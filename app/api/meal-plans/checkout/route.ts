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
        { success: false, error: "Ödeme yapılandırması eksik." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const planId = String(body.plan_id || "").trim();
    const customerName = String(body.customer_name || "").trim();
    const customerPhone = String(body.customer_phone || "").trim();
    const deliveryAddress = String(body.delivery_address || "").trim();
    const deliveryTimeSlot = String(body.delivery_time_slot || "12:30 - 13:00").trim();
    const dietaryNotes = body.dietary_notes ? String(body.dietary_notes).slice(0, 500) : null;
    const restaurantId = body.restaurant_id ? String(body.restaurant_id).trim() : null;

    if (!planId || !customerName || !customerPhone || !deliveryAddress) {
      return NextResponse.json(
        { success: false, error: "Lütfen zorunlu alanları (İsim, Telefon, Adres) doldurunuz." },
        { status: 400 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: plan, error: planError } = await admin
      .from("meal_plan_templates")
      .select("id, name, price_per_meal, total_meals, currency, is_active")
      .eq("id", planId)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      return NextResponse.json(
        { success: false, error: "Seçilen yemek planı bulunamadı veya aktif değil." },
        { status: 400 }
      );
    }

    const totalAmount = Number((Number(plan.price_per_meal) * plan.total_meals).toFixed(2));
    const amountInCents = Math.round(totalAmount * 100);

    const { data: subData, error: subError } = await admin
      .from("customer_meal_subscriptions")
      .insert({
        plan_id: plan.id,
        restaurant_id: restaurantId || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: body.customer_email || null,
        delivery_type: "delivery",
        delivery_time_slot: deliveryTimeSlot,
        delivery_address: { address: deliveryAddress },
        dietary_notes: dietaryNotes,
        total_amount: totalAmount,
        status: "pending_payment",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (subError || !subData) {
      console.error("Yemek abonelik kaydı hatası:", subError);
      return NextResponse.json(
        { success: false, error: "Abonelik kaydı oluşturulamadı." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey);
    const origin = getCanonicalSiteOrigin();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountInCents,
            product_data: {
              name: `Solidareaty Mahalle Yemek Planı - ${plan.name}`,
              description: `${plan.total_meals} öğünlük yemek aboneliği (${deliveryTimeSlot} teslimat)`,
            },
          },
        },
      ],
      success_url: `${origin}/meal-plans?payment=success&sub_id=${subData.id}`,
      cancel_url: `${origin}/meal-plans?payment=cancelled&sub_id=${subData.id}`,
      metadata: {
        project: "umecke",
        entity_type: "meal_subscription",
        subscription_id: subData.id,
        plan_id: plan.id,
      },
      payment_intent_data: {
        metadata: {
          project: "umecke",
          entity_type: "meal_subscription",
          subscription_id: subData.id,
          plan_id: plan.id,
        },
      },
    });

    await admin
      .from("customer_meal_subscriptions")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", subData.id);

    return NextResponse.json({
      success: true,
      subscription_id: subData.id,
      checkout_url: session.url,
    });
  } catch (error) {
    console.error("Yemek planı Checkout hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Checkout oluşturulamadı.",
      },
      { status: 500 }
    );
  }
}
