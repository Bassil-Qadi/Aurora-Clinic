import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { createSubscriptionPlanSchema } from "@/lib/validations";
import { isPayPalConfigured, syncPlanToPayPal } from "@/lib/paypal";

// ─── GET /api/super-admin/plans ─────────────────────────────
// List ALL plans (including inactive ones — unlike the public endpoint)
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  const filter: Record<string, any> = {};
  if (!includeInactive) {
    filter.isActive = true;
  }

  const plans = await SubscriptionPlan.find(filter)
    .sort({ sortOrder: 1, price: 1 })
    .lean();

  return NextResponse.json({ plans });
}

// ─── POST /api/super-admin/plans ────────────────────────────
// Create a new subscription plan
export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

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

  // Create the backing PayPal product + billing plan. Without a
  // paypalPlanId the plan renders as "Coming Soon" and clinic admins
  // cannot check out, so the plan is unusable until this succeeds.
  let paypalProductId = "";
  let paypalPlanId = "";
  let paypalSyncError: string | null = null;

  if (isPayPalConfigured()) {
    try {
      ({ paypalProductId, paypalPlanId } = await syncPlanToPayPal({
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        interval: data.interval,
      }));
    } catch (err: any) {
      // Save the plan anyway — it can be synced later from the plans page.
      console.error("PayPal sync failed:", err?.message);
      paypalSyncError = err?.message || "PayPal sync failed.";
    }
  } else {
    paypalSyncError =
      "PayPal is not configured, so this plan cannot accept subscriptions yet.";
  }

  const plan = await SubscriptionPlan.create({
    ...data,
    paypalProductId,
    paypalPlanId,
  });

  return NextResponse.json(
    { ...plan.toObject(), paypalSyncError },
    { status: 201 }
  );
}
