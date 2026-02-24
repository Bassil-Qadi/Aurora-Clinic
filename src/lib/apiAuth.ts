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

/**
 * Verify that the request comes from an authenticated user
 * with a valid clinic association.
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

  if (!session.user.clinicId) {
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
      clinicId: session.user.clinicId,
    },
  };
}
