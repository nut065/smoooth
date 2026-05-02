"use client";

import { useEffect, useState, useRef } from "react";
import type { AdminMenu, MenuStatus } from "@/app/api/admin/menus/route";
import type { BomRow } from "@/app/api/admin/menus/[id]/bom/route";
import type { MaterialWithStatus } from "@/app/api/admin/stock/route";

// ── Status button group config ─────────────────────────────────────────────

const STATUS_BUTTONS: { value: MenuStatus; label: string; cls: string }[] = [
  { value: "active",         label: "เปิดขาย",      cls: "bg-brand text-white" },
  { value: "inactive",       label: "ไม่เปิดขาย",   cls: "bg-zinc-600 text-white" },
  { value: "no_ingredients", label: "ไม่มีวัตถุดิบ", cls: "bg-amber-600 text-white" },
  { value: "hidden",         label: "ซ่อน",          cls: "bg-zinc-800 text-zinc-300" },
];

// When status='active' but cups_remaining=0, effective display = 'inactive'
function effectiveStatus(menu: AdminMenu): MenuStatus {
  if (menu.status === "active" && menu.cups_remaining === 0) return "inactive";
  return menu.status;
}

// ── Inline text/number edit ────────────────────────────────────────────────

function InlineEdit({
  value, type = "text", prefix, onSave, className = "",
}: {
  value: string | number; type?: "text" | "number"; prefix?: string;
  onSave: (v: string) => Promise<void>; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));
  const [saving, setSaving]   = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(String(value)); }, [value]);

  function start() { setDraft(String(value)); setEditing(true); setTimeout(() => ref.current?.select(), 0); }
  async function commit() {
    if (draft === String(value)) { setEditing(false); return; }
    setSaving(true); await onSave(draft); setSaving(false); setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={ref} type={type} value={draft}
        min={type === "number" ? 0 : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        disabled={saving}
        className={`bg-zinc-800 text-white rounded-lg px-2 py-0.5 border border-zinc-600
          focus:outline-none focus:border-brand text-sm disabled:opacity-50 ${className}`}
      />
    );
  }
  return (
    <button onClick={start} className={`text-left group hover:opacity-80 transition-opacity ${className}`}>
      {prefix && <span className="text-zinc-500">{prefix}</span>}
      <span className="border-b border-transparent group-hover:border-zinc-600 transition-colors">{value}</span>
      <span className="ml-1 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity text-xs">✏️</span>
    </button>
  );
}

// ── BOM section ────────────────────────────────────────────────────────────

