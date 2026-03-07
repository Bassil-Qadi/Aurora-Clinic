import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Clinic from "@/models/Clinic";
import SubscriptionPlan from "@/models/SubscriptionPlan";

/**
 * POST /api/super-admin/clinics/[id]/assign-enterprise
 * Assign Enterprise plan to a clinic without payment
 * This bypasses the subscription system and gives the clinic full Enterprise features
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  // Find the clinic
  const clinic = await Clinic.findById(id);
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // Find the Enterprise plan
  const enterprisePlan = await SubscriptionPlan.findOne({
    slug: "enterprise",
    isActive: true,
  });

  if (!enterprisePlan) {
    return NextResponse.json(
      {
        error:
          "Enterprise plan not found. Please create an Enterprise plan first.",
      },
      { status: 404 }
    );
  }

  // Assign Enterprise plan and set status to active
  clinic.subscriptionPlanId = enterprisePlan._id;
  clinic.subscriptionStatus = "active";
  clinic.trialEndsAt = undefined; // Remove trial end date
  await clinic.save();

  const updatedClinic = await Clinic.findById(id)
    .populate("subscriptionPlanId")
    .lean();

  return NextResponse.json({
    success: true,
    message: `Enterprise plan assigned to ${clinic.name}`,
    clinic: updatedClinic,
  });
}
