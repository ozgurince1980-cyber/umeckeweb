import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getCanonicalSiteOrigin } from "../../../../lib/canonical-site-url";

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!url || !anonKey || !serviceKey || !stripeKey) {
      return NextResponse.json(
        { success: false, error: "Üretici ödeme yapılandırması eksik." },
        { status: 503 }
      );
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ") ? authorization.replace("Bearer ", "").trim() : null;
    const body = await request.json();
    const producerId = String(body.producer_id || "").trim();
    const buyerType = body.buyer_type === "restaurant" ? "restaurant" : "consumer";
    const buyerRestaurantId = body.buyer_restaurant_id
      ? String(body.buyer_restaurant_id).trim()
      : null;
    const items = Array.isArray(body.items) ? body.items : [];

    if (!producerId || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Üretici veya ürünler eksik." },
        { status: 400 }
      );
    }

    if (buyerType === "restaurant" && !buyerRestaurantId) {
      return NextResponse.json(
        { success: false, error: "Restoran alıcısı için restoran seçilmelidir." },
        { status: 400 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (buyerType === "restaurant") {
      const authorization = request.headers.get("authorization");
      if (!authorization?.startsWith("Bearer ")) {
        return NextResponse.json(
          { success: false, error: "Restoran siparişi için Auth oturumu gerekli." },
          { status: 401 }
        );
      }

      const accessToken = authorization.replace("Bearer ", "").trim();
      const authClient = createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
      });

      const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
      if (userError || !userData.user) {
        return NextResponse.json(
          { success: false, error: "Restoran Auth oturumu doğrulanamadı." },
          { status: 401 }
        );
      }

      const { data: platformAdmin } = await admin
        .from("platform_memberships")
        .select("user_id")
        .eq("user_id", userData.user.id)
        .eq("role", "platform_admin")
        .eq("is_active", true)
        .maybeSingle();

      let allowed = Boolean(platformAdmin);
      if (!allowed) {
        const { data: membership } = await admin
          .from("restaurant_memberships")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("restaurant_id", buyerRestaurantId)
          .eq("is_active", true)
          .in("role", ["owner", "manager"])
          .maybeSingle();
        allowed = Boolean(membership);
      }

      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "Bu restoran adına sipariş verme yetkiniz yok." },
          { status: 403 }
        );
      }
    }

    const userClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    });

    // Anonymous consumer producer orders are created on the trusted server using
    // service_role; logged-in buyers use their verified Supabase JWT so auth.uid()
    // and the database membership guard remain meaningful.
    const orderWriter = accessToken ? userClient : admin;

    const { data: orderId, error: orderError } = await orderWriter.rpc(
      "create_producer_order",
      {
        p_producer_id: producerId,
        p_buyer_type: buyerType,
        p_buyer_restaurant_id: buyerRestaurantId,
        p_items: items.map((item: any) => ({
          producer_product_id: String(item.producer_product_id),
          quantity: Number(item.quantity),
        })),
        p_notes: body.notes ? String(body.notes).slice(0, 500) : null,
        p_delivery_address: body.delivery_address || null,
      }
    );

    if (orderError) {
      return NextResponse.json(
        { success: false, error: orderError.message },
        { status: 400 }
      );
    }

    const { data, error: checkoutDataError } = await admin.rpc(
      "get_producer_order_for_checkout",
      { p_order_id: orderId }
    );

    if (checkoutDataError) throw checkoutDataError;

    const order = Array.isArray(data) ? data[0] : data;
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Üretici siparişi ödeme için geçerli değil." },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeKey);
    const origin = getCanonicalSiteOrigin();

    const { data: latestOrder, error: latestOrderError } = await admin
      .from("producer_orders")
      .select("stripe_checkout_session_id, payment_status")
      .eq("id", order.order_id)
      .maybeSingle();

    if (latestOrderError) throw latestOrderError;
    if (!latestOrder || latestOrder.payment_status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Üretici siparişi ödeme için artık uygun değil." },
        { status: 409 }
      );
    }

    if (latestOrder.stripe_checkout_session_id) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(
          latestOrder.stripe_checkout_session_id
        );
        if (existing.status === "open" && existing.url) {
          return NextResponse.json({ success: true, order_id: order.order_id, buyer_type: buyerType, checkout_url: existing.url }, { headers: { "Cache-Control": "no-store" } });
        }
        if (existing.status === "complete") {
          return NextResponse.json({ success: false, error: "Bu siparişin ödemesi tamamlanmış." }, { status: 409 });
        }
        if (existing.status !== "expired") {
          return NextResponse.json({ success: false, error: "Önceki ödeme oturumunun durumu uygun değil." }, { status: 409 });
        }
      } catch (error) {
        console.error("Üretici Checkout oturumu doğrulanamadı:", error);
        return NextResponse.json({ success: false, error: "Önceki ödeme oturumu doğrulanamadı." }, { status: 502 });
      }
    }

    const amount = Math.round(Number(order.total_amount) * 100);

    if (!Number.isInteger(amount) || amount < 1) {
      return NextResponse.json(
        { success: false, error: "Üretici sipariş tutarı geçersiz." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            product_data: {
              name: `Üretici siparişi - ${order.product_summary}`,
            },
          },
        },
      ],
      success_url: `${origin}/${buyerType === "restaurant" ? "restaurant-producer-market" : "produzentenmarkt"}?payment=success&order_id=${order.order_id}`,
      cancel_url: `${origin}/${buyerType === "restaurant" ? "restaurant-producer-market" : "produzentenmarkt"}?payment=cancelled&order_id=${order.order_id}`,
      metadata: {
        project: "umecke",
        entity_type: "producer_order",
        producer_order_id: order.order_id,
        producer_id: order.producer_id,
        buyer_type: buyerType,
        buyer_restaurant_id: buyerRestaurantId || "",
      },
      payment_intent_data: {
        metadata: {
          project: "umecke",
          entity_type: "producer_order",
          producer_order_id: order.order_id,
          producer_id: order.producer_id,
          buyer_type: buyerType,
          buyer_restaurant_id: buyerRestaurantId || "",
        },
      },
    }, {
      idempotencyKey: `solidareaty-producer-order-${order.order_id}-${latestOrder.stripe_checkout_session_id || "initial"}`,
    });

    if (!session.url) {
      return NextResponse.json(
        { success: false, error: "Stripe Checkout bağlantısı oluşturulamadı." },
        { status: 500 }
      );
    }

    let saveSession = admin
      .from("producer_orders")
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq("id", order.order_id)
      .eq("payment_status", "pending");

    if (latestOrder.stripe_checkout_session_id) {
      saveSession = saveSession.eq("stripe_checkout_session_id", latestOrder.stripe_checkout_session_id);
    } else {
      saveSession = saveSession.is("stripe_checkout_session_id", null);
    }

    const { data: savedSession, error: updateError } = await saveSession
      .select("stripe_checkout_session_id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!savedSession) {
      const { data: current } = await admin.from("producer_orders")
        .select("stripe_checkout_session_id, payment_status")
        .eq("id", order.order_id).maybeSingle();
      if (current?.stripe_checkout_session_id === session.id && current.payment_status === "pending") {
        return NextResponse.json({ success: true, order_id: order.order_id, buyer_type: buyerType, checkout_url: session.url }, { headers: { "Cache-Control": "no-store" } });
      }
      try { await stripe.checkout.sessions.expire(session.id); } catch (expireError) { console.error("Kaybeden Checkout oturumu kapatılamadı:", expireError); }
      return NextResponse.json({ success: false, error: "Sipariş değişti. Yenileyip tekrar deneyin." }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      order_id: order.order_id,
      buyer_type: buyerType,
      checkout_url: session.url,
    });
  } catch (error) {
    console.error("Üretici Checkout hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Üretici Checkout oluşturulamadı.",
      },
      { status: 500 }
    );
  }
}
