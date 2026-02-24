import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Appointment from "@/models/Appointment";
import {
  AppointmentStatus,
  canTransitionStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  const visit = await Visit.findById(id);

  if (!visit) {
    return NextResponse.json(
      { error: "Visit not found" },
      { status: 404 }
    );
  }

  // Update visit
  visit.completed = true;
  await visit.save();

  // Update appointment status -> Completed with transition check
  if (visit.appointment) {
    const appointment = await Appointment.findById(visit.appointment);

    if (appointment) {
      const currentStatus =
        normalizeAppointmentStatus(appointment.status as any) ?? "scheduled";

      if (
        canTransitionStatus(currentStatus as AppointmentStatus, "completed")
      ) {
        appointment.status = "completed";
        await appointment.save();
      }
    }
  }

  return NextResponse.json({
    success: true,
  });
}