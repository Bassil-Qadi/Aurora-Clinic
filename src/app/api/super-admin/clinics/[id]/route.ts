import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Clinic from "@/models/Clinic";
import { User } from "@/models/User";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import Subscription from "@/models/Subscription";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/super-admin/clinics/[id] ──────────────────────
// Full clinic detail with counts, staff, and subscription history
export async function GET(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const clinic = await Clinic.findById(id)
    .populate("subscriptionPlanId")
    .lean() as any;

  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // Enrich with related data
  const [
    staff,
    patientCount,
    appointmentCount,
    visitCount,
    subscriptions,
  ] = await Promise.all([
    User.find({ clinicId: id, role: { $ne: "super_admin" } })
      .select("-passwordHash")
      .lean(),
    Patient.countDocuments({ clinicId: id }),
    Appointment.countDocuments({ clinicId: id }),
    Visit.countDocuments({ clinicId: id }),
    Subscription.find({ clinicId: id })
      .populate("planId")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return NextResponse.json({
    ...clinic,
    staff,
    patientCount,
    appointmentCount,
    visitCount,
    subscriptions,
  });
}

// ─── PATCH /api/super-admin/clinics/[id] ────────────────────
// Update clinic details or toggle active status
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  // Allowed fields
  const allowedFields = [
    "name", "slug", "address", "phone", "email", "logo",
    "isActive", "settings", "subscriptionStatus", "subscriptionPlanId",
    "trialEndsAt",
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
    const existing = await Clinic.findOne({
      slug: updates.slug,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A clinic with this slug already exists." },
        { status: 409 }
      );
    }
  }

  const clinic = await Clinic.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true }
  ).populate("subscriptionPlanId");

  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  return NextResponse.json(clinic);
}

// ─── DELETE /api/super-admin/clinics/[id] ───────────────────
// Soft-delete: deactivate the clinic
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const clinic = await Clinic.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { returnDocument: "after" }
  );

  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Clinic deactivated." });
}
