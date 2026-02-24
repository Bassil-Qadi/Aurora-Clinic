export type AppointmentStatus =
  | "scheduled"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  waiting: "Waiting",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const APPOINTMENT_STATUS_BADGE_STYLES: Record<
  AppointmentStatus,
  { className: string }
> = {
  scheduled: {
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-200",
  },
  waiting: {
    className:
      "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200",
  },
  in_progress: {
    className:
      "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-200",
  },
  completed: {
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200",
  },
  cancelled: {
    className:
      "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-200",
  },
  no_show: {
    className:
      "border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-200",
  },
};

export const APPOINTMENT_ALLOWED_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  scheduled: ["waiting", "cancelled", "no_show"],
  waiting: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionStatus(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  if (from === to) return true;
  return APPOINTMENT_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// Accept various legacy / free-text values and normalize them
export function normalizeAppointmentStatus(
  raw: string | null | undefined
): AppointmentStatus | null {
  if (!raw) return null;

  const value = raw.trim().toLowerCase();

  switch (value) {
    case "scheduled":
      return "scheduled";
    case "waiting":
      return "waiting";
    case "in progress":
    case "in_progress":
    case "in-progress":
      return "in_progress";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "no show":
    case "no_show":
    case "no-show":
      return "no_show";
    default:
      return null;
  }
}

