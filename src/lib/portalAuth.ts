import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Secret – prefer a dedicated PORTAL_JWT_SECRET; fall back to NEXTAUTH_SECRET
// ---------------------------------------------------------------------------
function getSecret(): string {
  const secret = process.env.PORTAL_JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Missing PORTAL_JWT_SECRET or NEXTAUTH_SECRET environment variable. " +
        "Portal tokens cannot be signed without a secret."
    );
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Token helpers – HMAC-SHA256 signed, format: <base64url-payload>.<base64url-sig>
// ---------------------------------------------------------------------------
export interface PortalTokenPayload {
  patientAccountId: string;
  clinicId: string;
  patientId: string;
}

/**
 * Generate a signed portal token.
 * Embeds an `iat` (issued-at) and `exp` (expiry) claim.
 */
export function generatePortalToken(payload: PortalTokenPayload): string {
  const secret = getSecret();

  const now = Date.now();
  const data = JSON.stringify({
    ...payload,
    iat: now,
    exp: now + 24 * 60 * 60 * 1000, // 24 hours
  });

  const encodedPayload = Buffer.from(data).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a signed portal token.
 * Returns the decoded payload on success, or `null` if the token is invalid
 * or expired.
 */
export function verifyPortalToken(token: string): PortalTokenPayload | null {
  try {
    const secret = getSecret();

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    if (!encodedPayload || !signature) return null;

    // Recompute expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(encodedPayload)
      .digest("base64url");

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    // Decode & validate claims
    const data = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString()
    );
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;

    return {
      patientAccountId: data.patientAccountId,
      clinicId: data.clinicId,
      patientId: data.patientId,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Convenience helper for protected API routes
// ---------------------------------------------------------------------------
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
