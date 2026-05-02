import { NextResponse } from "next/server";
import { getAdminOrders } from "@/lib/domain/admin-orders";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await getAdminOrders();
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
