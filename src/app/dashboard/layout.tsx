"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Activity, Users, Calendar, Clipboard, LogOut } from "lucide-react";

type Props = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: Props) {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen px-3 py-4 md:px-6 md:py-6 lg:px-10">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 font-semibold">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Aurora Clinic
            </h2>
            <p className="text-xs text-slate-500">Medical Dashboard</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-xl px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Dashboard Home</span>
            </span>
          </Link>
          <Link
            href="/patients"
            className="rounded-xl px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Patients</span>
            </span>
          </Link>
          <Link
            href="/appointments"
            className="rounded-xl px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Appointments</span>
            </span>
          </Link>
          <Link
            href="/visits"
            className="rounded-xl px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <span className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              <span>Visits</span>
            </span>
          </Link>
          <Link
            href="/appointments/calendar"
            className="rounded-xl px-3 py-2 text-slate-700 hover:bg-sky-50 hover:text-sky-700"
          >
            <span className="flex items-center gap-2">
              <Clipboard className="h-4 w-4" />
              <span>Calendar</span>
            </span>
          </Link>
        </nav>

        <div className="mt-6 border-t border-slate-100 pt-4">
          {session?.user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-slate-800">
                Hi, {session.user.name}
              </p>
              <p className="text-xs text-slate-500">{session.user.role}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-secondary w-full justify-center text-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-4 flex-1 overflow-auto md:ml-6">
        <div className="space-y-6 pb-10">{children}</div>
      </main>
    </div>
  );
}