function BomSection({ menuId, allMaterials }: { menuId: string; allMaterials: MaterialWithStatus[] }) {
  const [rows, setRows]     = useState<BomRow[] | null>(null);
  const [loading, setLoad]  = useState(false);
  const [adding, setAdding] = useState(false);
  const [newMatId, setNMat] = useState("");
  const [newQty, setNQty]   = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchBom() {
    setLoad(true);
    const res = await fetch(`/api/admin/menus/${menuId}/bom`, { cache: "no-store" });
    if (res.ok) setRows(await res.json());
    setLoad(false);
  }

  useEffect(() => { fetchBom(); }, [menuId]);

  async function handleQtyEdit(bomId: string, qty: string) {
    const q = parseFloat(qty);
    if (!(q > 0)) return;
    await fetch(`/api/admin/menus/${menuId}/bom/${bomId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity_required: q }),
    });
    await fetchBom();
  }
  async function handleDelete(bomId: string) {
    if (!confirm("ลบส่วนผสมนี้?")) return;
    await fetch(`/api/admin/menus/${menuId}/bom/${bomId}`, { method: "DELETE" });
    await fetchBom();
  }
  async function handleAdd() {
    const q = parseFloat(newQty);
    if (!newMatId || !(q > 0)) return;
    setSaving(true);
    await fetch(`/api/admin/menus/${menuId}/bom`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: newMatId, quantity_required: q }),
    });
    setAdding(false); setNMat(""); setNQty(""); setSaving(false);
    await fetchBom();
  }

  const usedIds = new Set((rows ?? []).map((r) => r.material_id));
  const available = allMaterials.filter((m) => !usedIds.has(m.id));

  if (loading || rows === null) return <p className="text-xs text-zinc-600 py-2">กำลังโหลด...</p>;

  return (
    <div className="mt-3 ml-1 space-y-1.5">
      {rows.length === 0 && <p className="text-xs text-zinc-600">ยังไม่มีส่วนผสม</p>}
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400 flex-1 truncate">{row.material_name}</span>
          <InlineEdit value={row.quantity_required} type="number"
            onSave={(v) => handleQtyEdit(row.id, v)} className="w-20 text-right" />
          <span className="text-zinc-600 w-5">{row.unit}</span>
          <button onClick={() => handleDelete(row.id)}
            className="text-zinc-700 hover:text-red-400 transition-colors text-xs px-1">×</button>
        </div>
      ))}
      {adding ? (
        <div className="flex items-center gap-2 pt-1">
          <select value={newMatId} onChange={(e) => setNMat(e.target.value)}
            className="flex-1 bg-zinc-800 text-sm text-white border border-zinc-600 rounded-lg px-2 py-1 focus:outline-none focus:border-brand">
            <option value="">เลือกวัตถุดิบ</option>
            {available.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
          </select>
          <input type="number" min="0" step="any" placeholder="ปริมาณ"
            value={newQty} onChange={(e) => setNQty(e.target.value)}
            className="w-20 bg-zinc-800 text-sm text-white border border-zinc-600 rounded-lg px-2 py-1 focus:outline-none focus:border-brand" />
          <button onClick={handleAdd} disabled={saving || !newMatId || !newQty}
            className="text-xs font-semibold text-brand hover:text-green-400 transition-colors disabled:opacity-40">
            บันทึก
          </button>
          <button onClick={() => setAdding(false)} className="text-xs text-zinc-600 hover:text-zinc-400">ยกเลิก</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} disabled={available.length === 0}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          + เพิ่มส่วนผสม
        </button>
      )}
    </div>
  );
}

// ── Menu card ─────────────────────────────────────────────────────────────

function MenuCard({
  menu, allMaterials, onUpdate,
}: {
  menu: AdminMenu;
  allMaterials: MaterialWithStatus[];
  onUpdate: (id: string, patch: Partial<AdminMenu>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy]         = useState(false);

  async function patchMenu(body: Record<string, unknown>) {
    await fetch(`/api/admin/menus/${menu.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleStatus(s: MenuStatus) {
    if (s === menu.status || busy) return;
    setBusy(true);
    onUpdate(menu.id, { status: s });
    await patchMenu({ status: s });
    setBusy(false);
  }

  async function handleNameSave(name: string) { onUpdate(menu.id, { name }); await patchMenu({ name }); }
  async function handlePriceSave(raw: string) {
    const base_price = parseFloat(raw);
    if (isNaN(base_price) || base_price < 0) return;
    onUpdate(menu.id, { base_price }); await patchMenu({ base_price });
  }

  const eff = effectiveStatus(menu);

  // Stock indicator for admin info
  const stockLabel = menu.cups_remaining >= 999
    ? null
    : menu.cups_remaining === 0
    ? { text: "สต็อกหมด", cls: "text-red-400" }
    : menu.cups_remaining < 3
    ? { text: `เหลือ ${menu.cups_remaining} แก้ว`, cls: "text-amber-400" }
    : { text: `เหลือ ${menu.cups_remaining} แก้ว`, cls: "text-brand" };

  const interestLabel = menu.interest_today > 0
    ? `❤️ ${menu.interest_today} อยากกินวันนี้`
    : null;

  return (
    <div className={`bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800 transition-opacity
      ${menu.status === "hidden" ? "opacity-50" : ""}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none flex-shrink-0 mt-0.5">🥤</span>
        <div className="flex-1 min-w-0">
          <InlineEdit value={menu.name} onSave={handleNameSave}
            className="text-sm font-semibold text-zinc-200 w-full" />
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-zinc-500">฿</span>
            <InlineEdit value={menu.base_price} type="number" onSave={handlePriceSave}
              className="text-sm font-bold text-brand" />
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {stockLabel && (
              <span className={`text-xs ${stockLabel.cls}`}>{stockLabel.text}</span>
            )}
            {interestLabel && (
              <span className="text-xs text-pink-400">{interestLabel}</span>
            )}
          </div>
        </div>
      </div>

      {/* Status button group */}
      <div className="mt-3 flex gap-1 flex-wrap">
        {STATUS_BUTTONS.map(({ value, label, cls }) => {
          const isSelected = eff === value;
          return (
            <button
              key={value}
              onClick={() => handleStatus(value)}
              disabled={busy}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50
                ${isSelected ? cls : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
            >
              {label}
            </button>
          );
        })}
        {/* Show "สต็อกหมด" reason when effective != stored */}
        {eff !== menu.status && (
          <span className="text-xs text-zinc-600 self-center ml-1">← สต็อกหมดอัตโนมัติ</span>
        )}
      </div>

      {/* BOM expand */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
        ส่วนผสม
      </button>
      {expanded && <BomSection menuId={menu.id} allMaterials={allMaterials} />}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function MenusPage() {
  const [menus, setMenus]         = useState<AdminMenu[]>([]);
  const [materials, setMaterials] = useState<MaterialWithStatus[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/menus", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/stock", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([m, s]) => { setMenus(m); setMaterials(s); })
      .finally(() => setLoading(false));
  }, []);

  function handleUpdate(id: string, patch: Partial<AdminMenu>) {
    setMenus((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  const openCount = menus.filter((m) => m.status === "active").length;

  if (loading) return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">เมนู</h1>
        <span className="text-xs text-zinc-500">
          เปิดขาย {openCount}/{menus.length} · แตะชื่อหรือราคาเพื่อแก้
        </span>
      </div>

      {menus.length === 0 ? (
        <div className="text-center py-20 text-zinc-600 text-sm">ยังไม่มีเมนู</div>
      ) : (
        <div className="space-y-3">
          {menus.map((m) => (
            <MenuCard key={m.id} menu={m} allMaterials={materials} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
