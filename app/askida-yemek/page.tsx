"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Restaurant = { id: string; name: string; slug?: string | null };
type MenuItem = { id: number; name: string; price: number | string; description?: string | null; image_url?: string | null; is_available?: boolean | null };

export default function SuspendedMealPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [menuItemId, setMenuItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [donorName, setDonorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadRestaurants() {
      const { data, error } = await supabase.from("restaurants").select("id, name, slug").eq("is_active", true).order("name");
      if (error) setMessage({ type: "error", text: "Restoranlar yüklenemedi." });
      else {
        const rows = (data || []) as Restaurant[];
        setRestaurants(rows);
        if (rows[0]) setRestaurantId(rows[0].id);
      }
      setLoading(false);
    }
    loadRestaurants();
  }, []);

  useEffect(() => {
    if (!restaurantId) { setMenuItems([]); return; }
    async function loadMenu() {
      setLoadingMenu(true);
      setMenuItemId("");
      const { data, error } = await supabase.from("menu_items").select("id, name, price, description, image_url, is_available").eq("restaurant_id", restaurantId).eq("is_available", true).order("name");
      if (error) setMessage({ type: "error", text: "Bu restoranın askıda yemek menüsü yüklenemedi." });
      else {
        const rows = (data || []) as MenuItem[];
        setMenuItems(rows);
        if (rows[0]) setMenuItemId(String(rows[0].id));
      }
      setLoadingMenu(false);
    }
    loadMenu();
  }, [restaurantId]);

  const selectedItem = useMemo(() => menuItems.find((item) => String(item.id) === menuItemId), [menuItems, menuItemId]);
  const total = selectedItem ? Number(selectedItem.price) * quantity : 0;

  async function submitDonation(event: React.FormEvent) {
    event.preventDefault();
    if (!restaurantId || !menuItemId) { setMessage({ type: "error", text: "Lütfen restoran ve ürün seçin." }); return; }
    setSubmitting(true); setMessage(null);
    try {
      const response = await fetch("/api/suspended-meal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restaurant_id: restaurantId, menu_item_id: Number(menuItemId), quantity, donor_name: isAnonymous ? null : donorName, is_anonymous: isAnonymous, source: "direct" }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Bağış oluşturulamadı.");

      const checkoutResponse = await fetch("/api/suspended-meal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donation_id: result.donation_id }),
      });

      const checkoutResult = await checkoutResponse.json();

      if (!checkoutResponse.ok || !checkoutResult.success || !checkoutResult.checkout_url) {
        throw new Error(checkoutResult.error || "Ödeme sayfası oluşturulamadı.");
      }

      window.location.href = checkoutResult.checkout_url;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." });
    } finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-bold text-stone-600 hover:text-orange-700">← Restoranlara dön</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-3xl bg-gradient-to-br from-orange-600 to-rose-700 p-7 text-white shadow-xl sm:p-10">
            <div className="text-5xl">🍲</div>
            <h1 className="mt-5 text-4xl font-black tracking-tight">Askıda Yemek</h1>
            <p className="mt-4 text-lg leading-8 text-orange-50">Bir komşunun bugün sıcak bir öğüne ulaşmasına katkıda bulun.</p>
            <div className="mt-8 space-y-3 text-sm text-orange-50"><p>✓ Yerel işletmeyi destekler</p><p>✓ İstersen anonim bağış yaparsın</p><p>✓ Bağış, seçtiğin işletmenin askı havuzuna gider</p></div>
          </section>
          <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-stone-200 sm:p-8">
            <h2 className="text-2xl font-black">Bağışını oluştur</h2>
            <p className="mt-2 text-sm text-stone-500">Stripe test ödeme sayfasına yönlendirileceksin. Ödeme tamamlanınca bağışın doğrulanacak.</p>
            <form onSubmit={submitDonation} className="mt-6 space-y-4">
              <label className="block text-sm font-bold">Restoran<select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} disabled={loading} className="mt-1 w-full rounded-xl border border-stone-300 p-3">{restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
              <label className="block text-sm font-bold">Askıya bırakılacak yemek<select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} disabled={loadingMenu || !menuItems.length} className="mt-1 w-full rounded-xl border border-stone-300 p-3">{menuItems.map((item) => <option key={item.id} value={item.id}>{item.name} — {Number(item.price).toFixed(2)} €</option>)}</select></label>
              <label className="block text-sm font-bold">Miktar<input type="number" min={1} max={20} value={quantity} onChange={(e) => setQuantity(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className="mt-1 w-full rounded-xl border border-stone-300 p-3" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} /> Anonim bağış yapmak istiyorum</label>
              {!isAnonymous && <label className="block text-sm font-bold">Adınız (isteğe bağlı)<input value={donorName} onChange={(e) => setDonorName(e.target.value)} className="mt-1 w-full rounded-xl border border-stone-300 p-3" /></label>}
              <div className="rounded-2xl bg-orange-50 p-4"><div className="flex justify-between text-sm"><span>Toplam</span><strong>{total.toFixed(2)} €</strong></div><p className="mt-2 text-xs text-orange-800">Ödeme tamamlanana kadar kayıt “ödeme bekliyor” durumunda tutulur.</p></div>
              {message && <div className={`rounded-xl p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{message.text}</div>}
              <button disabled={submitting || !selectedItem} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-stone-300">{submitting ? "Oluşturuluyor..." : "Bağış niyeti oluştur"}</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
