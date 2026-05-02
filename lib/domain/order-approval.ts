import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Calls the `approve_order` RPC. Stock deduction for menu BOM + addons
// happens atomically inside that function — if any material would go
// negative the transaction rolls back and this throws.
export async function approveOrder(orderId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("approve_order", {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data;
}
