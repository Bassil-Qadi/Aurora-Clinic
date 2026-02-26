import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { requireAuth } from "@/lib/apiAuth";
import { createAppointmentSchema } from "@/lib/validations";
import Patient from "@/models/Patient";
import Clinic from "@/models/Clinic";
import { User } from "@/models/User";
import { sendAppointmentConfirmationEmail } from "@/lib/email";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { searchParams } = new URL(req.url);

  const doctor = searchParams.get("doctor");
  const visit = searchParams.get("visit");
  const patient = searchParams.get("patient");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const search = searchParams.get("search") || "";

  const query: Record<string, any> = { clinicId: user.clinicId };

  if (doctor) query.doctor = doctor;
  if (visit) query.visit = visit;
  if (patient) query.patient = patient;

  // If search is provided, match on reason/status and patient fields
  if (search) {
    const matchingPatients = await Patient.find({
      clinicId: user.clinicId,
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    const patientIds = matchingPatients.map((p: any) => p._id);

    query.$or = [
      { reason: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
      { patient: { $in: patientIds } },
    ];
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate("patient")
      .populate("doctor")
      .populate("visit")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Appointment.countDocuments(query),
  ]);

  return NextResponse.json({
    appointments,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json();
  const validation = createAppointmentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  // If the logged-in user is a doctor, auto-assign them as the doctor
  // If admin/receptionist, use the doctor field from the request body
  const doctorId =
    user.role === "doctor"
      ? user.id
      : validation.data.doctor || undefined;

  const appointment = await Appointment.create({
    ...validation.data,
    doctor: doctorId,
    status: validation.data.status || "scheduled",
    clinicId: user.clinicId,
  });

  // Send confirmation email (fire-and-forget)
  try {
    const patientDoc = await Patient.findById(validation.data.patient)
      .select("firstName lastName email")
      .lean();

    if (patientDoc && typeof patientDoc === "object" && "email" in patientDoc && (patientDoc as any).email) {
      const p = patientDoc as { firstName: string; lastName: string; email: string };
      const appointmentDate = new Date(validation.data.date);

      // Get doctor name
      let doctorName: string | undefined;
      if (doctorId) {
        const doc = await User.findById(doctorId).select("name").lean();
        if (doc && typeof doc === "object" && "name" in doc) {
          doctorName = (doc as { name: string }).name;
        }
      }

      // Get clinic name
      const clinic = await Clinic.findById(user.clinicId).select("name").lean();
      const clinicName =
        clinic && typeof clinic === "object" && "name" in clinic
          ? (clinic as { name: string }).name
          : undefined;

      sendAppointmentConfirmationEmail({
        patientName: `${p.firstName} ${p.lastName}`,
        patientEmail: p.email,
        appointmentDate: appointmentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        appointmentTime: appointmentDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        doctorName,
        reason: validation.data.reason || undefined,
        clinicName,
      }).catch((err) => console.error("Email send failed:", err));
    }
  } catch (err) {
    console.error("Failed to queue confirmation email:", err);
  }

  return NextResponse.json(appointment, { status: 201 });
}
