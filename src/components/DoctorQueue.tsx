"use client";

import {
  Clock,
  User,
  Stethoscope,
  FileText,
  ListOrdered,
} from "lucide-react";
import { AppointmentStatusBadge } from "@/components/AppointmentStatusBadge";

interface QueueAppointment {
  _id: string;
  patient?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  doctor?: {
    _id: string;
    name: string;
  };
  reason?: string;
  date: string;
  status: string;
  updatedAt?: string;
}

interface DoctorQueueProps {
  appointments: QueueAppointment[];
}

function getWaitDuration(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();

  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}

export function DoctorQueue({ appointments }: DoctorQueueProps) {
  const queueCount = appointments?.length ?? 0;

  return (
    <div className="card relative overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <ListOrdered className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Doctor Queue
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Patients waiting to be seen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live indicator */}
          {queueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              Live
            </span>
          )}

          <span className="pill">
            {queueCount} {queueCount === 1 ? "patient" : "patients"}
          </span>
        </div>
      </div>

      {/* Queue List */}
      {queueCount > 0 ? (
        <div className="space-y-3">
          {appointments.map((appt, index) => {
            const waitSince = appt.updatedAt || appt.date;
            const waitDuration = getWaitDuration(waitSince);

            return (
              <div
                key={appt._id}
                className="group relative flex items-stretch gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 transition-all hover:border-amber-300 hover:shadow-md dark:border-slate-700 dark:from-slate-800/50 dark:to-slate-900/50 dark:hover:border-amber-600 dark:hover:shadow-lg"
              >
                {/* Queue position */}
                <div className="flex flex-col items-center justify-center">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm transition-colors ${
                      index === 0
                        ? "bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-800"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < appointments.length - 1 && (
                    <div className="mt-1 h-full w-px bg-gradient-to-b from-amber-200 to-transparent dark:from-amber-800" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    {/* Patient name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-4 w-4 text-slate-400 shrink-0 dark:text-slate-500" />
                      <p className="font-semibold text-slate-900 truncate dark:text-slate-100">
                        {appt.patient?.firstName} {appt.patient?.lastName}
                      </p>
                    </div>

                    {/* Status badge */}
                    <AppointmentStatusBadge status={appt.status} />
                  </div>

                  {/* Reason */}
                  {appt.reason && (
                    <div className="mb-1.5">
                      <div className="flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0 dark:text-slate-500" />
                        <p className="text-sm text-slate-600 line-clamp-1 dark:text-slate-400">
                          {appt.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Doctor + wait time row */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {appt.doctor && (
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope className="h-3.5 w-3.5 text-sky-500" />
                        Dr. {appt.doctor.name}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      Waiting {waitDuration}
                    </span>
                  </div>
                </div>

                {/* First-in-line glow accent */}
                {index === 0 && (
                  <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-amber-400 to-amber-500" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <ListOrdered className="h-6 w-6 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Queue is empty</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            No patients are currently waiting
          </p>
        </div>
      )}
    </div>
  );
}
