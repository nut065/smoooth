import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public — customer taps "อยากกินจัง" on an out-of-season menu. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    // Verify the menu exists and is no_ingredients (not hidden)
    const { data: menu } = await supabase
      .from("menus")
      .select("id, status")
      .eq("id", id)
      .single();

    if (!menu || menu.status === "hidden") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("menu_interests")
      .insert({ menu_id: id });
    if (error) throw error;

    // Return today's total count for this menu
    const { count } = await supabase
      .from("menu_interests")
      .select("*", { count: "exact", head: true })
      .eq("menu_id", id)
      .gte("created_at", new Date().toISOString().slice(0, 10));

    return NextResponse.json({ ok: true, count: count ?? 1 });
  } catch (err) {
    console.error("interest POST:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
