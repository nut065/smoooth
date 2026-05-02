import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/admin/addons/:id
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: {
      name?: string;
      price?: number;
      is_active?: boolean;
      material_id?: string | null;
      quantity_per_serving?: number | null;
    } = await req.json();

    const allowed: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim())
      allowed.name = body.name.trim();
    if (typeof body.price === "number" && body.price >= 0)
      allowed.price = body.price;
    if (typeof body.is_active === "boolean")
      allowed.is_active = body.is_active;
    // material link — must update both fields together
    if ("material_id" in body) {
      allowed.material_id          = body.material_id ?? null;
      allowed.quantity_per_serving = body.quantity_per_serving ?? null;
    }

    if (!Object.keys(allowed).length)
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("addons").update(allowed).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("addons PATCH:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// DELETE /api/admin/addons/:id
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { error } = await supabase.from("addons").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("addons DELETE:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
