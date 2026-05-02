"use client";

import { useState } from "react";

export function SeasonalCard({
  id,
  imageBlock,
  caption,
  interestToday,
}: {
  id: string;
  imageBlock: React.ReactNode;
  caption: React.ReactNode;
  interestToday: number;
}) {
  const storageKey = `interest_${id}_${new Date().toISOString().slice(0, 10)}`;
  const [tapped, setTapped] = useState(
    typeof window !== "undefined" && !!localStorage.getItem(storageKey),
  );
  const [count, setCount] = useState(interestToday);

  async function handleInterest() {
    if (tapped) return;
    setTapped(true);
    setCount((c) => c + 1);
    localStorage.setItem(storageKey, "1");
    try {
      const res = await fetch(`/api/menus/${id}/interest`, { method: "POST" });
      if (res.ok) {
        const { count: serverCount } = await res.json();
        setCount(serverCount);
      }
    } catch {
      // keep optimistic count on network error
    }
  }

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100 opacity-70">
      {imageBlock}
      {caption}
      <div className="px-3 pb-4">
        <button
          onClick={handleInterest}
          disabled={tapped}
          className={`w-full py-2 rounded-xl text-xs font-semibold transition-all
            ${tapped
              ? "bg-zinc-100 text-zinc-400 cursor-default"
              : "bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95"
            }`}
        >
          {tapped ? `อยากกินจัง ❤️ (${count})` : "อยากกินจัง 🙏"}
        </button>
      </div>
    </div>
  );
}
