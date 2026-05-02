"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/domain/orders";

type Props = { orderId: string; status: OrderStatus };

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next?: OrderStatus; approve?: true }>> = {
  Pending:  { label: "✅ อนุมัติออเดอร์", approve: true },
  Blending: { label: "🔔 แจ้งลูกค้าพร้อมรับ", next: "Ready" },
  Ready:    { label: "✔ ปิดออเดอร์", next: "Completed" },
};

export function AdminOrderActions({ orderId, status }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const action = NEXT_ACTION[status];
  if (!action) return null;

  async function handleClick() {
    if (!action) return;
    setBusy(true);
    setError("");
    try {
      if (action.approve) {
        const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
        if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      } else if (action.next) {
        const res = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action.next }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={busy}
        className="w-full bg-brand text-white py-3.5 rounded-2xl font-bold text-sm
          disabled:opacity-40 hover:bg-green-700 transition-colors"
      >
        {busy ? "กำลังดำเนินการ..." : action.label}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
