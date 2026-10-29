"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type TrackingData = {
  order_id: string;
  restaurant_name: string;
  product_name: string;
  total_amount: number | string;
  payment_status: string;
  payment_required: boolean;
  order_status: string;
  delivery_status: string | null;
  courier_name: string | null;
  courier_phone: string | null;
  created_at: string;
};

type StatusInfo = {
  label: string;
  step: number;
  desc: string;
};

const statusMap: Record<string, StatusInfo> = {
  pending: {
    label: "Sipariş Alındı (Onay Bekliyor)",
    step: 1,
    desc: "Siparişiniz restoranın mutfak ekranına iletildi.",
  },
  accepted: {
    label: "Restoran Onayladı",
    step: 2,
    desc: "Restoran siparişinizi onayladı, hazırlanmaya başlanıyor.",
  },
  preparing: {
    label: "Mutfakta Hazırlanıyor 🍳",
    step: 3,
    desc: "Şeflerimiz yemeğinizi taze malzemelerle hazırlıyor.",
  },
  ready: {
    label: "Paket Hazır / Kurye Bekliyor",
    step: 4,
    desc: "Yemeğiniz paketlendi, mahalle kuryemize devrediliyor.",
  },
  assigned: {
    label: "Mahalle Kuryesi Atandı 🚲",
    step: 5,
    desc: "Kuryemiz paketinizi teslim almak üzere yola çıktı.",
  },
  picked_up: {
    label: "Kurye Yolda 🚀",
    step: 6,
    desc: "Sıcak yemeğiniz bisikletle adresinize getiriliyor.",
  },
  delivered: {
    label: "Kapıda Teslim Edildi ✅",
    step: 7,
    desc: "Afiyet olsun! Solidareaty'yi tercih ettiğiniz için teşekkür ederiz.",
  },
  completed: {
    label: "Sipariş Tamamlandı",
    step: 7,
    desc: "İşlem başarıyla tamamlandı.",
  },
  cancelled: {
    label: "Sipariş İptal Edildi ❌",
    step: 0,
    desc: "Bu sipariş iptal edilmiştir.",
  },
};

function checkoutTokenStorageKey(orderId: string) {
  return `umecke:checkout-access:${orderId}`;
}

