import { notFound } from "next/navigation";
import { getMenuById } from "@/lib/domain/menus";
import { getAddons } from "@/lib/domain/addons";
import { AddToCartForm } from "./AddToCartForm";

type Props = { params: Promise<{ id: string }> };

export default async function MenuDetailPage({ params }: Props) {
  const { id } = await params;
  const [menu, addons] = await Promise.all([getMenuById(id), getAddons()]);
  if (!menu) notFound();
  return <AddToCartForm menu={menu} addons={addons} />;
}
