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
          error: "Geçerli kullanıcı oturumu bulunamadı.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    const supabaseUserClient = createClient(
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
    } = await supabaseUserClient.auth.getUser(accessToken);

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

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error: "restaurant_id eksik.",
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

    const { data: platformMembership, error: platformError } =
      await supabaseAdmin
        .from("platform_memberships")
        .select("role, is_active")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .eq("is_active", true)
        .maybeSingle();

    if (platformError) {
      console.error(
        "Platform admin kontrol hatası:",
        platformError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Platform yetkisi kontrol edilemedi.",
        },
        { status: 500 }
      );
    }

    let hasAccess = Boolean(platformMembership);

    if (!hasAccess) {
      const { data: membership, error: membershipError } =
        await supabaseAdmin
          .from("restaurant_memberships")
          .select("role, is_active")
          .eq("user_id", user.id)
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
          .in("role", ["owner", "manager"])
          .maybeSingle();

      if (membershipError) {
        console.error(
          "Restoran üyeliği kontrol hatası:",
          membershipError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Restoran yetkisi kontrol edilemedi.",
          },
          { status: 500 }
        );
      }

      hasAccess = Boolean(membership);
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu restoranın Stripe hesabını yönetme yetkiniz yok.",
        },
        { status: 403 }
      );
    }

    const { data: connectedAccount, error: accountError } =
      await supabaseAdmin
        .from("stripe_connected_accounts")
        .select(
          "stripe_account_id, account_type, onboarding_status"
        )
        .eq("owner_type", "restaurant")
        .eq("owner_id", restaurantId)
        .maybeSingle();

    if (accountError) {
      console.error(
        "Connected Account okuma hatası:",
        accountError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Stripe bağlı hesap kaydı okunamadı.",
        },
        { status: 500 }
      );
    }

    if (!connectedAccount?.stripe_account_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu restoran için Stripe Connected Account bulunamadı.",
        },
        { status: 404 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const origin = getCanonicalSiteOrigin();

    const accountLink = await stripe.accountLinks.create({
      account: connectedAccount.stripe_account_id,
      type: "account_onboarding",
      refresh_url:
        `${origin}/?stripe_onboarding=refresh` +
        `&restaurant_id=${encodeURIComponent(restaurantId)}`,
      return_url:
        `${origin}/?stripe_onboarding=complete` +
        `&restaurant_id=${encodeURIComponent(restaurantId)}`,
    });

    const { error: updateError } = await supabaseAdmin
      .from("stripe_connected_accounts")
      .update({
        onboarding_status: "started",
        updated_at: new Date().toISOString(),
      })
      .eq("owner_type", "restaurant")
      .eq("owner_id", restaurantId);

    if (updateError) {
      console.error(
        "Onboarding durumu güncelleme hatası:",
        updateError
      );
    }

    return NextResponse.json({
      success: true,
      onboarding_url: accountLink.url,
    });
  } catch (error) {
    console.error(
      "Stripe onboarding bağlantısı oluşturma hatası:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Stripe onboarding bağlantısı oluşturulamadı.",
      },
      { status: 500 }
    );
  }
}
