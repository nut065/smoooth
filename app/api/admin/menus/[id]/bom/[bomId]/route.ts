import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/admin/menus/:id/bom/:bomId
// body: { quantity_required: number }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bomId: string }> },
) {
  try {
    const { bomId } = await params;
    const { quantity_required }: { quantity_required: number } = await req.json();

    if (!(quantity_required > 0))
      return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("bom")
      .update({ quantity_required })
      .eq("id", bomId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("bom PATCH:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// DELETE /api/admin/menus/:id/bom/:bomId
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ bomId: string }> },
) {
  try {
    const { bomId } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from("bom").delete().eq("id", bomId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("bom DELETE:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
