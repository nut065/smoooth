"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function upsertProfile(
  lineUserId: string,
  displayName: string,
  avatarUrl: string | null,
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { line_user_id: lineUserId, display_name: displayName, avatar_url: avatarUrl },
      { onConflict: "line_user_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
