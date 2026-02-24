import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { NextResponse } from "next/server";
import {
  AppointmentStatus,
  APPOINTMENT_ALLOWED_TRANSITIONS,
  canTransitionStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params; // <-- unwrap params

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const requestedStatus = normalizeAppointmentStatus(body.status);

  if (!requestedStatus) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const currentStatus =
    normalizeAppointmentStatus(appointment.status as any) ?? "scheduled";

  if (!canTransitionStatus(currentStatus as AppointmentStatus, requestedStatus)) {
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
      action: "UPDATE",
      entity: "Appointment",
      entityId: String(appointment._id),
      performedBy: session.user.id,
      details: {
        field: "status",
        from: previousStatus,
        to: requestedStatus,
      },
    });
  } catch {}

  return NextResponse.json(appointment);
}