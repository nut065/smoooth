// Edge Function: cleanup-videos
//
// Deletes video proofs for orders that satisfy ALL THREE conditions:
//   1. status = 'Completed'
//   2. created_at < now() - 7 days
//   3. review_score IS NULL  (reviewed orders keep their video forever)
//
// Idempotent: safe to re-run at any time.
// Dry-run:    set env DRYRUN=true  OR  pass ?dry_run=true query param.
//             Logs what would be deleted without touching storage or the DB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "video-proofs";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const dryRun =
      Deno.env.get("DRYRUN") === "true" ||
      url.searchParams.get("dry_run") === "true";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    // The orders_cleanup_idx partial index (on status, created_at WHERE review_score IS NULL
    // AND video_proof_url IS NOT NULL) makes this query fast even as the table grows.
    const { data: orders, error: selectErr } = await supabase
      .from("orders")
      .select("id, video_proof_url")
      .eq("status", "Completed")
      .lt("created_at", cutoff)
      .is("review_score", null)
      .not("video_proof_url", "is", null);

    if (selectErr) throw selectErr;

    if (!orders?.length) {
      console.log("cleanup-videos: nothing eligible");
      return json({ cleaned: 0, skipped: 0, errors: 0, dryRun });
    }

    console.log(
      `cleanup-videos: found ${orders.length} eligible order(s), dryRun=${dryRun}`,
    );

    let cleaned = 0, skipped = 0, errors = 0;

    for (const order of orders) {
      const videoUrl = order.video_proof_url as string;

      // Extract the storage path (everything after "/video-proofs/") from the public URL.
      // Stored path format: <order_id>/<timestamp>.<ext>
      const marker = `/video-proofs/`;
      const markerIdx = videoUrl.indexOf(marker);
      if (markerIdx === -1) {
        console.warn(`cleanup-videos: unparseable URL for order ${order.id}:`, videoUrl);
        skipped++;
        continue;
      }
      const storagePath = videoUrl.slice(markerIdx + marker.length);

      if (dryRun) {
        console.log(`[dry-run] would delete storage path "${storagePath}" (order ${order.id})`);
        cleaned++;
        continue;
      }

      // Step 1 — delete from Storage.
      // If the file is already gone ("Object Not Found"), treat it as success and
      // still proceed to nullify the URL so the row is cleaned up on this pass.
      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .remove([storagePath]);

      const alreadyGone =
        storageErr?.message?.toLowerCase().includes("not found") ||
        storageErr?.message?.toLowerCase().includes("object not found");

      if (storageErr && !alreadyGone) {
        console.error(`cleanup-videos: storage delete error for ${order.id}:`, storageErr.message);
        errors++;
        continue;
      }

      // Step 2 — nullify video_proof_url in the database.
      // Do this only after the file is confirmed gone so the URL never points to
      // a live file while the row still shows NULL.
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ video_proof_url: null })
        .eq("id", order.id);

      if (updateErr) {
        // File was deleted but DB update failed — on the next run the SELECT will
        // find no file for this order (video_proof_url IS NOT NULL filter won't match),
        // because the storage delete succeeded. Log and move on.
        console.error(`cleanup-videos: db nullify error for ${order.id}:`, updateErr.message);
        errors++;
        continue;
      }

      console.log(`cleanup-videos: ✓ cleaned ${order.id} (${storagePath})`);
      cleaned++;
    }

    return json({
      cleaned,
      skipped,
      errors,
      total: orders.length,
      dryRun,
    });
  } catch (err) {
    console.error("cleanup-videos: fatal", err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
