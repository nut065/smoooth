import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { score, comment } = await req.json();

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: "invalid score" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ review_score: score, review_comment: comment ?? null })
    .eq("id", id)
    .is("review_score", null); // idempotent — only first review counts

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
