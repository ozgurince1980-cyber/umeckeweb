import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY bulunamadı.");
}

const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type IncomingItem = {
  menu_item_id: number;
  product_name?: string;
  quantity: number;
  selected_option_ids: number[];
  expected_unit_price: number | null;
};

function asMoney(value: unknown, fieldName: string): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} geçersiz.`);
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      restaurant_id,
      customer_phone,
      order_type,
      notes,
      product_name,
      items,
    } = body;

    if (!restaurant_id) {
      return NextResponse.json({ success: false, error: "restaurant_id eksik." }, { status: 400 });
    }

    const authorization = request.headers.get("authorization");
    let customerUserId: string | null = null;
    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return NextResponse.json({ success: false, error: "Oturum doğrulanamadı." }, { status: 401 });
      }
      const { data: userData, error: authError } = await publicClient.auth.getUser(match[1]);
      if (authError || !userData.user) {
        return NextResponse.json({ success: false, error: "Oturum süresi dolmuş. Yeniden giriş yapın." }, { status: 401 });
      }
      customerUserId = userData.user.id;
    }

    const validOrderTypes = ["table_qr", "whatsapp", "missed_call"];
    const selectedOrderType = order_type || "whatsapp";
    if (!validOrderTypes.includes(selectedOrderType)) {
      return NextResponse.json({ success: false, error: "Geçersiz sipariş türü." }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Siparişte en az bir ürün bulunmalıdır." }, { status: 400 });
    }

    const incomingItems: IncomingItem[] = items.map((item: any) => ({
      menu_item_id: Number(item.menu_item_id),
      product_name: item.product_name ? String(item.product_name) : undefined,
      quantity: Number(item.quantity),
      selected_option_ids: Array.isArray(item.selected_option_ids) ? item.selected_option_ids.map(Number) : [],
      expected_unit_price: item.unit_price === undefined ? null : Number(item.unit_price),
    }));
    const invalidItem = incomingItems.some((item) =>
      !Number.isInteger(item.menu_item_id) || item.menu_item_id <= 0 ||
      !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 100
    );
    if (incomingItems.some((item) => item.expected_unit_price !== null && (!Number.isFinite(item.expected_unit_price) || item.expected_unit_price < 0))) {
      return NextResponse.json({ success: false, error: "Ürün fiyatı geçersiz." }, { status: 400 });
    }
    if (invalidItem) {
      return NextResponse.json({ success: false, error: "Sipariş ürünlerinden biri geçersiz." }, { status: 400 });
    }

    const paymentMethod = String(body.payment_method || "Nakit");
    const paymentRequired = body.payment_required === true;
    if (!["Nakit", "Kredi Kartı / POS", "Stripe Online"].includes(paymentMethod)) {
      return NextResponse.json({ success: false, error: "Geçersiz ödeme yöntemi." }, { status: 400 });
    }
    if ((paymentRequired && paymentMethod !== "Stripe Online") || (!paymentRequired && paymentMethod === "Stripe Online")) {
      return NextResponse.json({ success: false, error: "Ödeme yöntemi ve ödeme gerekliliği eşleşmiyor." }, { status: 400 });
    }

    const pointsToSpend = Number(body.points_to_spend ?? 0);
    if (!Number.isInteger(pointsToSpend) || pointsToSpend < 0) {
      return NextResponse.json({ success: false, error: "Harcanacak puan miktarı geçersiz." }, { status: 400 });
    }
    if (pointsToSpend > 0 && !customerUserId) {
      return NextResponse.json({ success: false, error: "Puan kullanmak için müşteri hesabınızla giriş yapmalısınız." }, { status: 401 });
    }
    if (pointsToSpend > 0 && paymentRequired) {
      return NextResponse.json({ success: false, error: "Stripe online ödemede puan kullanımı şimdilik kapalıdır." }, { status: 400 });
    }

    // Never trust a coupon discount amount from the browser; only accept its code.
    // The raw token is returned once to the client; only its SHA-256 hash is stored.
    const checkoutAccessToken = paymentRequired
      ? randomBytes(32).toString("hex")
      : null;
    const checkoutAccessTokenHash = checkoutAccessToken
      ? createHash("sha256").update(checkoutAccessToken).digest("hex")
      : null;

    const couponCode = typeof body.coupon_code === "string"
      ? body.coupon_code.trim().slice(0, 80) || null
      : null;
    const taxTotal = asMoney(body.tax_total, "Vergi tutarı");
    const deliveryFee = asMoney(body.delivery_fee, "Teslimat ücreti");
    const tipAmount = asMoney(body.tip_amount, "Bahşiş");

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.error("SUPABASE_SERVICE_ROLE_KEY yapılandırılmamış.");
      return NextResponse.json({ success: false, error: "Sipariş servisi yapılandırılmamış. Lütfen işletme sahibiyle iletişime geçin." }, { status: 503 });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const rpcItems = incomingItems.map(({ menu_item_id, quantity, selected_option_ids, expected_unit_price }) => ({ menu_item_id, quantity, selected_option_ids, expected_unit_price }));

    // Database function binds the verified account and spends points atomically with order creation.
    const { data: orderId, error } = await adminClient.rpc("create_website_order_with_checkout_access", {
      p_restaurant_id: restaurant_id,
      p_customer_phone: customer_phone || null,
      p_order_type: selectedOrderType,
      p_notes: notes || null,
      p_product_name: product_name || "Sepet Siparişi",
      p_items: rpcItems,
      p_payment_method: paymentMethod,
      p_payment_required: paymentRequired,
      p_coupon_code: couponCode,
      p_tax_total: taxTotal,
      p_delivery_fee: deliveryFee,
      p_tip_amount: tipAmount,
      p_customer_user_id: customerUserId,
      p_points_to_spend: pointsToSpend,
      p_checkout_token_hash: checkoutAccessTokenHash,
      p_source_channel: "website",
    });

    if (error) {
      console.error("Transaction sipariş/cüzdan kaydı hatası:", error);
      const known = [
        "Yetersiz mahalle puanı bakiyesi",
        "Puan kullanımı için müşteri hesabıyla giriş yapın",
        "Stripe online ödemede puan kullanımı kapalıdır",
        "İlk sipariş kuponu için doğrulanmış müşteri hesabıyla giriş yapın",
        "İlk sipariş kuponu için e-posta adresinizi doğrulayın",
        "Bu kupon yalnızca ilk siparişlerde geçerlidir veya daha önce kullanılmış",
        "Geçersiz veya süresi dolmuş kupon kodu",
        "Bu kupon minimum",
      ];
      const status = known.some((message) => error.message?.includes(message)) ? 400 : error.message?.includes("Menu price changed") ? 409 : 500;
      return NextResponse.json({
        success: false,
        error: status === 400 ? error.message : "Sipariş oluşturulamadı. Lütfen tekrar deneyin.",
      }, { status });
    }

    if (body.delivery_required === true || body.service_option === "Paket Servis") {
      try {
        const { data: restData } = await publicClient
          .from("restaurants")
          .select("name, address")
          .eq("id", restaurant_id)
          .maybeSingle();
        const pickupAddress = restData ? `${restData.name} (${restData.address || "Dükkan"})` : "Restoran";
        const dropoffAddress = String(body.delivery_address || "Müşteri Adresi");
        const { error: delError } = await adminClient.from("deliveries").insert({
          order_id: orderId,
          status: "available",
          pickup_address: pickupAddress,
          dropoff_address: dropoffAddress,
          customer_name: body.customer_name ? String(body.customer_name).slice(0, 100) : null,
          customer_phone: customer_phone ? String(customer_phone).slice(0, 50) : null,
          delivery_notes: body.order_note ? String(body.order_note).slice(0, 500) : (notes || null),
          delivery_fee: deliveryFee > 0 ? deliveryFee : 3.50,
          courier_tip: asMoney(body.courier_tip, "Kurye bahşişi"),
          currency: "EUR",
          is_solidarity_delivery: false,
        });
        if (delError) console.error("Deliveries kayıt hatası:", delError);
      } catch (delEx) {
        console.error("Deliveries işlemi hatası:", delEx);
      }
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      payment_required: paymentRequired,
      payment_status: paymentRequired ? "pending" : "untracked",
      points_spent: pointsToSpend,
      checkout_access_token: checkoutAccessToken,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sipariş API hatası:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}
