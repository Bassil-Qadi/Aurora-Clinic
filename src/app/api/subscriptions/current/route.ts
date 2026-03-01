import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import Subscription from "@/models/Subscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import Clinic from "@/models/Clinic";
import { User } from "@/models/User";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";

// ─── GET /api/subscriptions/current ───────────────────────
// Returns the clinic's current subscription info + usage stats.
export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const clinic = (await Clinic.findById(auth.user.clinicId).lean()) as any;
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // Find active/trialing subscription
  const subscription = (await Subscription.findOne({
    clinicId: auth.user.clinicId,
    status: { $in: ["active", "trialing", "past_due"] },
  })
    .sort({ createdAt: -1 })
    .lean()) as any;

  // Get plan details
  let plan = null;
  if (subscription?.planId) {
    plan = await SubscriptionPlan.findById(subscription.planId).lean();
  } else if (clinic.subscriptionPlanId) {
    plan = await SubscriptionPlan.findById(clinic.subscriptionPlanId).lean();
  }

  // Current usage stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [doctorCount, patientCount, appointmentCount] = await Promise.all([
    User.countDocuments({
      clinicId: auth.user.clinicId,
      role: "doctor",
      isActive: true,
    }),
    Patient.countDocuments({ clinicId: auth.user.clinicId }),
    Appointment.countDocuments({
      clinicId: auth.user.clinicId,
      createdAt: { $gte: startOfMonth },
    }),
  ]);

  return NextResponse.json({
    subscription: subscription
      ? {
          id: subscription._id,
          status: subscription.status,
          paypalSubscriptionId: subscription.paypalSubscriptionId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          trialEnd: subscription.trialEnd,
        }
      : null,
    plan,
    clinic: {
      subscriptionStatus: clinic.subscriptionStatus || "none",
      trialEndsAt: clinic.trialEndsAt,
    },
    usage: {
      doctors: doctorCount,
      patients: patientCount,
      appointmentsThisMonth: appointmentCount,
    },
  });
}
