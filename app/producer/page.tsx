"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Membership = { producer_id: string; producer_name: string; producer_type: string; producer_location: string | null; producer_role: string; verification_status: string; documents_status: string; is_active: boolean };
type Item = { product_name: string; quantity: number; unit_label: string; unit_price: number | string; line_total: number | string };
type Order = { order_id: string; producer_id: string; buyer_type: string; order_status: string; payment_status: string; subtotal: number | string; grand_total: number | string; currency: string; notes?: string | null; created_at: string; items: Item[] };
type Tab = "new" | "preparing" | "ready" | "completed" | "cancelled";

const transitions: Record<string, Array<[string, string]>> = {
  pending: [["accepted", "Kabul et"], ["cancelled", "Reddet"]],
  accepted: [["preparing", "Hazırlanmaya al"]],
  preparing: [["ready", "Hazır işaretle"]],
  ready: [["completed", "Tamamlandı"]],
};

const tabLabels: Record<Tab, string> = { new: "Yeni", preparing: "Hazırlanıyor", ready: "Hazır", completed: "Sipariş Geçmişi", cancelled: "İptal / Red" };

function tabMatches(order: Order, tab: Tab) {
  if (tab === "new") return order.order_status === "pending";
  if (tab === "preparing") return ["accepted", "preparing"].includes(order.order_status);
  if (tab === "ready") return ["ready", "assigned", "out_for_delivery"].includes(order.order_status);
  if (tab === "completed") return ["delivered", "completed"].includes(order.order_status);
  return ["cancelled", "rejected"].includes(order.order_status);
}

