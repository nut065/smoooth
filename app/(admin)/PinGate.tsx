"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PinGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError("PIN ไม่ถูกต้อง");
      setPin("");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-dvh bg-zinc-950 flex items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">🔒</p>
          <h1 className="mt-2 text-lg font-semibold text-white">Admin Panel</h1>
          <p className="mt-1 text-sm text-zinc-400">กรอก PIN เพื่อเข้าสู่ระบบ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
              text-white text-center text-xl tracking-widest placeholder-zinc-600
              focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length === 0}
            className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm
              disabled:opacity-40 hover:bg-green-700 transition-colors"
          >
            {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
