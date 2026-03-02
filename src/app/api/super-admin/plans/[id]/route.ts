import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import SubscriptionPlan from "@/models/SubscriptionPlan";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/super-admin/plans/[id] ────────────────────────
export async function GET(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const plan = await SubscriptionPlan.findById(id).lean();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

// ─── PATCH /api/super-admin/plans/[id] ──────────────────────
// Update plan fields
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const allowedFields = [
    "name",
    "slug",
    "description",
    "price",
    "currency",
    "interval",
    "features",
    "sortOrder",
    "isActive",
    "paypalProductId",
    "paypalPlanId",
  ];

  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 }
    );
  }

  // Check slug uniqueness if being changed
  if (updates.slug) {
    const existing = await SubscriptionPlan.findOne({
      slug: updates.slug,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A plan with this slug already exists." },
        { status: 409 }
      );
    }
  }

  const plan = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  );

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

// ─── DELETE /api/super-admin/plans/[id] ─────────────────────
// Soft-delete: deactivate the plan
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const plan = await SubscriptionPlan.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { returnDocument: "after" }
  );

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Plan deactivated." });
}
