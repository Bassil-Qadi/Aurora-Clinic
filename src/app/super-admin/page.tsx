"use client";

import { useSession, signOut } from "next-auth/react";
import { ShieldCheck, LogOut } from "lucide-react";

/**
 * Super Admin Dashboard — placeholder overview page.
 * Full KPI cards, charts, and data tables will be added in Phase 3.
 */
export default function SuperAdminDashboard() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="card w-full max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40">
          <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {session?.user?.name ?? "Super Admin"}
          </p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
          The full super admin dashboard (clinics, users, subscriptions,
          analytics) is coming in the next phase. Your account is set up
          and working.
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-slate-500 dark:text-slate-400">Role</p>
            <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Super Admin
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-slate-500 dark:text-slate-400">Email</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {session?.user?.email ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
            <p className="text-slate-500 dark:text-slate-400">Status</p>
            <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Active
            </p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-secondary mx-auto"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
