import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file || !file.size) {
      return NextResponse.json({ error: "no file" }, { status: 400 });
    }

    const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const date = new Date().toISOString().slice(0, 10);
    const path = `${date}/${crypto.randomUUID()}.${ext}`;

    const supabase = createAdminClient();
    const { error: uploadErr } = await supabase.storage
      .from("fruit-photos")
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    const { data } = supabase.storage.from("fruit-photos").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl }, { status: 201 });
  } catch (err) {
    console.error("fruit-post/photo POST:", err);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}
