import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Stripe webhook yapılandırması eksik." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Stripe imzası bulunamadı." },
      { status: 400 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook imza hatası:", error);
    return NextResponse.json(
      { success: false, error: "Geçersiz Stripe webhook imzası." },
      { status: 400 }
    );
  }

  try {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("webhook_events")
      .select("id, processing_status")
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.processing_status === "processed") {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (!existing) {
      const { error } = await supabaseAdmin.from("webhook_events").insert({
        provider: "stripe",
        provider_event_id: event.id,
        event_type: event.type,
        payload: event,
        processing_status: "processing",
      });
      if (error) {
        const { data: retry } = await supabaseAdmin
          .from("webhook_events")
          .select("processing_status")
          .eq("provider", "stripe")
          .eq("provider_event_id", event.id)
          .maybeSingle();
        if (retry?.processing_status === "processed") {
          return NextResponse.json({ success: true, duplicate: true });
        }
        throw error;
      }
    } else {
      const { error } = await supabaseAdmin
        .from("webhook_events")
        .update({ processing_status: "processing", error_message: null })
        .eq("id", existing.id);
      if (error) throw error;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      if (metadata.project !== "umecke") {
        await supabaseAdmin
          .from("webhook_events")
          .update({ processing_status: "ignored", processed_at: new Date().toISOString(), error_message: "Solidareaty eventi değil." })
          .eq("provider", "stripe")
          .eq("provider_event_id", event.id);
        return NextResponse.json({ success: true, ignored: true });
      }

      if (session.payment_status !== "paid") {
        await supabaseAdmin
          .from("webhook_events")
          .update({ processing_status: "ignored", processed_at: new Date().toISOString(), error_message: "Ödeme paid değil." })
          .eq("provider", "stripe")
          .eq("provider_event_id", event.id);
        return NextResponse.json({ success: true, ignored: true });
      }

      const amount = Number(session.amount_total || 0) / 100;
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || "";

      let confirmed = false;
      let confirmError: { message?: string } | null = null;

      if (metadata.entity_type === "restaurant_subscription" && metadata.restaurant_id && metadata.plan_id) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id || "";
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || "";

        if (!subscriptionId || !customerId) {
          throw new Error("Stripe abonelik veya müşteri ID'si bulunamadı.");
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionStatus = subscription.status;

        const periodStart = subscription.items.data[0]?.current_period_start
          ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString()
          : null;
        const periodEnd = subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null;
        const canceledAt = subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null;

        const result = await supabaseAdmin.rpc("confirm_restaurant_subscription", {
          p_checkout_session_id: session.id,
          p_subscription_id: subscriptionId,
          p_customer_id: customerId,
          p_status: subscriptionStatus,
          p_period_start: periodStart,
          p_period_end: periodEnd,
          p_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          p_canceled_at: canceledAt,
        });

        if (result.error) throw result.error;
        if (result.data !== true) {
          throw new Error("confirm_restaurant_subscription false döndürdü.");
        }

        confirmed = true;
      } else if (metadata.entity_type === "producer_order" && metadata.producer_order_id) {
        const { data: producerOrder, error: producerOrderError } = await supabaseAdmin
          .from("producer_orders")
          .select("id, producer_id, grand_total, payment_status, status")
          .eq("id", metadata.producer_order_id)
          .maybeSingle();

        if (producerOrderError) throw producerOrderError;
        if (!producerOrder) throw new Error("Üretici siparişi bulunamadı.");

        const { data: existingPayment, error: existingPaymentError } =
          await supabaseAdmin
            .from("payments")
            .select("id, status, amount, refunded_amount")
            .eq("producer_order_id", producerOrder.id)
            .maybeSingle();

        if (existingPaymentError) throw existingPaymentError;

        let paymentId = existingPayment?.id;

        if (!existingPayment) {
          const { data: createdPayment, error: paymentError } =
            await supabaseAdmin
              .from("payments")
              .insert({
                producer_order_id: producerOrder.id,
                provider: "stripe",
                stripe_payment_intent_id: paymentIntentId || null,
                stripe_checkout_session_id: session.id,
                amount,
                currency: "EUR",
                status: "succeeded",
                payment_method: "stripe_checkout",
                paid_at: new Date().toISOString(),
              })
              .select("id")
              .single();

          if (paymentError) throw paymentError;
          paymentId = createdPayment.id;
        } else if (existingPayment.status !== "succeeded") {
          const { error: paymentUpdateError } = await supabaseAdmin
            .from("payments")
            .update({
              status: "succeeded",
              stripe_payment_intent_id: paymentIntentId || null,
              stripe_checkout_session_id: session.id,
              amount,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingPayment.id);

          if (paymentUpdateError) throw paymentUpdateError;
        }

        const { data: existingLedger, error: existingLedgerError } =
          await supabaseAdmin
            .from("financial_ledger_entries")
            .select("id")
            .eq("producer_order_id", producerOrder.id)
            .eq("entry_type", "charge")
            .maybeSingle();

        if (existingLedgerError) throw existingLedgerError;

        if (!existingLedger) {
          const fee = Number((amount * 0.03).toFixed(2));
          const net = Number((amount - fee).toFixed(2));

          const { error: ledgerError } = await supabaseAdmin
            .from("financial_ledger_entries")
            .insert({
              payment_id: paymentId,
              producer_order_id: producerOrder.id,
              recipient_type: "producer",
              recipient_id: producerOrder.producer_id,
              gross_amount: amount,
              platform_fee: fee,
              recipient_amount: net,
              currency: "EUR",
              commission_rate: 3,
              fixed_fee: 0,
              status: "waiting_for_onboarding",
              entry_type: "charge",
              description: "Üretici siparişi finansal dağılımı",
              metadata: {
                project: "umecke",
                commission_basis: "producer_subtotal",
              },
            });

          if (ledgerError) throw ledgerError;
        }

        const { error: producerUpdateError } = await supabaseAdmin
          .from("producer_orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent_id: paymentIntentId || null,
            status: producerOrder.status || "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", producerOrder.id);

        if (producerUpdateError) throw producerUpdateError;

        // Üretici ödeme akışı başarıyla tamamlandı.
        confirmed = true;
      } else if (metadata.entity_type === "suspended_meal_donation" && metadata.donation_id) {
        const result = await supabaseAdmin.rpc("confirm_suspended_meal_payment", {
          p_donation_id: metadata.donation_id,
          p_checkout_session_id: session.id,
          p_payment_intent_id: paymentIntentId,
          p_amount: amount,
        });
        confirmed = result.data === true;
        confirmError = result.error;
      } else if (metadata.entity_type === "order" && metadata.order_id) {
        const result = await supabaseAdmin.rpc("confirm_order_payment", {
          p_order_id: metadata.order_id,
          p_checkout_session_id: session.id,
          p_payment_intent_id: paymentIntentId,
          p_amount: amount,
        });
        confirmed = result.data === true;
        confirmError = result.error;

        if (!confirmError && confirmed) {
          const ledgerResult = await supabaseAdmin.rpc(
            "create_order_financial_ledger",
            { p_order_id: metadata.order_id }
          );

          if (ledgerResult.error) throw ledgerResult.error;
          if (!ledgerResult.data) {
            throw new Error("Sipariş finansal ledger kaydı oluşturulamadı.");
          }
        }
      } else {
        await supabaseAdmin
          .from("webhook_events")
          .update({ processing_status: "ignored", processed_at: new Date().toISOString(), error_message: "Bilinmeyen Solidareaty entity_type." })
          .eq("provider", "stripe")
          .eq("provider_event_id", event.id);
        return NextResponse.json({ success: true, ignored: true });
      }

      if (confirmError) throw confirmError;
      if (!confirmed) throw new Error("Ödeme onay RPC'si false döndürdü.");
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id || "";

      if (paymentIntentId) {
        const { data: payment, error: paymentError } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, refunded_amount")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle();

        if (paymentError) throw paymentError;

        if (payment?.order_id) {
          const cumulativeRefunded = Number(charge.amount_refunded || 0) / 100;
          const alreadyRefunded = Number(payment.refunded_amount || 0);
          const deltaRefund = Number((cumulativeRefunded - alreadyRefunded).toFixed(2));
          const refundId = charge.id + ":" + String(charge.amount_refunded || 0);

          if (deltaRefund > 0) {
            const refundResult = await supabaseAdmin.rpc("create_order_refund_ledger", {
              p_order_id: payment.order_id,
              p_refund_amount: deltaRefund,
              p_stripe_refund_id: refundId,
            });

            if (refundResult.error) throw refundResult.error;
            if (!refundResult.data) throw new Error("İade ledger kaydı oluşturulamadı.");
          }
        }
      }
    }

    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };

      const subscriptionValue = invoice.subscription;
      const subscriptionId = typeof subscriptionValue === "string"
        ? subscriptionValue
        : subscriptionValue?.id || "";

      if (subscriptionId) {
        const billingStatus = event.type === "invoice.paid"
          ? "active"
          : "past_due";

        const result = await supabaseAdmin.rpc(
          "update_restaurant_subscription_billing_status",
          {
            p_subscription_id: subscriptionId,
            p_status: billingStatus,
            p_invoice_id: invoice.id,
          }
        );

        if (result.error) throw result.error;
        if (result.data !== true) {
          throw new Error(
            "update_restaurant_subscription_billing_status false döndürdü."
          );
        }
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const nextStatus = event.type === "customer.subscription.deleted"
        ? "canceled"
        : subscription.status;

      const { error: subscriptionUpdateError } = await supabaseAdmin
        .from("restaurant_subscriptions")
        .update({
          status: nextStatus,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          current_period_start: subscription.items.data[0]?.current_period_start
            ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);

      if (subscriptionUpdateError) throw subscriptionUpdateError;
    }

    const { error: processedError } = await supabaseAdmin
      .from("webhook_events")
      .update({ processing_status: "processed", processed_at: new Date().toISOString(), error_message: null })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);
    if (processedError) throw processedError;

    return NextResponse.json({ success: true, event_type: event.type });
  } catch (error) {
    console.error("Stripe webhook işleme hatası:", error);
    await supabaseAdmin
      .from("webhook_events")
      .update({ processing_status: "failed", error_message: error instanceof Error ? error.message : "Bilinmeyen hata." })
      .eq("provider", "stripe")
      .eq("provider_event_id", event.id);
    return NextResponse.json({ success: false, error: "Stripe webhook işlenemedi." }, { status: 500 });
  }
}
