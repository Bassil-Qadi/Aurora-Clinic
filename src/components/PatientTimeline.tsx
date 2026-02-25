"use client";

import { useEffect, useState } from "react";

type TimelineItem = {
  id: string;
  date: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  doctor?: string;
  followUpDate?: string;
};

export default function PatientTimeline({ patientId }: { patientId: string }) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/timeline`)
      .then((res) => res.json())
      .then(setTimeline);
  }, [patientId]);

  if (!timeline.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-8 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Patient timeline
        </div>
        <p className="text-sm">No visits recorded for this patient yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* vertical line */}
      <div className="pointer-events-none absolute left-4 top-0 h-full w-px bg-gradient-to-b from-blue-400/60 via-slate-200 to-transparent dark:via-slate-700" />

      {timeline.map((item, index) => {
        const visitDate = new Date(item.date);
        const followUp = item.followUpDate ? new Date(item.followUpDate) : null;
        const doctorInitials =
          item.doctor
            ?.split(" ")
            .map((part: string) => part[0])
            .join("")
            .toUpperCase() || "DR";

        return (
          <div key={item.id} className="relative pl-12">
            {/* timeline dot */}
            <div className="absolute left-4 top-4 -translate-x-1/2">
              <div className="flex h-4 w-4 items-center justify-center rounded-full border border-blue-500 bg-white dark:bg-slate-900">
                <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
              </div>
            </div>

            <div className="group rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-500/70 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-blue-400/70 dark:hover:shadow-lg">
              {/* header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-semibold uppercase text-white shadow-sm">
                    {doctorInitials}
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Visit
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.doctor ? `Dr. ${item.doctor}` : "Doctor not assigned"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {visitDate.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {visitDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* body */}
              <div className="mt-3 space-y-2 text-sm">
                {item.diagnosis && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Diagnosis
                    </div>
                    <div className="text-slate-800 dark:text-slate-200">{item.diagnosis}</div>
                  </div>
                )}

                {item.prescription && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Prescription
                    </div>
                    <div className="text-slate-800 dark:text-slate-200">{item.prescription}</div>
                  </div>
                )}

                {item.notes && (
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Notes
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">{item.notes}</div>
                  </div>
                )}

                {followUp && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:ring-orange-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Follow-up on{" "}
                    {followUp.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* index chip */}
              <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Visit #{timeline.length - index}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}