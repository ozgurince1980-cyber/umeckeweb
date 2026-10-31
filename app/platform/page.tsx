"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Summary = {
  gross_sales: number | string;
  commissionable_sales: number | string;
  platform_fees: number | string;
  restaurant_net_amount: number | string;
  refunded_amount: number | string;
  paid_order_count: number;
  ledger_entry_count: number;
  active_subscription_count: number;
  active_subscription_monthly_value: number | string;
  onboarding_pending_restaurant_count: number;
};

function localDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function PlatformAdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const money = (value: number | string | null | undefined) =>
    `${Number(value || 0).toFixed(2)} €`;

  async function loadSummary(nextFrom = from, nextTo = to) {
    setLoading(true);
    setError("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error("Platform admin Auth oturumu bulunamadı.");
      }

      const response = await fetch("/api/finance/platform-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          from: nextFrom ? new Date(`${nextFrom}T00:00:00`).toISOString() : null,
          to: nextTo ? new Date(`${nextTo}T23:59:59.999`).toISOString() : null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Platform finans raporu alınamadı.");
      setSummary(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Platform finans raporu alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  function setPeriod(period: "today" | "yesterday" | "week" | "month" | "all") {
    const now = new Date();
    const end = period === "yesterday" ? localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) : localDate(now);
    let start = "";
    if (period === "yesterday") { const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); start = localDate(yesterday); }
    if (period !== "all") {
      const date = new Date(now);
      if (period === "today") date.setHours(0, 0, 0, 0);
      if (period === "yesterday") { date.setDate(date.getDate() - 1); date.setHours(0, 0, 0, 0); }
      if (period === "yesterday") { date.setDate(date.getDate() - 1); }
      if (period === "week") { const day = date.getDay() || 7; date.setDate(date.getDate() - day + 1); }
      if (period === "month") date.setDate(1);
      start = localDate(date);
    }
    setFrom(start); setTo(end); loadSummary(start, end);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) {
      setAuthError("E-posta veya şifre hatalı.");
      setAuthLoading(false);
      return;
    }
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_admin");
    if (adminError || isAdmin !== true) {
      await supabase.auth.signOut();
      setAuthError("Bu kullanıcı platform yöneticisi değil.");
      setAuthLoading(false);
      return;
    }
    setAuthenticated(true);
    setPassword("");
    setAuthLoading(false);
    await loadSummary();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthenticated(false);
    setSummary(null);
  }

  useEffect(() => {
    async function checkSession() {
      await supabase.auth.signOut();
      setAuthenticated(false);
      setAuthLoading(false);
    }
    checkSession();
  }, []);

  if (authLoading) {
    return <main className="min-h-screen bg-slate-950 p-8 text-slate-100"><div className="mx-auto max-w-md rounded-2xl bg-slate-900 p-8 text-center">Platform admin girişi hazırlanıyor...</div></main>;
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <Link href="/" className="text-sm font-bold text-slate-400 hover:text-white">← Ana sayfa</Link>
          <h1 className="mt-6 text-3xl font-black">Platform Admin Girişi</h1>
          <p className="mt-2 text-sm text-slate-400">Solidareaty platform finans paneli</p>
          <label className="mt-6 block text-sm font-bold">E-posta<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" /></label>
          <label className="mt-4 block text-sm font-bold">Şifre<input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white" /></label>
          {authError && <div className="mt-4 rounded-xl bg-red-950/50 p-3 text-sm text-red-200">{authError}</div>}
          <button type="submit" className="mt-6 w-full rounded-xl bg-indigo-500 px-4 py-3 font-black hover:bg-indigo-400">Giriş Yap</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/" className="text-sm font-bold text-slate-400 hover:text-white">← Ana sayfa</Link><h1 className="mt-3 text-3xl font-black">Platform Finans Dashboard</h1><p className="mt-2 text-slate-400">Solidareaty genel finansal görünümü</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-bold text-emerald-300">Platform Admin</span><button onClick={handleLogout} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold hover:bg-rose-500">Çıkış</button></div>
        </div>
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-center gap-2"><button onClick={() => setPeriod("today")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">Bugün</button><button onClick={() => setPeriod("yesterday")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">Dün</button><button onClick={() => setPeriod("week")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">Bu hafta</button><button onClick={() => setPeriod("month")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">Bu ay</button><button onClick={() => setPeriod("all")} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold hover:bg-slate-700">Tümü</button><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm" /><span className="text-slate-500">–</span><input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm" /><button onClick={() => loadSummary()} disabled={loading} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold hover:bg-indigo-400 disabled:bg-slate-700">{loading ? "Yükleniyor..." : "Uygula / Yenile"}</button></div>
        </section>
        {error && <div className="mt-5 rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-200">{error}</div>}
        {summary && <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Brüt satış", money(summary.gross_sales), "text-white"],["Komisyon matrahı", money(summary.commissionable_sales), "text-white"],["Solidareaty komisyonu", money(summary.platform_fees), "text-orange-300"],["Restoran net payı", money(summary.restaurant_net_amount), "text-emerald-300"],["İadeler", money(summary.refunded_amount), "text-rose-300"],["Ödenmiş sipariş", String(summary.paid_order_count), "text-white"],["Ledger kayıtları", String(summary.ledger_entry_count), "text-white"],["Onboarding bekleyen", String(summary.onboarding_pending_restaurant_count), "text-amber-300"]].map(([label,value,color]) => <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-2xl font-black ${color}`}>{value}</div></div>)}
        </section>}
        {summary && <section className="mt-6 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-black">Abonelik geliri</h2><p className="mt-2 text-sm text-slate-400">Aktif abonelikler ve aylık liste fiyatı toplamı</p><div className="mt-5 flex items-end justify-between"><span className="text-slate-400">Aktif plan sayısı</span><strong className="text-3xl text-violet-300">{summary.active_subscription_count}</strong></div><div className="mt-4 flex items-end justify-between"><span className="text-slate-400">Aylık toplam</span><strong className="text-3xl text-violet-300">{money(summary.active_subscription_monthly_value)}</strong></div></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-lg font-black">Payout durumu</h2><p className="mt-2 text-sm text-slate-400">Connected Account onboarding tamamlanana kadar tutarlar beklemede kalır.</p><div className="mt-5 rounded-xl bg-amber-400/10 p-4 text-amber-200">Onboarding bekleyen restoran sayısı: <strong>{summary.onboarding_pending_restaurant_count}</strong></div><p className="mt-4 text-xs text-slate-500">Canlı payout işlemleri, Stripe Connected Account doğrulaması ve payouts_enabled sonrasında başlatılmalıdır.</p></div></section>}
      </div>
    </main>
  );
}
