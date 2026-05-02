"use client";

import { useEffect, useState, useRef } from "react";
import type { MaterialWithStatus } from "@/app/api/admin/stock/route";

// ── Status helpers ─────────────────────────────────────────────────────────

function getStatus(m: MaterialWithStatus): "out" | "low" | "ok" {
  if (m.current_stock <= 0) return "out";
  if (m.min_per_cup !== null && m.current_stock < m.min_per_cup) return "low";
  return "ok";
}

const STATUS_CONFIG = {
  out: { label: "หมด",  dot: "bg-red-500",   text: "text-red-400",   ring: "ring-red-500/20" },
  low: { label: "ต่ำ",  dot: "bg-amber-400", text: "text-amber-400", ring: "ring-amber-400/20" },
  ok:  { label: "พอ",   dot: "bg-brand",     text: "text-brand",     ring: "ring-brand/20" },
};

// ── Inline editable stock row ──────────────────────────────────────────────

function MaterialRow({
  material,
  onSave,
}: {
  material: MaterialWithStatus;
  onSave: (id: string, newStock: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const status = getStatus(material);
  const cfg = STATUS_CONFIG[status];

  function startEdit() {
    setInputVal(String(material.current_stock));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commit() {
    const num = parseFloat(inputVal);
    if (isNaN(num) || num === material.current_stock) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(material.id, Math.max(0, num));
    setSaving(false);
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className={`bg-zinc-900 rounded-2xl p-4 ring-1 ${cfg.ring} transition-colors`}>
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-200 truncate">{material.name}</p>
          {material.min_per_cup !== null && (
            <p className="text-xs text-zinc-600 mt-0.5">
              ต่ำสุดต่อแก้ว {material.min_per_cup} {material.unit}
            </p>
          )}
        </div>

        {/* Stock display / edit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="any"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKey}
              disabled={saving}
              className="w-24 bg-zinc-800 text-white text-sm text-right rounded-lg
                px-2 py-1 border border-zinc-600 focus:outline-none focus:border-brand
                disabled:opacity-50"
            />
          ) : (
            <button
              onClick={startEdit}
              className="text-right group"
              title="แตะเพื่อแก้"
            >
              <span className={`text-base font-bold tabular-nums ${cfg.text}`}>
                {material.current_stock}
              </span>
              <span className="text-xs text-zinc-500 ml-1">{material.unit}</span>
              <span className="text-zinc-700 text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                ✏️
              </span>
            </button>
          )}

          {/* Status badge */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
            ${status === "ok"  ? "bg-brand/10 text-brand" :
              status === "low" ? "bg-amber-400/10 text-amber-400" :
                                 "bg-red-500/10 text-red-400"}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Restock quick-add buttons */}
      <div className="flex gap-2 mt-3 ml-5">
        {[100, 500, 1000].map((delta) => (
          <button
            key={delta}
            onClick={async () => {
              setSaving(true);
              await onSave(material.id, material.current_stock + delta);
              setSaving(false);
            }}
            disabled={saving}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800
              hover:border-zinc-600 rounded-lg px-2 py-0.5 transition-colors disabled:opacity-40"
          >
            +{delta}
          </button>
        ))}
        <span className="text-xs text-zinc-700 self-center">{material.unit}</span>
      </div>
    </div>
  );
}

// ── Add material form ─────────────────────────────────────────────────────

function AddMaterialForm({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"g" | "ml">("g");
  const [stock, setStock] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        unit,
        current_stock: parseFloat(stock) || 0,
        cost_per_unit: parseFloat(cost) || 0,
      }),
    });
    if (res.ok) {
      setName(""); setStock(""); setCost(""); setUnit("g");
      setOpen(false);
      onAdd();
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl border border-dashed border-zinc-700
          text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
      >
        + เพิ่มวัตถุดิบใหม่
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-700 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">วัตถุดิบใหม่</p>

      {/* Name */}
      <input
        type="text"
        required
        placeholder="ชื่อวัตถุดิบ เช่น มะม่วง"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
          px-3 py-2.5 focus:outline-none focus:border-brand"
      />

      {/* Unit toggle */}
      <div className="flex gap-2">
        {(["g", "ml"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUnit(u)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors
              ${unit === u ? "bg-brand text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
          >
            {u === "g" ? "กรัม (g)" : "มิลลิลิตร (ml)"}
          </button>
        ))}
      </div>

      {/* Stock + cost */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-zinc-600 mb-1">สต็อกเริ่มต้น ({unit})</p>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
              px-3 py-2.5 focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <p className="text-xs text-zinc-600 mb-1">ราคาต่อหน่วย (฿/{unit})</p>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
              px-3 py-2.5 focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl
            hover:bg-green-700 transition-colors disabled:opacity-40"
        >
          {busy ? "..." : "เพิ่ม"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function StockPage() {
  const [materials, setMaterials] = useState<MaterialWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMaterials() {
    try {
      const res = await fetch("/api/admin/stock", { cache: "no-store" });
      if (res.ok) setMaterials(await res.json());
    } catch {}
  }

  useEffect(() => {
    fetchMaterials().finally(() => setLoading(false));
  }, []);

  async function handleSave(id: string, newStock: number) {
    // Optimistic update
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, current_stock: newStock } : m)),
    );
    await fetch(`/api/admin/stock/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_stock: newStock }),
    });
    // Re-fetch to confirm server state
    await fetchMaterials();
  }

  const outCount = materials.filter((m) => getStatus(m) === "out").length;
  const lowCount = materials.filter((m) => getStatus(m) === "low").length;

  if (loading) {
    return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">วัตถุดิบ</h1>
        <div className="flex gap-3 text-xs">
          {outCount > 0 && (
            <span className="text-red-400 font-semibold">{outCount} หมด</span>
          )}
          {lowCount > 0 && (
            <span className="text-amber-400 font-semibold">{lowCount} ต่ำ</span>
          )}
          {outCount === 0 && lowCount === 0 && (
            <span className="text-zinc-500">สต็อกปกติ ✓</span>
          )}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-zinc-600">
        แตะที่ตัวเลขเพื่อแก้สต็อก · ปุ่ม +100/+500/+1000 สำหรับเติมเร็ว
      </p>

      {/* List */}
      {materials.length === 0 ? (
        <div className="text-center py-12 text-zinc-600 text-sm">
          ยังไม่มีวัตถุดิบในระบบ
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => (
            <MaterialRow key={m.id} material={m} onSave={handleSave} />
          ))}
        </div>
      )}

      <AddMaterialForm onAdd={fetchMaterials} />
    </div>
  );
}
