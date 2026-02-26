import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import AuditLog from "@/models/AuditLog";
import Patient from "@/models/Patient";
import Clinic from "@/models/Clinic";
import { NextResponse } from "next/server";
import {
  AppointmentStatus,
  APPOINTMENT_ALLOWED_TRANSITIONS,
  canTransitionStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";
import { requireAuth } from "@/lib/apiAuth";
import { statusUpdateSchema } from "@/lib/validations";
import { sendAppointmentStatusEmail } from "@/lib/email";

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

  // Send status notification email (fire-and-forget)
  try {
    const patient = await Patient.findById(appointment.patient)
      .select("firstName lastName email")
      .lean();

    if (patient && typeof patient === "object" && "email" in patient && (patient as any).email) {
      const p = patient as { firstName: string; lastName: string; email: string };
      const apptDate = new Date(appointment.date);

      const clinic = await Clinic.findById(user.clinicId).select("name").lean();
      const clinicName =
        clinic && typeof clinic === "object" && "name" in clinic
          ? (clinic as { name: string }).name
          : undefined;

      sendAppointmentStatusEmail({
        patientName: `${p.firstName} ${p.lastName}`,
        patientEmail: p.email,
        appointmentDate: apptDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        appointmentTime: apptDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        previousStatus,
        newStatus: requestedStatus,
        clinicName,
      }).catch((err) => console.error("Status email failed:", err));
    }
  } catch (err) {
    console.error("Failed to queue status email:", err);
  }

  return NextResponse.json(appointment);
}
