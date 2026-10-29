"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type PromoterProfile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  region: string;
  referral_code: string;
  status: string;
  total_earnings: number | string;
  total_points: number;
  hero_title: string;
  badge_level: number;
  referred_restaurant_count: number;
  referred_producer_count: number;
  referred_customer_count: number;
};

type Referral = {
  referral_id: string;
  referred_type: string;
  referred_name: string;
  referred_contact: string | null;
  plan_key: string | null;
  status: string;
  reward_amount: number | string;
  points_earned: number;
  created_at: string;
};

const badgeLevels = [
  { level: 1, title: "Mahalle Gönüllüsü", req: "1-3 Katılım", icon: "🌱" },
  { level: 2, title: "Mahalle Öncüsü", req: "4-10 Katılım", icon: "⭐" },
  { level: 3, title: "Esnaf Dostu", req: "11-25 Katılım", icon: "🎖️" },
  { level: 4, title: "Mahalle Lideri", req: "26-50 Katılım", icon: "👑" },
  { level: 5, title: "Solidareaty Mahalle Şampiyonu", req: "50+ Katılım", icon: "🏆" },
];

export default function PromoterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("18209 Bad Doberan");
  const [customCode, setCustomCode] = useState("");

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  const [profile, setProfile] = useState<PromoterProfile | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Close the Deal (Yerinde Kayıt) Modal Durumu
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealType, setDealType] = useState<"restaurant" | "producer">("restaurant");
  const [dealSuccess, setDealSuccess] = useState("");

  // Restoran Kayıt Formu
  const [restName, setRestName] = useState("");
  const [restPhone, setRestPhone] = useState("");
  const [restEmail, setRestEmail] = useState("");
  const [restAddress, setRestAddress] = useState("");
  const [restZipcode, setRestZipcode] = useState("18209");
  const [restCity, setRestCity] = useState("Bad Doberan");
  const [restCuisine, setRestCuisine] = useState("Yerel / Anadolu Mutfağı");
  const [restPlan, setRestPlan] = useState("basic");
  const [restMenuItems, setRestMenuItems] = useState<Array<{ name: string; price: string; description: string }>>([
    { name: "", price: "", description: "" },
  ]);

  // Üretici Kayıt Formu
  const [prodName, setProdName] = useState("");
  const [prodType, setProdType] = useState("Çiftçi / Tarım");
  const [prodLocation, setProdLocation] = useState("Rostock & Çevresi");
  const [prodPhone, setProdPhone] = useState("");

  async function loadData() {
    try {
      const { data: profData, error: profErr } = await supabase.rpc("get_promoter_profile");
      if (profErr) throw profErr;
      const p = Array.isArray(profData) ? profData[0] : profData;
      setProfile(p || null);

      const { data: refData, error: refErr } = await supabase.rpc("get_promoter_referrals");
      if (refErr) throw refErr;
      setReferrals((refData || []) as Referral[]);
    } catch (err) {
      console.error("Elçi verileri yükleme hatası:", err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.session) {
      setError("E-posta veya şifre hatalı.");
      setSubmitting(false);
      return;
    }

    try {
      await loadData();
      setLogged(true);
      setPassword("");
    } catch (x) {
      await supabase.auth.signOut();
      setError(x instanceof Error ? x.message : "Elçi profili yüklenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError || !authData.user) {
      setError(signUpError?.message || "Kayıt oluşturulamadı.");
      setSubmitting(false);
      return;
    }

    try {
      const { data: codeData, error: rpcErr } = await supabase.rpc("apply_as_promoter", {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_region: region,
        p_custom_code: customCode.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      await loadData();
      setLogged(true);
      setPassword("");
    } catch (x) {
      setError(x instanceof Error ? x.message : "Elçi başvurusu kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  // CLOSE THE DEAL (Yerinde Kayıt Gönderme)
  async function handleCloseDeal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setDealSuccess("");

    try {
      if (dealType === "restaurant") {
        const validItems = restMenuItems
          .filter((it) => it.name.trim() && Number(it.price) > 0)
          .map((it) => ({
            name: it.name.trim(),
            price: Number(it.price),
            category: "Ana Yemek",
            description: it.description.trim() || null,
          }));

        const { data, error: rpcErr } = await supabase.rpc("complete_promoter_restaurant_onboarding", {
          p_name: restName.trim(),
          p_phone: restPhone.trim() || null,
          p_email: restEmail.trim() || null,
          p_address: restAddress.trim() || null,
          p_zipcode: restZipcode.trim(),
          p_city: restCity.trim(),
          p_cuisine_type: restCuisine,
          p_plan_key: restPlan,
          p_menu_items: validItems,
          p_is_onsite_by_promoter: true,
        });

        if (rpcErr) {
          setError(rpcErr.message || "İşletme kaydı oluşturulamadı.");
          return;
        }

        const res = Array.isArray(data) ? data[0] : data;
        const earnedAmount = Number(res?.reward_amount || (restPlan === "premium" ? 80 : 40));
        setDealSuccess(`🎉 Harika İş! "${restName}" anahtar teslim canlıya alındı (${res?.menu_items_count || 0} menü ürünü eklendi). +${earnedAmount.toFixed(2)} € Anahtar Teslim Primi cüzdanınıza yansıtıldı!`);
        setRestName("");
        setRestPhone("");
        setRestEmail("");
        setRestAddress("");
        setRestMenuItems([{ name: "", price: "", description: "" }]);
      } else {
        const { data, error: rpcErr } = await supabase.rpc("promoter_onboard_producer", {
          p_name: prodName.trim(),
          p_producer_type: prodType,
          p_location: prodLocation,
          p_phone: prodPhone.trim() || null,
        });

        if (rpcErr) {
          setError(rpcErr.message || "Üretici kaydı oluşturulamadı.");
          return;
        }

        setDealSuccess(`🎉 Tebrikler! "${prodName}" üreticisi başarıyla kaydedildi. +20.00 € Hak Ediş ve +40 Puan cüzdanınıza eklendi!`);
        setProdName("");
        setProdPhone("");
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşletme kaydı tamamlanamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    supabase.auth.signOut();
    setLogged(false);
    setProfile(null);
    setReferrals([]);
  }

  const copyLink = (type: "neighbor" | "restaurant" | "producer") => {
    if (!profile) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    let url = `${origin}/?ref=${profile.referral_code}`;
    if (type === "restaurant") url = `${origin}/?join=restaurant&ref=${profile.referral_code}`;
    if (type === "producer") url = `${origin}/produzentenmarkt?ref=${profile.referral_code}`;

    navigator.clipboard.writeText(url);
    setCopyMsg(type);
    setTimeout(() => setCopyMsg(""), 2500);
  };

  const shareWhatsApp = (type: "neighbor" | "restaurant" | "producer") => {
    if (!profile) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    let text = "";

    if (type === "neighbor") {
      text = `Komşum selam! Mahallemizin esnafını ve çiftçilerini komisyonsuz destekleyen Solidareaty'ye davetlisin. Bu linkle ilk siparişinde %15 indirim kazan: ${origin}/?ref=${profile.referral_code}`;
    } else if (type === "restaurant") {
      text = `Değerli esnafımız merhaba, komisyon devlerine son veren Solidareaty yerel restoran ağına davetlisiniz (%5 düşük komisyon & KDS ekranı). Detaylar ve katılım: ${origin}/?join=restaurant&ref=${profile.referral_code}`;
    } else {
      text = `Değerli üreticimiz merhaba, yerel mahsullerinizi doğrudan mahalleliye ve restoranlara satabileceğiniz Çiftçi Tezgâhı'na katılın: ${origin}/produzentenmarkt?ref=${profile.referral_code}`;
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadData();
        setLogged(true);
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
        <div className="font-bold">Mahalle Elçisi Paneli Hazırlanıyor...</div>
      </main>
    );
  }

  // LOGGED OUT VIEW
  if (!logged) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white">
            ← Ana sayfaya dön
          </Link>

          {/* Hero Banner */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 shadow-2xl sm:p-12">
            <span className="rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-300">
              🌟 Solidareaty Mahalle Elçileri (Promoter Network)
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Mahallenin Öncüsü Ol, Dayanışmayı Büyüt
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Komşularını ve yerel esnafı Solidareaty ekosistemine davet et. Hem esnafı sömürüden kurtar, hem de her yeni katılımda nakdi hak ediş ve onur rozetleri kazan.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <div className="text-xl">💶</div>
                <div className="mt-2 font-bold text-white">80 €'ya Varan Prim / İşletme Başı</div>
                <div className="mt-1 text-slate-400">Kazandırdığın her aktif işletme için nakdi hak ediş.</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <div className="text-xl">🎖️</div>
                <div className="mt-2 font-bold text-white">Onur Rozetleri</div>
                <div className="mt-1 text-slate-400">Mahalle kahramanları panosunda liderlik derecesi.</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                <div className="text-xl">⚡</div>
                <div className="mt-2 font-bold text-white">Yerinde Anında Kayıt</div>
                <div className="mt-1 text-slate-400">Esnafın yanındayken tek tıkla kaydını ve aboneliğini aç.</div>
              </div>
            </div>
          </div>

          {/* Form Alanı */}
          <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <div className="flex rounded-2xl bg-slate-800 p-1 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-xl py-2 cursor-pointer ${
                  authMode === "login" ? "bg-indigo-600 text-white" : "text-slate-400"
                }`}
              >
                Elçi Girişi
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`flex-1 rounded-xl py-2 cursor-pointer ${
                  authMode === "register" ? "bg-indigo-600 text-white" : "text-slate-400"
                }`}
              >
                Yeni Elçi Başvurusu
              </button>
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-950/50 p-3 text-xs text-red-300">{error}</div>}

            {authMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">E-posta</label>
                  <input
                    required
                    type="email"
                    placeholder="test.promoter@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Şifre</label>
                  <input
                    required
                    type="password"
                    placeholder="Şifre"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-indigo-600 py-3.5 font-black text-white hover:bg-indigo-500 cursor-pointer shadow-lg"
                >
                  {submitting ? "Giriş Yapılıyor..." : "Elçi Paneline Gir"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Ad Soyad *</label>
                  <input
                    required
                    type="text"
                    placeholder="Örn: Ayşe Demir"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Telefon</label>
                  <input
                    type="tel"
                    placeholder="0176 12345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Mahalle / Posta Kodu *</label>
                  <input
                    required
                    type="text"
                    placeholder="18209 Bad Doberan"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">E-posta *</label>
                  <input
                    required
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Şifre Belirleyin *</label>
                  <input
                    required
                    type="password"
                    placeholder="En az 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Özel Referans Kodu (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    placeholder="Örn: AYSEDOBERAN"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none uppercase font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-emerald-600 py-3.5 font-black text-white hover:bg-emerald-500 cursor-pointer shadow-lg"
                >
                  {submitting ? "Kaydediliyor..." : "Mahalle Elçisi Başvurusunu Tamamla"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    );
  }

  // LOGGED IN DASHBOARD
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div>
            <span className="text-xs font-bold text-indigo-400">Solidareaty Mahalle Elçisi</span>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl font-black text-white">{profile?.full_name}</h1>
              <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-black text-amber-300">
                {profile?.hero_title} · Seviye {profile?.badge_level}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">📍 Bölge: <strong>{profile?.region}</strong></p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowDealModal(true);
                setError("");
                setDealSuccess("");
              }}
              className="cursor-pointer rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-3 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-orange-500 shadow-xl flex items-center gap-1.5"
            >
              <span>⚡</span> Yerinde İşletme Kaydet (Close the Deal)
            </button>
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-2xl bg-slate-800 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 border border-slate-700"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* Sayaçlar ve Cüzdan */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-emerald-400 font-bold">Toplam Hak Ediş</div>
            <div className="mt-1 text-2xl font-black text-emerald-400">
              {Number(profile?.total_earnings || 0).toFixed(2)} €
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-amber-400 font-bold">Mahalle Puanı</div>
            <div className="mt-1 text-2xl font-black text-amber-400">
              {profile?.total_points || 0} p
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-slate-400 font-bold">Kazandırılan Esnaf</div>
            <div className="mt-1 text-2xl font-black text-white">
              {profile?.referred_restaurant_count || 0}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
            <div className="text-xs text-slate-400 font-bold">Kazandırılan Üretici</div>
            <div className="mt-1 text-2xl font-black text-white">
              {profile?.referred_producer_count || 0}
            </div>
          </div>
        </div>

        {/* 3 AKILLI PAYLAŞIM VE DAVET LİNKİ KARTI */}
        <div className="rounded-3xl border border-indigo-800/60 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-6 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/50 pb-3">
            <div>
              <h2 className="text-lg font-black text-white">Kişisel Mahalle Davet Kodunuz: <span className="font-mono text-indigo-300 ml-1">{profile?.referral_code}</span></h2>
              <p className="text-xs text-slate-300 mt-0.5">Kiminle konuştuğunuza göre aşağıdaki özel davet linklerini kullanabilirsiniz.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            {/* 1. Komşu Daveti */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-base">👥</span>
                <div className="font-bold text-white mt-1">Komşu & Müşteri Daveti</div>
                <p className="text-[11px] text-slate-400 mt-1">İlk siparişe özel %15 indirim kazandırır.</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => copyLink("neighbor")}
                  className="flex-1 cursor-pointer rounded-xl bg-slate-800 py-2 font-bold hover:bg-slate-700 text-[11px]"
                >
                  {copyMsg === "neighbor" ? "✓ Kopyalandı" : "🔗 Kopyala"}
                </button>
                <button
                  onClick={() => shareWhatsApp("neighbor")}
                  className="cursor-pointer rounded-xl bg-emerald-600 px-3 py-2 font-bold hover:bg-emerald-500 text-[11px]"
                >
                  📲 WhatsApp
                </button>
              </div>
            </div>

            {/* 2. Restoran Daveti */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-base">🏛️</span>
                <div className="font-bold text-white mt-1">Restoran & Esnaf Daveti</div>
                <p className="text-[11px] text-slate-400 mt-1">%5 düşük komisyon ve KDS ekranı tanıtımı.</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => copyLink("restaurant")}
                  className="flex-1 cursor-pointer rounded-xl bg-slate-800 py-2 font-bold hover:bg-slate-700 text-[11px]"
                >
                  {copyMsg === "restaurant" ? "✓ Kopyalandı" : "🔗 Kopyala"}
                </button>
                <button
                  onClick={() => shareWhatsApp("restaurant")}
                  className="cursor-pointer rounded-xl bg-emerald-600 px-3 py-2 font-bold hover:bg-emerald-500 text-[11px]"
                >
                  📲 WhatsApp
                </button>
              </div>
            </div>

            {/* 3. Çiftçi Daveti */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-base">🌾</span>
                <div className="font-bold text-white mt-1">Çiftçi & Üretici Tezgâhı</div>
                <p className="text-[11px] text-slate-400 mt-1">Aracısız yerel ürün satışına katılım linki.</p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => copyLink("producer")}
                  className="flex-1 cursor-pointer rounded-xl bg-slate-800 py-2 font-bold hover:bg-slate-700 text-[11px]"
                >
                  {copyMsg === "producer" ? "✓ Kopyalandı" : "🔗 Kopyala"}
                </button>
                <button
                  onClick={() => shareWhatsApp("producer")}
                  className="cursor-pointer rounded-xl bg-emerald-600 px-3 py-2 font-bold hover:bg-emerald-500 text-[11px]"
                >
                  📲 WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KAZANDIRILAN İŞLETMELER LİSTESİ */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>👥</span> Kazandırdığınız İşletmeler & Referanslar ({referrals.length})
            </h2>
          </div>

          {referrals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              Henüz referansınızla kaydolan bir işletme yok. Sahadayken <strong>[⚡ Yerinde İşletme Kaydet]</strong> butonuyla hemen ilk esnafınızı kaydedebilirsiniz!
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div
                  key={ref.referral_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-800/80 p-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span>{ref.referred_type === "restaurant" ? "🏛️" : ref.referred_type === "producer" ? "🌾" : "👤"}</span>
                      <span>{ref.referred_name}</span>
                      {ref.plan_key && (
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 font-bold uppercase">
                          {ref.plan_key}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-slate-400 text-[11px]">
                      {new Date(ref.created_at).toLocaleDateString()} · İletişim: {ref.referred_contact || "Belirtilmedi"}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                      ✓ Kaydedildi (+{ref.points_earned} Puan)
                    </span>
                    <strong className="text-sm font-black text-emerald-400">+{Number(ref.reward_amount).toFixed(2)} €</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAHALLE KAHRAMANLARI SEVİYELERİ */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>🎖️</span> Mahalle Kahramanları Onur Kademeleri
          </h2>
          <div className="grid gap-3 sm:grid-cols-5 text-xs">
            {badgeLevels.map((b) => (
              <div
                key={b.level}
                className={`rounded-2xl p-4 border text-center ${
                  (profile?.badge_level || 1) >= b.level
                    ? "border-amber-400/50 bg-amber-950/20 text-amber-200"
                    : "border-slate-800 bg-slate-800/40 text-slate-500"
                }`}
              >
                <div className="text-2xl">{b.icon}</div>
                <div className="mt-2 font-black">{b.title}</div>
                <div className="mt-1 text-[11px] opacity-80">{b.req}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CLOSE THE DEAL (YERİNDE ANINDA İŞLETME KAYIT MODALI) */}
      {showDealModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDealModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              ✕
            </button>

            <span className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-black text-orange-400">
              ⚡ Yerinde Hızlı Kayıt (Close the Deal)
            </span>
            <h2 className="mt-2 text-2xl font-black">İşletmeyi Anında Sisteme Kat</h2>
            <p className="mt-1 text-xs text-slate-400">
              Esnafın veya üreticinin yanındayken bilgilerini girerek üyeliğini ve aboneliğini hemen başlatın.
            </p>

            <div className="flex rounded-2xl bg-slate-800 p-1 my-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDealType("restaurant")}
                className={`flex-1 rounded-xl py-2 cursor-pointer ${
                  dealType === "restaurant" ? "bg-orange-600 text-white" : "text-slate-400"
                }`}
              >
                🏛️ Restoran / Kafe
              </button>
              <button
                type="button"
                onClick={() => setDealType("producer")}
                className={`flex-1 rounded-xl py-2 cursor-pointer ${
                  dealType === "producer" ? "bg-emerald-600 text-white" : "text-slate-400"
                }`}
              >
                🌾 Çiftçi / Üretici
              </button>
            </div>

            {dealSuccess && (
              <div className="mb-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 p-4 text-xs font-bold text-emerald-300">
                {dealSuccess}
              </div>
            )}

            {error && <div className="mb-4 rounded-xl bg-red-950/50 p-3 text-xs text-red-300">{error}</div>}

            <form onSubmit={handleCloseDeal} className="space-y-3.5 text-xs">
              {dealType === "restaurant" ? (
                <>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">İşletme / Restoran Adı *</label>
                    <input
                      required
                      type="text"
                      placeholder="Örn: Doberan Kebap Haus"
                      value={restName}
                      onChange={(e) => setRestName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Telefon</label>
                      <input
                        type="tel"
                        placeholder="0176 12345678"
                        value={restPhone}
                        onChange={(e) => setRestPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">E-posta</label>
                      <input
                        type="email"
                        placeholder="restoran@email.com"
                        value={restEmail}
                        onChange={(e) => setRestEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Posta Kodu</label>
                      <input
                        required
                        type="text"
                        placeholder="18209"
                        value={restZipcode}
                        onChange={(e) => setRestZipcode(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-300 mb-1">Şehir</label>
                      <input
                        required
                        type="text"
                        placeholder="Bad Doberan"
                        value={restCity}
                        onChange={(e) => setRestCity(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Açık Adres</label>
                    <input
                      type="text"
                      placeholder="Markt 5, Bad Doberan"
                      value={restAddress}
                      onChange={(e) => setRestAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Mutfak Türü</label>
                    <select
                      value={restCuisine}
                      onChange={(e) => setRestCuisine(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    >
                      <option value="Döner & Kebap">Döner & Kebap</option>
                      <option value="İtalyan / Pizza / Pasta">İtalyan / Pizza / Pasta</option>
                      <option value="Asya / Wok / Sushi">Asya / Wok / Sushi</option>
                      <option value="Burger & Fast Food">Burger & Fast Food</option>
                      <option value="Alman / Yerel Mutfak">Alman / Yerel Mutfak</option>
                      <option value="Fırın & Pastane">Fırın & Pastane</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Başlangıç Abonelik Paketi</label>
                    <select
                      value={restPlan}
                      onChange={(e) => setRestPlan(e.target.value)}
                      className="w-full rounded-xl border border-amber-500/50 bg-slate-800 p-2.5 text-white outline-none font-bold"
                    >
                      <option value="basic">Basic Paket (9,90 € / ay) · Menü & Sipariş Yönetimi</option>
                      <option value="premium">Premium Paket (99,90 € / ay) · KDS & İleri Analitik</option>
                    </select>
                  </div>

                  {/* Menü Girişi */}
                  <div className="border-t border-slate-800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">🍽️ İlk Menü Kalemleri (Yerinde Giriş)</span>
                      <button
                        type="button"
                        onClick={() => setRestMenuItems((prev) => [...prev, { name: "", price: "", description: "" }])}
                        className="cursor-pointer text-[11px] font-bold text-indigo-400 hover:underline"
                      >
                        + Ürün Ekle
                      </button>
                    </div>

                    {restMenuItems.map((item, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Ürün Adı (Örn: Döner)"
                          value={item.name}
                          onChange={(e) => setRestMenuItems((prev) => prev.map((it, idx) => idx === i ? { ...it, name: e.target.value } : it))}
                          className="col-span-2 rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none"
                        />
                        <input
                          type="number"
                          step="0.10"
                          placeholder="Fiyat (€)"
                          value={item.price}
                          onChange={(e) => setRestMenuItems((prev) => prev.map((it, idx) => idx === i ? { ...it, price: e.target.value } : it))}
                          className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Üretici / Çiftlik / Balıkçı Adı *</label>
                    <input
                      required
                      type="text"
                      placeholder="Örn: Warnow Organik Balıkçılık"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Üretici Türü</label>
                    <select
                      value={prodType}
                      onChange={(e) => setProdType(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    >
                      <option value="Çiftçi / Tarım">Çiftçi / Tarım</option>
                      <option value="Balıkçı">Balıkçı</option>
                      <option value="Ev Üreticisi / Butik">Ev Üreticisi / Butik</option>
                      <option value="Arıcı / Bal">Arıcı / Bal</option>
                      <option value="Kasap / Şarküteri">Kasap / Şarküteri</option>
                      <option value="Fırın & Zanaat">Fırın & Zanaat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Bölge / Konum</label>
                    <input
                      type="text"
                      placeholder="Örn: Rostock & Çevresi (15 km)"
                      value={prodLocation}
                      onChange={(e) => setProdLocation(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">İletişim Telefonu</label>
                    <input
                      type="tel"
                      placeholder="0176 12345678"
                      value={prodPhone}
                      onChange={(e) => setProdPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-2.5 text-white outline-none"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-orange-500 cursor-pointer shadow-lg mt-4 disabled:opacity-50"
              >
                {submitting
                  ? "Kaydediliyor..."
                  : dealType === "restaurant"
                  ? `⚡ Anahtar Teslim Canlıya Al (+${restPlan === "premium" ? "80.00" : "40.00"} € Prim)`
                  : "⚡ Üreticiyi Canlıya Al (+20.00 € Prim)"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
