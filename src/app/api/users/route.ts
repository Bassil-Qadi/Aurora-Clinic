import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/apiAuth";
import { createUserSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get("role");

  const query: Record<string, any> = {
    clinicId: user.clinicId,
    isActive: true,
    role: { $ne: "super_admin" }, // never expose super_admin in clinic lists
  };

  if (roleParam) {
    query.role = roleParam.toLowerCase();
  }

  const users = await User.find(query).select("-passwordHash");

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json();
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Check for duplicate email
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const newUser = await User.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
    isActive: true,
    clinicId: user.clinicId,
  });

  const userResponse = newUser.toObject();
  delete userResponse.passwordHash;

  return NextResponse.json(userResponse, { status: 201 });
}