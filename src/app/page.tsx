import Link from "next/link";
import { Activity, LogIn, Users, Calendar, Clipboard } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="max-w-4xl grid items-center gap-10 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <span className="pill">Clinic Management</span>
          <h1 className="page-title">
            <Activity className="h-7 w-7 text-sky-500" />
            <span>A calmer way to manage your patients and visits.</span>
          </h1>
          <p className="page-subtitle max-w-xl">
            Securely track patients, appointments, and medical records in a
            single, modern dashboard designed for clinics and healthcare teams.
          </p>

          <div className="flex flex-wrap gap-3 pt-3">
            <Link href="/login" className="btn-primary">
              <LogIn className="h-4 w-4" />
              <span>Go to Login</span>
            </Link>
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              System status: Online
            </span>
          </div>
        </div>

        <div className="card card-muted">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                Today at a glance
              </p>
              <p className="text-sm text-slate-500">
                Patients, Appointments, Visits
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white text-sm font-semibold">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Users className="h-3.5 w-3.5 text-sky-500" />
                <span>Patients</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-sky-500" />
                <span>Appointments</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Clipboard className="h-3.5 w-3.5 text-sky-500" />
                <span>Visits</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">—</p>
            </div>
          </div>

          <p className="mt-5 text-[11px] text-slate-500">
            Log in to start capturing clinical data and see live metrics here.
          </p>
        </div>
      </div>
    </div>
  );
}
