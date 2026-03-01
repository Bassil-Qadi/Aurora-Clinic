import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import Clinic from "@/models/Clinic";
import { User } from "@/models/User";
import { registerClinicSchema } from "@/lib/validations";
import { startFreeTrial } from "@/lib/subscription";

// POST /api/auth/register-clinic — public endpoint
// Creates a new Clinic and an admin User in a single atomic operation.
export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();
  const validation = registerClinicSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { clinicName, clinicPhone, clinicAddress, adminName, adminEmail, adminPassword } =
    validation.data;

  // Prevent duplicate admin email across any clinic
  const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existingUser) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // Build a URL-safe slug from clinic name
  const baseSlug = clinicName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Ensure slug uniqueness by appending a random suffix when needed
  let slug = baseSlug;
  const existingClinic = await Clinic.findOne({ slug });
  if (existingClinic) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Create clinic
  const clinic = await Clinic.create({
    name: clinicName,
    slug,
    phone: clinicPhone || "",
    address: clinicAddress || "",
    isActive: true,
  });

  // Create the first admin user for this clinic
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await User.create({
    name: adminName,
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: "admin",
    isActive: true,
    clinicId: clinic._id,
  });

  // Start a 14-day free trial for the new clinic
  const trial = await startFreeTrial(clinic._id.toString());

  return NextResponse.json(
    {
      success: true,
      clinicId: clinic._id,
      adminId: adminUser._id,
      trialEndsAt: trial.trialEndsAt,
      message: `Clinic registered successfully with a ${trial.trialDays}-day free trial. You can now sign in.`,
    },
    { status: 201 }
  );
}
