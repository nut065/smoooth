"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/CartContext";

export function CartIconButton() {
  const { items } = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link href="/cart" aria-label="ตะกร้าสินค้า" className="relative p-2 -mr-2">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 bg-brand text-white text-[10px] font-bold
          w-4 h-4 rounded-full flex items-center justify-center leading-none">
          {count}
        </span>
      )}
    </Link>
  );
}
