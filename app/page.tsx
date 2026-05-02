import Link from "next/link";
import { CartIconButton } from "@/components/CartIconButton";
import { MenuGrid } from "@/components/MenuGrid";
import { FruitGallery } from "@/components/FruitGallery";
import { getMenusWithAvailability } from "@/lib/domain/availability";

export const revalidate = 30;

export default async function MenuListPage() {
  const menus = await getMenusWithAvailability();
  const available = menus.filter((m) => m.available).length;

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-30 bg-[#fffef9]/90 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-zinc-900">
            🌿 Craft Smoothie
          </span>
          <CartIconButton />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            เมนู<span className="text-brand">วันนี้</span>
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {available} เมนูพร้อมให้บริการ · จำกัด 15–20 แก้ว/วัน
          </p>
        </div>

        {menus.length === 0 ? (
          <p className="text-center text-zinc-500 mt-16">หมดทุกเมนูแล้ววันนี้ 🌿</p>
        ) : (
          <MenuGrid menus={menus} />
        )}

        <FruitGallery />

        <nav className="mt-10 flex justify-center">
          <Link
            href="/orders"
            className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-700 transition-colors"
          >
            ดูออเดอร์ของฉัน
          </Link>
        </nav>
      </main>
    </div>
  );
}
