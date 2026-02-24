import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/apiAuth";
import { changePasswordSchema } from "@/lib/validations";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json();
  const validation = changePasswordSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const dbUser = await User.findById(user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(
    validation.data.currentPassword,
    dbUser.passwordHash
  );

  if (!isValid) {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 }
    );
  }

  dbUser.passwordHash = await bcrypt.hash(validation.data.newPassword, 10);
  await dbUser.save();

  return NextResponse.json({
    success: true,
    message: "Password changed successfully.",
  });
}