export default function ProducerPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Membership[]>([]);
  const [producerId, setProducerId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [historySearch, setHistorySearch] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");

  async function loadMemberships() {
    const { data, error: rpcError } = await supabase.rpc("get_my_producer_memberships");
    if (rpcError) throw rpcError;
    setMembers(data || []);
    if (!producerId && data?.[0]) setProducerId(data[0].producer_id);
    return data || [];
  }

  async function loadOrders(id = producerId) {
    if (!id) return;
    const { data, error: rpcError } = await supabase.rpc("get_my_producer_orders", { p_producer_id: id });
    if (rpcError) throw rpcError;
    setOrders(data || []);
  }

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError || !data.session) { setError("E-posta veya şifre hatalı."); setLoading(false); return; }
    try { await loadMemberships(); setLogged(true); setPassword(""); }
    catch (e) { await supabase.auth.signOut(); setError(e instanceof Error ? e.message : "Üretici hesabı yüklenemedi."); }
    finally { setLoading(false); }
  }

  async function changeStatus(orderId: string, status: string) {
    setError("");
    const { data, error: rpcError } = await supabase.rpc("update_producer_order_status", { p_order_id: orderId, p_new_status: status });
    if (rpcError || data !== true) { setError(rpcError?.message || "Sipariş durumu güncellenemedi."); return; }
    await loadOrders();
  }

  function logout() { supabase.auth.signOut(); setLogged(false); setMembers([]); setOrders([]); }

  useEffect(() => { setLoading(false); }, []);
  useEffect(() => {
    if (!logged || !producerId) return;
    let disposed = false;
    const refresh = async () => { try { if (!disposed) await loadOrders(); } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : "Siparişler yenilenemedi."); } };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { disposed = true; window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [logged, producerId]);

  const member = members.find((m) => m.producer_id === producerId) || members[0];
  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (!tabMatches(order, activeTab)) return false;
    if (activeTab !== "completed" && activeTab !== "cancelled") return true;
    const searchable = `${order.order_id} ${order.items?.map((i) => i.product_name).join(" ") || ""}`.toLowerCase();
    const matchesSearch = searchable.includes(historySearch.toLowerCase());
    const created = new Date(order.created_at).getTime();
    const fromOk = historyFrom ? created >= new Date(`${historyFrom}T00:00:00`).getTime() : true;
    const toOk = historyTo ? created <= new Date(`${historyTo}T23:59:59.999`).getTime() : true;
    return matchesSearch && fromOk && toOk;
  }), [orders, activeTab, historySearch, historyFrom, historyTo]);

  const counts = { new: orders.filter((o) => tabMatches(o, "new")).length, preparing: orders.filter((o) => tabMatches(o, "preparing")).length, ready: orders.filter((o) => tabMatches(o, "ready")).length, completed: orders.filter((o) => tabMatches(o, "completed")).length, cancelled: orders.filter((o) => tabMatches(o, "cancelled")).length };

  if (!logged) return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white"><form onSubmit={login} className="w-full max-w-md rounded-3xl bg-slate-900 p-8"><h1 className="text-3xl font-black">Üretici Paneli</h1><p className="mt-2 text-slate-400">Ürünlerinizi ve siparişlerinizi yönetin.</p><input required type="email" placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-6 w-full rounded-xl bg-slate-800 p-3" /><input required type="password" placeholder="Şifre" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-3 w-full rounded-xl bg-slate-800 p-3" />{error && <p className="mt-3 text-red-300">{error}</p>}<button disabled={loading} className="mt-5 w-full rounded-xl bg-emerald-600 p-3 font-bold">{loading ? "Giriş yapılıyor..." : "Giriş yap"}</button></form></main>;

  return <main className="min-h-screen bg-stone-100 p-4 text-stone-900 sm:p-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">{member?.producer_name || "Üretici Paneli"}</h1><p className="text-stone-500">{member?.producer_type} · {member?.producer_location}</p><p className="mt-1 text-xs text-emerald-700">● Canlı yenileme · 5 saniyede bir</p></div><button onClick={logout} className="rounded-xl bg-stone-900 px-4 py-2 font-bold text-white">Çıkış</button></div>{error && <div className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}<div className="mt-6 rounded-2xl bg-white p-4"><label className="text-sm font-bold">Üretici<select value={producerId} onChange={(e) => { setProducerId(e.target.value); loadOrders(e.target.value); }} className="ml-3 rounded-lg border p-2">{members.map((m) => <option key={m.producer_id} value={m.producer_id}>{m.producer_name}</option>)}</select></label><span className="ml-4 text-xs text-emerald-700">Durum: {member?.verification_status}</span></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">{(["new", "preparing", "ready", "completed", "cancelled"] as Tab[]).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl p-3 text-left ${activeTab === tab ? "bg-emerald-700 text-white" : "bg-white text-stone-700"}`}><div className="text-xs font-bold">{tabLabels[tab]}</div><div className="mt-1 text-2xl font-black">{counts[tab]}</div></button>)}</div>{(activeTab === "completed" || activeTab === "cancelled") && <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-white p-4"><input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Sipariş veya ürün ara" className="flex-1 rounded-lg border p-2" /><input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="rounded-lg border p-2" /><input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="rounded-lg border p-2" /></div>}<div className="mt-6 grid gap-5">{visibleOrders.map((o) => <article key={o.order_id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-black">#{o.order_id.slice(0, 8)} · {o.buyer_type === "restaurant" ? "Restoran" : "Tüketici"}</h2><p className="text-sm text-stone-500">{new Date(o.created_at).toLocaleString()} · Ödeme: {o.payment_status} · Durum: {o.order_status}</p></div><strong className="text-xl">{Number(o.grand_total).toFixed(2)} {o.currency}</strong></div><div className="mt-4 space-y-2">{(o.items || []).map((item) => <div key={item.product_name + item.quantity} className="flex justify-between border-b py-2 text-sm"><span>{item.product_name} · {item.quantity} {item.unit_label}</span><span>{Number(item.line_total).toFixed(2)} €</span></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{o.payment_status === "paid" ? (transitions[o.order_status] || []).map(([status, label]) => <button key={status} onClick={() => changeStatus(o.order_id, status)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">{label}</button>) : <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800">Ödeme bekleniyor — işlem kapalı</span>}</div></article>)}{!visibleOrders.length && <div className="rounded-2xl bg-white p-12 text-center text-stone-500">Bu bölümde sipariş yok.</div>}</div></div></main>;
}
