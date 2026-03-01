import { connectDB } from "./db";
import Clinic from "../models/Clinic";
import Subscription from "../models/Subscription";
import SubscriptionPlan from "../models/SubscriptionPlan";
import { User } from "../models/User";
import Patient from "../models/Patient";
import Appointment from "../models/Appointment";

// ─── Status helpers ────────────────────────────────────────────

const ACTIVE_STATUSES = ["active", "trialing"];
const GRACE_STATUSES = ["past_due"]; // allow limited access

/**
 * Check whether a clinic has an active (or trialing) subscription.
 * Returns { allowed, reason, daysLeft? }
 */
export async function requireActiveSubscription(clinicId: string) {
  await connectDB();

  const clinic = await Clinic.findById(clinicId).lean() as any;
  if (!clinic) {
    return { allowed: false, reason: "clinic_not_found" as const };
  }

  const status = clinic.subscriptionStatus || "none";

  // Active or trialing — all good
  if (ACTIVE_STATUSES.includes(status)) {
    // If trialing, check if trial has expired
    if (status === "trialing" && clinic.trialEndsAt) {
      const trialEnd = new Date(clinic.trialEndsAt);
      if (trialEnd < new Date()) {
        // Trial expired — update status
        await Clinic.updateOne(
          { _id: clinicId },
          { $set: { subscriptionStatus: "expired" } }
        );
        return { allowed: false, reason: "trial_expired" as const };
      }
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return { allowed: true, reason: "trialing" as const, daysLeft };
    }
    return { allowed: true, reason: "active" as const };
  }

  // Grace period for past_due (allow 7 days)
  if (GRACE_STATUSES.includes(status)) {
    const sub = await Subscription.findOne({
      clinicId,
      status: "past_due",
    })
      .sort({ updatedAt: -1 })
      .lean() as any;

    if (sub) {
      const daysSinceDue = Math.ceil(
        (Date.now() - new Date(sub.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDue <= 7) {
        return {
          allowed: true,
          reason: "past_due_grace" as const,
          daysLeft: 7 - daysSinceDue,
        };
      }
    }
    return { allowed: false, reason: "payment_overdue" as const };
  }

  return { allowed: false, reason: "subscription_inactive" as const };
}

// ─── Feature limits ────────────────────────────────────────────

interface FeatureLimits {
  maxDoctors: number;
  maxPatients: number;
  maxAppointmentsPerMonth: number;
  patientPortal: boolean;
  aiSummary: boolean;
  customBranding: boolean;
}

/**
 * Get the feature limits for a clinic based on its current plan.
 * Returns null if no plan is assigned (unlimited / free trial defaults).
 */
export async function getClinicFeatureLimits(
  clinicId: string
): Promise<FeatureLimits | null> {
  await connectDB();

  const clinic = await Clinic.findById(clinicId).lean() as any;
  if (!clinic?.subscriptionPlanId) return null;

  const plan = await SubscriptionPlan.findById(clinic.subscriptionPlanId).lean() as any;
  if (!plan) return null;

  return plan.features as FeatureLimits;
}

/**
 * Check if a specific feature action is allowed under the clinic's plan.
 */
export async function checkFeatureLimit(
  clinicId: string,
  feature: "doctors" | "patients" | "appointments" | "patientPortal" | "aiSummary"
): Promise<{ allowed: boolean; current?: number; limit?: number; message?: string }> {
  const limits = await getClinicFeatureLimits(clinicId);

  // No plan assigned — during trial, allow generous defaults
  if (!limits) {
    return { allowed: true };
  }

  switch (feature) {
    case "doctors": {
      if (limits.maxDoctors === -1) return { allowed: true }; // unlimited
      const count = await User.countDocuments({
        clinicId,
        role: "doctor",
        isActive: true,
      });
      return {
        allowed: count < limits.maxDoctors,
        current: count,
        limit: limits.maxDoctors,
        message:
          count >= limits.maxDoctors
            ? `Your plan allows up to ${limits.maxDoctors} doctors. Please upgrade.`
            : undefined,
      };
    }

    case "patients": {
      if (limits.maxPatients === -1) return { allowed: true };
      const count = await Patient.countDocuments({ clinicId });
      return {
        allowed: count < limits.maxPatients,
        current: count,
        limit: limits.maxPatients,
        message:
          count >= limits.maxPatients
            ? `Your plan allows up to ${limits.maxPatients} patients. Please upgrade.`
            : undefined,
      };
    }

    case "appointments": {
      if (limits.maxAppointmentsPerMonth === -1) return { allowed: true };
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const count = await Appointment.countDocuments({
        clinicId,
        createdAt: { $gte: startOfMonth },
      });
      return {
        allowed: count < limits.maxAppointmentsPerMonth,
        current: count,
        limit: limits.maxAppointmentsPerMonth,
        message:
          count >= limits.maxAppointmentsPerMonth
            ? `Monthly appointment limit (${limits.maxAppointmentsPerMonth}) reached. Please upgrade.`
            : undefined,
      };
    }

    case "patientPortal":
      return {
        allowed: limits.patientPortal,
        message: !limits.patientPortal
          ? "Patient portal is not available on your current plan."
          : undefined,
      };

    case "aiSummary":
      return {
        allowed: limits.aiSummary,
        message: !limits.aiSummary
          ? "AI summary is not available on your current plan."
          : undefined,
      };

    default:
      return { allowed: true };
  }
}

// ─── Trial helper ──────────────────────────────────────────────

const TRIAL_DAYS = 14;

/**
 * Start a free trial for a newly registered clinic.
 */
export async function startFreeTrial(clinicId: string) {
  await connectDB();

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  await Clinic.updateOne(
    { _id: clinicId },
    {
      $set: {
        subscriptionStatus: "trialing",
        trialEndsAt: trialEnd,
      },
    }
  );

  return { trialEndsAt: trialEnd, trialDays: TRIAL_DAYS };
}
