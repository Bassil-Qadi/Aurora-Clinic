import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  clinicId: string;
}

type AuthSuccess = { success: true; user: AuthUser };
type AuthFailure = { success: false; response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

/** The only piece of a Mongoose model an ownership check actually needs. */
type OwnershipCheckable = {
  exists(filter: Record<string, unknown>): Promise<{ _id: unknown } | null>;
};

/** Result of a tenant-ownership check on a request-supplied document id. */
export type TenantCheck =
  | { ok: true }
  | { ok: false; response: NextResponse };

/**
 * Verify that the request comes from an authenticated user
 * with a valid clinic association.
 *
 * Super-admin users are allowed through even without a clinicId.
 *
 * @param allowedRoles – optional whitelist of roles; if provided the
 *                       user's role must be in the list.
 */
export async function requireAuth(
  allowedRoles?: string[]
): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  const isSuperAdmin = session.user.role === "super_admin";

  // Super admins bypass the clinicId requirement
  if (!isSuperAdmin && !session.user.clinicId) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error:
            "No clinic associated with your account. Please run the seed script or contact your administrator.",
        },
        { status: 403 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      role: session.user.role,
      clinicId: session.user.clinicId || "",
    },
  };
}

/**
 * Verify that the request comes from a super_admin user.
 * Use this guard for all /api/super-admin/* routes.
 */
export async function requireSuperAdmin(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      ),
    };
  }

  if (session.user.role !== "super_admin") {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Forbidden. Super admin access required." },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      role: session.user.role,
      clinicId: session.user.clinicId || "",
    },
  };
}

/**
 * Verify that a document referenced by an incoming request actually belongs
 * to the caller's clinic.
 *
 * Any route that accepts a document id from the request body or query string
 * MUST run it through this guard before persisting or returning it. Stamping a
 * new record with the caller's own clinicId is not sufficient isolation: the
 * record can still *reference* another clinic's document, and `.populate()`
 * will hydrate that reference across the tenant boundary on the way back out.
 *
 * Pass `extra` to add constraints to the same lookup (e.g. role / isActive).
 */
export async function assertBelongsToClinic(
  model: OwnershipCheckable,
  id: string | null | undefined,
  clinicId: string,
  label: string,
  extra: Record<string, unknown> = {}
): Promise<TenantCheck> {
  // Nothing referenced — nothing to verify.
  if (!id) return { ok: true };

  // A caller with no clinic (e.g. super_admin) has no tenant to scope against.
  // Deny rather than letting an empty clinicId reach Mongoose as a cast error.
  if (!clinicId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No clinic associated with your account." },
        { status: 403 }
      ),
    };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid ${label} ID.` },
        { status: 400 }
      ),
    };
  }

  const exists = await model.exists({ _id: id, clinicId, ...extra });

  // Deliberately a 404, not a 403: a clinic must not be able to probe whether
  // an id exists in someone else's tenant.
  if (!exists) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `${label} not found.` },
        { status: 404 }
      ),
    };
  }

  return { ok: true };
}

/**
 * Convenience wrapper — verify that a doctor id refers to an active doctor
 * inside the caller's own clinic.
 */
export async function assertDoctorInClinic(
  id: string | null | undefined,
  clinicId: string
): Promise<TenantCheck> {
  const { User } = await import("../models/User");
  return assertBelongsToClinic(User, id, clinicId, "Doctor", {
    role: "doctor",
    isActive: true,
  });
}
