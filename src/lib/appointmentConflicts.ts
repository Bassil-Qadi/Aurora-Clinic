import { connectDB } from "./db";
import Appointment from "@/models/Appointment";
import Clinic from "@/models/Clinic";
import mongoose from "mongoose";

export interface ConflictCheckResult {
  hasConflict: boolean;
  error?: string;
  conflictType?: "outside_hours" | "non_working_day" | "doctor_overlap" | "invalid_time";
}

/**
 * Checks if an appointment time conflicts with existing appointments or clinic settings
 * @param clinicId - The clinic ID
 * @param appointmentDate - The proposed appointment date/time
 * @param doctorId - Optional doctor ID to check for conflicts
 * @param excludeAppointmentId - Optional appointment ID to exclude from conflict check (for updates)
 * @returns ConflictCheckResult indicating if there's a conflict and the reason
 */
export async function checkAppointmentConflicts(
  clinicId: mongoose.Types.ObjectId | string,
  appointmentDate: Date,
  doctorId?: mongoose.Types.ObjectId | string,
  excludeAppointmentId?: mongoose.Types.ObjectId | string
): Promise<ConflictCheckResult> {
  await connectDB();

  // Fetch clinic settings
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    return {
      hasConflict: true,
      error: "Clinic not found",
      conflictType: "invalid_time",
    };
  }

  const settings = clinic.settings || {};
  const workingHours = settings.workingHours || { start: "09:00", end: "17:00" };
  const workingDays = settings.workingDays || [1, 2, 3, 4, 5]; // Mon-Fri default
  const appointmentDuration = settings.appointmentDuration || 30; // minutes

  // Check if appointment is in the past
  if (appointmentDate < new Date()) {
    return {
      hasConflict: true,
      error: "Cannot book appointments in the past",
      conflictType: "invalid_time",
    };
  }

  // Check if appointment day is a working day
  const dayOfWeek = appointmentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  if (!workingDays.includes(dayOfWeek)) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
      hasConflict: true,
      error: `Clinic is closed on ${dayNames[dayOfWeek]}. Please select a working day.`,
      conflictType: "non_working_day",
    };
  }

  // Parse working hours
  const [startHour, startMinute] = workingHours.start.split(":").map(Number);
  const [endHour, endMinute] = workingHours.end.split(":").map(Number);

  const appointmentHour = appointmentDate.getHours();
  const appointmentMinute = appointmentDate.getMinutes();
  const appointmentTimeMinutes = appointmentHour * 60 + appointmentMinute;
  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;

  // Calculate appointment end time
  const appointmentEndDate = new Date(appointmentDate);
  appointmentEndDate.setMinutes(appointmentEndDate.getMinutes() + appointmentDuration);
  const appointmentEndTimeMinutes = appointmentEndDate.getHours() * 60 + appointmentEndDate.getMinutes();

  // Check if appointment starts before clinic opens
  if (appointmentTimeMinutes < startTimeMinutes) {
    return {
      hasConflict: true,
      error: `Appointment time is before clinic opening hours (${workingHours.start}).`,
      conflictType: "outside_hours",
    };
  }

  // Check if appointment ends after clinic closes
  if (appointmentEndTimeMinutes > endTimeMinutes) {
    return {
      hasConflict: true,
      error: `Appointment would end after clinic closing hours (${workingHours.end}).`,
      conflictType: "outside_hours",
    };
  }

  // If no doctor is specified, we can't check for doctor conflicts
  // But we still validate working hours and days
  if (!doctorId) {
    return { hasConflict: false };
  }

  // Check for overlapping appointments with the same doctor
  // Two appointments overlap if: existingStart < proposedEnd AND existingEnd > proposedStart
  const existingAppointments = await Appointment.find({
    clinicId: new mongoose.Types.ObjectId(clinicId.toString()),
    doctor: new mongoose.Types.ObjectId(doctorId.toString()),
    status: { $in: ["scheduled", "waiting", "in_progress"] }, // Only active appointments block
    ...(excludeAppointmentId
      ? { _id: { $ne: new mongoose.Types.ObjectId(excludeAppointmentId.toString()) } }
      : {}),
  });

  // Check each existing appointment for overlap
  for (const existing of existingAppointments) {
    const existingStart = new Date(existing.date);
    const existingEnd = new Date(existingStart);
    existingEnd.setMinutes(existingEnd.getMinutes() + appointmentDuration);

    // Check if appointments overlap: existingStart < proposedEnd AND existingEnd > proposedStart
    if (appointmentDate < existingEnd && appointmentEndDate > existingStart) {
      const existingDoctor = await mongoose.models.User?.findById(existing.doctor).select("name");
      const doctorName = existingDoctor?.name || "the doctor";
      const existingTime = existingStart.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        hasConflict: true,
        error: `Doctor ${doctorName} already has an appointment at ${existingTime}. Please choose a different time.`,
        conflictType: "doctor_overlap",
      };
    }
  }

  return { hasConflict: false };
}
