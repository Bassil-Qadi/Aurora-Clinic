import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import { requirePortalAuth } from "@/lib/portalAuth";
import { User } from "@/models/User";
import { checkAppointmentConflicts } from "@/lib/appointmentConflicts";
import { notifyClinicStaff, createNotification } from "@/lib/notifications";

// GET /api/portal/appointments - List patient's appointments
export async function GET() {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const appointments = await Appointment.find({
    patient: auth.patient!.patientId,
    clinicId: auth.patient!.clinicId,
  })
    .populate("doctor", "name")
    .sort({ date: -1 })
    .limit(50);

  return NextResponse.json({ appointments });
}

// POST /api/portal/appointments - Book a new appointment
export async function POST(req: Request) {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const body = await req.json();
  const { date, reason, doctor, type } = body;

  if (!date) {
    return NextResponse.json(
      { error: "Appointment date is required." },
      { status: 400 }
    );
  }

  const appointmentDate = new Date(date);
  if (appointmentDate < new Date()) {
    return NextResponse.json(
      { error: "Cannot book appointments in the past." },
      { status: 400 }
    );
  }

  // Validate doctor if provided
  if (doctor) {
    const doc = await User.findOne({
      _id: doctor,
      clinicId: auth.patient!.clinicId,
      role: "doctor",
      isActive: true,
    });
    if (!doc) {
      return NextResponse.json(
        { error: "Selected doctor is not available." },
        { status: 400 }
      );
    }
  }

  // Check for conflicts before creating the appointment
  const conflictCheck = await checkAppointmentConflicts(
    auth.patient!.clinicId,
    appointmentDate,
    doctor || undefined
  );

  if (conflictCheck.hasConflict) {
    return NextResponse.json(
      { error: conflictCheck.error },
      { status: 400 }
    );
  }

  const appointment = await Appointment.create({
    clinicId: auth.patient!.clinicId,
    patient: auth.patient!.patientId,
    date: appointmentDate,
    reason: reason || "",
    doctor: doctor || undefined,
    type: type === "video" ? "video" : "in_person",
    status: "scheduled",
  });

  // ── Send notifications (fire & forget) ──
  try {
    const patient = await Patient.findById(auth.patient!.patientId).lean() as any;
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "A patient";
    const dateStr = appointmentDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Notify the assigned doctor
    if (doctor) {
      createNotification({
        clinicId: auth.patient!.clinicId,
        recipientId: doctor,
        type: "portal_booking",
        title: "New Portal Booking",
        message: `${patientName} booked an appointment via the patient portal for ${dateStr}`,
        link: "/appointments",
        metadata: { appointmentId: String(appointment._id), patientName },
      }).catch(() => {});
    }

    // Notify admin + receptionists
    notifyClinicStaff(
      auth.patient!.clinicId,
      ["admin", "receptionist"],
      {
        type: "portal_booking",
        title: "New Portal Booking",
        message: `${patientName} booked an appointment via the patient portal for ${dateStr}`,
        link: "/appointments",
        metadata: { appointmentId: String(appointment._id), patientName },
      }
    ).catch(() => {});
  } catch {}

  return NextResponse.json(appointment, { status: 201 });
}
