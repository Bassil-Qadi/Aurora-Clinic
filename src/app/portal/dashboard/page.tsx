"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Stethoscope,
  CalendarCheck,
  Heart,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function PortalDashboard() {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/appointments").then((r) => r.json()),
      fetch("/api/portal/visits").then((r) => r.json()),
      fetch("/api/portal/profile").then((r) => r.json()),
    ])
      .then(([apptData, visitData, profileData]) => {
        setAppointments(apptData.appointments || []);
        setVisits(visitData.visits || []);
        setProfile(profileData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <p className="page-title text-xl">{t("portal.loadingDashboard")}</p>
        <p className="page-subtitle">{t("portal.fetchingHealth")}</p>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (a) => new Date(a.date) >= new Date() && a.status === "scheduled"
  );
  const pastAppointments = appointments.filter(
    (a) => new Date(a.date) < new Date() || a.status !== "scheduled"
  );

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">
            <Heart className="h-6 w-6 text-emerald-500" />
            <span>
              {t("portal.welcomeBack", { name: profile?.firstName || t("common.patient") })}
            </span>
          </h1>
          <p className="page-subtitle mt-1">
            {t("portal.viewHealthRecords")}
          </p>
        </div>
        <Link
          href="/portal/book"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:from-emerald-600 hover:to-teal-600"
        >
          <Calendar className="h-4 w-4" />
          {t("portal.bookAppointment")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("portal.upcomingAppointments")}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {upcomingAppointments.length}
              </p>
            </div>
            <CalendarCheck className="h-5 w-5 text-emerald-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("portal.totalAppointments")}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {appointments.length}
              </p>
            </div>
            <Calendar className="h-5 w-5 text-sky-500" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("portal.completedVisits")}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {visits.length}
              </p>
            </div>
            <Stethoscope className="h-5 w-5 text-violet-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4 dark:text-slate-100">
            <CalendarCheck className="h-5 w-5 text-emerald-500" />
            {t("portal.upcomingAppointments")}
          </h2>
          {upcomingAppointments.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("portal.noUpcomingAppointments")}</p>
              <Link
                href="/portal/book"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {t("portal.bookOneNow")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 5).map((appt) => {
                const apptDate = new Date(appt.date);
                const isToday =
                  apptDate.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={appt._id}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {apptDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                            {" • "}
                            {apptDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {appt.reason && (
                          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                            {appt.reason}
                          </p>
                        )}
                        {appt.doctor && (
                          <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                            {t("common.dr")} {appt.doctor.name}
                          </p>
                        )}
                      </div>
                      {isToday && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                          <AlertCircle className="h-3 w-3" />
                          {t("common.today")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Visits */}
        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4 dark:text-slate-100">
            <Stethoscope className="h-5 w-5 text-violet-500" />
            {t("portal.recentVisitSummaries")}
          </h2>
          {visits.length === 0 ? (
            <div className="py-8 text-center">
              <Stethoscope className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("portal.noCompletedVisits")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.slice(0, 5).map((visit) => (
                <div
                  key={visit._id}
                  className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(visit.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("portal.completed")}
                    </span>
                  </div>
                  {visit.diagnosis && (
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{t("portal.diagnosis")}</span>{" "}
                      {visit.diagnosis}
                    </p>
                  )}
                  {visit.doctor && (
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                      {t("common.dr")} {visit.doctor.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4 dark:text-slate-100">
            <Calendar className="h-5 w-5 text-sky-500" />
            {t("portal.pastAppointments")}
          </h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("common.reason")}</th>
                  <th>{t("common.doctor")}</th>
                  <th>{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pastAppointments.slice(0, 10).map((appt) => (
                  <tr key={appt._id}>
                    <td>{new Date(appt.date).toLocaleDateString()}</td>
                    <td>{appt.reason || "—"}</td>
                    <td>{appt.doctor?.name ? `${t("common.dr")} ${appt.doctor.name}` : "—"}</td>
                    <td>
                      <span className="capitalize text-xs">{appt.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
