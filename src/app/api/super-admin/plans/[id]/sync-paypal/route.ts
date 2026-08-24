import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { isPayPalConfigured, syncPlanToPayPal } from "@/lib/paypal";

type RouteContext = { params: Promise<{ id: string }> };

// ─── POST /api/super-admin/plans/[id]/sync-paypal ───────────
// Backfill the PayPal product + billing plan for a plan that was
// created without one. Idempotent: a plan that already has a
// paypalPlanId is returned untouched.
export async function POST(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const plan = await SubscriptionPlan.findById(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  if (plan.paypalPlanId) {
    return NextResponse.json({
      success: true,
      alreadySynced: true,
      plan,
    });
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      {
        error:
          "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  try {
    const { paypalProductId, paypalPlanId } = await syncPlanToPayPal({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      // Reuse the product if a previous run created one but then failed.
      existingProductId: plan.paypalProductId || undefined,
    });

    plan.paypalProductId = paypalProductId;
    plan.paypalPlanId = paypalPlanId;
    await plan.save();

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error("PayPal sync failed:", err?.message);
    return NextResponse.json(
      { error: err?.message || "PayPal sync failed." },
      { status: 502 }
    );
  }
}
