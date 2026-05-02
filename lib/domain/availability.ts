import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MenuStatus = "active" | "inactive" | "no_ingredients";

export type MenuWithAvailability = {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  status: MenuStatus;
  /** Min cups remaining across all BOM materials. 999 = no BOM (unlimited). */
  cups_remaining: number;
  /** true only when status='active' AND cups_remaining >= 1 */
  available: boolean;
  interest_today: number;
};

export async function getMenusWithAvailability(): Promise<MenuWithAvailability[]> {
  const supabase = await createClient();
  // p_include_hidden=false → hidden menus never reach the customer page
  const { data, error } = await supabase.rpc("get_menus_with_availability", {
    p_include_hidden: false,
  });
  if (error) throw error;
  return (data ?? []) as MenuWithAvailability[];
}
