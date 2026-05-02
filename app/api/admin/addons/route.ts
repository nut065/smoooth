import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type AdminAddon = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  material_id: string | null;
  material_name: string | null;
  unit: string | null;
  quantity_per_serving: number | null;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("addons")
      .select("id, name, price, is_active, material_id, quantity_per_serving, material:material_id(name, unit)")
      .order("name");
    if (error) throw error;

    const rows: AdminAddon[] = (data ?? []).map((r) => {
      const mat = r.material as unknown as { name: string; unit: string } | null;
      return {
        id: r.id,
        name: r.name,
        price: r.price,
        is_active: r.is_active,
        material_id: r.material_id,
        material_name: mat?.name ?? null,
        unit: mat?.unit ?? null,
        quantity_per_serving: r.quantity_per_serving,
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("addons GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// POST /api/admin/addons
// body: { name, price, material_id?, quantity_per_serving? }
export async function POST(req: Request) {
  try {
    const body: {
      name: string;
      price: number;
      material_id?: string | null;
      quantity_per_serving?: number | null;
    } = await req.json();

    if (!body.name?.trim() || body.price == null || body.price < 0)
      return NextResponse.json({ error: "invalid body" }, { status: 400 });

    // Both material_id and quantity_per_serving must be set, or both null
    const hasMat = !!body.material_id && !!body.quantity_per_serving;
    const supabase = createAdminClient();
    const { error } = await supabase.from("addons").insert({
      name:                 body.name.trim(),
      price:                body.price,
      material_id:          hasMat ? body.material_id : null,
      quantity_per_serving: hasMat ? body.quantity_per_serving : null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("addons POST:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
