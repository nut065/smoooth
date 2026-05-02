"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AdminMenu } from "@/app/api/admin/menus/route";
import type { BomRow }    from "@/app/api/admin/menus/[id]/bom/route";
import type { MaterialWithStatus } from "@/app/api/admin/stock/route";

// ── Types ──────────────────────────────────────────────────────────────────

type EnrichedBomRow = BomRow & {
  cost_per_unit: number;   // from materials table
  line_cost: number;       // quantity_required × cost_per_unit
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtB(n: number) {
  return n % 1 === 0 ? `฿${n}` : `฿${n.toFixed(2)}`;
}

function marginColor(pct: number) {
  if (pct >= 60) return "text-brand";
  if (pct >= 40) return "text-amber-400";
  return "text-red-400";
}

// ── Stepper row ────────────────────────────────────────────────────────────

function StepperRow({
  row,
  step,
  onQtyChange,
  onDelete,
}: {
  row: EnrichedBomRow;
  step: number;
  onQtyChange: (bomId: string, qty: number) => Promise<void>;
  onDelete: (bomId: string) => Promise<void>;
}) {
  const [busy, setBusy]       = useState(false);
  const [local, setLocal]     = useState(row.quantity_required);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when parent refreshes
  useEffect(() => { setLocal(row.quantity_required); }, [row.quantity_required]);

  async function adjust(delta: number) {
    const next = Math.max(0, local + delta);
    if (next === local) return;
    setLocal(next);
    setBusy(true);
    await onQtyChange(row.id, next);
    setBusy(false);
  }

  function startEdit() {
    setDraft(String(local));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commitEdit() {
    const val = parseFloat(draft);
    if (!isNaN(val) && val > 0 && val !== local) {
      setLocal(val);
      setBusy(true);
      await onQtyChange(row.id, val);
      setBusy(false);
    }
    setEditing(false);
  }

  const lineCost = local * row.cost_per_unit;

  return (
    <div className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0">
      {/* Material name + unit cost */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 truncate">{row.material_name}</p>
        <p className="text-xs text-zinc-600">
          {fmtB(row.cost_per_unit)}/{row.unit}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => adjust(-step)}
          disabled={busy || local <= 0}
          className="w-10 h-12 flex items-center justify-center rounded-xl bg-zinc-800
            text-zinc-300 text-lg font-bold hover:bg-zinc-700 transition-colors
            disabled:opacity-30 active:scale-95"
        >
          −
        </button>

        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-20 h-12 text-center bg-zinc-800 text-white text-sm font-bold
              rounded-xl border border-brand focus:outline-none"
          />
        ) : (
          <button
            onClick={startEdit}
            className="w-20 h-12 text-center bg-zinc-800 rounded-xl text-sm font-bold
              text-white hover:bg-zinc-700 transition-colors tabular-nums"
          >
            {local} <span className="text-zinc-500 text-xs font-normal">{row.unit}</span>
          </button>
        )}

        <button
          onClick={() => adjust(+step)}
          disabled={busy}
          className="w-10 h-12 flex items-center justify-center rounded-xl bg-zinc-800
            text-zinc-300 text-lg font-bold hover:bg-zinc-700 transition-colors
            disabled:opacity-30 active:scale-95"
        >
          +
        </button>
      </div>

      {/* Line cost */}
      <div className="w-16 text-right flex-shrink-0">
        <p className="text-sm font-semibold text-zinc-300 tabular-nums">{fmtB(lineCost)}</p>
      </div>

      {/* Delete */}
      <button
        onClick={async () => {
          if (!confirm(`ลบ ${row.material_name} ออกจากสูตร?`)) return;
          await onDelete(row.id);
        }}
        className="text-zinc-700 hover:text-red-400 transition-colors text-sm px-1 flex-shrink-0"
        title="ลบออกจาก BOM"
      >
        ×
      </button>
    </div>
  );
}

// ── Add-ingredient form ────────────────────────────────────────────────────

