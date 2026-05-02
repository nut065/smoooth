"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/lib/cart/CartContext";
import { createOrder, uploadSlip } from "@/app/actions/orders";
import { upsertProfile } from "@/app/actions/profiles";
import { getProfile } from "@/lib/liff";

type Step = "review" | "payment" | "uploading" | "done";

const DEV_LINE_ID = "U_dev_customer";

export default function CartPage() {
  const { items, removeItem, clear, total } = useCart();
  const [step, setStep] = useState<Step>("review");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptpayQr, setPromptpayQr] = useState<string | null>(
    process.env.NEXT_PUBLIC_PROMPTPAY_QR_URL ?? null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Fetch DB-driven QR URL when entering payment step
  useEffect(() => {
    if (step !== "payment") return;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { if (d.promptpay_qr_url) setPromptpayQr(d.promptpay_qr_url); })
      .catch(() => {/* keep env fallback */});
  }, [step]);

  async function handlePlaceOrder() {
    setError(null);
    try {
      // Get or create profile from LIFF (falls back to dev profile)
      let lineUserId = DEV_LINE_ID;
      let displayName = "Dev Customer";
      let avatarUrl: string | null = null;

      try {
        const profile = await getProfile();
        if (profile) {
          lineUserId = profile.userId;
          displayName = profile.displayName;
          avatarUrl = profile.pictureUrl ?? null;
        }
      } catch {
        // Running outside LIFF — use dev profile
      }

      const profileId = await upsertProfile(lineUserId, displayName, avatarUrl);
      const id = await createOrder(profileId, items);
      setOrderId(id);
      setStep("payment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  }

  async function handleSlipUpload(file: File) {
    if (!orderId) return;
    setStep("uploading");
    const fd = new FormData();
    fd.append("orderId", orderId);
    fd.append("file", file);
    try {
      await uploadSlip(fd);
      clear();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดสลิปไม่สำเร็จ");
      setStep("payment");
    }
  }

  // ── done ───────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <span className="text-5xl">🎉</span>
        <h2 className="text-xl font-semibold text-zinc-900">ส่งออเดอร์แล้ว!</h2>
        <p className="text-sm text-zinc-500">ติดตามสถานะได้ที่หน้าออเดอร์</p>
        <button
          onClick={() => router.push("/orders")}
          className="mt-2 bg-zinc-900 text-white px-8 py-3 rounded-full text-sm font-medium"
        >
          ดูออเดอร์ของฉัน
        </button>
      </div>
    );
  }

  // ── empty cart ─────────────────────────────────────────────────────
  if (items.length === 0 && step === "review") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <span className="text-5xl">🛒</span>
        <p className="text-zinc-500 text-sm">ตะกร้าว่างเปล่า</p>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-zinc-900 underline underline-offset-4"
        >
          กลับเลือกเมนู
        </button>
      </div>
    );
  }

  // ── payment ────────────────────────────────────────────────────────
  if (step === "payment" || step === "uploading") {
    return (
      <div className="space-y-6 pb-8">
        <h1 className="text-xl font-semibold text-zinc-900">ชำระเงิน</h1>

        <div className="bg-white rounded-2xl border border-zinc-100 p-4 text-center space-y-3">
          <p className="text-sm text-zinc-500">สแกน QR PromptPay</p>
          {promptpayQr ? (
            <Image
              src={promptpayQr}
              alt="PromptPay QR"
              width={200}
              height={200}
              className="mx-auto rounded-xl"
            />
          ) : (
            <div className="mx-auto w-48 h-48 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 text-sm">
              [QR Code]
              <br />
              ตั้งค่า NEXT_PUBLIC_PROMPTPAY_QR_URL
            </div>
          )}
          <p className="text-2xl font-semibold text-zinc-900">฿{total}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-zinc-700">แนบสลิปการชำระเงิน</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSlipUpload(file);
            }}
          />
          <button
            disabled={step === "uploading"}
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-zinc-300 rounded-2xl py-8
              text-sm text-zinc-400 transition-colors hover:border-zinc-400
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === "uploading" ? "กำลังอัปโหลด..." : "แตะเพื่อเลือกรูปสลิป"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  // ── review ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-xl font-semibold text-zinc-900">ตะกร้า</h1>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.lineId}
            className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{item.menuName}</p>
              {item.addons.length > 0 && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  + {item.addons.map((a) => a.name).join(", ")}
                </p>
              )}
              <p className="text-sm text-zinc-500 mt-1">
                ฿{item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)}
              </p>
            </div>
            <button
              onClick={() => removeItem(item.lineId)}
              className="text-zinc-300 hover:text-zinc-500 transition-colors p-1"
              aria-label="ลบรายการ"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="bg-white rounded-2xl border border-zinc-100 p-4 flex justify-between items-center">
        <span className="text-sm text-zinc-500">รวมทั้งหมด</span>
        <span className="text-lg font-semibold text-zinc-900">฿{total}</span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handlePlaceOrder}
        className="w-full bg-zinc-900 text-white py-4 rounded-2xl text-sm font-medium
          transition-transform active:scale-95"
      >
        สั่งซื้อ · ฿{total}
      </button>
    </div>
  );
}
