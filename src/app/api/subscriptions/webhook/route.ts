import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Subscription from "@/models/Subscription";
import Clinic from "@/models/Clinic";
import { verifyPayPalWebhook, getPayPalSubscription } from "@/lib/paypal";

// ─── POST /api/subscriptions/webhook ──────────────────────
// Receives PayPal webhook events and updates subscription status.
// This endpoint is PUBLIC (called by PayPal servers).
export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Verify the webhook signature
  const isValid = await verifyPayPalWebhook(headers, rawBody);
  if (!isValid) {
    console.error("PayPal webhook verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.event_type;
  const resource = event.resource;

  console.log(`[PayPal Webhook] ${eventType}`, resource?.id);

  await connectDB();

  try {
    switch (eventType) {
      // ─── Subscription activated (first payment successful) ──
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        await handleSubscriptionActivated(resource);
        break;
      }

      // ─── Subscription updated (plan change, etc.) ──────────
      case "BILLING.SUBSCRIPTION.UPDATED": {
        await handleSubscriptionUpdated(resource);
        break;
      }

      // ─── Subscription suspended (payment failure) ──────────
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        await handleSubscriptionStatusChange(resource.id, "suspended");
        break;
      }

      // ─── Subscription cancelled ────────────────────────────
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        await handleSubscriptionStatusChange(resource.id, "cancelled");
        break;
      }

      // ─── Subscription expired ──────────────────────────────
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        await handleSubscriptionStatusChange(resource.id, "expired");
        break;
      }

      // ─── Payment completed (recurring) ─────────────────────
      case "PAYMENT.SALE.COMPLETED": {
        await handlePaymentCompleted(resource);
        break;
      }

      // ─── Payment failed ────────────────────────────────────
      case "PAYMENT.SALE.DENIED":
      case "PAYMENT.SALE.REFUNDED": {
        if (resource.billing_agreement_id) {
          await handleSubscriptionStatusChange(
            resource.billing_agreement_id,
            "past_due"
          );
        }
        break;
      }

      default:
        console.log(`[PayPal Webhook] Unhandled event: ${eventType}`);
    }
  } catch (err: any) {
    console.error(`[PayPal Webhook] Error handling ${eventType}:`, err.message);
    // Return 200 to prevent PayPal from retrying; log for debugging
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ──────────────────────────────────────────────────

async function handleSubscriptionActivated(resource: any) {
  const paypalSubId = resource.id;
  const customId = resource.custom_id; // our clinicId

  const sub = await Subscription.findOne({
    paypalSubscriptionId: paypalSubId,
  });

  if (!sub) {
    console.warn(`No local subscription found for PayPal sub ${paypalSubId}`);
    return;
  }

  // Update subscription
  sub.status = "active";
  sub.currentPeriodStart = resource.billing_info?.last_payment?.time
    ? new Date(resource.billing_info.last_payment.time)
    : new Date();
  sub.currentPeriodEnd = resource.billing_info?.next_billing_time
    ? new Date(resource.billing_info.next_billing_time)
    : undefined;
  await sub.save();

  // Update clinic
  await Clinic.updateOne(
    { _id: sub.clinicId },
    {
      $set: {
        subscriptionStatus: "active",
        subscriptionPlanId: sub.planId,
      },
    }
  );
}

async function handleSubscriptionUpdated(resource: any) {
  const paypalSubId = resource.id;

  // Fetch fresh details from PayPal
  let subDetails;
  try {
    subDetails = await getPayPalSubscription(paypalSubId);
  } catch {
    subDetails = resource;
  }

  const sub = await Subscription.findOne({
    paypalSubscriptionId: paypalSubId,
  });

  if (!sub) return;

  // Map PayPal status to our status
  const statusMap: Record<string, string> = {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    CANCELLED: "cancelled",
    EXPIRED: "expired",
  };

  const newStatus = statusMap[subDetails.status] || sub.status;
  sub.status = newStatus;

  if (subDetails.billing_info?.next_billing_time) {
    sub.currentPeriodEnd = new Date(
      subDetails.billing_info.next_billing_time
    );
  }

  await sub.save();

  // Sync to clinic
  await Clinic.updateOne(
    { _id: sub.clinicId },
    { $set: { subscriptionStatus: newStatus } }
  );
}

async function handleSubscriptionStatusChange(
  paypalSubId: string,
  status: string
) {
  const sub = await Subscription.findOne({
    paypalSubscriptionId: paypalSubId,
  });

  if (!sub) {
    console.warn(
      `No local subscription for PayPal sub ${paypalSubId} (status → ${status})`
    );
    return;
  }

  sub.status = status;
  if (status === "cancelled") {
    sub.cancelledAt = new Date();
  }
  await sub.save();

  // Sync to clinic
  await Clinic.updateOne(
    { _id: sub.clinicId },
    { $set: { subscriptionStatus: status } }
  );
}

async function handlePaymentCompleted(resource: any) {
  // For recurring payments, refresh the subscription period
  const billingAgreementId = resource.billing_agreement_id;
  if (!billingAgreementId) return;

  const sub = await Subscription.findOne({
    paypalSubscriptionId: billingAgreementId,
  });

  if (!sub) return;

  // Ensure subscription is active
  if (sub.status !== "active") {
    sub.status = "active";
    await Clinic.updateOne(
      { _id: sub.clinicId },
      { $set: { subscriptionStatus: "active" } }
    );
  }

  sub.currentPeriodStart = new Date();
  await sub.save();
}
