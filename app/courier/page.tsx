"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type CourierProfile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  vehicle_type: string;
  is_online: boolean;
  active_region: string;
  total_deliveries: number;
  total_co2_saved_grams: number | string;
  free_meal_points: number;
  solidarity_deliveries: number;
};

type Delivery = {
  delivery_id: string;
  order_id: string | null;
  producer_order_id: string | null;
  delivery_status: string;
  pickup_address: string;
  dropoff_address: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_notes: string | null;
  delivery_fee: number | string;
  courier_tip: number | string;
  currency: string;
  is_solidarity: boolean;
  assigned_to_me: boolean;
  created_at: string;
};

const vehicleIcons: Record<string, string> = {
  bicycle: "🚲 Bisiklet",
  cargo_bike: "🚲 Kargo Bisikleti",
  walking: "🚶 Yaya",
  e_scooter: "🛴 E-Scooter",
};

export default function CourierPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  async function loadData() {
    try {
      const { data: profData, error: profErr } = await supabase.rpc("get_courier_profile");
      if (profErr) throw profErr;
      const p = Array.isArray(profData) ? profData[0] : profData;
      setProfile(p || null);

      const { data: delData, error: delErr } = await supabase.rpc("get_courier_deliveries");
      if (delErr) throw delErr;
      setDeliveries((delData || []) as Delivery[]);
    } catch (err) {
      console.error("Kurye veri yükleme hatası:", err);
    }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.session) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    try {
      await loadData();
      setLogged(true);
      setPassword("");
    } catch (x) {
      await supabase.auth.signOut();
      setError(x instanceof Error ? x.message : "Kurye profili yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleOnline() {
    if (!profile) return;
    const nextStatus = !profile.is_online;
    try {
      const { error: rpcError } = await supabase.rpc("toggle_courier_online_status", {
        p_is_online: nextStatus,
      });
      if (rpcError) throw rpcError;
      setProfile((prev) => prev ? { ...prev, is_online: nextStatus } : null);
    } catch (err) {
      alert("Durum güncellenemedi: " + (err instanceof Error ? err.message : "Hata"));
    }
  }

  async function handleAction(deliveryId: string, action: "accept" | "pickup" | "complete" | "cancel") {
    setActionLoading(deliveryId + action);
    try {
      const { data: success, error: rpcError } = await supabase.rpc("courier_action_delivery", {
        p_delivery_id: deliveryId,
        p_action: action,
      });

      if (rpcError || success !== true) {
        throw new Error(rpcError?.message || "İşlem gerçekleştirilemedi.");
      }

      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "İşlem hatası.");
    } finally {
      setActionLoading(null);
    }
  }

  function logout() {
    supabase.auth.signOut();
    setLogged(false);
    setProfile(null);
    setDeliveries([]);
  }

  useEffect(() => {
    async function checkExisting() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadData();
        setLogged(true);
      }
      setLoading(false);
    }
    checkExisting();
  }, []);

  // 5 saniyede bir canlı yenileme
  useEffect(() => {
    if (!logged) return;
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [logged]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="text-center font-bold">Kurye paneli açılıyor...</div>
      </main>
    );
  }

  if (!logged) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <form onSubmit={login} className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-2xl border border-slate-800">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white">← Ana sayfaya dön</Link>
          <div className="mt-4 text-4xl">🚲</div>
          <h1 className="mt-2 text-3xl font-black">Mahalle Kuryesi Girişi</h1>
          <p className="mt-1 text-xs text-slate-400">İnsani ve çevreci mahalle taşıyıcı ağı.</p>

          <input
            required
            type="email"
            placeholder="test.courier@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-6 w-full rounded-xl bg-slate-800 p-3 text-sm text-white outline-none border border-slate-700"
          />
          <input
            required
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-3 w-full rounded-xl bg-slate-800 p-3 text-sm text-white outline-none border border-slate-700"
          />

          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-orange-600 p-3 text-sm font-black text-white hover:bg-orange-700 cursor-pointer shadow-lg"
          >
            Göreve Başla
          </button>
        </form>
      </main>
    );
  }

  const myActiveDeliveries = deliveries.filter((d) => d.assigned_to_me);
  const poolDeliveries = deliveries.filter((d) => !d.assigned_to_me && d.delivery_status === "available");
  const co2Kg = (Number(profile?.total_co2_saved_grams || 0) / 1000).toFixed(2);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header & Canlı / Mola Butonu */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div>
            <span className="text-xs font-bold text-orange-400">Solidareaty Mahalle Taşıyıcısı</span>
            <h1 className="text-2xl font-black text-white">{profile?.full_name || "Mahalle Kuryesi"}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {vehicleIcons[profile?.vehicle_type || "bicycle"]} · Bölge: <strong>{profile?.active_region}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleOnline}
              className={`cursor-pointer rounded-2xl px-5 py-3 text-xs font-black shadow-lg transition-all ${
                profile?.is_online
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              {profile?.is_online ? "🟢 Teslimata Hazırım" : "⚪ Moladayım (Pasif)"}
            </button>
            <button
              onClick={logout}
              className="cursor-pointer rounded-2xl bg-slate-800 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 border border-slate-700"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* Dayanışma & Çevrecilik Sayaçları */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-slate-400">Toplam Teslimat</div>
            <div className="mt-1 text-2xl font-black text-white">{profile?.total_deliveries || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-emerald-400">🌱 Kurtarılan CO₂</div>
            <div className="mt-1 text-2xl font-black text-emerald-400">{co2Kg} kg</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-amber-400">🍲 Esnaf İkramı Puanı</div>
            <div className="mt-1 text-2xl font-black text-amber-400">{profile?.free_meal_points || 0} p</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-rose-400">❤️ Askı Teslimatı</div>
            <div className="mt-1 text-2xl font-black text-rose-400">{profile?.solidarity_deliveries || 0}</div>
          </div>
        </div>

        {/* 1. ÜZERİMDEKİ AKTİF GÖREVLER */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>📦</span> Üzerimdeki Aktif Görevler ({myActiveDeliveries.length})
          </h2>

          {myActiveDeliveries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
              Şu an üzerinizde aktif bir teslimat bulunmuyor. Aşağıdaki havuzdan paket seçebilirsiniz.
            </div>
          ) : (
            <div className="space-y-4">
              {myActiveDeliveries.map((del) => {
                const totalFee = (Number(del.delivery_fee) + Number(del.courier_tip)).toFixed(2);
                return (
                  <article
                    key={del.delivery_id}
                    className="rounded-3xl border-2 border-orange-500/80 bg-slate-900 p-6 shadow-2xl space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-black text-orange-400">
                          {del.delivery_status === "assigned" ? "⏳ Dükkandan Alınacak" : "🚲 Yolda (Müşteriye Gidiyor)"}
                        </span>
                        {del.is_solidarity && (
                          <span className="ml-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-300">
                            ❤️ Askıda Yemek
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400">Kurye Net Kazancı</div>
                        <div className="text-xl font-black text-emerald-400">
                          {totalFee} {del.currency}
                          {Number(del.courier_tip) > 0 && (
                            <span className="text-xs text-slate-400 ml-1">(+{del.courier_tip} bahşiş)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-xl bg-slate-800/80 p-3">
                        <div className="font-bold text-slate-400">📍 Nereden Alınacak:</div>
                        <div className="mt-1 text-sm font-semibold text-white">{del.pickup_address}</div>
                      </div>
                      <div className="rounded-xl bg-slate-800/80 p-3">
                        <div className="font-bold text-slate-400">🏠 Kime Teslim Edilecek:</div>
                        <div className="mt-1 text-sm font-semibold text-white">{del.dropoff_address}</div>
                        <div className="mt-1 text-slate-400">{del.customer_name} · 📞 {del.customer_phone || "Belirtilmedi"}</div>
                      </div>
                    </div>

                    {del.delivery_notes && (
                      <div className="rounded-xl bg-amber-950/30 border border-amber-800/50 p-3 text-xs text-amber-200">
                        💬 <strong>Müşteri Notu:</strong> {del.delivery_notes}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2">
                      {del.delivery_status === "assigned" && (
                        <>
                          <button
                            disabled={actionLoading !== null}
                            onClick={() => handleAction(del.delivery_id, "pickup")}
                            className="cursor-pointer flex-1 rounded-xl bg-orange-600 py-3 text-xs font-black text-white hover:bg-orange-700 shadow-lg"
                          >
                            🚲 Dükkandan / Çiftlikten Aldım
                          </button>
                          <button
                            disabled={actionLoading !== null}
                            onClick={() => handleAction(del.delivery_id, "cancel")}
                            className="cursor-pointer rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-700 border border-slate-700"
                          >
                            Bırak
                          </button>
                        </>
                      )}

                      {del.delivery_status === "picked_up" && (
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => handleAction(del.delivery_id, "complete")}
                          className="cursor-pointer w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-black text-white hover:bg-emerald-700 shadow-xl"
                        >
                          ✅ Kapıda Müşteriye Teslim Ettim
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 2. MAHALLE TESLİMAT HAVUZU (BOŞTA BEKLEYENLER) */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🚲</span> Mahalle Teslimat Havuzu ({poolDeliveries.length})
            </h2>
            <span className="text-xs text-slate-400">Canlı Akış (5sn)</span>
          </div>

          {poolDeliveries.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-xs text-slate-500">
              Şu anda mahallenizde boşta bekleyen teslimat paketi yok. Yeni sipariş geldiğinde anında burada belirecektir.
            </div>
          ) : (
            <div className="space-y-3">
              {poolDeliveries.map((del) => {
                const totalFee = (Number(del.delivery_fee) + Number(del.courier_tip)).toFixed(2);
                return (
                  <article
                    key={del.delivery_id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">📍 {del.pickup_address}</span>
                        <span className="text-slate-500">➔</span>
                        <span className="font-semibold text-slate-300">🏠 {del.dropoff_address}</span>
                      </div>
                      <div className="text-slate-400">
                        {del.customer_name} {del.is_solidarity && <span className="text-rose-400 font-bold ml-1">❤️ Askı Yemeği</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-400">{totalFee} {del.currency}</div>
                        <div className="text-[10px] text-slate-400">%100 Kuryeye</div>
                      </div>

                      <button
                        disabled={actionLoading !== null || !profile?.is_online}
                        onClick={() => handleAction(del.delivery_id, "accept")}
                        className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-black text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40 shadow-md"
                      >
                        {profile?.is_online ? "Teslimatı Üstlen" : "Önce Online Olun"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
