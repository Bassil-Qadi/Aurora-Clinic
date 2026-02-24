import mongoose, { Schema, Document, models } from "mongoose";
import {
  AppointmentStatus,
  normalizeAppointmentStatus,
} from "@/lib/appointmentStatus";

export interface IAppointment extends Document {
  clinicId: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  date: Date;
  reason: string;
  status: AppointmentStatus;
  doctor: mongoose.Types.ObjectId;
  visit: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", index: true },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    visit: { type: Schema.Types.ObjectId,
      ref: "Visit" },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true },
    reason: { type: String },
    status: {
      type: String,
      enum: [
        "scheduled",
        "waiting",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "scheduled",
      set: (value: string) =>
        normalizeAppointmentStatus(value) ?? "scheduled",
    },
  },
  { timestamps: true }
);

export default
  models.Appointment ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
