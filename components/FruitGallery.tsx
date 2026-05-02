import Image from "next/image";
import type { FruitPostPublic } from "@/app/api/fruit-posts/route";
import { createAdminClient } from "@/lib/supabase/admin";

async function getFruitPosts(): Promise<FruitPostPublic[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("fruit_purchases")
      .select("id, purchase_date, note, photo_url, material:material_id(name)")
      .not("photo_url", "is", null)
      .order("purchase_date", { ascending: false })
      .order("created_at",    { ascending: false })
      .limit(10);

    if (error || !data?.length) return [];

    return data.map((r) => {
      const mat = r.material as unknown as { name: string };
      return {
        id: r.id,
        material_name: mat.name,
        purchase_date: r.purchase_date,
        note: r.note,
        photo_url: r.photo_url as string,
      };
    });
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric", month: "short",
  });
}

export async function FruitGallery() {
  const posts = await getFruitPosts();
  if (!posts.length) return null;

  return (
    <section className="mt-10 -mx-4">
      <div className="px-4 mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold text-zinc-700 tracking-tight">🌿 วัตถุดิบสดวันนี้</h2>
        <span className="text-xs text-zinc-400">{posts.length} รายการ</span>
      </div>

      {/* Horizontal scroll gallery */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-none snap-x snap-mandatory">
        {posts.map((p) => (
          <div
            key={p.id}
            className="flex-shrink-0 w-52 snap-start rounded-2xl overflow-hidden
              border border-zinc-100 bg-white shadow-sm"
          >
            {/* Photo */}
            <div className="relative w-52 h-52">
              <Image
                src={p.photo_url}
                alt={p.material_name}
                fill
                className="object-cover"
                sizes="208px"
              />
            </div>

            {/* Caption */}
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-zinc-800 truncate">{p.material_name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{formatDate(p.purchase_date)}</p>
              {p.note && (
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
