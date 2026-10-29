import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

const fail = (message: string, status: number) =>
  NextResponse.json(
    { success: false, error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );

function safeHexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(a) || !/^[0-9a-f]{64}$/i.test(b)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function getTrustedSiteOrigin(): string | null {
  if (!SITE_URL) return null;

  try {
    const url = new URL(SITE_URL);

    const isLocalHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname);

    if (url.protocol !== "https:" && !isLocalHttp) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !STRIPE_SECRET_KEY
    ) {
      return fail("Stripe checkout service is not configured.", 503);
    }

    const siteOrigin = getTrustedSiteOrigin();

    if (!siteOrigin) {
      return fail(
        "NEXT_PUBLIC_SITE_URL must be configured as the trusted app URL.",
        503
      );
    }

    const body = await request.json();
    const orderId =
      typeof body.order_id === "string" ? body.order_id.trim() : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        orderId
      )
    ) {
      return fail("A valid order ID is required.", 400);
    }

    let authenticatedUserId: string | null = null;
    const authorization = request.headers.get("authorization");

    if (authorization) {
      const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

      if (!bearer) {
        return fail("Your session could not be verified.", 401);
      }

      const authClient = createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data, error } = await authClient.auth.getUser(bearer);

      if (error || !data.user) {
        return fail("Your session is invalid or expired.", 401);
      }

      authenticatedUserId = data.user.id;
    }

    const admin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, restaurant_id, product_name, total_amount, currency, payment_status, payment_required, payment_method, customer_user_id, stripe_checkout_session_id"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Checkout order lookup failed:", orderError);
      return fail("Could not verify this order.", 500);
    }

    if (!order) {
      return fail("Order was not found.", 404);
    }

    if (
      order.payment_required !== true ||
      order.payment_status !== "pending" ||
      order.payment_method !== "Stripe Online"
    ) {
      return fail("This order is not available for online payment.", 409);
    }

    const accessToken =
      typeof body.checkout_access_token === "string"
        ? body.checkout_access_token.trim()
        : "";

    let validGuestToken = false;

    if (/^[0-9a-f]{64}$/i.test(accessToken)) {
      const tokenHash = createHash("sha256")
        .update(accessToken)
        .digest("hex");

      const { data: access, error: accessError } = await admin
        .from("order_checkout_access")
        .select("token_hash, expires_at")
        .eq("order_id", order.id)
        .maybeSingle();

      if (accessError) {
        console.error("Checkout access lookup failed:", accessError);
        return fail("Could not verify checkout access.", 500);
      }

      if (
        access &&
        new Date(access.expires_at).getTime() > Date.now() &&
        safeHexEqual(tokenHash, access.token_hash)
      ) {
        validGuestToken = true;
      }
    }

    const isOrderOwner =
      authenticatedUserId !== null &&
      order.customer_user_id !== null &&
      authenticatedUserId === order.customer_user_id;

    if (
      authenticatedUserId !== null &&
      order.customer_user_id !== null &&
      authenticatedUserId !== order.customer_user_id
    ) {
      return fail("This order belongs to another customer account.", 403);
    }

    if (!isOrderOwner && !validGuestToken) {
      return fail("Checkout access could not be verified.", 403);
    }

    const amountNumber = Number(order.total_amount);
    const amountInCents = Math.round(amountNumber * 100);

    if (
      !Number.isFinite(amountNumber) ||
      !Number.isInteger(amountInCents) ||
      amountInCents < 1
    ) {
      return fail("The order amount is invalid.", 400);
    }

    const currency = String(order.currency || "EUR").toLowerCase();

    if (!/^[a-z]{3}$/.test(currency)) {
      return fail("The order currency is invalid.", 400);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    if (order.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          order.stripe_checkout_session_id
        );

        if (existingSession.status === "open" && existingSession.url) {
          return NextResponse.json(
            {
              success: true,
              checkout_url: existingSession.url,
              checkout_session_id: existingSession.id,
            },
            { headers: { "Cache-Control": "no-store" } }
          );
        }

        if (existingSession.status === "complete") {
          return fail(
            "Payment has already been submitted for this order.",
            409
          );
        }

        if (existingSession.status !== "expired") {
          return fail(
            "The prior checkout session is not in a retryable state.",
            409
          );
        }
      } catch (error) {
        console.error("Existing Stripe checkout lookup failed:", error);
        return fail("Could not verify the existing checkout session.", 502);
      }
    }

    const successUrl = new URL("/track", siteOrigin);
    successUrl.searchParams.set("order_id", order.id);
    successUrl.searchParams.set("payment", "success");

    const cancelUrl = new URL("/track", siteOrigin);
    cancelUrl.searchParams.set("order_id", order.id);
    cancelUrl.searchParams.set("payment", "cancelled");

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountInCents,
              product_data: {
                name: `Solidareaty order - ${String(order.product_name || "Order").slice(0, 200)}`,
              },
            },
          },
        ],
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        client_reference_id: order.id,
        metadata: {
          project: "umecke",
          entity_type: "order",
          order_id: order.id,
          restaurant_id: order.restaurant_id,
        },
        payment_intent_data: {
          metadata: {
            project: "umecke",
            entity_type: "order",
            order_id: order.id,
            restaurant_id: order.restaurant_id,
          },
        },
      },
      {
        // Concurrent/retried calls from the same prior state share one Stripe session.
        // Once a stored session expires, its session ID yields a new retry key.
        idempotencyKey: `umecke-order-checkout-${order.id}-${order.stripe_checkout_session_id ?? "initial"}`,
      }
    );

    if (!session.url) {
      return fail("Stripe did not return a checkout URL.", 502);
    }

    let updateQuery = admin
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id)
      .eq("payment_status", "pending")
      .eq("payment_required", true);

    // Compare-and-set against the session value we originally read. This allows
    // replacing an expired session without overwriting a concurrent winner.
    if (order.stripe_checkout_session_id) {
      updateQuery = updateQuery.eq(
        "stripe_checkout_session_id",
        order.stripe_checkout_session_id
      );
    } else {
      updateQuery = updateQuery.is("stripe_checkout_session_id", null);
    }

    const { data: updatedOrder, error: updateError } = await updateQuery
      .select("id, stripe_checkout_session_id")
      .maybeSingle();

    if (updateError) {
      console.error("Saving checkout session ID failed:", updateError);
      return fail("Could not safely attach checkout to the order.", 500);
    }

    if (!updatedOrder) {
      // A concurrent request may have stored the same idempotent Stripe session.
      const { data: latestOrder, error: latestError } = await admin
        .from("orders")
        .select("stripe_checkout_session_id, payment_status")
        .eq("id", order.id)
        .maybeSingle();

      if (latestError) {
        console.error("Could not verify winning checkout session:", latestError);
        return fail("Could not verify the order checkout state.", 500);
      }

      if (
        latestOrder?.stripe_checkout_session_id === session.id &&
        latestOrder.payment_status === "pending"
      ) {
        // Do not expire the session: another concurrent request stored this same session.
        return NextResponse.json(
          {
            success: true,
            checkout_url: session.url,
            checkout_session_id: session.id,
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      // Expire only if another different session won the database race.
      if (
        latestOrder?.stripe_checkout_session_id &&
        latestOrder.stripe_checkout_session_id !== session.id
      ) {
        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expireError) {
          console.error("Could not expire losing checkout session:", expireError);
        }
      }

      return fail(
        "The order changed while checkout was being created. Refresh and try again.",
        409
      );
    }

    return NextResponse.json(
      {
        success: true,
        checkout_url: session.url,
        checkout_session_id: session.id,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Order checkout creation failed:", error);

    return fail("Checkout could not be created. Please try again.", 500);
  }
}