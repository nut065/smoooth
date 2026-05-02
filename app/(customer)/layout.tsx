import { ViewTransition } from "react";
import Link from "next/link";
import { CartIconButton } from "@/components/CartIconButton";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* viewTransitionName keeps header anchored during nav-forward/back slides */}
      <header
        style={{ viewTransitionName: "site-header" }}
        className="sticky top-0 z-30 bg-[#fffef9]/90 backdrop-blur-sm border-b border-zinc-100"
      >
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className="text-lg font-bold tracking-tight text-zinc-900"
          >
            🌿 Craft Smoothie
          </Link>
          <CartIconButton />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <ViewTransition
          enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
          exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
          default="none"
        >
          {children}
        </ViewTransition>
      </main>
    </div>
  );
}
