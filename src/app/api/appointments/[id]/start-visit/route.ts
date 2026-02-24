import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import {
  AppointmentStatus,
  canTransitionStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;

  const appointment = await Appointment.findOne({
    _id: id,
    clinicId: user.clinicId,
  })
    .populate("patient")
    .populate("doctor");

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const currentStatus =
    normalizeAppointmentStatus(appointment.status as any) ?? "scheduled";

  // Only allow starting a visit from Waiting or In Progress (to resume)
  if (currentStatus !== "waiting" && currentStatus !== "in_progress") {
    return NextResponse.json(
      {
        error:
          "Visit can only be started when the patient is Waiting or already In Progress.",
        status: currentStatus,
      },
      { status: 400 }
    );
  }

  // Prevent duplicate visits
  const existingVisit = await Visit.findOne({
    appointment: id,
    clinicId: user.clinicId,
  });

  if (existingVisit) {
    // Ensure status is at least in_progress
    if (
      canTransitionStatus(currentStatus as AppointmentStatus, "in_progress")
    ) {
      appointment.status = "in_progress";
      await appointment.save();
    }

    return NextResponse.json({
      visitId: existingVisit._id,
      alreadyExists: true,
    });
  }

  // Determine which doctor to assign to the visit
  const doctorId =
    (appointment.doctor &&
    (appointment.doctor as any)._id
      ? (appointment.doctor as any)._id
      : appointment.doctor) || user.id;

  const visit = await Visit.create({
    clinicId: user.clinicId,
    patient: appointment.patient,
    doctor: doctorId,
    appointment: appointment._id,
    diagnosis: "",
    notes: "",
  });

  // Move to In Progress
  if (
    canTransitionStatus(currentStatus as AppointmentStatus, "in_progress")
  ) {
    appointment.status = "in_progress";
    await appointment.save();
  }

  return NextResponse.json({
    visitId: visit._id,
    created: true,
  });
}
