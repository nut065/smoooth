import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "./orders";

export type AdminOrderAddon = {
  name: string;
  unit_price: number;
};

export type AdminOrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  menu_name: string;
  addons: AdminOrderAddon[];
};

export type AdminOrder = {
  id: string;
  total_price: number;
  status: OrderStatus;
  payment_slip_url: string | null;
  video_proof_url: string | null;
  created_at: string;
  customer_id: string;
  items: AdminOrderItem[];
};

const ORDER_SELECT = `
  id, total_price, status, payment_slip_url, video_proof_url, created_at, customer_id,
  order_items (
    id, quantity, unit_price,
    menus ( name ),
    order_item_addons ( unit_price, addons ( name ) )
  )
` as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(row: any): AdminOrder {
  return {
    id: row.id,
    total_price: row.total_price,
    status: row.status,
    payment_slip_url: row.payment_slip_url,
    video_proof_url: row.video_proof_url,
    created_at: row.created_at,
    customer_id: row.customer_id,
    items: (row.order_items ?? []).map((oi: any) => ({
      id: oi.id,
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      menu_name: oi.menus?.name ?? "Unknown",
      addons: (oi.order_item_addons ?? []).map((a: any) => ({
        name: a.addons?.name ?? "Unknown",
        unit_price: a.unit_price,
      })),
    })),
  };
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .neq("status", "Completed")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getAdminOrderById(id: string): Promise<AdminOrder | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .single();
  if (error) return null;
  return normalize(data);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function setOrderVideoUrl(id: string, videoUrl: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ video_proof_url: videoUrl })
    .eq("id", id);
  if (error) throw error;
}
