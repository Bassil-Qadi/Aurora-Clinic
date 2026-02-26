import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import Clinic from "@/models/Clinic";
import { forgotPasswordSchema } from "@/lib/validations";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

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

  const user = await User.findOne({
    email: validation.data.email,
    isActive: true,
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been generated.",
    });
  }

  // Invalidate any existing tokens for this user
  await PasswordResetToken.updateMany(
    { userId: user._id, used: false },
    { used: true }
  );

  // Generate a secure token
  const token = crypto.randomBytes(32).toString("hex");

  await PasswordResetToken.create({
    userId: user._id,
    token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  });

  const resetUrl = `${
    process.env.NEXTAUTH_URL || "http://localhost:3000"
  }/reset-password?token=${token}`;

  // Fetch clinic name for email branding
  let clinicName: string | undefined;
  if (user.clinicId) {
    const clinic = await Clinic.findById(user.clinicId).select("name").lean();
    if (clinic && typeof clinic === "object" && "name" in clinic) {
      clinicName = (clinic as { name: string }).name;
    }
  }

  // Send password reset email
  try {
    await sendPasswordResetEmail({
      recipientName: user.name,
      recipientEmail: user.email,
      resetUrl,
      clinicName,
    });
  } catch (emailErr) {
    console.error("Staff password reset email failed:", emailErr);
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
