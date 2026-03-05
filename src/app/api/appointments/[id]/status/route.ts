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
import { notifyClinicStaff, createNotification } from "@/lib/notifications";

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

  // ── Send notifications (fire & forget) ──
  try {
    const populated = await Appointment.findById(appointment._id)
      .populate("patient")
      .populate("doctor")
      .lean() as any;

    const patientName = populated?.patient
      ? `${populated.patient.firstName} ${populated.patient.lastName}`
      : "A patient";

    const STATUS_LABELS: Record<string, string> = {
      scheduled: "Scheduled",
      waiting: "Waiting",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No Show",
    };
    const statusLabel = STATUS_LABELS[requestedStatus] || requestedStatus;

    const type =
      requestedStatus === "cancelled"
        ? "appointment_cancelled" as const
        : requestedStatus === "no_show"
        ? "appointment_no_show" as const
        : "appointment_status_changed" as const;

    const title =
      requestedStatus === "cancelled"
        ? "Appointment Cancelled"
        : requestedStatus === "no_show"
        ? "Patient No-Show"
        : "Appointment Updated";

    const message =
      requestedStatus === "cancelled"
        ? `${patientName}'s appointment was cancelled`
        : requestedStatus === "no_show"
        ? `${patientName} did not show up for their appointment`
        : `${patientName}'s appointment status changed to ${statusLabel}`;

    // Notify the assigned doctor if they didn't make the change
    if (populated?.doctor?._id && String(populated.doctor._id) !== user.id) {
      createNotification({
        clinicId: user.clinicId,
        recipientId: String(populated.doctor._id),
        type,
        title,
        message,
        link: "/appointments",
        metadata: { appointmentId: String(appointment._id), patientName, status: requestedStatus },
      }).catch(() => {});
    }

    // Notify admin + receptionists
    notifyClinicStaff(
      user.clinicId,
      ["admin", "receptionist"],
      {
        type,
        title,
        message,
        link: "/appointments",
        metadata: { appointmentId: String(appointment._id), patientName, status: requestedStatus },
      },
      user.id
    ).catch(() => {});
  } catch {}

  return NextResponse.json(appointment);
}
