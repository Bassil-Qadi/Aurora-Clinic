import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { requireAuth } from "@/lib/apiAuth";
import { updateAppointmentSchema } from "@/lib/validations";
import { checkAppointmentConflicts } from "@/lib/appointmentConflicts";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const validation = updateAppointmentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  // Get existing appointment to check what's being updated
  const existing = await Appointment.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // If date or doctor is being updated, check for conflicts
  const newDate = validation.data.date ? new Date(validation.data.date) : existing.date;
  const newDoctorId = validation.data.doctor || existing.doctor;

  // Only check conflicts if date or doctor changed
  if (validation.data.date || validation.data.doctor) {
    const conflictCheck = await checkAppointmentConflicts(
      user.clinicId,
      newDate,
      newDoctorId,
      id // Exclude current appointment from conflict check
    );

    if (conflictCheck.hasConflict) {
      return NextResponse.json(
        { error: conflictCheck.error },
        { status: 400 }
      );
    }
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: id, clinicId: user.clinicId },
    validation.data,
    { returnDocument: "after" }
  );

  return NextResponse.json(updated);
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

  const deleted = await Appointment.findOneAndDelete({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!deleted) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
