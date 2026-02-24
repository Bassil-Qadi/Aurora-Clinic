import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { requirePortalAuth } from "@/lib/portalAuth";

export async function GET() {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const patient = await Patient.findOne({
    _id: auth.patient!.patientId,
    clinicId: auth.patient!.clinicId,
  }).select("-medicalHistory -emergencyContact -insuranceInfo");

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json(patient);
}
