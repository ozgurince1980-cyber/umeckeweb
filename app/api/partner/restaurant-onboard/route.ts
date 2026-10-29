import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return fail("Onboarding service is not configured.", 503);
    const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return fail("Please sign in with your verified business-owner account.", 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
    const user = authData.user;
    if (authError || !user) return fail("Your session is invalid or expired. Please sign in again.", 401);
    if (!user.email || !user.email_confirmed_at) return fail("Verify your email address before setting up a restaurant.", 403);

    const body = await request.json();
    const requestId = text(body.request_id, 36);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return fail("A valid onboarding request ID is required.", 400);
    const name = text(body.name, 120);
    const phone = text(body.phone, 50);
    const address = text(body.address, 220);
    const zipcode = text(body.zipcode, 20);
    const city = text(body.city, 100);
    const cuisineType = text(body.cuisine_type, 100) || "Local cuisine";
    const planKey = text(body.plan_key, 32) || "basic";
    const parkingInfo = text(body.parking_info, 300);
    const description = text(body.description, 1500);
    const story = text(body.story, 3000);
    const vision = text(body.vision, 1500);
    const website = text(body.website, 300);
    const logoUrl = text(body.logo_url, 1000);
    const coverImageUrl = text(body.cover_image_url, 1000);
    const businessType = text(body.business_type, 80) || "Restaurant";
    const productCategory = text(body.product_category, 100);
    const referralCode = text(body.referral_code, 80) || null;
    const allowedPlans = new Set(["basic", "premium"]);
    if (!name || !phone || !address) return fail("Business name, phone and address are required.", 400);
    if (!allowedPlans.has(planKey)) return fail("The selected subscription plan is invalid.", 400);
    if (website && !/^https?:\/\//i.test(website)) return fail("Website must start with https:// or http://.", 400);

    const rawMenu = Array.isArray(body.menu_items) ? body.menu_items : [];
    if (rawMenu.length > 100) return fail("Please add no more than 100 menu items during signup.", 400);
    const menuItems = rawMenu.map((item: any) => ({
      name: text(item?.name, 120),
      price: Number(item?.price),
      category: text(item?.category, 80) || "Main dish",
      description: text(item?.description, 500) || null,
      // Do not pass a fake placeholder URL. The owner can upload product photos later.
      image_url: text(item?.image_url, 1000) || null,
    })).filter((item: any) => item.name && Number.isFinite(item.price) && item.price > 0 && item.price <= 10000);
    if (rawMenu.length && menuItems.length !== rawMenu.length) return fail("One or more menu items have an invalid name or price.", 400);

    const serviceOptions = Array.isArray(body.service_options)
      ? body.service_options.map((x: unknown) => text(x, 50)).filter(Boolean).slice(0, 10)
      : ["Gel-Al"];
    const paymentMethods = Array.isArray(body.payment_methods)
      ? body.payment_methods.map((x: unknown) => text(x, 50)).filter(Boolean).slice(0, 10)
      : ["Nakit", "Kredi Kartı / POS"];
    const weeklyHours = body.weekly_hours && typeof body.weekly_hours === "object" ? body.weekly_hours : null;
    const features = body.features && typeof body.features === "object" && !Array.isArray(body.features) ? body.features : {};

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: created, error: createError } = await admin.rpc("complete_verified_restaurant_onboarding", {
      p_owner_user_id: user.id,
      p_request_id: requestId,
      p_name: name,
      p_phone: phone,
      p_address: address,
      p_zipcode: zipcode,
      p_city: city,
      p_cuisine_type: cuisineType,
      p_weekly_hours: weeklyHours,
      p_service_options: serviceOptions,
      p_payment_methods: paymentMethods,
      p_parking_info: parkingInfo,
      p_plan_key: planKey,
      p_menu_items: menuItems,
      p_referral_code: referralCode,
      p_description: description,
      p_story: story,
      p_vision: vision,
      p_website: website,
      p_logo_url: logoUrl,
      p_cover_image_url: coverImageUrl,
      p_business_type: businessType,
      p_product_category: productCategory,
      p_features: features,
    });
    if (createError) {
      console.error("Verified restaurant onboarding DB error:", createError);
      return fail("Restaurant setup could not be completed. Please check the form and try again.", 400);
    }
    const result = Array.isArray(created) ? created[0] : created;
    if (!result?.restaurant_id || !result?.restaurant_slug) return fail("Restaurant setup returned an incomplete result. Contact support before retrying.", 500);

    let stripeUrl: string | null = null;
    let stripeSetupMessage: string | null = null;
    if (STRIPE_SECRET_KEY && SITE_URL) {
      let stripeAccountId: string | null = null;
      const stripe = new Stripe(STRIPE_SECRET_KEY);
      const { data: existingStripe, error: lookupError } = await admin.from("stripe_connected_accounts")
        .select("stripe_account_id")
        .eq("owner_type", "restaurant")
        .eq("owner_id", result.restaurant_id)
        .maybeSingle();
      if (lookupError) {
        console.error("Stripe connected account lookup failed:", lookupError);
        stripeSetupMessage = "Restaurant is ready; payment onboarding can be completed from the business dashboard.";
      } else if (existingStripe?.stripe_account_id) {
        stripeAccountId = existingStripe.stripe_account_id;
      } else {
        try {
          const account = await stripe.accounts.create({
            type: "express",
            country: "DE",
            email: user.email,
            business_type: "individual",
            capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
            metadata: { project: "umecke", restaurant_id: result.restaurant_id, owner_user_id: user.id },
          });
          stripeAccountId = account.id;
          const { error: insertError } = await admin.from("stripe_connected_accounts").insert({
            owner_type: "restaurant", owner_id: result.restaurant_id, stripe_account_id: account.id,
            account_type: "express", onboarding_status: "pending", charges_enabled: false,
            payouts_enabled: false, country: "DE", default_currency: "EUR",
          });
          if (insertError) {
            console.error("Stripe account record insert failed:", insertError);
            try { await stripe.accounts.del(account.id); } catch (cleanupError) { console.error("Stripe orphan cleanup failed:", cleanupError); }
            stripeAccountId = null;
            stripeSetupMessage = "Restaurant is ready; payment onboarding can be completed from the business dashboard.";
          }
        } catch (stripeError) {
          console.error("Stripe account creation failed:", stripeError);
          stripeSetupMessage = "Restaurant is ready; payment onboarding can be completed from the business dashboard.";
        }
      }
      if (stripeAccountId) {
        try {
          const base = new URL(SITE_URL);
          if (!(["https:", "http:"].includes(base.protocol)) || (base.protocol === "http:" && !["localhost", "127.0.0.1"].includes(base.hostname))) throw new Error("Invalid configured site URL");
          const refresh = new URL("/partner/restaurant?stripe=refresh", base);
          refresh.searchParams.set("restaurant_id", result.restaurant_id);
          const success = new URL("/partner/restaurant?stripe=complete", base);
          success.searchParams.set("restaurant_id", result.restaurant_id);
          const link = await stripe.accountLinks.create({ account: stripeAccountId, type: "account_onboarding", refresh_url: refresh.toString(), return_url: success.toString() });
          stripeUrl = link.url;
        } catch (stripeError) {
          console.error("Stripe onboarding link failed:", stripeError);
          stripeSetupMessage = "Restaurant is ready; payment onboarding can be completed from the business dashboard.";
        }
      }
    } else {
      stripeSetupMessage = "Restaurant is ready. Stripe onboarding is not configured for this environment.";
    }

    return NextResponse.json({
      success: true,
      restaurant_id: result.restaurant_id,
      restaurant_slug: result.restaurant_slug,
      menu_items_count: result.menu_items_count,
      stripe_onboarding_url: stripeUrl,
      stripe_setup_message: stripeSetupMessage,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Verified restaurant onboarding failed:", error);
    return fail("Restaurant setup failed unexpectedly. Please try again or contact support.", 500);
  }
}
