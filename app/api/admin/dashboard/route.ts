import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type DailyPoint = {
  day: string;      // ISO date "2026-04-25"
  revenue: number;
  orders: number;
};

export type TopMenu = {
  name: string;
  cups: number;
  revenue: number;
};

export type StockAlert = {
  name: string;
  unit: string;
  current_stock: number;
  min_per_cup: number;
  pct_remaining: number;
};

export type DashboardStats = {
  today_revenue:  number;
  today_orders:   number;
  week_revenue:   number;
  week_orders:    number;
  daily_chart:    DailyPoint[];
  top_menus:      TopMenu[];
  avg_margin:     number;
  stock_alerts:   StockAlert[];
  avg_review:     number | null;
  pending_count:  number;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_dashboard_stats");
    if (error) throw error;
    return NextResponse.json(data as DashboardStats);
  } catch (err) {
    console.error("dashboard GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
