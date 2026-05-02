import { NextRequest, NextResponse } from "next/server";
import { getAdminOrderById } from "@/lib/domain/admin-orders";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await getAdminOrderById(id);
    if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
