"use client";

import { useEffect, useState } from "react";
import type { DailyCloseStats } from "@/app/api/admin/daily-close/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function pct(part: number, whole: number) {
  if (!whole) return "0%";
  return ((part / whole) * 100).toFixed(1) + "%";
}

function buildLineText(s: DailyCloseStats): string {
  const dateStr = new Date(s.date).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric",
  });
  const topList = s.top_items
    .slice(0, 3)
    .map((t, i) => `  ${i + 1}. ${t.name} — ${t.cups} แก้ว`)
    .join("\n");
  const wasteList = s.waste_items.length
    ? s.waste_items.map((w) => `  • ${w.name} ${w.quantity} ${w.unit}`).join("\n")
    : "  — ไม่มี";

  return [
    `📊 สรุปประจำวัน — ${dateStr}`,
    ``,
    `💰 รายรับ  ฿${fmt(s.revenue)}`,
    `🥤 จำนวน   ${s.cups} แก้ว (${s.orders} ออเดอร์)`,
    `📦 ต้นทุน  ฿${fmt(s.cogs)}`,
    `✨ กำไรขั้นต้น  ฿${fmt(s.gross_profit)} (${pct(s.gross_profit, s.revenue)})`,
    ``,
    `🏆 เมนูยอดนิยม`,
    topList || "  —",
    ``,
    `🗑 ของเสียวันนี้  ฿${fmt(s.waste_cost)}`,
    wasteList,
  ].join("\n");
}

// ── KPI card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800 flex flex-col gap-1">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-brand" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function DailyClosePage() {
  const [stats, setStats] = useState<DailyCloseStats | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setCopied(false);
    fetch(`/api/admin/daily-close?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [date]);

  async function copyLine() {
    if (!stats) return;
    await navigator.clipboard.writeText(buildLineText(stats));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">ปิดวัน</h1>
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="bg-zinc-800 text-white text-xs rounded-xl px-3 py-2
            border border-zinc-700 focus:outline-none focus:border-brand"
        />
      </div>

      {loading || !stats ? (
        <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="รายรับ"
              value={`฿${fmt(stats.revenue)}`}
              sub={`${stats.orders} ออเดอร์`}
              accent
            />
            <KpiCard
              label="แก้ว"
              value={String(stats.cups)}
              sub={stats.orders > 0 ? `เฉลี่ย ฿${fmt(stats.revenue / stats.cups)} / แก้ว` : undefined}
            />
            <KpiCard
              label="ต้นทุน (COGS)"
              value={`฿${fmt(stats.cogs)}`}
              sub={pct(stats.cogs, stats.revenue) + " ของรายรับ"}
            />
            <KpiCard
              label="กำไรขั้นต้น"
              value={`฿${fmt(stats.gross_profit)}`}
              sub={pct(stats.gross_profit, stats.revenue)}
              accent={stats.gross_profit > 0}
            />
          </div>

          {/* Waste */}
          <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-zinc-300">ของเสียวันนี้</p>
              <span className="text-sm font-bold text-red-400">฿{fmt(stats.waste_cost)}</span>
            </div>
            {stats.waste_items.length === 0 ? (
              <p className="text-xs text-zinc-600">ไม่มีของเสีย 🎉</p>
            ) : (
              <ul className="space-y-1.5">
                {stats.waste_items.map((w, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{w.name}</span>
                    <span className="text-zinc-500">
                      {w.quantity} {w.unit}
                      <span className="ml-2 text-zinc-700">({w.reason})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Top items */}
          {stats.top_items.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
              <p className="text-sm font-semibold text-zinc-300 mb-3">เมนูยอดนิยม</p>
              <ul className="space-y-2">
                {stats.top_items.map((t, i) => {
                  const maxCups = stats.top_items[0]?.cups ?? 1;
                  return (
                    <li key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400">
                          <span className="text-zinc-600 mr-1.5">{i + 1}.</span>
                          {t.name}
                        </span>
                        <span className="text-zinc-400 font-semibold">{t.cups} แก้ว</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${(t.cups / maxCups) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* LINE share */}
          <button
            onClick={copyLine}
            className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors
              ${copied
                ? "bg-green-800 text-green-200"
                : "bg-[#06C755] text-white hover:bg-[#05b34c]"
              }`}
          >
            {copied ? "คัดลอกแล้ว ✓" : "📋 คัดลอกสรุปสำหรับ LINE"}
          </button>

          {/* Preview */}
          <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
            <p className="text-xs text-zinc-600 mb-2">ตัวอย่างข้อความ</p>
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed font-sans">
              {buildLineText(stats)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
