import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/admin/stock/:id
// body: { current_stock: number }   — set absolute value
//    OR { delta: number }            — add/subtract (e.g. +500 to restock)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: { current_stock?: number; delta?: number } = await req.json();

    const supabase = createAdminClient();

    if (typeof body.delta === "number") {
      // Read current → add delta → write back (within service-role so no race in admin)
      const { data: mat, error: readErr } = await supabase
        .from("materials")
        .select("current_stock")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;

      const next = Math.max(0, (mat.current_stock as number) + body.delta);
      const { error } = await supabase
        .from("materials")
        .update({ current_stock: next })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ current_stock: next });
    }

    if (typeof body.current_stock === "number") {
      const next = Math.max(0, body.current_stock);
      const { error } = await supabase
        .from("materials")
        .update({ current_stock: next })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ current_stock: next });
    }

    return NextResponse.json({ error: "body must have current_stock or delta" }, { status: 400 });
  } catch (err) {
    console.error("stock PATCH:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
