import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type WasteEntry = {
  id: string;
  material_id: string;
  material_name: string;
  unit: "g" | "ml";
  quantity: number;
  reason: "spoiled" | "dropped" | "prep_error" | "other";
  note: string | null;
  logged_at: string;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("waste_logs")
      .select(`
        id, material_id, quantity, reason, note, logged_at, created_at,
        materials ( name, unit )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const rows: WasteEntry[] = (data ?? []).map((r: unknown) => {
      const row = r as {
        id: string; material_id: string; quantity: number;
        reason: string; note: string | null; logged_at: string; created_at: string;
        materials: { name: string; unit: string };
      };
      return {
        id: row.id,
        material_id: row.material_id,
        material_name: row.materials?.name ?? "",
        unit: (row.materials?.unit ?? "g") as "g" | "ml",
        quantity: row.quantity,
        reason: row.reason as WasteEntry["reason"],
        note: row.note,
        logged_at: row.logged_at,
        created_at: row.created_at,
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("waste-log GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { material_id, quantity, reason = "other", note, logged_at } = body;

    if (!material_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Insert waste log
    const insertPayload: Record<string, unknown> = { material_id, quantity, reason };
    if (note) insertPayload.note = note;
    if (logged_at) insertPayload.logged_at = logged_at;

    const { error: insertErr } = await supabase.from("waste_logs").insert(insertPayload);
    if (insertErr) throw insertErr;

    // Deduct from current_stock, cap at 0
    const { data: mat, error: matErr } = await supabase
      .from("materials")
      .select("current_stock")
      .eq("id", material_id)
      .single();
    if (matErr) throw matErr;

    const newStock = Math.max(0, (mat.current_stock as number) - quantity);
    const { error: updErr } = await supabase
      .from("materials")
      .update({ current_stock: newStock })
      .eq("id", material_id);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, new_stock: newStock });
  } catch (err) {
    console.error("waste-log POST:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
