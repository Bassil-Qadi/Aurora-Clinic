import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PatientAccount from "@/models/PatientAccount";
import Patient from "@/models/Patient";
import Clinic from "@/models/Clinic";
import PasswordResetToken from "@/models/PasswordResetToken";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

// POST /api/portal/forgot-password — public endpoint
export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();
  const validation = forgotPasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  // Find active patient account by email
  const account = await PatientAccount.findOne({
    email: validation.data.email.toLowerCase(),
    isActive: true,
  });

  // Always return success to prevent email enumeration
  if (!account) {
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }

  // Invalidate any existing tokens for this patient account
  await PasswordResetToken.updateMany(
    { patientAccountId: account._id, used: false },
    { used: true }
  );

  // Generate a secure token
  const token = crypto.randomBytes(32).toString("hex");

  await PasswordResetToken.create({
    patientAccountId: account._id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  const resetUrl = `${
    process.env.NEXTAUTH_URL || "http://localhost:3000"
  }/portal/reset-password?token=${token}`;

  // Get patient name and clinic name for the email
  let recipientName = "Patient";
  let clinicName: string | undefined;

  try {
    const patient = await Patient.findById(account.patient)
      .select("firstName lastName")
      .lean();
    if (patient && typeof patient === "object" && "firstName" in patient) {
      const p = patient as { firstName: string; lastName: string };
      recipientName = `${p.firstName} ${p.lastName}`;
    }

    const clinic = await Clinic.findById(account.clinicId)
      .select("name")
      .lean();
    if (clinic && typeof clinic === "object" && "name" in clinic) {
      clinicName = (clinic as { name: string }).name;
    }
  } catch {}

  // Send password reset email
  try {
    await sendPasswordResetEmail({
      recipientName,
      recipientEmail: account.email,
      resetUrl,
      clinicName,
    });
  } catch (emailErr) {
    console.error("Portal password reset email failed:", emailErr);
    return NextResponse.json(
      { error: "Failed to send reset email. Please try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "If an account with that email exists, a password reset link has been sent.",
    // Include reset URL in development only
    ...(process.env.NODE_ENV !== "production" && { resetUrl }),
  });
}
