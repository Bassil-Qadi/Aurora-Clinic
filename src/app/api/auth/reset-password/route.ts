import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { resetPasswordSchema } from "@/lib/validations";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();
  const validation = resetPasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const resetToken = await PasswordResetToken.findOne({
    token: validation.data.token,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: "Invalid or expired reset token." },
      { status: 400 }
    );
  }

  const user = await User.findById(resetToken.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Update password
  user.passwordHash = await bcrypt.hash(validation.data.password, 10);
  await user.save();

  // Mark token as used
  resetToken.used = true;
  await resetToken.save();

  return NextResponse.json({
    success: true,
    message: "Password has been reset successfully. You can now log in.",
  });
}
