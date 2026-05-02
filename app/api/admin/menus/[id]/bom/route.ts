import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type BomRow = {
  id: string;
  material_id: string;
  material_name: string;
  unit: string;
  quantity_required: number;
};

// GET /api/admin/menus/:id/bom
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("bom")
      .select("id, material_id, quantity_required, material:material_id(name, unit)")
      .eq("menu_id", id)
      .order("material_id");

    if (error) throw error;

    const rows: BomRow[] = (data ?? []).map((r) => {
      const mat = r.material as unknown as { name: string; unit: string };
      return {
        id: r.id,
        material_id: r.material_id,
        material_name: mat.name,
        unit: mat.unit,
        quantity_required: r.quantity_required,
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("bom GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// POST /api/admin/menus/:id/bom
// body: { material_id: string, quantity_required: number }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: menu_id } = await params;
    const body: { material_id: string; quantity_required: number } =
      await req.json();

    if (!body.material_id || !(body.quantity_required > 0))
      return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("bom")
      .insert({ menu_id, material_id: body.material_id, quantity_required: body.quantity_required });

    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("bom POST:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
