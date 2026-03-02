"use client";

import { ReactNode, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Props = {
  children: ReactNode;
};

/**
 * Super-admin layout — guards access so only super_admin users
 * can view these pages. A full sidebar will be built in Phase 3.
 */
export default function SuperAdminLayout({ children }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    if (session.user.role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  // While checking auth, show nothing
  if (
    status === "loading" ||
    !session?.user ||
    session.user.role !== "super_admin"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
