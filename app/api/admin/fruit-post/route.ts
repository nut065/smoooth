import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * After topping up a material, find every menu that:
 *   1. has status = 'no_ingredients'
 *   2. uses this material in its BOM
 *   3. NOW has enough stock for every BOM ingredient (>= 1 cup)
 * and flip those menus to 'active'.
 */
async function autoTransitionMenus(
  supabase: SupabaseClient,
  materialId: string,
) {
  // Menus that use this material AND are currently no_ingredients
  const { data: candidates } = await supabase
    .from("bom")
    .select("menu_id, menus!inner(status)")
    .eq("material_id", materialId)
    .eq("menus.status", "no_ingredients");

  if (!candidates?.length) return;

  for (const row of candidates) {
    const menuId = row.menu_id as string;

    // Check every BOM ingredient for this menu has sufficient stock
    const { data: bom } = await supabase
      .from("bom")
      .select("quantity_required, materials(current_stock)")
      .eq("menu_id", menuId);

    const allSufficient = (bom ?? []).every((b) => {
      const mat = b.materials as unknown as { current_stock: number } | null;
      return mat !== null && mat.current_stock >= b.quantity_required;
    });

    if (allSufficient) {
      await supabase
        .from("menus")
        .update({ status: "active" })
        .eq("id", menuId);
    }
  }
}

export const dynamic = "force-dynamic";

export type FruitPurchase = {
  id: string;
  material_id: string;
  material_name: string;
  unit: string;
  purchase_date: string;
  weight_g: number;
  total_cost: number;
  yield_pct: number;
  usable_g: number;         // weight_g × yield_pct/100
  cost_per_g: number;       // total_cost / usable_g
  note: string | null;
  photo_url: string | null;
  created_at: string;
};

// GET — last 20 purchases, newest first
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fruit_purchases")
      .select("*, material:material_id(name, unit)")
      .order("purchase_date", { ascending: false })
      .order("created_at",    { ascending: false })
      .limit(20);

    if (error) throw error;

    const rows: FruitPurchase[] = (data ?? []).map((r) => {
      const mat = r.material as unknown as { name: string; unit: string };
      const usable_g = r.weight_g * (r.yield_pct / 100);
      return {
        id: r.id,
        material_id: r.material_id,
        material_name: mat.name,
        unit: mat.unit,
        purchase_date: r.purchase_date,
        weight_g: r.weight_g,
        total_cost: r.total_cost,
        yield_pct: r.yield_pct,
        usable_g,
        cost_per_g: usable_g > 0 ? r.total_cost / usable_g : 0,
        note: r.note,
        photo_url: r.photo_url,
        created_at: r.created_at,
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("fruit-post GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

// POST — record purchase, update stock + cost_per_unit
// body: { material_id, purchase_date?, weight_g, total_cost, yield_pct?, note? }
export async function POST(req: Request) {
  try {
    const body: {
      material_id: string;
      purchase_date?: string;
      weight_g: number;
      total_cost: number;
      yield_pct?: number;
      note?: string;
      photo_url?: string;
    } = await req.json();

    if (!body.material_id || !(body.weight_g > 0) || !(body.total_cost >= 0))
      return NextResponse.json({ error: "invalid body" }, { status: 400 });

    const yield_pct = body.yield_pct ?? 100;
    const usable_g  = body.weight_g * (yield_pct / 100);
    const cost_per_g = usable_g > 0 ? body.total_cost / usable_g : 0;

    const supabase = createAdminClient();

    // 1. Record the purchase
    const { error: insertErr } = await supabase.from("fruit_purchases").insert({
      material_id:   body.material_id,
      purchase_date: body.purchase_date ?? new Date().toISOString().slice(0, 10),
      weight_g:      body.weight_g,
      total_cost:    body.total_cost,
      yield_pct,
      note:          body.note ?? null,
      photo_url:     body.photo_url ?? null,
    });
    if (insertErr) throw insertErr;

    // 2. Add usable stock + update cost_per_unit
    //    Fetch current stock first so we can compute the new value.
    const { data: mat, error: readErr } = await supabase
      .from("materials")
      .select("current_stock")
      .eq("id", body.material_id)
      .single();
    if (readErr) throw readErr;

    const new_stock = (mat.current_stock as number) + usable_g;

    const { error: updateErr } = await supabase
      .from("materials")
      .update({ current_stock: new_stock, cost_per_unit: cost_per_g })
      .eq("id", body.material_id);
    if (updateErr) throw updateErr;

    // Auto-transition: if any menu with status='no_ingredients' uses this material
    // and now has sufficient stock for all BOM ingredients, flip it to 'active'.
    await autoTransitionMenus(supabase, body.material_id);

    return NextResponse.json({ usable_g, cost_per_g, new_stock }, { status: 201 });
  } catch (err) {
    console.error("fruit-post POST:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
