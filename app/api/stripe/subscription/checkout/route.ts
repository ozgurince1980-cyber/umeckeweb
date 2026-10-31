import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getCanonicalSiteOrigin } from "../../../../../lib/canonical-site-url";

export async function POST(request: Request) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !stripeSecretKey ||
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe veya Supabase yapılandırması eksik.",
        },
        { status: 503 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçerli Auth oturumu bulunamadı.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "").trim();

    const supabaseUser = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı oturumu doğrulanamadı.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const restaurantId = String(body.restaurant_id || "").trim();
    const planKey = String(body.plan_key || "").trim();

    if (!restaurantId || !planKey) {
      return NextResponse.json(
        {
          success: false,
          error: "restaurant_id veya plan_key eksik.",
        },
        { status: 400 }
      );
    }

    if (!["basic", "premium"].includes(planKey)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz abonelik planı.",
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: platformAdmin, error: platformError } =
      await supabaseAdmin
        .from("platform_memberships")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .eq("is_active", true)
        .maybeSingle();

    if (platformError) {
      throw platformError;
    }

    let hasAccess = Boolean(platformAdmin);

    if (!hasAccess) {
      const { data: membership, error: membershipError } =
        await supabaseAdmin
          .from("restaurant_memberships")
          .select("role")
          .eq("user_id", user.id)
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .in("role", ["owner", "manager"])
          .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      hasAccess = Boolean(membership);
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu restoranın aboneliğini yönetme yetkiniz yok.",
        },
        { status: 403 }
      );
    }

    const { data: restaurant, error: restaurantError } =
      await supabaseAdmin
        .from("restaurants")
        .select("id, name")
        .eq("id", restaurantId)
        .maybeSingle();

    if (restaurantError) {
      throw restaurantError;
    }

    if (!restaurant) {
      return NextResponse.json(
        {
          success: false,
          error: "Restoran bulunamadı.",
        },
        { status: 404 }
      );
    }

    const { data: plan, error: planError } =
      await supabaseAdmin
        .from("subscription_plans")
        .select(
          "id, plan_key, name, monthly_amount, currency, stripe_price_id, is_active"
        )
        .eq("plan_key", planKey)
        .eq("is_active", true)
        .maybeSingle();

    if (planError) {
      throw planError;
    }

    if (!plan?.stripe_price_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu planın Stripe fiyatı henüz tanımlanmamış.",
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const stripeCustomer = await stripe.customers.create({
      email: user.email || undefined,
      name: restaurant.name,
      metadata: {
        project: "umecke",
        restaurant_id: restaurant.id,
      },
    });

    const origin = getCanonicalSiteOrigin();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer: stripeCustomer.id,

      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],

      success_url:
        `${origin}/?subscription=success` +
        `&restaurant_id=${encodeURIComponent(restaurant.id)}` +
        `&session_id={CHECKOUT_SESSION_ID}`,

      cancel_url:
        `${origin}/?subscription=cancelled` +
        `&restaurant_id=${encodeURIComponent(restaurant.id)}`,

      metadata: {
        project: "umecke",
        entity_type: "restaurant_subscription",
        restaurant_id: restaurant.id,
        plan_id: plan.id,
        plan_key: plan.plan_key,
      },

      subscription_data: {
        metadata: {
          project: "umecke",
          entity_type: "restaurant_subscription",
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          plan_key: plan.plan_key,
        },
      },

      allow_promotion_codes: false,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        {
          success: false,
          error: "Abonelik Checkout bağlantısı oluşturulamadı.",
        },
        { status: 500 }
      );
    }

    const { error: subscriptionInsertError } =
      await supabaseAdmin
        .from("restaurant_subscriptions")
        .insert({
          restaurant_id: restaurant.id,
          plan_id: plan.id,
          provider: "stripe",
          stripe_customer_id: stripeCustomer.id,
          stripe_checkout_session_id: checkoutSession.id,
          status: "incomplete",
        });

    if (subscriptionInsertError) {
      console.error(
        "Abonelik kaydı oluşturma hatası:",
        subscriptionInsertError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Abonelik kaydı oluşturulamadı.",
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
    console.error(
      "Abonelik Checkout oluşturma hatası:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Abonelik Checkout oluşturulamadı.",
      },
      { status: 500 }
    );
  }
}
