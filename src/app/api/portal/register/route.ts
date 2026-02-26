import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import PatientAccount from "@/models/PatientAccount";
import { requireAuth } from "@/lib/apiAuth";
import bcrypt from "bcryptjs";

// POST /api/portal/register - Staff creates a portal account for a patient
export async function POST(req: Request) {
  const auth = await requireAuth(["admin", "receptionist"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json();
  const { patientId, email, password } = body;

  if (!patientId || !email || !password) {
    return NextResponse.json(
      { error: "patientId, email, and password are required." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  // Verify patient exists and belongs to this clinic
  const patient = await Patient.findOne({
    _id: patientId,
    clinicId: user.clinicId,
  });

  if (!patient) {
    return NextResponse.json(
      { error: "Patient not found." },
      { status: 404 }
    );
  }

  // Check if account already exists
  const existing = await PatientAccount.findOne({ patient: patientId });
  if (existing) {
    return NextResponse.json(
      { error: "This patient already has a portal account." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const account = await PatientAccount.create({
    clinicId: user.clinicId,
    patient: patientId,
    email: email.toLowerCase(),
    passwordHash,
  });

  return NextResponse.json(
    {
      success: true,
      accountId: account._id,
      email: account.email,
      message: "Portal account created successfully.",
    },
    { status: 201 }
  );
}
