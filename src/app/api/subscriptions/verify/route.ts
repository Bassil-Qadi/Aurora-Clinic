import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import Subscription from "@/models/Subscription";
import Clinic from "@/models/Clinic";
import { getPayPalSubscription } from "@/lib/paypal";

// ─── POST /api/subscriptions/verify ───────────────────────
// Called when the payer returns from PayPal. Confirms the real
// subscription status with PayPal before granting any access, so the
// flow does not depend on the webhook being reachable (it isn't on
// localhost). Safe to call repeatedly.
export async function POST() {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;

  await connectDB();

  const sub = await Subscription.findOne({
    clinicId: auth.user.clinicId,
    status: "pending",
  }).sort({ createdAt: -1 });

  if (!sub) {
    // Nothing awaiting confirmation — either already activated by the
    // webhook, or the payer never started a checkout.
    return NextResponse.json({ status: "none" });
  }

  if (!sub.paypalSubscriptionId) {
    return NextResponse.json({ status: "pending" });
  }

  let details: any;
  try {
    details = await getPayPalSubscription(sub.paypalSubscriptionId);
  } catch (err: any) {
    console.error("PayPal verify failed:", err?.message);
    return NextResponse.json(
      { error: "Could not verify the payment with PayPal." },
      { status: 502 }
    );
  }

  // APPROVAL_PENDING => payer abandoned checkout. Grant nothing.
  switch (details.status) {
    case "ACTIVE":
    case "APPROVED": {
      sub.status = "active";
      sub.currentPeriodStart = details.billing_info?.last_payment?.time
        ? new Date(details.billing_info.last_payment.time)
        : new Date();
      if (details.billing_info?.next_billing_time) {
        sub.currentPeriodEnd = new Date(details.billing_info.next_billing_time);
      }
      await sub.save();

      await Clinic.updateOne(
        { _id: sub.clinicId },
        {
          $set: {
            subscriptionStatus: "active",
            subscriptionPlanId: sub.planId,
          },
        }
      );

      return NextResponse.json({ status: "active" });
    }

    case "CANCELLED":
    case "EXPIRED": {
      await Subscription.deleteOne({ _id: sub._id });
      return NextResponse.json({ status: "cancelled" });
    }

    default:
      // APPROVAL_PENDING and anything unrecognised stay pending.
      return NextResponse.json({ status: "pending" });
  }
}
