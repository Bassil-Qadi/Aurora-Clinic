import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export function verifyPortalToken(token: string): {
  patientAccountId: string;
  clinicId: string;
  patientId: string;
} | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return {
      patientAccountId: data.patientAccountId,
      clinicId: data.clinicId,
      patientId: data.patientId,
    };
  } catch {
    return null;
  }
}

export async function requirePortalAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("portal_token")?.value;

  if (!token) {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Please log in to the patient portal." },
        { status: 401 }
      ),
      patient: null,
    };
  }

  const decoded = verifyPortalToken(token);
  if (!decoded) {
    return {
      success: false as const,
      response: NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      ),
      patient: null,
    };
  }

  return {
    success: true as const,
    response: null,
    patient: decoded,
  };
}
