import { NextRequest, NextResponse } from "next/server";
import { approveOrder } from "@/lib/domain/order-approval";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await approveOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
