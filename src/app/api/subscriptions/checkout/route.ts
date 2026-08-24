import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import Subscription from "@/models/Subscription";
import { checkoutSubscriptionSchema } from "@/lib/validations";
import { createPayPalSubscription } from "@/lib/paypal";

// ─── POST /api/subscriptions/checkout ─────────────────────
// Creates a PayPal subscription and returns the approval URL.
// Only clinic admins can subscribe.
export async function POST(req: Request) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;

  await connectDB();

  const body = await req.json();
  const validation = checkoutSubscriptionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { planId } = validation.data;

  // Fetch the plan
  const plan = await SubscriptionPlan.findById(planId).lean() as any;
  if (!plan || !plan.isActive) {
    return NextResponse.json(
      { error: "Plan not found or inactive." },
      { status: 404 }
    );
  }

  if (!plan.paypalPlanId) {
    return NextResponse.json(
      {
        error:
          "This plan is not yet synced with PayPal. Please contact support.",
      },
      { status: 400 }
    );
  }

  // Check if clinic already has a *paid* subscription. "pending" is
  // deliberately excluded — an abandoned checkout must never block the
  // clinic from subscribing later.
  const existingSub = await Subscription.findOne({
    clinicId: auth.user.clinicId,
    status: { $in: ["active", "trialing", "past_due"] },
  });

  if (existingSub) {
    return NextResponse.json(
      {
        error:
          "Your clinic already has an active subscription. Cancel it first to switch plans.",
      },
      { status: 409 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Create PayPal subscription
  const paypalSub = await createPayPalSubscription({
    planId: plan.paypalPlanId,
    subscriberEmail: auth.user.email,
    subscriberName: auth.user.name,
    returnUrl: `${baseUrl}/dashboard/subscription?status=success&plan=${planId}`,
    cancelUrl: `${baseUrl}/dashboard/subscription?status=cancelled`,
    customId: auth.user.clinicId,
  });

  // Find the approval link
  const approveLink = paypalSub.links?.find(
    (l: any) => l.rel === "approve"
  );

  if (!approveLink) {
    return NextResponse.json(
      { error: "Failed to get PayPal approval URL." },
      { status: 500 }
    );
  }

  // Discard any earlier abandoned checkouts for this clinic so pending
  // records don't pile up each time Subscribe is clicked.
  await Subscription.deleteMany({
    clinicId: auth.user.clinicId,
    status: "pending",
  });

  // Record the attempt as PENDING only. The payer has not approved at
  // PayPal yet, so nothing is granted here — the clinic record is left
  // untouched. Activation happens in the BILLING.SUBSCRIPTION.ACTIVATED
  // webhook, or via /api/subscriptions/verify on return from PayPal.
  await Subscription.create({
    clinicId: auth.user.clinicId,
    planId: plan._id,
    paypalSubscriptionId: paypalSub.id,
    status: "pending",
  });

  return NextResponse.json({
    subscriptionId: paypalSub.id,
    approvalUrl: approveLink.href,
  });
}
