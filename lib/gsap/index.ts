"use client";

import { gsap } from "gsap";

// Single import point for GSAP. Add plugins here once and re-export — keeps
// usage sites unaware of registration order.
export { gsap };

// Dev-only: expose singleton for preview tooling (not included in production build)
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__gsap = gsap;
}

export function fadeInUp(el: gsap.TweenTarget, delay = 0) {
  return gsap.fromTo(
    el,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.5, delay, ease: "power2.out" },
  );
}

export function staggeredReveal(els: gsap.TweenTarget) {
  return gsap.fromTo(
    els,
    { opacity: 0, y: 16 },
    {
      opacity: 1,
      y: 0,
      duration: 0.5,
      ease: "power2.out",
      stagger: 0.06,
      clearProps: "all", // remove inline styles when done so CSS takes over cleanly
    },
  );
}
