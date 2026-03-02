import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { createSubscriptionPlanSchema } from "@/lib/validations";

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

  const plan = await SubscriptionPlan.create(data);

  return NextResponse.json(plan, { status: 201 });
}
