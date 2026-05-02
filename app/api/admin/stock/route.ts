import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type MaterialWithStatus = {
  id: string;
  name: string;
  unit: "g" | "ml";
  current_stock: number;
  cost_per_unit: number;
  // smallest quantity_required across all menus that use this material
  // null = not used in any BOM yet
  min_per_cup: number | null;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_materials_with_min_bom");
    if (error) throw error;
    return NextResponse.json(data as MaterialWithStatus[]);
  } catch (err) {
    console.error("stock GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, unit, current_stock = 0, cost_per_unit = 0 } = await req.json();

    if (!name?.trim() || !["g", "ml"].includes(unit)) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("materials")
      .insert({
        name: name.trim(),
        unit,
        current_stock: Math.max(0, Number(current_stock) || 0),
        cost_per_unit: Math.max(0, Number(cost_per_unit) || 0),
      })
      .select("id, name, unit, current_stock, cost_per_unit")
      .single();

    if (error) throw error;
    return NextResponse.json({ ...data, min_per_cup: null } as MaterialWithStatus, { status: 201 });
  } catch (err) {
    console.error("stock POST:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
