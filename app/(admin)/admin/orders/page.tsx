"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { HistoryOrder } from "@/app/api/admin/orders/history/route";
import type { OrderStatus } from "@/lib/domain/orders";

// ── Config ─────────────────────────────────────────────────────────────────

const TABS: { label: string; value: string }[] = [
  { label: "ทั้งหมด",      value: "all" },
  { label: "รอชำระ",       value: "Pending" },
  { label: "กำลังปั่น",   value: "Blending" },
  { label: "พร้อมรับ",    value: "Ready" },
  { label: "เสร็จสิ้น",   value: "Completed" },
];

const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  Pending:   { dot: "bg-amber-400",  label: "รอชำระ" },
  Blending:  { dot: "bg-blue-400",   label: "กำลังปั่น" },
  Ready:     { dot: "bg-brand",      label: "พร้อมรับ" },
  Completed: { dot: "bg-zinc-500",   label: "เสร็จสิ้น" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function Stars({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <span className="text-xs text-amber-400">
      {"★".repeat(score)}{"☆".repeat(5 - score)}
    </span>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: HistoryOrder }) {
  const style = STATUS_STYLE[order.status] ?? STATUS_STYLE.Pending;
  return (
    <Link href={`/admin/orders/${order.id}`}>
      <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800 hover:bg-zinc-800 transition-colors">
        <div className="flex items-start gap-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${style.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 justify-between">
              <span className="text-xs text-zinc-500 font-mono">#{order.id.slice(0, 8)}</span>
              <span className="text-xs text-zinc-600">{fmtDate(order.created_at)}</span>
            </div>
            <p className="text-sm text-zinc-300 mt-0.5 truncate">{order.item_summary}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm font-bold text-white">฿{order.total_price}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                ${order.status === "Completed"
                  ? "bg-zinc-800 text-zinc-500"
                  : order.status === "Ready"
                  ? "bg-brand/10 text-brand"
                  : order.status === "Blending"
                  ? "bg-blue-900/30 text-blue-400"
                  : "bg-amber-900/30 text-amber-400"}`}
              >
                {style.label}
              </span>
              <Stars score={order.review_score} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [tab, setTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async (status: string) => {
    setLoading(true);
    const qs = status !== "all" ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/orders/history${qs}`, { cache: "no-store" });
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(tab); }, [tab, fetchOrders]);

  // Count per status for tab badges
  const countByStatus = (s: string) =>
    s === "all" ? orders.length : orders.filter((o) => o.status === s).length;

  // Revenue of current view
  const totalRevenue = orders
    .filter((o) => (o.status as OrderStatus) !== "Pending")
    .reduce((s, o) => s + o.total_price, 0);

  const avgReview = (() => {
    const scored = orders.filter((o) => o.review_score !== null);
    if (!scored.length) return null;
    return (scored.reduce((s, o) => s + (o.review_score ?? 0), 0) / scored.length).toFixed(1);
  })();

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">ประวัติออเดอร์</h1>
        <div className="text-right">
          <p className="text-xs text-zinc-500">
            {orders.length} รายการ
            {totalRevenue > 0 && ` · ฿${totalRevenue}`}
          </p>
          {avgReview && (
            <p className="text-xs text-amber-400">⭐ {avgReview}</p>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
              ${tab === value
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-zinc-500 pt-8 text-sm">กำลังโหลด...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-zinc-600 text-sm pt-12">ไม่มีออเดอร์</p>
      ) : (
        <div className="space-y-2.5">
          {orders.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
