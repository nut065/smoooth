import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/domain/orders";

export const dynamic = "force-dynamic";

export type HistoryOrder = {
  id: string;
  status: OrderStatus;
  total_price: number;
  created_at: string;
  review_score: number | null;
  item_summary: string;   // "Banana Honey Cream ×2, Mango Sunrise"
  item_count: number;     // total cups
};

const ITEM_SELECT = `
  id, status, total_price, created_at, review_score,
  order_items ( quantity, menus ( name ) )
` as const;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");   // optional filter
    const limit  = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

    const supabase = createAdminClient();
    let query = supabase
      .from("orders")
      .select(ITEM_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders: HistoryOrder[] = (data ?? []).map((o: any) => {
      const items: { qty: number; name: string }[] = (o.order_items ?? []).map(
        (oi: { quantity: number; menus: { name: string } | null }) => ({
          qty:  oi.quantity,
          name: oi.menus?.name ?? "?",
        }),
      );
      const item_count   = items.reduce((s, i) => s + i.qty, 0);
      const item_summary = items
        .map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name))
        .join(", ");

      return {
        id:           o.id,
        status:       o.status,
        total_price:  o.total_price,
        created_at:   o.created_at,
        review_score: o.review_score,
        item_summary,
        item_count,
      };
    });

    return NextResponse.json(orders);
  } catch (err) {
    console.error("orders/history GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
