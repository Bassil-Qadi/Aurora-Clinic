import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PatientAccount from "@/models/PatientAccount";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Simple JWT-like token for patient portal (stored in cookies)
function generateToken(payload: object): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return Buffer.from(data).toString("base64url");
}

export function verifyPortalToken(token: string): { patientAccountId: string; clinicId: string; patientId: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return { patientAccountId: data.patientAccountId, clinicId: data.clinicId, patientId: data.patientId };
  } catch {
    return null;
  }
}

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

  const token = generateToken({
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
