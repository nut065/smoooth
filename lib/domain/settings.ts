import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Reads one setting from shop_settings, falls back to `fallback` if not found. */
export async function getSetting(key: string, fallback = ""): Promise<string> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("shop_settings")
      .select("value")
      .eq("key", key)
      .single();
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
}
