import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export async function POST(request: NextRequest) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return fail("Order tracking service is not configured.", 503);
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
        "id, customer_user_id, payment_required, payment_status"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Tracking order lookup failed:", orderError);
      return fail("Could not look up this order.", 500);
    }

    if (!order) {
      return fail("Order was not found.", 404);
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

    let validGuestToken = false;
    const accessToken =
      typeof body.checkout_access_token === "string"
        ? body.checkout_access_token.trim()
        : "";

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
        console.error("Tracking access lookup failed:", accessError);
        return fail("Could not verify order access.", 500);
      }

      if (
        access &&
        new Date(access.expires_at).getTime() > Date.now() &&
        safeHexEqual(tokenHash, access.token_hash)
      ) {
        validGuestToken = true;
      }
    }

    if (!isOrderOwner && !validGuestToken) {
      return fail("Order tracking access could not be verified.", 403);
    }

    const { data: trackingData, error: trackingError } = await admin.rpc(
      "get_customer_order_tracking",
      { p_order_id: order.id }
    );

    if (trackingError) {
      console.error("Tracking details lookup failed:", trackingError);
      return fail("Could not load order tracking details.", 500);
    }

    const tracking = Array.isArray(trackingData)
      ? trackingData[0]
      : trackingData;

    if (!tracking) {
      return fail("Order tracking details were not found.", 404);
    }

    return NextResponse.json(
      {
        success: true,
        tracking: {
          ...tracking,
          payment_required: order.payment_required,
          payment_status: order.payment_status,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Order tracking API failed:", error);
    return fail("Could not load order tracking.", 500);
  }
}