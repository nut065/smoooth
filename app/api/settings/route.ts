import { NextResponse } from "next/server";
import { getSetting } from "@/lib/domain/settings";

export const dynamic = "force-dynamic";

/** Public endpoint — only exposes the PromptPay QR URL (safe to share). */
export async function GET() {
  const promptpay_qr_url = await getSetting(
    "promptpay_qr_url",
    process.env.NEXT_PUBLIC_PROMPTPAY_QR_URL ?? "",
  );
  return NextResponse.json({ promptpay_qr_url });
}
