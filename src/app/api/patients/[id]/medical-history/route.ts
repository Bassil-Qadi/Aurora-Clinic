import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { requireAuth } from "@/lib/apiAuth";
import { medicalHistorySchema, emergencyContactSchema, insuranceInfoSchema } from "@/lib/validations";
import { z } from "zod";

const updateMedicalInfoSchema = z.object({
  medicalHistory: medicalHistorySchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  insuranceInfo: insuranceInfoSchema.optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();
  const { id } = await params;

  const patient = await Patient.findOne(
    { _id: id, clinicId: user.clinicId },
    "medicalHistory emergencyContact insuranceInfo"
  );

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({
    medicalHistory: patient.medicalHistory || {},
    emergencyContact: patient.emergencyContact || {},
    insuranceInfo: patient.insuranceInfo || {},
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["doctor", "admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();
  const { id } = await params;

  const body = await req.json();
  const validation = updateMedicalInfoSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (validation.data.medicalHistory) {
    updateData.medicalHistory = validation.data.medicalHistory;
  }
  if (validation.data.emergencyContact) {
    updateData.emergencyContact = validation.data.emergencyContact;
  }
  if (validation.data.insuranceInfo) {
    updateData.insuranceInfo = validation.data.insuranceInfo;
  }

  const patient = await Patient.findOneAndUpdate(
    { _id: id, clinicId: user.clinicId },
    { $set: updateData },
    { returnDocument: "after", runValidators: true }
  );

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  return NextResponse.json({
    medicalHistory: patient.medicalHistory || {},
    emergencyContact: patient.emergencyContact || {},
    insuranceInfo: patient.insuranceInfo || {},
  });
}
