"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CartItem } from "@/lib/cart/CartContext";

export async function createOrder(
  profileId: string,
  items: CartItem[],
): Promise<string> {
  const supabase = createAdminClient();

  const total = items.reduce(
    (sum, item) =>
      sum +
      (item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0)) *
        item.quantity,
    0,
  );

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({ customer_id: profileId, total_price: total, status: "Pending" })
    .select("id")
    .single();
  if (orderErr) throw orderErr;

  for (const item of items) {
    const { data: oi, error: oiErr } = await supabase
      .from("order_items")
      .insert({
        order_id: order.id,
        menu_id: item.menuId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })
      .select("id")
      .single();
    if (oiErr) throw oiErr;

    if (item.addons.length > 0) {
      const { error: addonErr } = await supabase
        .from("order_item_addons")
        .insert(
          item.addons.map((a) => ({
            order_item_id: oi.id,
            addon_id: a.addonId,
            quantity: 1,
            unit_price: a.price,
          })),
        );
      if (addonErr) throw addonErr;
    }
  }

  return order.id;
}

export async function uploadSlip(formData: FormData): Promise<void> {
  const orderId = formData.get("orderId") as string;
  const file = formData.get("file") as File;
  if (!orderId || !file) throw new Error("missing fields");

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${orderId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("payment-slips")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;

  const { error: dbErr } = await supabase
    .from("orders")
    .update({ payment_slip_url: path })
    .eq("id", orderId);
  if (dbErr) throw dbErr;
}
