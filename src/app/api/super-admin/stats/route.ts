import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Clinic from "@/models/Clinic";
import { User } from "@/models/User";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import Subscription from "@/models/Subscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";

// ─── GET /api/super-admin/stats ─────────────────────────────
// Global KPIs for the super admin dashboard
export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  // ── Core counts ──────────────────────────────────────────
  const [
    totalClinics,
    activeClinics,
    totalUsers,
    totalPatients,
    totalAppointments,
    totalVisits,
  ] = await Promise.all([
    Clinic.countDocuments(),
    Clinic.countDocuments({ isActive: true }),
    User.countDocuments({ role: { $ne: "super_admin" } }),
    Patient.countDocuments(),
    Appointment.countDocuments(),
    Visit.countDocuments(),
  ]);

  // ── Subscription breakdown ───────────────────────────────
  const subscriptionsByStatus = await Clinic.aggregate([
    {
      $group: {
        _id: "$subscriptionStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  // ── Active subscriptions with plan revenue ───────────────
  const activeSubscriptions = await Subscription.countDocuments({
    status: { $in: ["active", "trialing"] },
  });

  // ── Monthly recurring revenue (MRR) ─────────────────────
  const mrrPipeline = await Subscription.aggregate([
    { $match: { status: "active" } },
    {
      $lookup: {
        from: "subscriptionplans",
        localField: "planId",
        foreignField: "_id",
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $group: {
        _id: null,
        mrr: {
          $sum: {
            $cond: [
              { $eq: ["$plan.interval", "YEAR"] },
              { $divide: ["$plan.price", 12] },
              "$plan.price",
            ],
          },
        },
      },
    },
  ]);
  const mrr = mrrPipeline[0]?.mrr ?? 0;

  // ── New clinics this month ──────────────────────────────
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newClinicsThisMonth = await Clinic.countDocuments({
    createdAt: { $gte: startOfMonth },
  });

  // ── New clinics trend (last 6 months) ───────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const clinicsTrend = await Clinic.aggregate([
    { $match: { createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  // ── Users by role ───────────────────────────────────────
  const usersByRole = await User.aggregate([
    { $match: { role: { $ne: "super_admin" } } },
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);

  // ── Appointments today (global) ─────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const appointmentsToday = await Appointment.countDocuments({
    date: { $gte: todayStart, $lte: todayEnd },
  });

  return NextResponse.json({
    totalClinics,
    activeClinics,
    totalUsers,
    totalPatients,
    totalAppointments,
    totalVisits,
    activeSubscriptions,
    mrr: Math.round(mrr * 100) / 100,
    newClinicsThisMonth,
    clinicsTrend,
    subscriptionsByStatus,
    usersByRole,
    appointmentsToday,
  });
}
