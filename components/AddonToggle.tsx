"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";

type Props = {
  id: string;
  name: string;
  price: number;
  selected: boolean;
  onToggle: () => void;
};

export function AddonToggle({ name, price, selected, onToggle }: Props) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick() {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { scale: 0.92 },
        { scale: 1, duration: 0.25, ease: "back.out(2)" },
      );
    }
    onToggle();
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm transition-colors
        ${selected
          ? "border-brand bg-brand text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-brand/40"
        }`}
    >
      <span className="font-medium">{name}</span>
      <span className={selected ? "text-green-200" : "text-zinc-400"}>
        +฿{price}
      </span>
    </button>
  );
}
