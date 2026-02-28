"use client";

import { useEffect, useState } from "react";
import { Stethoscope, Circle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface DoctorSlot {
  _id: string;
  name: string;
  email: string;
  isInAppointment: boolean;
}

export function DoctorSlots() {
  const { t } = useI18n();
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctorSlots = async () => {
    try {
      const res = await fetch("/api/dashboard/doctor-slots", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setDoctorSlots(data.doctorSlots || []);
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorSlots();

    // Refresh every 5 seconds to keep status updated
    const interval = setInterval(() => {
      fetchDoctorSlots();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("dashboard.doctorSlots") || "Doctor Slots"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dashboard.doctorSlotsSubtitle") || "Current availability status"}
            </p>
          </div>
        </div>
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="card relative overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t("dashboard.doctorSlots") || "Doctor Slots"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dashboard.doctorSlotsSubtitle") || "Current availability status"}
            </p>
          </div>
        </div>
      </div>

      {/* Doctor Slots Grid */}
      {doctorSlots.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {doctorSlots.map((doctor) => (
            <div
              key={doctor._id}
              className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${
                doctor.isInAppointment
                  ? "border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:border-red-800 dark:from-red-950/30 dark:to-red-900/20"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-emerald-900/20"
              }`}
            >
              {/* Status Indicator */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      doctor.isInAppointment
                        ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                    }`}
                  >
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate dark:text-slate-100">
                      {t("common.dr")} {doctor.name}
                    </p>
                  </div>
                </div>

                {/* Status Dot */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`relative flex h-3 w-3 ${
                      doctor.isInAppointment ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {doctor.isInAppointment && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    )}
                    <Circle
                      className={`h-3 w-3 fill-current ${
                        doctor.isInAppointment ? "text-red-500" : "text-emerald-500"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Status Text */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    doctor.isInAppointment
                      ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800"
                      : "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800"
                  }`}
                >
                  {doctor.isInAppointment
                    ? t("dashboard.inAppointment") || "In Appointment"
                    : t("dashboard.available") || "Available"}
                </span>
              </div>

              {/* Accent Border */}
              <div
                className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${
                  doctor.isInAppointment
                    ? "bg-gradient-to-b from-red-400 to-red-500"
                    : "bg-gradient-to-b from-emerald-400 to-emerald-500"
                }`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <Stethoscope className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("dashboard.noDoctors") || "No doctors found"}
          </p>
        </div>
      )}
    </div>
  );
}
