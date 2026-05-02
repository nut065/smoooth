import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuStatus } from "@/app/api/admin/menus/route";

const VALID_STATUSES: MenuStatus[] = ["active", "inactive", "no_ingredients", "hidden"];

// PATCH /api/admin/menus/:id
// Accepts any subset of { name, base_price, status }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: { name?: string; base_price?: number; status?: MenuStatus } =
      await req.json();

    const allowed: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim())
      allowed.name = body.name.trim();
    if (typeof body.base_price === "number" && body.base_price >= 0)
      allowed.base_price = body.base_price;
    if (body.status !== undefined && VALID_STATUSES.includes(body.status))
      allowed.status = body.status;

    if (Object.keys(allowed).length === 0)
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("menus").update(allowed).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("menus PATCH:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
