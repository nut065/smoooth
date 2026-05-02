import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrderStatus = "Pending" | "Blending" | "Ready" | "Completed";

export type CustomerOrder = {
  id: string;
  total_price: number;
  status: OrderStatus;
  payment_slip_url: string | null;
  video_proof_url: string | null;
  review_score: number | null;
  created_at: string;
};

export async function getCustomerOrders(
  profileId: string,
): Promise<CustomerOrder[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, total_price, status, payment_slip_url, video_proof_url, review_score, created_at",
    )
    .eq("customer_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
