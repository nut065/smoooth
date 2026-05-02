import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MenuDetail = {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
};

export async function getMenuById(id: string): Promise<MenuDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menus")
    .select("id, name, base_price, image_url")
    .eq("id", id)
    .neq("status", "hidden")
    .single();
  if (error) return null;
  return data;
}
