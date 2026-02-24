"use client";

import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_STATUS_BADGE_STYLES,
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";

interface AppointmentStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function AppointmentStatusBadge({
  status,
  className,
}: AppointmentStatusBadgeProps) {
  const normalized = normalizeAppointmentStatus(status) || "scheduled";
  const config = APPOINTMENT_STATUS_BADGE_STYLES[normalized as AppointmentStatus];

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className ?? ""}`}
    >
      {APPOINTMENT_STATUS_LABELS[normalized]}
    </Badge>
  );
}

