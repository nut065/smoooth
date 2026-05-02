"use client";

import { useEffect, useState } from "react";
import type { AdminAddon } from "@/app/api/admin/addons/route";
import type { MaterialWithStatus } from "@/app/api/admin/stock/route";

// ── Inline edit helper ─────────────────────────────────────────────────────

function InlineEdit({
  value, type = "text", prefix, onSave, className = "",
}: {
  value: string | number; type?: "text" | "number"; prefix?: string;
  onSave: (v: string) => Promise<void>; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  async function commit() {
    if (draft !== String(value)) await onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        min={type === "number" ? 0 : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={`bg-zinc-800 text-white rounded-lg px-2 py-0.5 border border-brand
          focus:outline-none text-sm ${className}`}
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className={`text-left group ${className}`}>
      {prefix && <span className="text-zinc-500">{prefix}</span>}
      <span className="border-b border-transparent group-hover:border-zinc-600 transition-colors">{value}</span>
      <span className="ml-1 text-[10px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
    </button>
  );
}

// ── Addon card ─────────────────────────────────────────────────────────────

function AddonCard({
  addon, materials, onUpdate, onDelete,
}: {
  addon: AdminAddon;
  materials: MaterialWithStatus[];
  onUpdate: (id: string, patch: Partial<AdminAddon>) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/admin/addons/${addon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleToggle() {
    setToggling(true);
    const next = !addon.is_active;
    onUpdate(addon.id, { is_active: next });
    await patch({ is_active: next });
    setToggling(false);
  }

  async function handleDelete() {
    if (!confirm(`ลบ "${addon.name}"? ถ้ามีออเดอร์ที่ใช้ add-on นี้อยู่จะลบไม่ได้`)) return;
    setDeleting(true);
    await onDelete(addon.id);
    setDeleting(false);
  }

  return (
    <div className={`bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800 transition-opacity
      ${!addon.is_active ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* Name */}
          <InlineEdit
            value={addon.name}
            onSave={async (v) => { onUpdate(addon.id, { name: v }); await patch({ name: v }); }}
            className="text-sm font-semibold text-zinc-200"
          />
          {/* Price */}
          <div className="flex items-center gap-1">
            <InlineEdit
              value={addon.price}
              type="number"
              prefix="฿"
              onSave={async (v) => {
                const p = parseFloat(v);
                if (!isNaN(p) && p >= 0) { onUpdate(addon.id, { price: p }); await patch({ price: p }); }
              }}
              className="text-sm font-bold text-brand"
            />
          </div>
          {/* Material link */}
          {addon.material_name ? (
            <p className="text-xs text-zinc-600">
              🔗 {addon.material_name} {addon.quantity_per_serving} {addon.unit}/แก้ว
            </p>
          ) : (
            <p className="text-xs text-zinc-700">ไม่หักสต็อก</p>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex-shrink-0 w-10 h-6 rounded-full relative transition-colors
            ${addon.is_active ? "bg-brand" : "bg-zinc-700"} disabled:opacity-50`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all
            ${addon.is_active ? "left-5" : "left-1"}`}
          />
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-zinc-700 hover:text-red-400 transition-colors text-sm px-1 flex-shrink-0 self-center"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

// ── Add addon form ─────────────────────────────────────────────────────────

function AddAddonForm({
  materials, onAdd,
}: { materials: MaterialWithStatus[]; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [matId, setMatId] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    if (!name.trim() || isNaN(p) || p < 0) return;
    setBusy(true);
    await fetch("/api/admin/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        price: p,
        material_id: matId || null,
        quantity_per_serving: qty ? parseFloat(qty) : null,
      }),
    });
    setName(""); setPrice(""); setMatId(""); setQty("");
    setOpen(false); setBusy(false);
    onAdd();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl border border-dashed border-zinc-700
          text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
      >
        + เพิ่ม Add-on ใหม่
      </button>
    );
  }

  const selMat = materials.find((m) => m.id === matId);

  return (
    <form onSubmit={submit} className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-700 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Add-on ใหม่</p>

      <input
        type="text" required placeholder="ชื่อ เช่น Extra Honey"
        value={name} onChange={(e) => setName(e.target.value)}
        className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
          px-3 py-2.5 focus:outline-none focus:border-brand"
      />

      <div className="flex gap-2 items-center">
        <span className="text-zinc-500 text-sm">฿</span>
        <input
          type="number" inputMode="decimal" min="0" step="any" required
          placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)}
          className="flex-1 bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
            px-3 py-2.5 focus:outline-none focus:border-brand"
        />
      </div>

      {/* Optional material link */}
      <div className="space-y-2">
        <p className="text-xs text-zinc-600">เชื่อมวัตถุดิบ (ถ้าต้องหักสต็อก)</p>
        <select
          value={matId} onChange={(e) => setMatId(e.target.value)}
          className="w-full bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
            px-3 py-2.5 focus:outline-none focus:border-brand"
        >
          <option value="">ไม่เชื่อม (เช่น Less Ice)</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
          ))}
        </select>
        {matId && (
          <div className="flex gap-2 items-center">
            <input
              type="number" inputMode="decimal" min="0" step="any"
              placeholder={`ปริมาณต่อแก้ว (${selMat?.unit ?? "หน่วย"})`}
              value={qty} onChange={(e) => setQty(e.target.value)}
              className="flex-1 bg-zinc-800 text-white text-sm border border-zinc-700 rounded-xl
                px-3 py-2.5 focus:outline-none focus:border-brand"
            />
            <span className="text-zinc-500 text-sm">{selMat?.unit}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={busy}
          className="flex-1 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl
            hover:bg-green-700 transition-colors disabled:opacity-40">
          {busy ? "..." : "เพิ่ม"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AddonsPage() {
  const [addons, setAddons] = useState<AdminAddon[]>([]);
  const [materials, setMaterials] = useState<MaterialWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [aRes, mRes] = await Promise.all([
      fetch("/api/admin/addons", { cache: "no-store" }),
      fetch("/api/admin/stock",  { cache: "no-store" }),
    ]);
    if (aRes.ok) setAddons(await aRes.json());
    if (mRes.ok) setMaterials(await mRes.json());
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  function handleUpdate(id: string, patch: Partial<AdminAddon>) {
    setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/addons/${id}`, { method: "DELETE" });
    if (!res.ok) { alert("ลบไม่ได้ — อาจมีออเดอร์ที่ใช้ add-on นี้อยู่"); return; }
    await fetchData();
  }

  const active   = addons.filter((a) => a.is_active).length;
  const inactive = addons.length - active;

  if (loading) return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Add-ons</h1>
        <span className="text-xs text-zinc-500">
          เปิด {active}{inactive > 0 ? ` · ปิด ${inactive}` : ""}
        </span>
      </div>

      <p className="text-xs text-zinc-600">
        แตะชื่อหรือราคาเพื่อแก้ · สวิตช์ = เปิด/ปิดให้ลูกค้าเห็น
      </p>

      {addons.length === 0 ? (
        <p className="text-center text-zinc-600 text-sm py-10">ยังไม่มี add-on</p>
      ) : (
        <div className="space-y-3">
          {addons.map((a) => (
            <AddonCard
              key={a.id} addon={a} materials={materials}
              onUpdate={handleUpdate} onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AddAddonForm materials={materials} onAdd={fetchData} />
    </div>
  );
}
