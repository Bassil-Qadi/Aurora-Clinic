import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Appointment from "@/models/Appointment";
import {
  AppointmentStatus,
  canTransitionStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { requireAuth } from "@/lib/apiAuth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["doctor", "admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;

  const visit = await Visit.findOne({ _id: id, clinicId: user.clinicId });

  if (!visit) {
    return NextResponse.json(
      { error: "Visit not found" },
      { status: 404 }
    );
  }

  // Update visit
  visit.completed = true;
  await visit.save();

  // Update appointment status → Completed with transition check
  if (visit.appointment) {
    const appointment = await Appointment.findOne({
      _id: visit.appointment,
      clinicId: user.clinicId,
    });

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
