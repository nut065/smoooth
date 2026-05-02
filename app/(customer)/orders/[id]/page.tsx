import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { VideoReview } from "./VideoReview";
import type { OrderStatus } from "@/lib/domain/orders";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 0;

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, total_price, status, video_proof_url, review_score, created_at")
    .eq("id", id)
    .single();

  if (!order) notFound();

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400 font-mono">#{order.id.slice(0, 8)}</p>
          <h1 className="text-xl font-semibold text-zinc-900 mt-0.5">
            ฿{order.total_price}
          </h1>
        </div>
        <OrderStatusBadge status={order.status as OrderStatus} />
      </div>

      {order.video_proof_url ? (
        <VideoReview
          orderId={order.id}
          videoUrl={order.video_proof_url}
          existingScore={order.review_score}
        />
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-zinc-100 py-12 text-center">
          <p className="text-2xl mb-2">
            {order.status === "Blending" ? "🧃" : order.status === "Ready" ? "🥤" : "⏳"}
          </p>
          <p className="text-sm text-zinc-400">
            {order.status === "Blending"
              ? "กำลังปั่น... รอสักครู่"
              : order.status === "Ready"
              ? "พร้อมรับแล้ว!"
              : "รอยืนยันออเดอร์"}
          </p>
        </div>
      )}
    </div>
  );
}
