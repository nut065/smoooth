import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { SeasonalCard } from "./SeasonalCard";
import type { MenuStatus } from "@/lib/domain/availability";

const TINTS = [
  "#dcfce7", // mint
  "#fef9c3", // lemon
  "#fce7f3", // blush
  "#e0f2fe", // sky
  "#fff7ed", // peach
];

type Props = {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  status: MenuStatus;
  cups_remaining: number;
  available: boolean;
  interest_today: number;
  colorIndex?: number;
};

export function MenuCard({
  id, name, base_price, image_url,
  status, cups_remaining, available,
  interest_today, colorIndex = 0,
}: Props) {
  const tint = TINTS[colorIndex % TINTS.length];

  // ── Derived display state ────────────────────────────────────────────────
  const isLow     = available && cups_remaining < 3 && cups_remaining < 999;
  const isSoldOut = (status === "active" && cups_remaining === 0) || status === "inactive";
  const isSeasonal = status === "no_ingredients";
  const dimmed    = isSoldOut || isSeasonal;

  // ── Shared image block ───────────────────────────────────────────────────
  const imageBlock = (
    <div className="relative aspect-square" style={{ backgroundColor: image_url ? undefined : tint }}>
      {image_url ? (
        <Image
          src={image_url}
          alt={name}
          fill
          className={`object-cover transition-transform duration-500 group-hover:scale-105
            ${dimmed ? "grayscale" : ""}`}
          sizes="(max-width: 640px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-5xl select-none">🥤</div>
      )}

      {/* Low-stock badge */}
      {isLow && (
        <div className="absolute top-2 right-2">
          <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            เหลือ {cups_remaining} แก้ว
          </span>
        </div>
      )}

      {/* Sold-out overlay */}
      {isSoldOut && (
        <div className="absolute inset-0 flex items-end justify-center pb-3">
          <span className="bg-zinc-800/75 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            Sold out
          </span>
        </div>
      )}

      {/* Seasonal overlay */}
      {isSeasonal && (
        <div className="absolute inset-0 bg-zinc-900/20 flex items-end justify-center pb-3">
          <span className="bg-zinc-700/80 text-zinc-200 text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            นอกฤดูกาล
          </span>
        </div>
      )}
    </div>
  );

  const caption = (
    <div className="p-3 pb-3">
      <p className={`text-sm font-bold leading-snug ${dimmed ? "text-zinc-400" : "text-zinc-900"}`}>
        {name}
      </p>
      <p className={`mt-1 text-sm font-semibold ${dimmed ? "text-zinc-400" : "text-brand"}`}>
        ฿{base_price}
      </p>
    </div>
  );

  // ── Seasonal → client component with interest button ─────────────────────
  if (isSeasonal) {
    return (
      <SeasonalCard
        id={id}
        imageBlock={imageBlock}
        caption={caption}
        interestToday={interest_today}
      />
    );
  }

  // ── Sold-out / inactive ──────────────────────────────────────────────────
  if (isSoldOut) {
    return (
      <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 opacity-60 cursor-not-allowed">
        <ViewTransition name={`menu-${id}`}>{imageBlock}</ViewTransition>
        {caption}
      </div>
    );
  }

  // ── Orderable ────────────────────────────────────────────────────────────
  return (
    <Link href={`/menu/${id}`} transitionTypes={["nav-forward"]}>
      <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer">
        <ViewTransition name={`menu-${id}`}>{imageBlock}</ViewTransition>
        {caption}
      </div>
    </Link>
  );
}
