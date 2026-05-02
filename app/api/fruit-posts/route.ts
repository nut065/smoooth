import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type FruitPostPublic = {
  id: string;
  material_name: string;
  purchase_date: string;
  note: string | null;
  photo_url: string;
};

/** Public — only rows that have a photo, last 10, newest first. */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fruit_purchases")
      .select("id, purchase_date, note, photo_url, material:material_id(name)")
      .not("photo_url", "is", null)
      .order("purchase_date", { ascending: false })
      .order("created_at",    { ascending: false })
      .limit(10);

    if (error) throw error;

    const rows: FruitPostPublic[] = (data ?? []).map((r) => {
      const mat = r.material as unknown as { name: string };
      return {
        id: r.id,
        material_name: mat.name,
        purchase_date: r.purchase_date,
        note: r.note,
        photo_url: r.photo_url as string,
      };
    });

    return NextResponse.json(rows);
  } catch (err) {
    console.error("fruit-posts GET:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
