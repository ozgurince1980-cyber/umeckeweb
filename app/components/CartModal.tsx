"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LuckyWheelModal from "./LuckyWheelModal";

interface CartModalProps {
  items: any[];
  onClose: () => void;
  onUpdateQuantity: (cartId: string, delta: number) => void;
  onClearCart: () => void;
  restaurantPhone?: string;
  restaurantName: string;
  restaurantId?: string;
}

function checkoutTokenStorageKey(orderId: string) {
  return `umecke:checkout-access:${orderId}`;
}

export default function CartModal({
  items,
  onClose,
  onUpdateQuantity,
  onClearCart,
  restaurantPhone,
  restaurantName,
  restaurantId,
}: CartModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [serviceOption, setServiceOption] = useState("Paket Servis");
  const [paymentMethod, setPaymentMethod] = useState("Nakit");
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{
    id: string;
    total: number;
    paymentMethod: string;
  } | null>(null);

  const [courierCount, setCourierCount] = useState<number | null>(null);
  const [courierLoading, setCourierLoading] = useState(true);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [showWheel, setShowWheel] = useState(false);

  const [wallet, setWallet] = useState<{
    points_balance: number;
    cashback_balance: number;
  } | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToSpend, setPointsToSpend] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);

  useEffect(() => {
    async function loadWalletAndCouriers() {
      try {
        const { data: walletData } = await supabase.rpc("get_customer_wallet");
        const walletRow = Array.isArray(walletData)
          ? walletData[0]
          : walletData;

        if (walletRow) {
          setWallet({
            points_balance: Number(walletRow.points_balance || 0),
            cashback_balance: Number(walletRow.cashback_balance || 0),
          });
        }
      } catch (error) {
        console.warn("Cüzdan okunamadı (giriş yapılmamış olabilir):", error);
      }

      try {
        const { data, error } = await supabase.rpc(
          "get_available_couriers_count"
        );

        if (!error && typeof data === "number") {
          setCourierCount(data);

          if (data === 0) {
            setServiceOption("Gel-Al");
          }
        }
      } catch (error) {
        console.warn("Kurye sayısı alınamadı:", error);
      } finally {
        setCourierLoading(false);
      }
    }

    void loadWalletAndCouriers();
  }, []);

  const itemsTotal = items.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  const baseDeliveryFee = serviceOption === "Paket Servis" ? 3.5 : 0;
  const isFreeDeliveryCoupon =
    appliedCoupon?.discountType === "free_delivery";
  const actualDeliveryFee = isFreeDeliveryCoupon ? 0 : baseDeliveryFee;
  const couponDiscount = isFreeDeliveryCoupon
    ? 0
    : Number(appliedCoupon?.discountAmount || 0);

  const pointsDiscountValue = usePoints ? Number(pointsDiscount || 0) : 0;
  const totalDiscount = couponDiscount + pointsDiscountValue;
  const totalPrice = Math.max(
    0,
    itemsTotal - totalDiscount + actualDeliveryFee
  );

  const applyCouponCode = async (codeToApply = couponCode) => {
    const code = codeToApply.trim().toUpperCase();

    if (!code) return;

    setCouponLoading(true);
    setCouponError("");

    try {
      const { data, error } = await supabase.rpc("validate_coupon", {
        p_code: code,
        p_subtotal: itemsTotal,
        p_customer_phone: customerPhone ? customerPhone.trim() : null,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result || !result.is_valid) {
        setCouponError(result?.message || "Geçersiz kupon kodu.");
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code,
        discountAmount: Number(result.discount_amount || 0),
        discountType: result.discount_type || "percentage",
        message: result.message,
      });

      setCouponCode(code);
    } catch (error) {
      console.error("Kupon hatası:", error);
      setCouponError("Kupon doğrulanamadı.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSendOrder = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Lütfen adınızı ve telefon numaranızı girin.");
      return;
    }

    if (!restaurantId) {
      alert(
        "Restoran bilgisi bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin."
      );
      return;
    }

    if (!items.length) {
      alert("Sepetiniz boş.");
      return;
    }

    if (serviceOption === "Paket Servis" && courierCount === 0) {
      alert(
        "Şu anda müsait kurye bulunmuyor. Lütfen Gel-Al veya Mekanda Servis seçin."
      );
      return;
    }

    if (serviceOption === "Paket Servis" && !deliveryAddress.trim()) {
      alert("Lütfen teslimat adresinizi yazın.");
      return;
    }

    if (isFreeDeliveryCoupon && serviceOption !== "Paket Servis") {
      alert(
        "Ücretsiz teslimat kuponu yalnızca paket servis siparişlerinde geçerlidir."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (usePoints && pointsToSpend > 0 && !session) {
        alert("Puan kullanmak için müşteri hesabınızla giriş yapmalısınız.");
        return;
      }

      if (paymentRequired && usePoints && pointsToSpend > 0) {
        alert("Stripe online ödemede puan kullanımı şimdilik kapalıdır.");
        return;
      }

      const productSummary = items
        .map((item) => `${Number(item.quantity) || 1}x ${item.name}`)
        .join(", ");

      const orderItems = items.map((item) => ({
        menu_item_id: Number(item.id),
        product_name: String(item.name || "Product"),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.price) || 0,
        selected_option_ids: Array.isArray(item.selected_option_ids)
          ? item.selected_option_ids.map(Number)
          : [],
      }));

      const hasInvalidItem = orderItems.some(
        (item) =>
          !Number.isInteger(item.menu_item_id) ||
          item.menu_item_id <= 0 ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unit_price) ||
          item.unit_price < 0
      );

      if (hasInvalidItem) {
        alert(
          "Sepette geçersiz bir ürün var. Lütfen ürünü kaldırıp tekrar ekleyin."
        );
        return;
      }

      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          customer_phone: customerPhone.trim(),
          order_type: "whatsapp",
          total_amount: totalPrice,
          notes: [
            `Customer: ${customerName.trim()}`,
            `Service: ${serviceOption}`,
            `Payment: ${paymentMethod}`,
            appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null,
            usePoints && pointsToSpend > 0
              ? `Points redemption: ${pointsToSpend}`
              : null,
            `Address: ${deliveryAddress.trim() || "None"}`,
            `Note: ${orderNote.trim() || "None"}`,
          ]
            .filter(Boolean)
            .join(" | "),
          product_name: productSummary,
          items: orderItems,
          payment_method: paymentMethod,
          payment_required: paymentRequired,
          service_option: serviceOption,
          delivery_required: serviceOption === "Paket Servis",
          delivery_address: deliveryAddress.trim(),
          customer_name: customerName.trim(),
          order_note: orderNote.trim(),
          delivery_fee: baseDeliveryFee,
          coupon_code: appliedCoupon?.code || null,
          points_to_spend:
            usePoints && !paymentRequired ? pointsToSpend : 0,
        }),
      });

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || !result?.success) {
        console.error("Sipariş API hatası:", result);
        alert(result?.error || "Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }

      if (paymentRequired) {
        const checkoutAccessToken = result.checkout_access_token;

        if (
          typeof checkoutAccessToken !== "string" ||
          !/^[0-9a-f]{64}$/i.test(checkoutAccessToken)
        ) {
          throw new Error(
            "Güvenli ödeme erişimi oluşturulamadı. Lütfen tekrar deneyin."
          );
        }

        // Token yalnızca bu sekmede tutulur; URL'ye eklenmez.
        sessionStorage.setItem(
          checkoutTokenStorageKey(String(result.order_id)),
          checkoutAccessToken
        );

        const checkoutResponse = await fetch("/api/order/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {}),
          },
          body: JSON.stringify({
            order_id: result.order_id,
            checkout_access_token: checkoutAccessToken,
          }),
        });

        const checkoutResult = await checkoutResponse.json();

        if (
          !checkoutResponse.ok ||
          !checkoutResult?.success ||
          !checkoutResult?.checkout_url
        ) {
          throw new Error(
            checkoutResult?.error || "Online ödeme sayfası oluşturulamadı."
          );
        }

        window.location.href = checkoutResult.checkout_url;
        return;
      }

      // Website orders remain on the website. WhatsApp inbound ordering is
      // handled separately by its own webhook and is not changed here.
      onClearCart();

      setPlacedOrder({
        id: String(result.order_id),
        total: totalPrice,
        paymentMethod,
      });

      return;
    } catch (error) {
      console.error("Sipariş gönderme hatası:", error);
      alert(
        "Sipariş gönderilirken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <section
          role="status"
          className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-2xl"
        >
          <div className="text-5xl" aria-hidden="true">
            ✅
          </div>

          <h2 className="mt-4 text-2xl font-black text-stone-900">
            Siparişiniz alındı
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            Siparişiniz {restaurantName} işletmesine iletildi ve mutfak
            ekranına kaydedildi.
          </p>

          <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-stone-500">Sipariş numarası</span>
              <strong className="font-mono text-stone-900">
                {placedOrder.id.slice(0, 8).toUpperCase()}
              </strong>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-stone-500">Ödeme yöntemi</span>
              <strong className="text-stone-900">
                {placedOrder.paymentMethod}
              </strong>
            </div>

            <div className="mt-2 flex justify-between gap-4 border-t border-stone-200 pt-2">
              <span className="font-bold text-stone-700">Toplam</span>
              <strong className="text-stone-900">
                {placedOrder.total.toFixed(2)} €
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-black text-white hover:bg-emerald-800"
          >
            Tamam
          </button>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-gray-50 p-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Siparişi Tamamla
              </h2>
              <p className="text-sm text-gray-500">{restaurantName}</p>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 font-bold text-gray-700 hover:bg-gray-300"
              type="button"
              aria-label="Close cart"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-800">
                Sepetteki ürünler
              </h3>

              <div className="space-y-3">
                {items.map((item) => {
                  const quantity = Number(item.quantity) || 1;
                  const price = Number(item.price) || 0;

                  return (
                    <div
                      key={item.cartId}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex-1 pr-3">
                        <h4 className="font-semibold text-gray-900">
                          {item.name}
                        </h4>

                        {Array.isArray(item.selectedOptions) &&
                          item.selectedOptions.length > 0 && (
                            <p className="mt-1 text-[11px] text-stone-600">
                              {item.selectedOptions
                                .map(
                                  (option: any) =>
                                    `${option.group_name}: ${option.name}`
                                )
                                .join(" · ")}
                            </p>
                          )}

                        <span className="mt-1 block text-sm font-bold text-green-600">
                          {(price * quantity).toFixed(2)} €
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            onUpdateQuantity(item.cartId, -1)
                          }
                          className="h-7 w-7 rounded-lg border bg-white font-bold text-gray-700 hover:bg-gray-100"
                          type="button"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>

                        <span className="min-w-[20px] text-center text-sm font-bold">
                          {quantity}
                        </span>

                        <button
                          onClick={() =>
                            onUpdateQuantity(item.cartId, 1)
                          }
                          className="h-7 w-7 rounded-lg border bg-white font-bold text-gray-700 hover:bg-gray-100"
                          type="button"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className="border-gray-100" />

            <form onSubmit={handleSendOrder} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-800">
                Teslimat ve iletişim bilgileri
              </h3>

              {!courierLoading && (
                <div
                  className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs ${
                    courierCount && courierCount > 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <span className="text-base">
                    {courierCount && courierCount > 0 ? "🚲" : "⚠️"}
                  </span>

                  <div>
                    {courierCount && courierCount > 0 ? (
                      <div>
                        <strong>
                          Aktif mahalle kuryesi ({courierCount}):
                        </strong>{" "}
                        Paket servis kullanılabilir.
                      </div>
                    ) : (
                      <div>
                        <strong>Şu anda müsait mahalle kuryesi yok.</strong>{" "}
                        Gel-Al veya Mekanda Servis seçin.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Ad Soyad"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="Telefon numarası"
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Servis türü
                  </label>
                  <select
                    value={serviceOption}
                    onChange={(event) =>
                      setServiceOption(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                  >
                    <option
                      value="Paket Servis"
                      disabled={courierCount === 0}
                    >
                      Paket Servis{" "}
                      {courierCount === 0
                        ? "(Kurye yok)"
                        : "(+3,50 €)"}
                    </option>
                    <option value="Gel-Al">Gel-Al</option>
                    <option value="Mekanda Servis">Mekanda Servis</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Ödeme yöntemi
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPaymentMethod(value);
                      setPaymentRequired(value === "Stripe Online");
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="Nakit">Nakit</option>
                    <option value="Kredi Kartı / POS">
                      Kredi Kartı / POS
                    </option>
                    <option value="Stripe Online">Stripe Online</option>
                  </select>

                  {paymentRequired && (
                    <p className="mt-1 text-[11px] text-blue-700">
                      Stripe güvenli ödeme sayfasına yönlendirileceksiniz.
                    </p>
                  )}
                </div>
              </div>

              {serviceOption === "Paket Servis" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Teslimat adresi *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Sokak, bina, daire, posta kodu / şehir"
                    value={deliveryAddress}
                    onChange={(event) =>
                      setDeliveryAddress(event.target.value)
                    }
                    className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              )}

              <div className="space-y-2 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    🎟️ İndirim kuponu
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWheel(true)}
                    className="text-xs font-bold text-orange-600 underline hover:text-orange-700"
                  >
                    🎡 Şans çarkını çevir
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Kupon kodu"
                    value={couponCode}
                    onChange={(event) => {
                      const nextCode = event.target.value.toUpperCase();
                      setCouponCode(nextCode);

                      if (
                        appliedCoupon &&
                        nextCode.trim() !== appliedCoupon.code
                      ) {
                        setAppliedCoupon(null);
                      }
                    }}
                    className="flex-1 rounded-lg border border-amber-200 bg-white p-2 text-xs font-bold uppercase outline-none"
                  />

                  <button
                    type="button"
                    disabled={couponLoading || !couponCode.trim()}
                    onClick={() => void applyCouponCode()}
                    className="rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {couponLoading ? "..." : "Uygula"}
                  </button>
                </div>

                {appliedCoupon && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-100/70 p-2 text-xs font-bold text-emerald-800">
                    <span>
                      ✓ {appliedCoupon.code} ({appliedCoupon.message})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                      className="ml-2 text-xs font-bold text-red-600"
                    >
                      Kaldır
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-[11px] font-bold text-red-600">
                    {couponError}
                  </p>
                )}
              </div>

              {wallet && wallet.points_balance > 0 && (
                <div className="space-y-2 rounded-xl border border-amber-200/60 bg-amber-50/40 p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>
                      💰 Mahalle cüzdanı ({wallet.points_balance} puan)
                    </span>

                    <label className="flex cursor-pointer items-center gap-1.5 text-orange-700">
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setUsePoints(checked);

                          if (checked) {
                            const maxAllowedPoints = Math.min(
                              wallet.points_balance,
                              Math.floor(
                                Math.max(0, itemsTotal - couponDiscount) *
                                  100
                              )
                            );
                            setPointsToSpend(maxAllowedPoints);
                            setPointsDiscount(maxAllowedPoints / 100);
                          } else {
                            setPointsToSpend(0);
                            setPointsDiscount(0);
                          }
                        }}
                      />
                      <span>Puanlarımı indirime çevir</span>
                    </label>
                  </div>

                  {usePoints && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-100/60 p-2 text-[11px] text-amber-800">
                      <span>
                        {pointsToSpend} puan kullanılıyor (-
                        {pointsDiscount.toFixed(2)} €)
                      </span>
                      <span className="font-bold">100 puan = 1 €</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Sipariş notu
                </label>
                <input
                  type="text"
                  placeholder="Örn: Zili çalmayın."
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1.5 rounded-xl bg-gray-50 p-3.5 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Ürünler toplamı:</span>
                  <span>{itemsTotal.toFixed(2)} €</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>🎟️ İndirimler:</span>
                    <span>-{totalDiscount.toFixed(2)} €</span>
                  </div>
                )}

                {serviceOption === "Paket Servis" && (
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>🚲 Mahalle kurye ücreti:</span>
                    <span>
                      {isFreeDeliveryCoupon
                        ? "0,00 € (ücretsiz)"
                        : "+3,50 €"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-200 pt-1 text-sm font-black text-gray-900">
                  <span>Genel toplam:</span>
                  <span>{totalPrice.toFixed(2)} €</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-xl bg-green-600 px-6 py-3.5 font-bold text-white shadow-lg transition-colors hover:bg-green-700 disabled:bg-gray-400"
              >
                <span>
                  {isSubmitting
                    ? "Sipariş işleniyor..."
                    : paymentRequired
                      ? "💳 Güvenli ödemeye geç"
                      : "Siparişi Ver"}
                </span>
                <span className="text-lg">{totalPrice.toFixed(2)} €</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {showWheel && (
        <LuckyWheelModal
          onClose={() => setShowWheel(false)}
          onApplyCoupon={(code) => {
            setShowWheel(false);
            setCouponCode(code);
            void applyCouponCode(code);
          }}
        />
      )}
    </>
  );
}