import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type MenuStatus = "active" | "inactive" | "no_ingredients" | "hidden";

export type AdminMenu = {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  status: MenuStatus;
  cups_remaining: number;
  available: boolean;
  interest_today: number;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    // include_hidden=true so admin sees all menus
    const { data, error } = await supabase.rpc("get_menus_with_availability", {
      p_include_hidden: true,
    });
    if (error) throw error;
    return NextResponse.json((data ?? []) as AdminMenu[]);
  } catch (err) {
    console.error("menus GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
