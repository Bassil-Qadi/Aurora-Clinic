import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";
import { requireAuth } from "@/lib/apiAuth";
import { createPrescriptionSchema } from "@/lib/validations";
import { notifyClinicStaff } from "@/lib/notifications";

export async function POST(req: Request) {
  const auth = await requireAuth(["doctor"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json();
  const validation = createPrescriptionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const prescription = await Prescription.create({
    ...validation.data,
    clinicId: user.clinicId,
  });

  // ── Notify admin/receptionists about the new prescription (fire & forget) ──
  try {
    const Patient = (await import("@/models/Patient")).default;
    const patient = await Patient.findById(validation.data.patient).lean() as any;
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "A patient";

    notifyClinicStaff(
      user.clinicId,
      ["admin", "receptionist"],
      {
        type: "prescription_created",
        title: "New Prescription",
        message: `A prescription was created for ${patientName}`,
        link: `/visits`,
        metadata: { prescriptionId: String(prescription._id), patientName },
      },
      user.id
    ).catch(() => {});
  } catch {}

  return NextResponse.json({ prescription });
}

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient");
  const visit = searchParams.get("visit");

  const query: any = {
    clinicId: user.clinicId,
    isDeleted: false,
    isSuperseded: { $ne: true },
  };

  if (patientId) query.patient = patientId;
  if (visit) query.visit = visit;

  const prescriptions = await Prescription.find(query)
    .populate("patient")
    .populate("doctor")
    .populate("visit")
    .sort({ createdAt: -1 });

  return NextResponse.json({ prescriptions });
}
