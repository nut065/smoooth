"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { AdminOrder } from "@/lib/domain/admin-orders";

const STATUS_ORDER = ["Pending", "Blending", "Ready"];

const STATUS_CONFIG: Record<string, { label: string; dot: string; ring: string }> = {
  Pending:  { label: "รอชำระ",    dot: "bg-amber-400",  ring: "ring-amber-400/20" },
  Blending: { label: "กำลังปั่น", dot: "bg-blue-400",   ring: "ring-blue-400/20" },
  Ready:    { label: "พร้อมรับ",  dot: "bg-brand",      ring: "ring-brand/20" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เพิ่งสั่ง";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  return `${Math.floor(m / 60)} ชม.ที่แล้ว`;
}

function OrderCard({ order, onApprove }: { order: AdminOrder; onApprove: (id: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.Pending;
  const itemSummary = order.items
    .map((i) => `${i.menu_name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`)
    .join(", ");

  async function handleApprove(e: React.MouseEvent) {
    e.preventDefault();
    setBusy(true);
    await onApprove(order.id);
    setBusy(false);
  }

  return (
    <Link href={`/admin/orders/${order.id}`}>
      <div className={`bg-zinc-900 rounded-2xl p-4 ring-1 ${cfg.ring} hover:bg-zinc-800 transition-colors`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
              <span className="text-xs text-zinc-400 font-mono">#{order.id.slice(0, 8)}</span>
              <span className="text-xs text-zinc-500 ml-auto">{timeAgo(order.created_at)}</span>
            </div>
            <p className="text-sm text-zinc-200 leading-snug truncate">{itemSummary}</p>
            <p className="text-base font-bold text-white mt-1">฿{order.total_price}</p>
          </div>

          {order.status === "Pending" && (
            <button
              onClick={handleApprove}
              disabled={busy}
              className="flex-shrink-0 bg-brand text-white text-xs font-bold px-3 py-1.5
                rounded-lg disabled:opacity-50 hover:bg-green-700 transition-colors"
            >
              {busy ? "..." : "อนุมัติ"}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function AdminQueuePage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (res.ok) setOrders(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));
    const id = setInterval(fetchOrders, 3000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  async function handleApprove(orderId: string) {
    await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
    await fetchOrders();
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: orders.filter((o) => o.status === status),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">คิวออเดอร์</h1>
        <span className="text-xs text-zinc-500">
          {orders.length > 0 ? `${orders.length} รายการ · รีเฟรชทุก 3 วิ` : "ไม่มีออเดอร์"}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">
          ยังไม่มีออเดอร์ที่รอดำเนินการ 🎉
        </div>
      ) : (
        grouped.map(({ status, items }) => (
          <div key={status}>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
              {STATUS_CONFIG[status].label} · {items.length}
            </p>
            <div className="space-y-3">
              {items.map((order) => (
                <OrderCard key={order.id} order={order} onApprove={handleApprove} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
