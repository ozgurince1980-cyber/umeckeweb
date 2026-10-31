"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type WalletData = {
  points_balance: number;
  total_earned_points: number;
  cashback_balance: number | string;
};

type Tx = {
  id: string;
  amount_changed: number;
  cashback_changed: number | string;
  transaction_type: string;
  description: string | null;
  created_at: string;
};

export default function CustomerWalletPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);

  async function loadWalletData() {
    try {
      const { data: wData, error: wErr } = await supabase.rpc("get_customer_wallet");
      if (wErr) throw wErr;
      const w = Array.isArray(wData) ? wData[0] : wData;
      setWallet(w || { points_balance: 0, total_earned_points: 0, cashback_balance: 0 });

      const { data: txData, error: txErr } = await supabase
        .from("customer_wallet_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (txErr) throw txErr;
      setTransactions((txData || []) as Tx[]);
    } catch (err) {
      console.error("Cüzdan yükleme hatası:", err);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authErr || !data.session) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    try {
      await loadWalletData();
      setLogged(true);
      setPassword("");
    } catch (x) {
      await supabase.auth.signOut();
      setError(x instanceof Error ? x.message : "Cüzdan bilgileri alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    supabase.auth.signOut();
    setLogged(false);
    setWallet(null);
    setTransactions([]);
  }

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadWalletData();
        setLogged(true);
      }
      setLoading(false);
    }
    checkSession();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-950 p-4 text-white">
        <div className="font-bold">Mahalle Cüzdanı Yükleniyor...</div>
      </main>
    );
  }

  if (!logged) {
    return (
      <main className="min-h-screen bg-stone-950 px-4 py-12 text-white sm:px-8 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-stone-800 bg-stone-900 p-8 shadow-2xl space-y-6">
          <Link href="/" className="text-xs font-bold text-stone-400 hover:text-white">
            ← Ana sayfaya dön
          </Link>
          <div className="text-4xl">💰</div>
          <div>
            <h1 className="text-2xl font-black">Mahalle Cüzdanım</h1>
            <p className="mt-1 text-xs text-stone-400">Puanlarınızı ve cashback bakiyenizi görmek için giriş yapın.</p>
          </div>

          {error && <div className="rounded-xl bg-red-950/50 p-3 text-xs text-red-300">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-400 mb-1">E-posta</label>
              <input
                required
                type="email"
                placeholder="musteri@ornek.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 p-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-400 mb-1">Şifre</label>
              <input
                required
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-800 p-3 text-white outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-600 py-3.5 font-black text-white hover:bg-orange-700 cursor-pointer shadow-lg"
            >
              Cüzdanıma Giriş Yap
            </button>
          </form>
        </div>
      </main>
    );
  }

  const euroEquivalent = ((wallet?.points_balance || 0) / 100).toFixed(2);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-slate-900 via-stone-900 to-slate-950 p-6 text-white shadow-xl">
          <div>
            <span className="text-xs font-bold text-amber-400">Solidareaty Sadakat Programı</span>
            <h1 className="text-2xl font-black mt-1">Mahalle Cüzdanı &amp; Puanlar</h1>
            <p className="mt-1 text-xs text-stone-400">Her yerel alışverişinizde kazanın, sonraki siparişinizde harcayın.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-2xl bg-stone-800 px-4 py-3 text-xs font-bold text-stone-300 hover:bg-stone-700 border border-stone-700"
            >
              Alışverişe Devam Et
            </Link>
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-2xl bg-rose-950/80 px-4 py-3 text-xs font-bold text-rose-200 hover:bg-rose-900 border border-rose-800"
            >
              Çıkış
            </button>
          </div>
        </div>

        {/* Cüzdan Kartları */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-2">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Mahalle Puanı</div>
            <div className="text-3xl font-black text-orange-600">{wallet?.points_balance || 0} p</div>
            <div className="text-xs text-stone-500 font-medium">Değeri: <strong>{euroEquivalent} €</strong> indirim</div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-2">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Toplam Kazanılan</div>
            <div className="text-3xl font-black text-emerald-700">{wallet?.total_earned_points || 0} p</div>
            <div className="text-xs text-stone-500 font-medium">Tüm zamanların toplamı</div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-2">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Nakit İade (Cashback)</div>
            <div className="text-3xl font-black text-indigo-700">{Number(wallet?.cashback_balance || 0).toFixed(2)} €</div>
            <div className="text-xs text-stone-500 font-medium">Biriken doğrudan iade tutarı</div>
          </div>
        </div>

        {/* Cüzdan Hareketleri */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-stone-900">Cüzdan &amp; Puan Hareketleri</h2>

          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center text-xs text-stone-400">
              Henüz cüzdan hareketiniz bulunmuyor. Sipariş vererek mahalle puanı kazanmaya başlayın!
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 p-4 text-xs border border-stone-100"
                >
                  <div>
                    <div className="font-bold text-stone-900">{tx.description || tx.transaction_type}</div>
                    <div className="mt-1 text-[11px] text-stone-400">{new Date(tx.created_at).toLocaleString()}</div>
                  </div>

                  <div className="text-right">
                    <span className={`font-black text-sm ${tx.amount_changed >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {tx.amount_changed >= 0 ? `+${tx.amount_changed} p` : `${tx.amount_changed} p`}
                    </span>
                    {Number(tx.cashback_changed) !== 0 && (
                      <div className="text-[11px] font-bold text-indigo-700">
                        {Number(tx.cashback_changed) >= 0 ? `+${Number(tx.cashback_changed).toFixed(2)} €` : `${Number(tx.cashback_changed).toFixed(2)} €`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}