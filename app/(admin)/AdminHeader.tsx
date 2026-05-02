"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/dashboard",   label: "ภาพรวม" },
  { href: "/admin",             label: "คิว" },
  { href: "/admin/orders",      label: "ประวัติ" },
  { href: "/admin/menus",       label: "เมนู" },
  { href: "/admin/addons",      label: "Add-ons" },
  { href: "/admin/recipes",     label: "สูตร" },
  { href: "/admin/stock",       label: "สต็อก" },
  { href: "/admin/fruit-post",  label: "Fruit Post" },
  { href: "/admin/waste-log",   label: "ของเสีย" },
  { href: "/admin/daily-close", label: "ปิดวัน" },
  { href: "/admin/settings",    label: "ตั้งค่า" },
];

export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-800">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <span className="text-xs font-bold tracking-widest uppercase text-zinc-500 flex-shrink-0">
          Craft Smoothie
        </span>

        {/* Nav */}
        <nav className="flex gap-1 flex-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
                  ${active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
        >
          ออก
        </button>
      </div>
    </header>
  );
}
