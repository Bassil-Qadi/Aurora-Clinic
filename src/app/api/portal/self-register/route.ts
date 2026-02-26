import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Clinic from "@/models/Clinic";
import Patient from "@/models/Patient";
import PatientAccount from "@/models/PatientAccount";
import { patientSelfRegisterSchema } from "@/lib/validations";

// POST /api/portal/self-register — public endpoint
// Creates a Patient record + PatientAccount in a single operation.
export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();
  const validation = patientSelfRegisterSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { clinicId, firstName, lastName, dateOfBirth, gender, phone, email, password } =
    validation.data;

  // Verify the clinic exists and is active
  const clinic = await Clinic.findOne({ _id: clinicId, isActive: true });
  if (!clinic) {
    return NextResponse.json(
      { error: "Selected clinic not found." },
      { status: 404 }
    );
  }

  // Prevent duplicate portal accounts for the same email within this clinic
  const existingAccount = await PatientAccount.findOne({
    email: email.toLowerCase(),
    clinicId,
  });
  if (existingAccount) {
    return NextResponse.json(
      { error: "An account with this email already exists for this clinic." },
      { status: 409 }
    );
  }

  // Create the Patient record
  const patient = await Patient.create({
    clinicId,
    firstName,
    lastName,
    dateOfBirth: new Date(dateOfBirth),
    gender,
    phone,
    email: email.toLowerCase(),
  });

  // Create the PatientAccount (portal login credentials)
  const passwordHash = await bcrypt.hash(password, 10);

  await PatientAccount.create({
    clinicId,
    patient: patient._id,
    email: email.toLowerCase(),
    passwordHash,
    isActive: true,
  });

  return NextResponse.json(
    {
      success: true,
      message: "Account created successfully. You can now sign in.",
    },
    { status: 201 }
  );
}
