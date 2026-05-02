import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "@/lib/domain/admin-orders";
import type { OrderStatus } from "@/lib/domain/orders";

const ALLOWED: OrderStatus[] = ["Blending", "Ready", "Completed"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  try {
    await updateOrderStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
