import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import Subscription from "@/models/Subscription";
import Clinic from "@/models/Clinic";
import { cancelPayPalSubscription } from "@/lib/paypal";

// ─── POST /api/subscriptions/cancel ───────────────────────
// Cancels the clinic's active PayPal subscription.
export async function POST(req: Request) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const reason = body.reason || "Cancelled by clinic admin";

  // Find active subscription
  const subscription = await Subscription.findOne({
    clinicId: auth.user.clinicId,
    status: { $in: ["active", "trialing", "past_due"] },
  }).sort({ createdAt: -1 });

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription found." },
      { status: 404 }
    );
  }

  // Cancel on PayPal (if there's a PayPal subscription)
  if (subscription.paypalSubscriptionId) {
    try {
      await cancelPayPalSubscription(
        subscription.paypalSubscriptionId,
        reason
      );
    } catch (err: any) {
      console.error("PayPal cancel failed:", err.message);
      // Continue with local cancellation
    }
  }

  // Update local records
  subscription.status = "cancelled";
  subscription.cancelledAt = new Date();
  await subscription.save();

  await Clinic.updateOne(
    { _id: auth.user.clinicId },
    {
      $set: { subscriptionStatus: "cancelled" },
      $unset: { subscriptionPlanId: 1 },
    }
  );

  return NextResponse.json({
    success: true,
    message: "Subscription cancelled successfully.",
  });
}
