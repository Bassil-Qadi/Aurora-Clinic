import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/apiAuth";
import { updateUserSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  // Check email uniqueness if being updated
  if (validation.data.email) {
    const existingWithEmail = await User.findOne({
      email: validation.data.email,
      _id: { $ne: id },
    });
    if (existingWithEmail) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
  }

  const updated = await User.findOneAndUpdate(
    { _id: id, clinicId: user.clinicId },
    validation.data,
    { returnDocument: "after" }
  ).select("-passwordHash");

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;

  // Prevent admin from deactivating themselves
  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account." },
      { status: 400 }
    );
  }

  const targetUser = await User.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  targetUser.isActive = !targetUser.isActive;
  await targetUser.save();

  const response = targetUser.toObject();
  delete response.passwordHash;

  return NextResponse.json(response);
}

// Admin resets a user's password
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  if (!body.password || body.password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const targetUser = await User.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  targetUser.passwordHash = await bcrypt.hash(body.password, 10);
  await targetUser.save();

  return NextResponse.json({ success: true, message: "Password reset successfully." });
}