function AddIngredient({
  menuId,
  usedIds,
  allMaterials,
  onAdd,
}: {
  menuId: string;
  usedIds: Set<string>;
  allMaterials: MaterialWithStatus[];
  onAdd: () => void;
}) {
  const [open, setOpen]   = useState(false);
  const [matId, setMatId] = useState("");
  const [qty, setQty]     = useState("");
  const [busy, setBusy]   = useState(false);

  const available = allMaterials.filter((m) => !usedIds.has(m.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!matId || !(q > 0)) return;
    setBusy(true);
    await fetch(`/api/admin/menus/${menuId}/bom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: matId, quantity_required: q }),
    });
    setMatId(""); setQty(""); setOpen(false); setBusy(false);
    onAdd();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available.length === 0}
        className="mt-4 w-full py-3 rounded-xl border border-dashed border-zinc-700
          text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-300
          transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        + เพิ่มวัตถุดิบ
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 bg-zinc-900 rounded-xl p-4 space-y-3 ring-1 ring-zinc-700">
      <select
        value={matId}
        onChange={(e) => setMatId(e.target.value)}
        required
        className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
          px-3 py-2.5 focus:outline-none focus:border-brand"
      >
        <option value="">เลือกวัตถุดิบ</option>
        {available.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.unit})
          </option>
        ))}
      </select>

      <div className="flex gap-2 items-center">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="ปริมาณ"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="flex-1 bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
            px-3 py-2.5 focus:outline-none focus:border-brand"
        />
        <span className="text-zinc-500 text-sm">
          {allMaterials.find((m) => m.id === matId)?.unit ?? "หน่วย"}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !matId || !qty}
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

// ── Cost breakdown card ────────────────────────────────────────────────────

function CostBreakdown({ rows, basePrice }: { rows: EnrichedBomRow[]; basePrice: number }) {
  const cogs   = rows.reduce((s, r) => s + r.quantity_required * r.cost_per_unit, 0);
  const profit = basePrice - cogs;
  const margin = basePrice > 0 ? (profit / basePrice) * 100 : 0;

  return (
    <div className="mt-4 bg-zinc-900 rounded-xl p-4 ring-1 ring-zinc-800 space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-zinc-500">COGS (ต้นทุนวัตถุดิบ)</span>
        <span className="text-zinc-200 tabular-nums font-semibold">{fmtB(cogs)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-500">ราคาขาย</span>
        <span className="text-zinc-200 tabular-nums font-semibold">{fmtB(basePrice)}</span>
      </div>
      <div className="border-t border-zinc-800 pt-2 flex justify-between items-baseline">
        <span className="text-zinc-400 font-semibold">กำไรขั้นต้น</span>
        <span className={`text-base font-bold tabular-nums ${marginColor(margin)}`}>
          {fmtB(profit)}{" "}
          <span className="text-sm">({margin.toFixed(1)}%)</span>
        </span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [menus, setMenus]         = useState<AdminMenu[]>([]);
  const [materials, setMaterials] = useState<MaterialWithStatus[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [bomRows, setBomRows]     = useState<EnrichedBomRow[]>([]);
  const [step, setStep]           = useState(10);
  const [loadingBom, setLoadingBom] = useState(false);

  // Cost lookup map: material_id → cost_per_unit
  const costMap = new Map(materials.map((m) => [m.id, m.cost_per_unit]));

  function enrich(rows: BomRow[]): EnrichedBomRow[] {
    return rows.map((r) => {
      const cpu = costMap.get(r.material_id) ?? 0;
      return { ...r, cost_per_unit: cpu, line_cost: r.quantity_required * cpu };
    });
  }

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/menus",  { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/stock",  { cache: "no-store" }).then((r) => r.json()),
    ]).then(([m, s]) => {
      setMenus(m);
      setMaterials(s);
      if (m.length > 0) setSelectedId(m[0].id);
    });
  }, []);

  const fetchBom = useCallback(async (menuId: string) => {
    if (!menuId) return;
    setLoadingBom(true);
    const res = await fetch(`/api/admin/menus/${menuId}/bom`, { cache: "no-store" });
    if (res.ok) {
      const raw: BomRow[] = await res.json();
      // costMap may not be ready yet on first load — enrich in state setter
      setBomRows(raw.map((r) => {
        const cpu = costMap.get(r.material_id) ?? 0;
        return { ...r, cost_per_unit: cpu, line_cost: r.quantity_required * cpu };
      }));
    }
    setLoadingBom(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materials]);

  useEffect(() => { fetchBom(selectedId); }, [selectedId, fetchBom]);

  async function handleQtyChange(bomId: string, qty: number) {
    // Optimistic
    setBomRows((prev) =>
      prev.map((r) =>
        r.id === bomId
          ? { ...r, quantity_required: qty, line_cost: qty * r.cost_per_unit }
          : r,
      ),
    );
    await fetch(`/api/admin/menus/${selectedId}/bom/${bomId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity_required: qty }),
    });
    // Re-fetch to stay in sync
    await fetchBom(selectedId);
  }

  async function handleDelete(bomId: string) {
    await fetch(`/api/admin/menus/${selectedId}/bom/${bomId}`, { method: "DELETE" });
    await fetchBom(selectedId);
  }

  const selectedMenu = menus.find((m) => m.id === selectedId);
  const usedIds = new Set(bomRows.map((r) => r.material_id));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">สูตร (BOM)</h1>

        {/* Step selector */}
        <div className="flex gap-1">
          {[5, 10, 25, 50].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors
                ${step === s
                  ? "bg-brand text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}
            >
              {s}
            </button>
          ))}
          <span className="text-xs text-zinc-700 self-center ml-1">step</span>
        </div>
      </div>

      {/* Menu tabs (scrollable horizontal) */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {menus.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-colors
              ${selectedId === m.id
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"}`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* BOM editor */}
      {selectedMenu && (
        <div className="bg-zinc-950 rounded-2xl p-4 ring-1 ring-zinc-800">
          {/* Menu title + price */}
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-base font-bold text-white">{selectedMenu.name}</p>
            <p className="text-sm font-semibold text-brand">{fmtB(selectedMenu.base_price)}</p>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 mb-1 text-xs text-zinc-600 font-semibold uppercase tracking-widest">
            <span className="flex-1">วัตถุดิบ</span>
            <span className="w-40 text-center">ปริมาณ</span>
            <span className="w-16 text-right">ต้นทุน</span>
            <span className="w-4" />
          </div>

          {/* Rows */}
          {loadingBom ? (
            <p className="text-sm text-zinc-600 py-4 text-center">กำลังโหลด...</p>
          ) : bomRows.length === 0 ? (
            <p className="text-sm text-zinc-600 py-4 text-center">ยังไม่มีส่วนผสม</p>
          ) : (
            bomRows.map((row) => (
              <StepperRow
                key={row.id}
                row={row}
                step={step}
                onQtyChange={handleQtyChange}
                onDelete={handleDelete}
              />
            ))
          )}

          {/* Cost breakdown */}
          {bomRows.length > 0 && (
            <CostBreakdown rows={bomRows} basePrice={selectedMenu.base_price} />
          )}

          {/* Add ingredient */}
          <AddIngredient
            menuId={selectedId}
            usedIds={usedIds}
            allMaterials={materials}
            onAdd={() => fetchBom(selectedId)}
          />
        </div>
      )}
    </div>
  );
}
