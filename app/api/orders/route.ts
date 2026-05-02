import { NextRequest, NextResponse } from "next/server";
import { getCustomerOrders } from "@/lib/domain/orders";

export async function GET(req: NextRequest) {
  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json([], { status: 200 });
  try {
    const orders = await getCustomerOrders(profileId);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
