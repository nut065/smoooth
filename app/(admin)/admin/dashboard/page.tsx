"use client";

import { useEffect, useState, useCallback } from "react";
import type { DashboardStats, DailyPoint, TopMenu, StockAlert } from "@/app/api/admin/dashboard/route";

// ── Formatters ─────────────────────────────────────────────────────────────

function fmtB(n: number) {
  if (n >= 1000) return `฿${(n / 1000).toFixed(1)}K`;
  return `฿${n % 1 === 0 ? n : n.toFixed(0)}`;
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function dayLabel(iso: string) {
  const d = new Date(iso);
  return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][d.getDay()];
}

// ── Stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent ? "text-brand" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Bar chart ──────────────────────────────────────────────────────────────

function BarChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
        รายได้ 7 วันล่าสุด
      </p>
      <div className="flex items-end gap-1.5 h-24">
        {data.map((d) => {
          const pct = max > 0 ? (d.revenue / max) * 100 : 0;
          const isToday = d.day === new Date().toISOString().slice(0, 10);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isToday ? "bg-brand" : "bg-zinc-700"
                  }`}
                  style={{ height: `${Math.max(pct, d.revenue > 0 ? 4 : 0)}%` }}
                  title={`${d.day}: ${fmtB(d.revenue)} (${d.orders} แก้ว)`}
                />
              </div>
              <span className={`text-[10px] ${isToday ? "text-brand font-bold" : "text-zinc-600"}`}>
                {dayLabel(d.day)}
              </span>
            </div>
          );
        })}
      </div>
      {/* Revenue labels on highest bar */}
      <div className="flex gap-1.5 mt-1">
        {data.map((d) => (
          <div key={d.day} className="flex-1 text-center">
            {d.revenue > 0 && (
              <span className="text-[9px] text-zinc-600 tabular-nums">{fmtB(d.revenue)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top menus ──────────────────────────────────────────────────────────────

function TopMenus({ menus }: { menus: TopMenu[] }) {
  if (menus.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Top เมนู</p>
        <p className="text-sm text-zinc-600">ยังไม่มีออเดอร์ใน 7 วัน</p>
      </div>
    );
  }
  const maxCups = Math.max(...menus.map((m) => m.cups), 1);
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        Top เมนู · 7 วัน
      </p>
      <div className="space-y-2.5">
        {menus.map((m, i) => (
          <div key={m.name}>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-zinc-300 font-semibold">
                <span className="text-zinc-600 mr-1.5">{i + 1}.</span>{m.name}
              </span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {m.cups} แก้ว · {fmtB(m.revenue)}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all"
                style={{ width: `${(m.cups / maxCups) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stock alerts ───────────────────────────────────────────────────────────

function StockAlerts({ alerts }: { alerts: StockAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="bg-red-950/40 rounded-2xl p-4 ring-1 ring-red-900/50">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-400 mb-3">
        ⚠️ สต็อกไม่พอ ({alerts.length})
      </p>
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.name} className="flex items-center justify-between">
            <span className="text-sm text-red-300">{a.name}</span>
            <span className="text-xs text-red-400 tabular-nums">
              {a.current_stock}/{a.min_per_cup} {a.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Export ─────────────────────────────────────────────────────────────

function AIExport({ stats }: { stats: DashboardStats }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    // Fetch menus + materials for full context
    const [menusRes, matRes] = await Promise.all([
      fetch("/api/admin/menus",  { cache: "no-store" }),
      fetch("/api/admin/stock",  { cache: "no-store" }),
    ]);
    const menus     = menusRes.ok ? await menusRes.json() : [];
    const materials = matRes.ok   ? await matRes.json()   : [];

    const payload = {
      exported_at:   new Date().toISOString(),
      shop:          "Premium Craft Smoothie",
      stats: {
        today:         { revenue: stats.today_revenue, orders: stats.today_orders },
        week:          { revenue: stats.week_revenue,  orders: stats.week_orders  },
        avg_margin_pct: stats.avg_margin,
        avg_review:    stats.avg_review,
        pending_orders: stats.pending_count,
        stock_alerts:  stats.stock_alerts,
        daily_chart:   stats.daily_chart,
        top_menus:     stats.top_menus,
      },
      menus,
      materials,
    };

    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setLoading(false);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="w-full py-3.5 rounded-2xl border border-zinc-700 text-sm font-semibold
        text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors
        disabled:opacity-40 flex items-center justify-center gap-2"
    >
      {loading ? (
        "กำลังเตรียม..."
      ) : copied ? (
        <>✓ คัดลอกแล้ว — วางใน AI ได้เลย</>
      ) : (
        <>📋 Export ข้อมูลสำหรับ AI</>
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.ok) {
        setStats(await res.json());
        setLastUpdated(new Date());
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
    // Refresh every 60 seconds
    const id = setInterval(fetchStats, 60_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  if (loading || !stats) {
    return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <span className="text-xs text-zinc-600">
          {lastUpdated
            ? `อัปเดต ${lastUpdated.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </span>
      </div>

      {/* Stock alerts — prominently at top if any */}
      <StockAlerts alerts={stats.stock_alerts} />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="วันนี้"
          value={fmtB(stats.today_revenue)}
          sub={`${stats.today_orders} แก้ว`}
          accent
        />
        <StatCard
          label="7 วัน"
          value={fmtB(stats.week_revenue)}
          sub={`${stats.week_orders} แก้ว`}
        />
        <StatCard
          label="Gross Margin"
          value={fmtPct(stats.avg_margin)}
          sub="เฉลี่ยทุกเมนู"
        />
        <StatCard
          label="Avg Review"
          value={stats.avg_review !== null ? `⭐ ${stats.avg_review.toFixed(1)}` : "—"}
          sub="30 วันล่าสุด"
        />
      </div>

      {/* Pending badge */}
      {stats.pending_count > 0 && (
        <div className="bg-amber-950/40 rounded-2xl p-3 ring-1 ring-amber-800/40 flex items-center justify-between">
          <span className="text-sm text-amber-300 font-semibold">
            🕐 รอยืนยัน {stats.pending_count} ออเดอร์
          </span>
          <a href="/admin" className="text-xs text-amber-400 underline underline-offset-2">
            ไปคิว →
          </a>
        </div>
      )}

      {/* Bar chart */}
      <BarChart data={stats.daily_chart} />

      {/* Top menus */}
      <TopMenus menus={stats.top_menus} />

      {/* AI Export */}
      <AIExport stats={stats} />
    </div>
  );
}
