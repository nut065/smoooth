import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSetting } from "@/lib/domain/settings";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  // DB is authoritative; env var is the cold-start fallback.
  const adminPin = await getSetting("admin_pin", process.env.ADMIN_PIN ?? "1234");

  if (pin !== adminPin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set("admin_auth", adminPin, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_auth");
  return NextResponse.json({ ok: true });
}
