export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import RestaurantManager from "../components/RestaurantManager";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default async function RestaurantMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: restaurant } = await supabase.from("restaurants").select("id,name,slug").eq("slug", slug).maybeSingle();
  if (!restaurant) notFound();
  const { data: badgeRows } = await supabase.rpc("get_restaurant_local_badge", { p_restaurant_id: restaurant.id });
  const badge = Array.isArray(badgeRows) ? badgeRows[0] : badgeRows;
  const stars = badge?.star_level > 0 ? "★".repeat(Math.min(5, badge.star_level)) : "";
  return <main className="min-h-screen bg-gray-50">
    {badge?.star_level > 0 && <section className="mx-auto max-w-6xl px-5 pt-6"><div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-7 text-center shadow-xl"><div className="text-4xl text-amber-300">{stars}</div><div className="mt-2 text-xs font-black tracking-[.22em] text-amber-300">REGIONAL • VERBUNDEN • SOLIDARISCH</div><div className="mt-3 text-5xl font-black text-white">Solidareaty</div><div className="mx-auto mt-4 w-fit rounded-full bg-gradient-to-r from-orange-600 to-red-700 px-7 py-2 text-sm font-black text-white">Lokaler Unterstützer</div><p className="mt-3 text-sm text-slate-300">{badge.badge_description}</p><p className="mt-2 text-xs text-slate-400">{badge.unique_producer_count} lokale Produzenten unterstützt</p></div></section>}
    <RestaurantManager initialRestaurantSlug={restaurant.slug} />
  </main>;
}
