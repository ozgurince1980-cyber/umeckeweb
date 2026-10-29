"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Plan = {
  id: string;
  name: string;
  plan_key: string;
  plan_type: string;
  diet_category: string;
  price_per_meal: number | string;
  total_meals: number;
  discount_percentage: number | string;
  currency: string;
  description: string;
  features: string[];
};

type Restaurant = {
  id: string;
  name: string;
};

const timeSlots = [
  "11:30 - 12:00",
  "12:00 - 12:30",
  "12:30 - 13:00",
  "13:00 - 13:30",
  "18:00 - 18:30",
  "18:30 - 19:00",
  "19:00 - 19:30",
];

export default function MealPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(""); // "" ise karma mahalle havuzu

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState("12:30 - 13:00");
  const [dietaryNotes, setDietaryNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const { data: planData, error: planErr } = await supabase
          .from("meal_plan_templates")
          .select("*")
          .eq("is_active", true)
          .order("price_per_meal");

        if (planErr) throw planErr;
        const pList = (planData || []) as Plan[];
        setPlans(pList);
        if (pList[0]) setSelectedPlanId(pList[0].id);

        const { data: restData } = await supabase
          .from("restaurants")
          .select("id, name")
          .eq("is_active", true)
          .order("name");

        setRestaurants((restData || []) as Restaurant[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Planlar yüklenemedi.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const totalAmount = selectedPlan
    ? (Number(selectedPlan.price_per_meal) * selectedPlan.total_meals).toFixed(2)
    : "0.00";

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/meal-plans/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: selectedPlanId,
          restaurant_id: selectedRestaurantId || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          delivery_address: deliveryAddress,
          delivery_time_slot: deliveryTimeSlot,
          dietary_notes: dietaryNotes || null,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success || !result.checkout_url) {
        throw new Error(result.error || "Ödeme oturumu oluşturulamadı.");
      }

      window.location.href = result.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abonelik başlatılamadı.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/" className="text-xs font-bold text-stone-500 hover:text-orange-700">
          ← Ana sayfaya dön
        </Link>

        {/* Hero Header */}
        <header className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-xl sm:p-12 border border-slate-800">
          <span className="rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-300">
            ⭐ Solidareaty Mahalle Yemek Planı
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            Her Gün Ne Yesem Derdine Son
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Mahallenizin usta aşçılarından her güne taze, sıcak ve dengeli öğünler. Sabit saatte kapınıza teslim, %20'ye varan avantajlı fiyatla.
          </p>
        </header>

        {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

        {loading ? (
          <div className="py-20 text-center font-bold text-stone-400">Planlar hazırlanıyor...</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* 1. ADIM: PLAN SEÇİM KARTLARI */}
            <div className="space-y-4 lg:col-span-7">
              <h2 className="text-xl font-black text-slate-900">1. Size Uygun Yemek Planını Seçin</h2>

              <div className="space-y-4">
                {plans.map((p) => {
                  const isSelected = p.id === selectedPlanId;
                  const planTotal = (Number(p.price_per_meal) * p.total_meals).toFixed(2);
                  return (
                    <article
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`cursor-pointer rounded-3xl p-6 transition-all border-2 shadow-sm ${
                        isSelected
                          ? "border-orange-600 bg-white ring-2 ring-orange-500/20"
                          : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-slate-900">{p.name}</span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                              %{Number(p.discount_percentage)} Tasarruf
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-stone-500">{p.description}</p>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black text-orange-600">{Number(p.price_per_meal).toFixed(2)} €</div>
                          <div className="text-[11px] text-stone-400">öğün başı · Toplam {planTotal} €</div>
                        </div>
                      </div>

                      {/* Özellikler */}
                      <ul className="mt-4 grid grid-cols-1 gap-1.5 text-xs text-stone-600 sm:grid-cols-2">
                        {(Array.isArray(p.features) ? p.features : []).map((feat, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-emerald-600">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* 2. ADIM: ABONELİK FORMU & SAAT SEÇİMİ */}
            <div className="lg:col-span-5">
              <div className="sticky top-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl space-y-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">2. Teslimat & Kişisel Tercihler</h2>
                  <p className="text-xs text-stone-500 mt-1">Yemeğinizin her gün teslim edileceği saati ve adresinizi girin.</p>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Mutfak / Restoran Tercihi</label>
                    <select
                      value={selectedRestaurantId}
                      onChange={(e) => setSelectedRestaurantId(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 p-2.5 bg-white font-medium outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">🍲 Karma Mahalle Menüsü (Farklı Restoranlardan Gün Gün)</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          🏛️ Yalnızca {r.name} Menüsü
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">⏰ Günlük Teslimat Saati Aralığı</label>
                    <select
                      value={deliveryTimeSlot}
                      onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 p-2.5 bg-white font-medium outline-none focus:ring-2 focus:ring-black"
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot} arası adrese teslim
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ahmet Yılmaz"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 p-2.5 outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Telefon *</label>
                      <input
                        type="tel"
                        required
                        placeholder="0176 12345678"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 p-2.5 outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Teslimat Adresi *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Sokak, Bina No, Daire / Ofis Katı"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 p-2.5 outline-none focus:ring-2 focus:ring-black resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Diyet / Alerjen Notları</label>
                    <input
                      type="text"
                      placeholder="Örn: Vejetaryen, acısız, glütensiz vb."
                      value={dietaryNotes}
                      onChange={(e) => setDietaryNotes(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 p-2.5 outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  {/* Özet ve Ödeme */}
                  <div className="rounded-2xl bg-orange-50 p-4 space-y-2 border border-orange-100">
                    <div className="flex justify-between font-bold text-stone-700">
                      <span>Seçilen Plan:</span>
                      <span>{selectedPlan?.name || "Plan seçilmedi"}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>Öğün Sayısı:</span>
                      <span>{selectedPlan?.total_meals || 0} Öğün</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-orange-200">
                      <span>Toplam Tutar:</span>
                      <span className="text-orange-600">{totalAmount} €</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedPlan}
                    className="w-full rounded-2xl bg-orange-600 py-3.5 text-sm font-black text-white hover:bg-orange-700 disabled:bg-stone-300 cursor-pointer shadow-lg transition-colors"
                  >
                    {submitting ? "İşleniyor..." : `💳 Güvenli Ödeme ile Aboneliği Başlat (${totalAmount} €)`}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
