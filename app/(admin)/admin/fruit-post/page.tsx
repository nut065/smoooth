"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import type { MaterialWithStatus } from "@/app/api/admin/stock/route";
import type { FruitPurchase } from "@/app/api/admin/fruit-post/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt2(n: number) { return n.toFixed(2); }
function fmtStock(n: number, unit: string) {
  return unit === "g" && n >= 1000
    ? `${(n / 1000).toFixed(2)} กก.`
    : `${n % 1 === 0 ? n : n.toFixed(1)} ${unit}`;
}

function generateLinePost(
  matName: string,
  weightG: number,
  yieldPct: number,
  usableG: number,
  costPerG: number,
  unit: string,
  note?: string,
) {
  const weightDisplay = unit === "g" && weightG >= 1000
    ? `${(weightG / 1000).toFixed(2)} กก.`
    : `${weightG} ${unit}`;
  const usableDisplay = fmtStock(usableG, unit);
  const lines = [
    `🌿 วันนี้รับของสด!`,
    ``,
    `🛒 ${matName} ${weightDisplay}`,
    `✂️ yield ${yieldPct}% → ใช้ได้ ${usableDisplay}`,
    `💰 ต้นทุน ${fmt2(costPerG)} บาท/${unit}`,
  ];
  if (note) lines.push(``, `📝 ${note}`);
  lines.push(``, `สั่งสมูทตี้สดๆ ได้เลยนะคะ 🥤`);
  return lines.join("\n");
}

// ── Image compressor (client-side, Canvas API) ─────────────────────────────

async function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("compress failed")), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Photo upload helper ────────────────────────────────────────────────────

