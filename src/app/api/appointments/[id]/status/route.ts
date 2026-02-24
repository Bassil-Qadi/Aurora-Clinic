import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import AuditLog from "@/models/AuditLog";
import { NextResponse } from "next/server";
import {
  AppointmentStatus,
  APPOINTMENT_ALLOWED_TRANSITIONS,
  canTransitionStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { requireAuth } from "@/lib/apiAuth";
import { statusUpdateSchema } from "@/lib/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;

  const body = await req.json();
  const validation = statusUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const requestedStatus = normalizeAppointmentStatus(validation.data.status);

  if (!requestedStatus) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  const appointment = await Appointment.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const currentStatus =
    normalizeAppointmentStatus(appointment.status as any) ?? "scheduled";

  if (
    !canTransitionStatus(currentStatus as AppointmentStatus, requestedStatus)
  ) {
    return NextResponse.json(
      {
        error: "Invalid status transition",
        from: currentStatus,
        to: requestedStatus,
        allowedTo: APPOINTMENT_ALLOWED_TRANSITIONS[currentStatus],
      },
      { status: 400 }
    );
  }

  const previousStatus = currentStatus;
  appointment.status = requestedStatus;
  await appointment.save();

  try {
    await AuditLog.create({
      clinicId: user.clinicId,
      action: "UPDATE",
      entity: "Appointment",
      entityId: String(appointment._id),
      performedBy: user.id,
      details: {
        field: "status",
        from: previousStatus,
        to: requestedStatus,
      },
    });
  } catch {}

  return NextResponse.json(appointment);
}
