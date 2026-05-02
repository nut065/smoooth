"use client";

import { useEffect, useState } from "react";
import type { WasteEntry } from "@/app/api/admin/waste-log/route";
import type { MaterialWithStatus } from "@/app/api/admin/stock/route";

// ── Reason labels ──────────────────────────────────────────────────────────

const REASONS = [
  { value: "spoiled",    label: "เน่า / หมดอายุ" },
  { value: "dropped",   label: "ตก / หก" },
  { value: "prep_error", label: "เตรียมผิด" },
  { value: "other",     label: "อื่นๆ" },
] as const;

type Reason = typeof REASONS[number]["value"];

const REASON_COLOR: Record<Reason, string> = {
  spoiled:    "bg-red-900/30 text-red-400",
  dropped:    "bg-orange-900/30 text-orange-400",
  prep_error: "bg-yellow-900/30 text-yellow-400",
  other:      "bg-zinc-800 text-zinc-400",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Log form ──────────────────────────────────────────────────────────────

function LogWasteForm({
  materials,
  onAdd,
}: { materials: MaterialWithStatus[]; onAdd: () => void }) {
  const [matId, setMatId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<Reason>("other");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ stock: number; name: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!matId || !q || q <= 0) return;

    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/waste-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: matId, quantity: q, reason, note: note || null }),
    });
    if (res.ok) {
      const { new_stock } = await res.json();
      const mat = materials.find((m) => m.id === matId);
      setResult({ stock: new_stock, name: mat?.name ?? "" });
      setQty(""); setNote("");
      onAdd();
    }
    setBusy(false);
  }

  const selMat = materials.find((m) => m.id === matId);

  return (
    <form onSubmit={submit} className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">บันทึกของเสีย</p>

      {/* Material */}
      <select
        required
        value={matId}
        onChange={(e) => setMatId(e.target.value)}
        className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
          px-3 py-2.5 focus:outline-none focus:border-red-500"
      >
        <option value="">เลือกวัตถุดิบ</option>
        {materials.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} (คงเหลือ {m.current_stock} {m.unit})
          </option>
        ))}
      </select>

      {/* Quantity + unit */}
      <div className="flex gap-2 items-center">
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="any"
          required
          placeholder={`ปริมาณที่เสีย (${selMat?.unit ?? "หน่วย"})`}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="flex-1 bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
            px-3 py-2.5 focus:outline-none focus:border-red-500"
        />
        {selMat && (
          <span className="text-zinc-500 text-sm">{selMat.unit}</span>
        )}
      </div>

      {/* Reason */}
      <div className="grid grid-cols-2 gap-2">
        {REASONS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setReason(r.value)}
            className={`py-2 rounded-xl text-xs font-semibold transition-colors
              ${reason === r.value
                ? "bg-red-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Note */}
      <input
        type="text"
        placeholder="หมายเหตุ (ไม่บังคับ)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
          px-3 py-2.5 focus:outline-none focus:border-red-500"
      />

      {result && (
        <p className="text-xs text-green-400">
          ✓ บันทึกแล้ว · {result.name} คงเหลือ {result.stock}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-2.5 bg-red-700 text-white text-sm font-semibold rounded-xl
          hover:bg-red-800 transition-colors disabled:opacity-40"
      >
        {busy ? "..." : "บันทึกของเสีย"}
      </button>
    </form>
  );
}

// ── History row ────────────────────────────────────────────────────────────

function WasteRow({ entry }: { entry: WasteEntry }) {
  const reason = entry.reason as Reason;
  const label = REASONS.find((r) => r.value === reason)?.label ?? reason;

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-sm font-semibold text-zinc-200">
              {entry.material_name}
            </span>
            <span className="text-xs text-zinc-600">{fmtDate(entry.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-red-400 font-bold">
              −{entry.quantity} {entry.unit}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${REASON_COLOR[reason]}`}>
              {label}
            </span>
          </div>
          {entry.note && (
            <p className="text-xs text-zinc-600 mt-1">{entry.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function WasteLogPage() {
  const [entries, setEntries] = useState<WasteEntry[]>([]);
  const [materials, setMaterials] = useState<MaterialWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [wRes, mRes] = await Promise.all([
      fetch("/api/admin/waste-log", { cache: "no-store" }),
      fetch("/api/admin/stock",     { cache: "no-store" }),
    ]);
    if (wRes.ok) setEntries(await wRes.json());
    if (mRes.ok) setMaterials(await mRes.json());
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  // Today's total waste entries (by logged_at date)
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = entries.filter((e) => e.logged_at === today).length;

  if (loading) return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">บันทึกของเสีย</h1>
        {todayCount > 0 && (
          <span className="text-xs text-zinc-500">วันนี้ {todayCount} รายการ</span>
        )}
      </div>

      <LogWasteForm materials={materials} onAdd={fetchData} />

      {entries.length === 0 ? (
        <p className="text-center text-zinc-600 text-sm pt-8">ยังไม่มีรายการ</p>
      ) : (
        <div className="space-y-2.5">
          {entries.map((e) => <WasteRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}
