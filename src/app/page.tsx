"use client";

import Link from "next/link";
import { Activity, LogIn, Users, Calendar, Clipboard, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="max-w-4xl grid items-center gap-10 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <span className="pill">{t("common.appName")}</span>
          <h1 className="page-title">
            <Activity className="h-7 w-7 text-sky-500" />
            <span>{t("home.heroTitle")} {t("home.heroTitleHighlight")} {t("home.heroTitleEnd")}</span>
          </h1>
          <p className="page-subtitle max-w-xl">
            {t("home.heroSubtitle")}
          </p>

          <div className="flex flex-wrap gap-3 pt-3">
            <Link href="/login" className="btn-primary">
              <LogIn className="h-4 w-4" />
              <span>{t("home.getStarted")}</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-400 dark:hover:bg-sky-900/50"
            >
              <Building2 className="h-4 w-4" />
              <span>{t("register.title")}</span>
            </Link>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("common.systemOnline")}
          </p>
        </div>

        <div className="card card-muted">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-400">
                {t("dashboard.todayAtAGlance")}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("dashboard.patientsAppointmentsVisits")}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white text-sm font-semibold">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/70">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Users className="h-3.5 w-3.5 text-sky-500" />
                <span>{t("nav.patients")}</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">—</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/70">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5 text-sky-500" />
                <span>{t("nav.appointments")}</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">—</p>
            </div>
            <div className="rounded-xl bg-white/70 p-3 dark:bg-slate-800/70">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Clipboard className="h-3.5 w-3.5 text-sky-500" />
                <span>{t("nav.visits")}</span>
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">—</p>
            </div>
          </div>

          <p className="mt-5 text-[11px] text-slate-500">
            {t("dashboard.loginToStart")}
          </p>
        </div>
      </div>
    </div>
  );
}
