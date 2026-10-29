import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getCanonicalSiteOrigin } from "../../../../lib/canonical-site-url";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY bulunamadı.");
}

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY bulunamadı."
  );
}

const stripe = new Stripe(stripeSecretKey);

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const donationId = String(body.donation_id || "").trim();

    if (!donationId) {
      return NextResponse.json(
        {
          success: false,
          error: "donation_id eksik.",
        },
        { status: 400 }
      );
    }

    const { data, error: donationError } = await supabaseAdmin.rpc(
      "get_suspended_donation_for_checkout",
      {
        p_donation_id: donationId,
      }
    );

    if (donationError) {
      console.error(
        "Bağış Checkout bilgisi okuma hatası:",
        donationError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Bağış bilgisi doğrulanamadı.",
        },
        { status: 500 }
      );
    }

    const donation = Array.isArray(data) ? data[0] : data;

    if (!donation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bağış bulunamadı veya ödeme için artık geçerli değil.",
        },
        { status: 400 }
      );
    }

    if (
      donation.payment_status !== "pending" ||
      donation.donation_status !== "pending_payment"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu bağış için yeni bir ödeme başlatılamaz.",
        },
        { status: 400 }
      );
    }

    const totalAmount = Number(donation.total_amount);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bağış tutarı geçersiz.",
        },
        { status: 400 }
      );
    }

    const amountInCents = Math.round(totalAmount * 100);

    if (amountInCents < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Bağış tutarı sıfır olamaz.",
        },
        { status: 400 }
      );
    }

    const origin = getCanonicalSiteOrigin();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountInCents,
            product_data: {
              name: `Askıda Yemek Bağışı - ${donation.meal_name}`,
              description: `${donation.quantity} adet askıda yemek bağışı`,
            },
          },
        },
      ],

      success_url:
        `${origin}/askida-yemek?payment=success` +
        `&donation_id=${encodeURIComponent(donation.donation_id)}` +
        `&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${origin}/askida-yemek?payment=cancelled` +
        `&donation_id=${encodeURIComponent(donation.donation_id)}`,

      metadata: {
        project: "umecke",
        entity_type: "suspended_meal_donation",
        donation_id: donation.donation_id,
        restaurant_id: donation.restaurant_id,
      },

      payment_intent_data: {
        metadata: {
          project: "umecke",
          entity_type: "suspended_meal_donation",
          donation_id: donation.donation_id,
          restaurant_id: donation.restaurant_id,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe Checkout bağlantısı oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      checkout_url: checkoutSession.url,
      checkout_session_id: checkoutSession.id,
    });
  } catch (error) {
    console.error("Stripe Checkout oluşturma hatası:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Stripe Checkout oluşturulamadı.",
      },
      { status: 500 }
    );
  }
}
