"use client";

import { ViewTransition } from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { v4 as uuid } from "uuid";
import { gsap } from "@/lib/gsap";
import { AddonToggle } from "@/components/AddonToggle";
import { useCart } from "@/lib/cart/CartContext";
import type { MenuDetail } from "@/lib/domain/menus";
import type { Addon } from "@/lib/domain/addons";

type Props = { menu: MenuDetail; addons: Addon[] };

export function AddToCartForm({ menu, addons }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { addItem } = useCart();
  const router = useRouter();

  const cupRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);
  const addingRef = useRef(false);

  // Page entrance
  const pageRef = useRef<HTMLDivElement>(null);

  // Price counter — span element + last-known value
  const totalSpanRef = useRef<HTMLSpanElement>(null);
  const displayedTotal = useRef(menu.base_price);

  // Derive total early so useEffect dependency arrays can reference it
  const chosenAddons = addons.filter((a) => selected.has(a.id));
  const total = menu.base_price + chosenAddons.reduce((s, a) => s + a.price, 0);

  // ── Page entrance animation ──────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Skip if page is hidden (LINE WebView background-open, preview tools, etc.)
      // — GSAP ticker pauses when document.hidden, leaving elements stuck at opacity:0
      if (document.hidden) return;

      // .js-hero is revealed by the ViewTransition morph — skip GSAP entrance for it
      const tl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "all" } });
      tl.from(".js-info",  { y: 24, opacity: 0, duration: 0.4 })
        .from(".js-addon", { y: 16, opacity: 0, duration: 0.32, stagger: 0.07 }, "-=0.15")
        .from(".js-cta",   { y: 16, opacity: 0, duration: 0.32 }, "-=0.1");
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // ── Price counter: init + animate on every total change ──────────
  useEffect(() => {
    if (totalSpanRef.current) totalSpanRef.current.textContent = String(menu.base_price);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!totalSpanRef.current) return;
    const from = displayedTotal.current;
    const to = total;
    if (from === to) return;

    const obj = { val: from };
    gsap.to(obj, {
      val: to,
      duration: 0.38,
      ease: "power2.out",
      onUpdate: () => {
        if (totalSpanRef.current)
          totalSpanRef.current.textContent = String(Math.round(obj.val));
      },
      onComplete: () => { displayedTotal.current = to; },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // ── Addon drop animation ─────────────────────────────────────────
  function animateDrop(addonName: string) {
    if (animatingRef.current || !cupRef.current || !dropZoneRef.current) return;
    animatingRef.current = true;

    const cup = cupRef.current;
    const dropZone = dropZoneRef.current;
    const containerH = dropZone.getBoundingClientRect().height;

    const pill = document.createElement("div");
    pill.textContent = addonName;
    Object.assign(pill.style, {
      position:     "absolute",
      top:          "0px",
      left:         "50%",
      background:   "white",
      color:        "#16a34a",
      fontSize:     "11px",
      fontWeight:   "700",
      padding:      "5px 14px",
      borderRadius: "999px",
      whiteSpace:   "nowrap",
      pointerEvents:"none",
      boxShadow:    "0 2px 10px rgba(0,0,0,0.18)",
    });
    dropZone.appendChild(pill);

    const landY = containerH * 0.36;

    const tl = gsap.timeline({
      onComplete: () => {
        pill.remove();
        gsap.set(cup, { clearProps: "all" });
        animatingRef.current = false;
      },
    });

    tl.to(cup, {
      scale: 2.0,
      transformOrigin: "center 42%",
      duration: 0.38,
      ease: "power2.inOut",
    })
    .fromTo(
      pill,
      { xPercent: -50, y: -36, opacity: 0, scale: 0.5 },
      { xPercent: -50, y: landY, opacity: 1, scale: 1,
        duration: 0.44, ease: "power2.in" },
      "-=0.06",
    )
    .to(pill, {
      y: landY + 18,
      scale: 0.08,
      opacity: 0,
      duration: 0.18,
      ease: "power2.in",
    })
    .to(cup, {
      scale: 1,
      duration: 0.38,
      ease: "power2.out",
    }, "-=0.12");
  }

  function handleToggle(addonId: string, addonName: string) {
    const isSelecting = !selected.has(addonId);
    if (isSelecting) animateDrop(addonName);
    setSelected((prev) => {
      const next = new Set(prev);
      isSelecting ? next.add(addonId) : next.delete(addonId);
      return next;
    });
  }

  // ── Add-to-cart cinematic animation ─────────────────────────────
  function animateAddToCart(): Promise<void> {
    return new Promise((resolve) => {
      const cupEl = cupRef.current;
      if (!cupEl) { resolve(); return; }

      const rect = cupEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "9999",
        pointerEvents: "none",
        overflow: "hidden",
      });
      document.body.appendChild(overlay);

      const backdrop = document.createElement("div");
      Object.assign(backdrop.style, {
        position: "absolute",
        inset: "0",
        background: "rgba(0,0,0,0.65)",
        opacity: "0",
      });
      overlay.appendChild(backdrop);

      const flyingCup = document.createElement("div");
      Object.assign(flyingCup.style, {
        position: "absolute",
        top: "0",
        left: "0",
        fontSize: "96px",
        lineHeight: "1",
        opacity: "0",
        userSelect: "none",
      });
      flyingCup.textContent = "🥤"; // 🥤
      overlay.appendChild(flyingCup);
      gsap.set(flyingCup, {
        x: rect.left + rect.width / 2 - 48,
        y: rect.top + rect.height / 2 - 48,
      });

      const cartEl = document.createElement("div");
      Object.assign(cartEl.style, {
        position: "absolute",
        top: "0",
        left: "50%",
        fontSize: "160px",
        lineHeight: "1",
        userSelect: "none",
      });
      cartEl.textContent = "🛒"; // 🛒
      overlay.appendChild(cartEl);

      const cartY = vh * 0.38;
      gsap.set(cartEl, { xPercent: -50, y: vh + 20 });

      const tl = gsap.timeline({
        onComplete: () => {
          overlay.remove();
          gsap.set(cupEl, { clearProps: "all" });
          resolve();
        },
      });

      tl
        .to(backdrop, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0)
        .to(cupEl, {
          scale: 5,
          opacity: 0,
          transformOrigin: "center 40%",
          duration: 0.45,
          ease: "power3.in",
        }, 0)
        .fromTo(flyingCup,
          { scale: 1.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(1.7)" },
          "-=0.1"
        )
        .to(cartEl, { y: cartY, duration: 0.5, ease: "power3.out" }, "-=0.12")
        .to(flyingCup, {
          x: vw / 2 - 48,
          y: cartY + 55,
          scale: 0.35,
          duration: 0.4,
          ease: "power2.in",
        })
        .to(flyingCup, { scale: 0, opacity: 0, duration: 0.12 })
        .to(cartEl, { y: cartY - 22, duration: 0.1, ease: "power1.out" })
        .to(cartEl, { y: cartY,      duration: 0.2, ease: "bounce.out" })
        .addLabel("exit", "+=0.2")
        .to(backdrop, { opacity: 0, duration: 0.45, ease: "power2.in" }, "exit")
        .to(cartEl,   { y: vh + 20, duration: 0.45, ease: "power2.in" }, "exit");
    });
  }

  async function handleAdd() {
    if (addingRef.current) return;
    addingRef.current = true;

    addItem({
      lineId: uuid(),
      menuId: menu.id,
      menuName: menu.name,
      unitPrice: menu.base_price,
      addons: chosenAddons.map((a) => ({
        addonId: a.id,
        name: a.name,
        price: a.price,
      })),
      quantity: 1,
    });

    await animateAddToCart();
    router.push("/");
  }

  return (
    <div ref={pageRef} className="space-y-6 pb-8">
      {/* ── Cup — ViewTransition name matches MenuCard so they morph on nav ── */}
      <ViewTransition name={`menu-${menu.id}`}>
      <div
        className="js-hero relative aspect-square rounded-3xl overflow-hidden -mx-4 sm:mx-0 sm:rounded-3xl"
        style={{ background: menu.image_url ? undefined : "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)" }}
      >
        <div
          ref={cupRef}
          className="absolute inset-0 flex items-center justify-center"
        >
          {menu.image_url ? (
            <Image
              src={menu.image_url}
              alt={menu.name}
              fill
              className="object-cover"
            />
          ) : (
            <span className="text-[160px] leading-none select-none">🥤</span>
          )}
        </div>

        <div
          ref={dropZoneRef}
          className="absolute inset-0 pointer-events-none"
        />
      </div>
      </ViewTransition>

      {/* ── Info ────────────────────────────────────────────────────── */}
      <div className="js-info">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{menu.name}</h1>
        <p className="mt-1.5 text-xl font-semibold text-brand">฿{menu.base_price}</p>
      </div>

      {/* ── Add-ons ─────────────────────────────────────────────────── */}
      {addons.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">เพิ่มเติม</p>
          <div className="space-y-2">
            {addons.map((addon) => (
              <div key={addon.id} className="js-addon">
                <AddonToggle
                  id={addon.id}
                  name={addon.name}
                  price={addon.price}
                  selected={selected.has(addon.id)}
                  onToggle={() => handleToggle(addon.id, addon.name)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <button
        onClick={handleAdd}
        className="js-cta w-full bg-brand text-white py-4 rounded-2xl text-sm font-bold tracking-wide
          transition-all active:scale-95 hover:bg-green-700 shadow-md shadow-green-200"
      >
        เพิ่มลงตะกร้า · ฿<span ref={totalSpanRef} />
      </button>
    </div>
  );
}
