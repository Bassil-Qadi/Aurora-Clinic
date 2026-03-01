import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { createSubscriptionPlanSchema } from "@/lib/validations";
import {
  createPayPalProduct,
  createPayPalPlan,
} from "@/lib/paypal";

// ─── GET /api/subscriptions/plans ─────────────────────────
// Public: list all active plans (for pricing page)
export async function GET() {
  await connectDB();

  const plans = await SubscriptionPlan.find({ isActive: true })
    .sort({ sortOrder: 1, price: 1 })
    .lean();

  return NextResponse.json(plans);
}

// ─── POST /api/subscriptions/plans ────────────────────────
// Admin-only: create a new plan (also syncs to PayPal)
export async function POST(req: Request) {
  const auth = await requireAuth(["admin"]);
//   if (!auth.success) return auth.response;

  await connectDB();

  const body = await req.json();
  const validation = createSubscriptionPlanSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Check slug uniqueness
  const existing = await SubscriptionPlan.findOne({ slug: data.slug });
  if (existing) {
    return NextResponse.json(
      { error: "A plan with this slug already exists." },
      { status: 409 }
    );
  }

  // Create PayPal product + plan (if PayPal is configured)
  let paypalProductId = "";
  let paypalPlanId = "";

  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    try {
      // 1. Create PayPal Product
      const product = await createPayPalProduct(
        `CarePilot ${data.name}`,
        data.description || `${data.name} subscription plan`
      );
      paypalProductId = product.id;

      // 2. Create PayPal Billing Plan
      const plan = await createPayPalPlan({
        productId: product.id,
        name: data.name,
        description: data.description || `${data.name} subscription plan`,
        price: data.price,
        currency: data.currency || "USD",
        interval: data.interval || "MONTH",
        trialDays: 14,
      });
      paypalPlanId = plan.id;
    } catch (err: any) {
      console.error("PayPal sync failed:", err.message);
      // Continue saving locally — PayPal can be synced later
    }
  }

  const plan = await SubscriptionPlan.create({
    ...data,
    paypalProductId,
    paypalPlanId,
  });

  return NextResponse.json(plan, { status: 201 });
}
