import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { requirePortalAuth } from "@/lib/portalAuth";
import { User } from "@/models/User";

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
  const { date, reason, doctor } = body;

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

  const appointment = await Appointment.create({
    clinicId: auth.patient!.clinicId,
    patient: auth.patient!.patientId,
    date: appointmentDate,
    reason: reason || "",
    doctor: doctor || undefined,
    status: "scheduled",
  });

  return NextResponse.json(appointment, { status: 201 });
}
