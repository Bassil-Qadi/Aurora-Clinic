import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PatientAccount from "@/models/PatientAccount";
import bcrypt from "bcryptjs";
import { generatePortalToken } from "@/lib/portalAuth";

// POST /api/portal/auth - Login
export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const account = await PatientAccount.findOne({ email: email.toLowerCase(), isActive: true })
    .populate("patient", "firstName lastName email phone");

  if (!account) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const isValid = await bcrypt.compare(password, account.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Update last login
  account.lastLogin = new Date();
  await account.save();

  const token = generatePortalToken({
    patientAccountId: account._id.toString(),
    clinicId: account.clinicId.toString(),
    patientId: account.patient._id.toString(),
  });

  const response = NextResponse.json({
    success: true,
    patient: account.patient,
    token,
  });

  // Set cookie
  response.cookies.set("portal_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  });

  return response;
}
