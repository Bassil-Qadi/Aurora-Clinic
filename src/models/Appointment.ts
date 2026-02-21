import mongoose, { Schema, Document, models } from "mongoose";

export interface IAppointment extends Document {
  patient: mongoose.Types.ObjectId;
  date: Date;
  reason: string;
  status: "scheduled" | "completed" | "cancelled";
  doctor: mongoose.Types.ObjectId;
  visit: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
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
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

export default
  models.Appointment ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
