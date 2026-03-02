import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Subscription from "@/models/Subscription";

// ─── GET /api/super-admin/subscriptions ─────────────────────
// List all subscriptions across all clinics
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "active" | "trialing" | etc.
  const clinicId = searchParams.get("clinicId");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (clinicId) filter.clinicId = clinicId;

  const [subscriptions, total] = await Promise.all([
    Subscription.find(filter)
      .populate("clinicId", "name slug email subscriptionStatus")
      .populate("planId", "name slug price currency interval")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Subscription.countDocuments(filter),
  ]);

  return NextResponse.json({
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
