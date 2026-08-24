import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PatientAccount from "@/models/PatientAccount";
// Side-effect imports: register the models referenced by .populate() below.
import "@/models/Clinic";
import "@/models/Patient";
import bcrypt from "bcryptjs";
import { generatePortalToken } from "@/lib/portalAuth";

// POST /api/portal/auth - Login
export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();
  const { email, password, clinicId } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  // The same email may hold a separate portal account at more than one clinic
  // (self-registration only enforces uniqueness within a clinic). Resolving
  // with findOne() would pick an arbitrary tenant, so gather every candidate
  // and disambiguate explicitly.
  const query: Record<string, unknown> = {
    email: email.toLowerCase(),
    isActive: true,
  };
  if (clinicId) query.clinicId = clinicId;

  const candidates = await PatientAccount.find(query)
    .populate("patient", "firstName lastName email phone")
    .populate("clinicId", "name");

  // Verify the password against each candidate before revealing anything —
  // this keeps the multi-clinic prompt below from leaking account existence.
  const matches = [];
  for (const candidate of candidates) {
    if (await bcrypt.compare(password, candidate.passwordHash)) {
      matches.push(candidate);
    }
  }

  if (matches.length === 0) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Credentials are valid at several clinics — the caller must say which one.
  if (matches.length > 1) {
    return NextResponse.json(
      {
        error: "This email is registered at more than one clinic. Please select one.",
        clinics: matches.map((m: any) => ({
          id: String(m.clinicId?._id ?? m.clinicId),
          name: m.clinicId?.name ?? "",
        })),
      },
      { status: 409 }
    );
  }

  const account = matches[0];

  // Update last login
  account.lastLogin = new Date();
  await account.save();

  const token = generatePortalToken({
    patientAccountId: account._id.toString(),
    clinicId: String(account.clinicId?._id ?? account.clinicId),
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
