"use client";

import { useRef, useState, useEffect } from "react";
import { gsap } from "@/lib/gsap";

type Props = {
  orderId: string;
  videoUrl: string;
  existingScore: number | null;
};

export function VideoReview({ orderId, videoUrl, existingScore }: Props) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [rating, setRating] = useState(existingScore ?? 0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(!!existingScore);
  const [busy, setBusy] = useState(false);

  const panelRef  = useRef<HTMLDivElement>(null);
  const starRefs  = useRef<(HTMLButtonElement | null)[]>([]);
  const submitRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  // ── Animate panel in after video ends (or immediately if already reviewed) ──
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || (!videoEnded && !existingScore)) return;

    gsap.set(successRef.current, { opacity: 0, scale: 0.5, y: 20 });

    if (existingScore) {
      // Already reviewed — show panel without animation
      gsap.set(panel, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    // Video just ended — cinematic reveal
    const tl = gsap.timeline();
    tl.fromTo(panel,
      { opacity: 0, y: 56, scale: 0.93 },
      { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)" }
    )
    .from(
      starRefs.current.filter(Boolean),
      { opacity: 0, y: 28, scale: 0.3, stagger: 0.09, duration: 0.42, ease: "back.out(2.8)" },
      "-=0.28"
    )
    .from(submitRef.current,
      { opacity: 0, y: 12, duration: 0.28, ease: "power3.out" },
      "-=0.12"
    );
  }, [videoEnded, existingScore]);

  // ── Star interactions ──────────────────────────────────────────────────────
  function onStarEnter(i: number) {
    if (submitted) return;
    setHovered(i);
    const el = starRefs.current[i - 1];
    if (el) gsap.to(el, { scale: 1.38, duration: 0.14, ease: "power2.out" });
  }

  function onStarLeave(i: number) {
    if (submitted) return;
    setHovered(0);
    const el = starRefs.current[i - 1];
    if (el) gsap.to(el, { scale: 1, duration: 0.1 });
  }

  function onStarClick(i: number) {
    if (submitted) return;
    setRating(i);

    // Bounce selected stars in sequence
    const selected = starRefs.current.slice(0, i).filter(Boolean);
    gsap.fromTo(selected,
      { scale: 1.8 },
      { scale: 1, stagger: 0.06, duration: 0.48, ease: "back.out(2.2)" }
    );
    // Snap unselected back
    const rest = starRefs.current.slice(i).filter(Boolean);
    gsap.to(rest, { scale: 1, duration: 0.1 });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!rating || busy || submitted) return;
    setBusy(true);

    await fetch(`/api/orders/${orderId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: rating }),
    });

    // Button exits → success pops in
    const tl = gsap.timeline({ onComplete: () => setSubmitted(true) });
    tl.to(submitRef.current, { scale: 0.7, opacity: 0, duration: 0.18 })
      .fromTo(
        successRef.current,
        { scale: 0.4, opacity: 0, y: 16 },
        { scale: 1, opacity: 1, y: 0, duration: 0.62, ease: "back.out(2.4)" },
        "-=0.05"
      );
  }

  const active = hovered || rating;

  return (
    <div className="space-y-4">
      {/* ── Video ──────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden bg-zinc-900">
        <video
          src={videoUrl}
          className="w-full"
          playsInline
          controls
          onEnded={() => { if (!existingScore) setVideoEnded(true); }}
        />
      </div>

      {/* ── Review panel — hidden until video ends (or already reviewed) ── */}
      {(videoEnded || !!existingScore) && (
        <div
          ref={panelRef}
          style={{ opacity: 0 }}
          className="bg-white rounded-3xl border border-zinc-100 shadow-sm px-6 py-6 space-y-5"
        >
          {/* Heading */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {submitted ? "คะแนนที่คุณให้" : "สมูทตี้เป็นยังไงบ้าง?"}
            </p>
          </div>

          {/* Stars */}
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                ref={(el) => { starRefs.current[i - 1] = el; }}
                disabled={submitted}
                onMouseEnter={() => onStarEnter(i)}
                onMouseLeave={() => onStarLeave(i)}
                onTouchStart={() => onStarEnter(i)}
                onTouchEnd={() => onStarLeave(i)}
                onClick={() => onStarClick(i)}
                className="text-[44px] leading-none select-none disabled:cursor-default touch-none"
                style={{ color: i <= active ? "#facc15" : "#d4d4d8" }}
              >
                ★
              </button>
            ))}
          </div>

          {/* Hint text */}
          {!submitted && (
            <p className="text-center text-xs text-zinc-400">
              {rating === 0 ? "กดดาวเพื่อให้คะแนน" : ["", "แย่มาก", "พอใช้", "โอเค", "ดีมาก", "อร่อยมาก! 🔥"][rating]}
            </p>
          )}

          {/* Submit button */}
          {!submitted && (
            <button
              ref={submitRef}
              onClick={handleSubmit}
              disabled={!rating || busy}
              className="w-full bg-brand text-white py-4 rounded-2xl font-bold text-sm
                disabled:opacity-30 hover:bg-green-700 transition-colors shadow-md shadow-green-200"
            >
              ส่งรีวิว
            </button>
          )}

          {/* Success state */}
          <div ref={successRef} className="text-center py-2">
            <p className="text-4xl">🎉</p>
            <p className="mt-2 text-sm font-bold text-zinc-900">ขอบคุณที่รีวิว!</p>
            <p className="text-xs text-zinc-400 mt-1">
              ความคิดเห็นของคุณช่วยให้เราปรับปรุงได้
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
