import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import {
  requireAuth,
  assertBelongsToClinic,
  assertDoctorInClinic,
} from "@/lib/apiAuth";
import Patient from "@/models/Patient";
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

  // updateAppointmentSchema accepts both `patient` and `doctor`, and the
  // validated body is written straight through below — verify any reference
  // being introduced belongs to this clinic.
  if (validation.data.patient !== undefined) {
    const patientCheck = await assertBelongsToClinic(
      Patient,
      validation.data.patient,
      user.clinicId,
      "Patient"
    );
    if (!patientCheck.ok) return patientCheck.response;
  }

  if (validation.data.doctor !== undefined) {
    const doctorCheck = await assertDoctorInClinic(
      validation.data.doctor,
      user.clinicId
    );
    if (!doctorCheck.ok) return doctorCheck.response;
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
