import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { CartProvider } from "@/lib/cart/CartContext";
import { LiffProvider } from "@/lib/liff/LiffProvider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Craft Smoothie",
  description: "Premium craft smoothies — limited 15 cups daily",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale omitted — disabling zoom fails WCAG 1.4.4 (Resize Text)
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={geist.variable}>
      <body className="min-h-dvh bg-zinc-50 font-sans antialiased">
        <LiffProvider>
          <CartProvider>{children}</CartProvider>
        </LiffProvider>
      </body>
    </html>
  );
}