export default function OrderTrackingPage() {
  const [orderIdInput, setOrderIdInput] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [checkoutAccessToken, setCheckoutAccessToken] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("order_id");

    if (id) {
      setOrderIdInput(id);
      setOrderId(id);

      const token =
        sessionStorage.getItem(checkoutTokenStorageKey(id)) || "";

      setCheckoutAccessToken(token);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setHasSession(Boolean(data.session));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;

    setCheckoutAccessToken(
      sessionStorage.getItem(checkoutTokenStorageKey(orderId)) || ""
    );
    setCheckoutError("");
  }, [orderId]);

  const fetchTracking = useCallback(async (id: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token =
      sessionStorage.getItem(checkoutTokenStorageKey(id)) || "";

    const response = await fetch("/api/order/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        order_id: id,
        checkout_access_token: token || undefined,
      }),
      cache: "no-store",
    });

    const payload = await response.json();

    if (!response.ok || !payload?.success || !payload?.tracking) {
      throw new Error(
        payload?.error || "Takip bilgisi alınamadı."
      );
    }

    return payload.tracking as TrackingData;
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let active = true;

    const loadTracking = async () => {
      setLoading(true);
      setError("");

      try {
        const nextTracking = await fetchTracking(orderId);

        if (!active) return;

        setTracking(nextTracking);

        // Misafir erişim anahtarını ödeme tamamlanınca da silmiyoruz:
        // takip API'si sonraki yenilemelerde de aynı anahtarı doğrular.
      } catch (err) {
        if (!active) return;

        setTracking(null);
        setError(
          err instanceof Error
            ? err.message
            : "Takip bilgisi alınamadı."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadTracking();

    const interval = window.setInterval(() => {
      void loadTracking();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderId, fetchTracking]);

  const handleResumePayment = async () => {
    if (!tracking || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token =
        sessionStorage.getItem(
          checkoutTokenStorageKey(tracking.order_id)
        ) || checkoutAccessToken;

      if (!token && !session) {
        throw new Error(
          "Misafir ödemesine aynı tarayıcı sekmesinden devam edin. Erişim anahtarı URL'de saklanmaz."
        );
      }

      const response = await fetch("/api/order/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          order_id: tracking.order_id,
          checkout_access_token: token || undefined,
        }),
        cache: "no-store",
      });

      const payload = await response.json();

      if (
        !response.ok ||
        !payload?.success ||
        !payload?.checkout_url
      ) {
        throw new Error(
          payload?.error || "Ödeme sayfası tekrar açılamadı."
        );
      }

      window.location.href = payload.checkout_url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Ödeme sayfası tekrar açılamadı."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const id = orderIdInput.trim();
    if (!id) return;

    setTracking(null);
    setError("");
    setOrderId(id);

    window.history.replaceState(
      {},
      "",
      `/track?order_id=${encodeURIComponent(id)}`
    );
  };

  const currentStatusInfo = tracking
    ? statusMap[
        tracking.delivery_status || tracking.order_status
      ] || {
        label: tracking.order_status,
        step: 2,
        desc: "Siparişiniz işleniyor.",
      }
    : null;

  const paymentPending =
    tracking?.payment_required === true &&
    tracking.payment_status === "pending" &&
    tracking.order_status !== "cancelled";

  const canResumePayment =
    Boolean(checkoutAccessToken) || hasSession;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold text-stone-500 hover:text-orange-700"
          >
            ← Ana sayfaya dön
          </Link>

          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Canlı Takip
          </span>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Sipariş Canlı Takibi
          </h1>

          <p className="mt-1 text-xs text-stone-500">
            Sipariş numaranızı girerek hazırlık ve kurye aşamasını anlık takip edin.
          </p>

          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Sipariş ID"
              value={orderIdInput}
              onChange={(event) => setOrderIdInput(event.target.value)}
              className="flex-1 rounded-xl border border-stone-300 p-3 text-xs font-mono outline-none focus:ring-2 focus:ring-black"
            />

            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white shadow-md hover:bg-orange-700"
            >
              Sorgula
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        {loading && !tracking && (
          <div className="py-12 text-center text-xs font-bold text-stone-400">
            Sipariş aranıyor...
          </div>
        )}

        {tracking && currentStatusInfo && (
          <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-100 pb-4">
              <div>
                <span className="font-mono text-[11px] font-bold text-stone-400">
                  #{tracking.order_id}
                </span>

                <h2 className="mt-0.5 text-xl font-black text-slate-900">
                  {tracking.restaurant_name}
                </h2>
              </div>

              <div className="text-right">
                <div className="text-lg font-black text-orange-600">
                  {Number(tracking.total_amount).toFixed(2)} €
                </div>
                <div className="text-[11px] text-stone-400">
                  {new Date(tracking.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {paymentPending && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-black text-amber-950">
                  Ödeme tamamlanmadı
                </h3>

                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Ödeme sayfasından geri döndüyseniz aynı sipariş için güvenli
                  şekilde tekrar devam edebilirsiniz.
                </p>

                {checkoutError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-lg bg-white p-3 text-xs font-bold text-rose-700"
                  >
                    {checkoutError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleResumePayment()}
                  disabled={checkoutLoading || !canResumePayment}
                  className="mt-3 w-full rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading
                    ? "Ödeme sayfası açılıyor…"
                    : "Ödemeye devam et"}
                </button>

                {!canResumePayment && (
                  <p className="mt-2 text-[11px] text-amber-900">
                    Misafir ödemesinde, siparişi verdiğiniz aynı tarayıcı
                    sekmesini kullanın. Güvenlik anahtarı URL’de saklanmaz.
                  </p>
                )}
              </section>
            )}

            <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white shadow-lg">
              <div className="text-xs font-bold uppercase tracking-wider text-orange-100">
                Güncel Durum
              </div>

              <div className="mt-1 text-2xl font-black">
                {currentStatusInfo.label}
              </div>

              <p className="mt-2 text-xs leading-relaxed text-orange-50">
                {currentStatusInfo.desc}
              </p>
            </div>

            <div className="space-y-1 rounded-2xl border border-stone-100 bg-stone-50 p-4 text-xs">
              <div className="font-bold uppercase tracking-wider text-stone-500">
                Sipariş İçeriği
              </div>

              <div className="text-sm font-bold text-stone-800">
                {tracking.product_name}
              </div>
            </div>

            {tracking.courier_name && (
              <div className="space-y-1 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-black text-emerald-800">
                  <span>🚲 Mahalle Kuryeniz:</span>
                  {tracking.courier_name}
                </div>

                {tracking.courier_phone && (
                  <div>İletişim: 📞 {tracking.courier_phone}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}