async function uploadPhoto(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("file", compressed, "photo.jpg");
  const res = await fetch("/api/admin/fruit-post/photo", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  const { url } = await res.json();
  return url as string;
}

// ── History row ────────────────────────────────────────────────────────────

function HistoryRow({ p }: { p: FruitPurchase }) {
  return (
    <div className="bg-zinc-900 rounded-xl ring-1 ring-zinc-800 overflow-hidden">
      {p.photo_url && (
        <div className="relative w-full h-40">
          <Image
            src={p.photo_url}
            alt={p.material_name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-200">{p.material_name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {p.purchase_date} · {fmtStock(p.weight_g, p.unit)} →{" "}
            ใช้ได้ {fmtStock(p.usable_g, p.unit)}
          </p>
          {p.note && <p className="text-xs text-zinc-600 mt-0.5 truncate">{p.note}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-brand">฿{fmt2(p.cost_per_g)}/{p.unit}</p>
          <p className="text-xs text-zinc-500">yield {p.yield_pct}%</p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function FruitPostPage() {
  const [materials, setMaterials] = useState<MaterialWithStatus[]>([]);
  const [history,   setHistory]   = useState<FruitPurchase[]>([]);
  const [loading,   setLoading]   = useState(true);

  // Form fields
  const [matId,    setMatId]    = useState("");
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [weightG,  setWeightG]  = useState("");
  const [cost,     setCost]     = useState("");
  const [yieldPct, setYieldPct] = useState("100");
  const [note,     setNote]     = useState("");

  // Photo
  const fileRef  = useRef<HTMLInputElement>(null);
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);

  // Post-submit
  const [lineText,   setLineText]   = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  async function fetchData() {
    const [mRes, hRes] = await Promise.all([
      fetch("/api/admin/stock",      { cache: "no-store" }),
      fetch("/api/admin/fruit-post", { cache: "no-store" }),
    ]);
    if (mRes.ok) setMaterials(await mRes.json());
    if (hRes.ok) setHistory(await hRes.json());
  }

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  // ── Live preview ───────────────────────────────────────────────────────────
  const wg       = parseFloat(weightG)  || 0;
  const c        = parseFloat(cost)     || 0;
  const yp       = parseFloat(yieldPct) || 100;
  const usableG  = wg * (yp / 100);
  const costPerG = usableG > 0 ? c / usableG : 0;
  const selMat   = useMemo(() => materials.find((m) => m.id === matId), [materials, matId]);
  const canSubmit = matId && wg > 0 && c >= 0 && yp > 0 && yp <= 100 && !submitting;

  // ── Photo pick ─────────────────────────────────────────────────────────────
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    let photo_url: string | undefined;
    if (photoFile) {
      setUploading(true);
      try {
        photo_url = await uploadPhoto(photoFile);
      } catch {
        setError("อัปโหลดรูปไม่สำเร็จ ลองใหม่");
        setSubmitting(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const res = await fetch("/api/admin/fruit-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_id:   matId,
        purchase_date: date,
        weight_g:      wg,
        total_cost:    c,
        yield_pct:     yp,
        note:          note.trim() || undefined,
        photo_url,
      }),
    });

    if (!res.ok) {
      setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      setSubmitting(false);
      return;
    }

    setLineText(generateLinePost(selMat!.name, wg, yp, usableG, costPerG, selMat!.unit, note.trim() || undefined));
    setMatId(""); setWeightG(""); setCost(""); setYieldPct("100"); setNote("");
    removePhoto();
    setSubmitting(false);
    await fetchData();
  }

  async function copyLine() {
    if (!lineText) return;
    await navigator.clipboard.writeText(lineText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p className="text-center text-zinc-500 pt-16 text-sm">กำลังโหลด...</p>;

  return (
    <div className="space-y-8 pb-12">
      <h1 className="text-xl font-bold text-white">Fruit Post</h1>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Material */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">วัตถุดิบ</label>
          <select
            value={matId} onChange={(e) => setMatId(e.target.value)} required
            className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
          >
            <option value="">เลือกวัตถุดิบ...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (สต็อกปัจจุบัน {fmtStock(m.current_stock, m.unit)})
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">วันที่ซื้อ</label>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)} required
            className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
          />
        </div>

        {/* Weight + Cost */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
              น้ำหนัก ({selMat?.unit ?? "g"})
            </label>
            <input
              type="number" inputMode="decimal" min="0" step="any" placeholder="0"
              value={weightG} onChange={(e) => setWeightG(e.target.value)} required
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">ราคา (฿)</label>
            <input
              type="number" inputMode="decimal" min="0" step="any" placeholder="0"
              value={cost} onChange={(e) => setCost(e.target.value)} required
              className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Yield */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            Yield % <span className="text-zinc-600 normal-case font-normal">(% ที่ใช้ได้หลังตัดแต่ง)</span>
          </label>
          <div className="flex items-center gap-3">
            <input type="range" min="1" max="100" value={yieldPct} onChange={(e) => setYieldPct(e.target.value)} className="flex-1 accent-brand" />
            <input
              type="number" inputMode="decimal" min="1" max="100"
              value={yieldPct} onChange={(e) => setYieldPct(e.target.value)}
              className="w-16 bg-zinc-900 text-white border border-zinc-700 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:border-brand"
            />
            <span className="text-zinc-500 text-sm">%</span>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            โน้ต <span className="text-zinc-600 normal-case font-normal">(ไม่บังคับ)</span>
          </label>
          <input
            type="text" placeholder="เช่น ของวันนี้หวานมาก 🍌"
            value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full bg-zinc-900 text-white border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand"
          />
        </div>

        {/* Photo upload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">
            รูปภาพ <span className="text-zinc-600 normal-case font-normal">(ไม่บังคับ · ลูกค้าจะเห็น)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {photoPreview ? (
            <div className="relative">
              <div className="relative w-full h-48 rounded-2xl overflow-hidden ring-1 ring-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7
                  flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-32 rounded-2xl border-2 border-dashed border-zinc-700
                flex flex-col items-center justify-center gap-2
                text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs">แตะเพื่อถ่าย / เลือกรูป</span>
            </button>
          )}
        </div>

        {/* Live preview */}
        {selMat && wg > 0 && (
          <div className="bg-zinc-900/60 rounded-xl p-4 ring-1 ring-zinc-800 space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">ตัวอย่างก่อนบันทึก</p>
            <div className="flex justify-between">
              <span className="text-zinc-400">น้ำหนักที่ใช้ได้</span>
              <span className="text-white font-semibold">{fmtStock(usableG, selMat.unit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">ต้นทุนต่อหน่วย</span>
              <span className="text-brand font-bold">฿{fmt2(costPerG)} /{selMat.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">สต็อกหลังเติม</span>
              <span className="text-white font-semibold">
                {fmtStock(selMat.current_stock, selMat.unit)}
                <span className="text-zinc-500"> → </span>
                {fmtStock(selMat.current_stock + usableG, selMat.unit)}
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-brand text-white font-bold py-4 rounded-2xl text-sm
            hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {uploading ? "กำลังอัปโหลดรูป..." : submitting ? "กำลังบันทึก..." : "บันทึก + อัปสต็อก"}
        </button>
      </form>

      {/* ── LINE post result ─────────────────────────────────────────────── */}
      {lineText && (
        <div className="bg-[#06C755]/10 border border-[#06C755]/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#06C755]">LINE Post พร้อมส่ง</p>
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">{lineText}</pre>
          <button
            onClick={copyLine}
            className="w-full py-3 rounded-xl bg-[#06C755] text-white text-sm font-bold hover:bg-[#05b34a] transition-colors"
          >
            {copied ? "คัดลอกแล้ว ✓" : "คัดลอกข้อความ"}
          </button>
        </div>
      )}

      {/* ── History ──────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">ประวัติล่าสุด</p>
          {history.map((p) => <HistoryRow key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}
