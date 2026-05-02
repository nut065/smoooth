"use client";

import { useEffect, useState } from "react";
import type { ShopSettings } from "@/app/api/admin/settings/route";

// ── Setting row ────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  settingKey,
  value,
  type = "text",
  placeholder,
  onSave,
}: {
  label: string;
  description: string;
  settingKey: keyof ShopSettings;
  value: string;
  type?: "text" | "password" | "url";
  placeholder?: string;
  onSave: (key: keyof ShopSettings, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);

  async function commit() {
    if (draft === value) { setEditing(false); return; }
    setBusy(true);
    await onSave(settingKey, draft);
    setBusy(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-4 ring-1 ring-zinc-800 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">{label}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{description}</p>
        </div>
        {saved && <span className="text-xs text-green-400">บันทึกแล้ว ✓</span>}
      </div>

      {editing ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type={type}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(value); setEditing(false); }
            }}
            className="flex-1 bg-zinc-800 text-white text-sm border border-brand rounded-xl
              px-3 py-2 focus:outline-none"
          />
          <button
            onClick={commit}
            disabled={busy}
            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl
              hover:bg-green-700 transition-colors disabled:opacity-40"
          >
            {busy ? "..." : "บันทึก"}
          </button>
          <button
            onClick={() => { setDraft(value); setEditing(false); }}
            className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-left group"
        >
          <span className={`text-sm font-mono rounded-lg px-3 py-2 block
            bg-zinc-800 text-zinc-300 group-hover:ring-1 group-hover:ring-zinc-600
            transition-all`}
          >
            {type === "password"
              ? "•".repeat(Math.min(value.length, 8))
              : value || <span className="text-zinc-600">{placeholder ?? "ยังไม่ได้ตั้งค่า"}</span>
            }
            <span className="ml-2 text-[10px] text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
              ✏️ แก้ไข
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(key: keyof ShopSettings, value: string) {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  if (loading || !settings) {
    return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;
  }

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">ตั้งค่าร้าน</h1>
      </div>

      <p className="text-xs text-zinc-600">แตะช่องเพื่อแก้ไข · บันทึกมีผลทันที</p>

      <SettingRow
        label="ชื่อร้าน"
        description="แสดงในส่วนหัวและข้อความ LINE"
        settingKey="shop_name"
        value={settings.shop_name}
        placeholder="เช่น Craft Smoothie"
        onSave={handleSave}
      />

      <SettingRow
        label="PIN เข้าแอดมิน"
        description="เปลี่ยนแล้วต้องล็อกอินใหม่"
        settingKey="admin_pin"
        value={settings.admin_pin}
        type="password"
        placeholder="4 ตัวเลข"
        onSave={handleSave}
      />

      <SettingRow
        label="URL รูป QR PromptPay"
        description="ใช้แสดงในหน้าชำระเงินของลูกค้า"
        settingKey="promptpay_qr_url"
        value={settings.promptpay_qr_url}
        type="url"
        placeholder="https://..."
        onSave={handleSave}
      />

      {/* PIN change warning */}
      <div className="bg-amber-900/20 border border-amber-800/40 rounded-2xl p-4">
        <p className="text-xs text-amber-400 font-semibold">⚠️ หมายเหตุเรื่อง PIN</p>
        <p className="text-xs text-amber-500/80 mt-1 leading-relaxed">
          เมื่อเปลี่ยน PIN แล้ว เซสชันที่เปิดอยู่ทุกหน้าต้องล็อกอินใหม่
          เพราะคุกกี้ยังคงใช้ PIN เก่า
        </p>
      </div>
    </div>
  );
}
