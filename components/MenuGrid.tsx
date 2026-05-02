"use client";

import { useEffect, useRef } from "react";
import { staggeredReveal } from "@/lib/gsap";
import { MenuCard } from "./MenuCard";
import type { MenuWithAvailability } from "@/lib/domain/availability";

type Props = { menus: MenuWithAvailability[] };

export function MenuGrid({ menus }: Props) {
  const mainRef     = useRef<HTMLDivElement>(null);
  const seasonalRef = useRef<HTMLDivElement>(null);

  const mainMenus     = menus.filter((m) => m.status !== "no_ingredients");
  const seasonalMenus = menus.filter((m) => m.status === "no_ingredients");

  useEffect(() => {
    if (document.hidden) return;
    if (mainRef.current?.children.length)
      staggeredReveal(Array.from(mainRef.current.children));
    if (seasonalRef.current?.children.length)
      staggeredReveal(Array.from(seasonalRef.current.children));
  }, []);

  return (
    <div className="space-y-10">
      {/* ── Main grid (active + inactive/sold-out) ─────────────────────── */}
      {mainMenus.length > 0 && (
        <div
          ref={mainRef}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          {mainMenus.map((m, i) => (
            <MenuCard key={m.id} {...m} colorIndex={i} />
          ))}
        </div>
      )}

      {/* ── Seasonal section ───────────────────────────────────────────── */}
      {seasonalMenus.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-100" />
            <p className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">
              นอกฤดูกาล
            </p>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>
          <p className="text-xs text-zinc-400 text-center -mt-2">
            เมนูเหล่านี้ยังไม่มีขายวันนี้ — กด "อยากกินจัง" เพื่อให้ร้านรู้ว่าเราต้องการ 🙏
          </p>
          <div
            ref={seasonalRef}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {seasonalMenus.map((m, i) => (
              <MenuCard key={m.id} {...m} colorIndex={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
