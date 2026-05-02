import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Addon = {
  id: string;
  name: string;
  price: number;
};

export async function getAddons(): Promise<Addon[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addons")
    .select("id, name, price")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}
