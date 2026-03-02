import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Subscription from "@/models/Subscription";
import Clinic from "@/models/Clinic";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/super-admin/subscriptions/[id] ────────────────
export async function GET(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const subscription = await Subscription.findById(id)
    .populate("clinicId", "name slug email subscriptionStatus")
    .populate("planId")
    .lean();

  if (!subscription) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(subscription);
}

// ─── PATCH /api/super-admin/subscriptions/[id] ─────────────
// Override subscription fields (status, period dates, trial dates, plan)
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const allowedFields = [
    "status",
    "planId",
    "currentPeriodStart",
    "currentPeriodEnd",
    "trialStart",
    "trialEnd",
    "cancelAtPeriodEnd",
    "cancelledAt",
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

  const subscription = await Subscription.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  )
    .populate("clinicId", "name slug")
    .populate("planId");

  if (!subscription) {
    return NextResponse.json(
      { error: "Subscription not found" },
      { status: 404 }
    );
  }

  // Sync subscription status to the clinic document
  if (updates.status && subscription.clinicId) {
    const clinicId =
      typeof subscription.clinicId === "object"
        ? (subscription.clinicId as any)._id
        : subscription.clinicId;

    await Clinic.findByIdAndUpdate(clinicId, {
      $set: { subscriptionStatus: updates.status },
    });
  }

  return NextResponse.json(subscription);
}
