import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminOrderById } from "@/lib/domain/admin-orders";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { AdminOrderActions } from "./AdminOrderActions";
import { VideoUpload } from "./VideoUpload";
import type { OrderStatus } from "@/lib/domain/orders";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 0;

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();

  return (
    <div className="space-y-6 pb-8">
      {/* Back */}
      <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        ← กลับคิว
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 font-mono">#{order.id.slice(0, 8)}</p>
          <p className="text-2xl font-bold text-white mt-0.5">฿{order.total_price}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {new Date(order.created_at).toLocaleString("th-TH", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </div>

      {/* Items */}
      <div className="bg-zinc-900 rounded-2xl divide-y divide-zinc-800">
        {order.items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex justify-between items-baseline">
              <p className="text-sm font-semibold text-zinc-100">
                {item.menu_name}
                {item.quantity > 1 && (
                  <span className="ml-1.5 text-zinc-400 font-normal">×{item.quantity}</span>
                )}
              </p>
              <p className="text-sm text-zinc-300">฿{item.unit_price * item.quantity}</p>
            </div>
            {item.addons.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {item.addons.map((a, i) => (
                  <li key={i} className="flex justify-between text-xs text-zinc-500">
                    <span>+ {a.name}</span>
                    <span>฿{a.unit_price}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Payment slip */}
      {order.payment_slip_url && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            สลิปการชำระ
          </p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.payment_slip_url}
              alt="payment slip"
              className="w-full max-h-64 object-contain"
            />
          </div>
        </div>
      )}

      {/* Video proof */}
      {order.video_proof_url && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
            วิดีโอยืนยัน
          </p>
          <div className="bg-zinc-900 rounded-2xl overflow-hidden">
            <video
              src={order.video_proof_url}
              className="w-full"
              controls
              playsInline
              muted
            />
          </div>
        </div>
      )}

      {/* Status actions + video upload */}
      <AdminOrderActions orderId={order.id} status={order.status as OrderStatus} />

      {order.status !== "Completed" && !order.video_proof_url && (
        <VideoUpload orderId={order.id} />
      )}
    </div>
  );
}
