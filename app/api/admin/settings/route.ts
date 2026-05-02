import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type ShopSettings = {
  shop_name: string;
  admin_pin: string;
  promptpay_qr_url: string;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shop_settings")
      .select("key, value");
    if (error) throw error;

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({
      shop_name:        settings.shop_name        ?? "Craft Smoothie",
      admin_pin:        settings.admin_pin        ?? "1234",
      promptpay_qr_url: settings.promptpay_qr_url ?? "",
    } as ShopSettings);
  } catch (err) {
    console.error("settings GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    const allowed = ["shop_name", "admin_pin", "promptpay_qr_url"];
    if (!allowed.includes(key)) {
      return NextResponse.json({ error: "unknown key" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("shop_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings PATCH:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
