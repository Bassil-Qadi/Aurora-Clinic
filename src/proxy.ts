import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Only allow these paths to be protected
export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;

    // Example: role-based redirect
    const session = req.nextauth.token;

    // Admin-only page example
    if (pathname.startsWith("/admin") && session?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Doctor-only page example
    if (pathname.startsWith("/doctor") && session?.role !== "doctor") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Receptionist-only page example
    if (pathname.startsWith("/reception") && session?.role !== "receptionist") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/dashboard/users") && session?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // if (session?.role !== "admin") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    // }

    // All other pages under /dashboard are accessible if logged in
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // must be logged in
    },
  }
);

// Define which routes require auth
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/appointments/:path*",
    "/admin/:path*",
    "/doctor/:path*",
    "/reception/:path*",
  ],
};
