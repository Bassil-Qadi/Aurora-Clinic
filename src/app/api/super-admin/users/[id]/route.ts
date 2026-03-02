import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/super-admin/users/[id] ────────────────────────
export async function GET(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  const user = await User.findById(id)
    .select("-passwordHash")
    .populate("clinicId", "name slug")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// ─── PATCH /api/super-admin/users/[id] ──────────────────────
// Update user fields (name, email, role, isActive, clinicId)
export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const allowedFields = ["name", "email", "role", "isActive", "clinicId"];
  const updates: Record<string, any> = {};

  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  // Don't allow upgrading someone to super_admin via this route
  if (updates.role === "super_admin") {
    return NextResponse.json(
      { error: "Cannot assign super_admin role through this endpoint." },
      { status: 400 }
    );
  }

  // Check email uniqueness if being changed
  if (updates.email) {
    const existing = await User.findOne({
      email: updates.email,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after" }
  )
    .select("-passwordHash")
    .populate("clinicId", "name slug");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// ─── DELETE /api/super-admin/users/[id] ─────────────────────
// Soft-delete: deactivate the user
export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;

  // Prevent deleting another super_admin
  const target = await User.findById(id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.role === "super_admin") {
    return NextResponse.json(
      { error: "Cannot deactivate a super admin through this endpoint." },
      { status: 400 }
    );
  }

  target.isActive = false;
  await target.save();

  return NextResponse.json({ success: true, message: "User deactivated." });
}

// ─── POST /api/super-admin/users/[id] ──────────────────────
// Reset a user's password
export async function POST(req: Request, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  if (!body.password || body.password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const target = await User.findById(id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  target.passwordHash = await bcrypt.hash(body.password, 10);
  await target.save();

  return NextResponse.json({ success: true, message: "Password reset successfully." });
}
