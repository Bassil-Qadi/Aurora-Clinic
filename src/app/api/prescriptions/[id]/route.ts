import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";
import AuditLog from "@/models/AuditLog";
import { requireAuth } from "@/lib/apiAuth";
import { updatePrescriptionSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;

  const prescription = await Prescription.findOne({
    _id: id,
    clinicId: user.clinicId,
  })
    .populate("patient")
    .populate("doctor");

  if (!prescription) {
    return NextResponse.json(
      { error: "Prescription not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(prescription);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["doctor"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const validation = updatePrescriptionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { userId, ...updateData } = validation.data;

  // 1. Find existing prescription (scoped to clinic)
  const existing = await Prescription.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Prescription not found" },
      { status: 404 }
    );
  }

  // 2. Mark current as superseded
  await Prescription.findByIdAndUpdate(id, { isSuperseded: true });

  // 3. Create new version
  const newVersion = await Prescription.create({
    ...existing.toObject(),
    ...updateData,
    _id: undefined,
    clinicId: user.clinicId,
    version: existing.version + 1,
    previousVersion: existing._id,
    isSuperseded: false,
    updatedBy: userId || user.id,
    updatedAt: new Date(),
  });

  // 4. Audit log
  await AuditLog.create({
    clinicId: user.clinicId,
    action: "UPDATE",
    entity: "Prescription",
    entityId: newVersion._id,
    performedBy: userId || user.id,
    details: {
      previousVersion: existing._id,
      newVersion: newVersion._id,
    },
  });

  return NextResponse.json(newVersion);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body.userId;
  } catch {
    // No body provided
  }

  const prescription = await Prescription.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!prescription) {
    return NextResponse.json(
      { error: "Prescription not found" },
      { status: 404 }
    );
  }

  await Prescription.findByIdAndUpdate(id, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy: userId || user.id,
  });

  await AuditLog.create({
    clinicId: user.clinicId,
    action: "DELETE",
    entity: "Prescription",
    entityId: id,
    performedBy: userId || user.id,
  });

  return NextResponse.json({ success: true });
}
