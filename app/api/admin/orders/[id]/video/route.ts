import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setOrderVideoUrl } from "@/lib/domain/admin-orders";

const BUCKET = "video-proofs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop() ?? "webm";
  const path = `${id}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  await setOrderVideoUrl(id, publicUrl);
  return NextResponse.json({ url: publicUrl });
}
