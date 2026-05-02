import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type WasteItem = {
  name: string;
  unit: string;
  quantity: number;
  reason: string;
};

export type TopItem = {
  name: string;
  cups: number;
};

export type DailyCloseStats = {
  date: string;
  revenue: number;
  cups: number;
  orders: number;
  cogs: number;
  gross_profit: number;
  waste_cost: number;
  waste_items: WasteItem[];
  top_items: TopItem[];
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const supabase = createAdminClient();
    const { data, error } = dateParam
      ? await supabase.rpc("get_daily_close_stats", { p_date: dateParam })
      : await supabase.rpc("get_daily_close_stats");

    if (error) throw error;
    return NextResponse.json(data as DailyCloseStats);
  } catch (err) {
    console.error("daily-close GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
