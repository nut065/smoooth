"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { CustomerOrder } from "@/lib/domain/orders";

const DEV_PROFILE_ID = "44444444-0000-0000-0000-000000000001";

function getProfileId(): string {
  if (typeof window === "undefined") return DEV_PROFILE_ID;
  return localStorage.getItem("smoothie_profile_id") ?? DEV_PROFILE_ID;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const profileId = getProfileId();
    try {
      const res = await fetch(`/api/orders?profileId=${profileId}`, {
        cache: "no-store",
      });
      if (res.ok) setOrders(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchOrders().finally(() => setLoading(false));

    // Poll every 3s — satisfies "status update within 2s" DoD without Supabase
    // realtime auth complexity. Upgrade to realtime once LIFF auth is wired.
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="flex justify-center pt-16 text-zinc-400 text-sm">
        กำลังโหลด...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <span className="text-5xl">🧾</span>
        <p className="text-zinc-500 text-sm">ยังไม่มีออเดอร์</p>
        <Link href="/" className="text-sm text-zinc-900 underline underline-offset-4">
          เลือกเมนู
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-xl font-semibold text-zinc-900">ออเดอร์ของฉัน</h1>

      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id}>
            <Link
              href={`/orders/${order.id}`}
              className="block bg-white rounded-2xl border border-zinc-100 p-4
                hover:border-zinc-200 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400 font-mono truncate">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-base font-semibold text-zinc-900 mt-0.5">
                    ฿{order.total_price}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {new Date(order.created_at).toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
