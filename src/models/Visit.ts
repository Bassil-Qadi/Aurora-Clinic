import mongoose, { Schema, Document, models } from "mongoose";

export interface IVisit extends Document {
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  diagnosis: string;
  prescription?: string;
  notes?: string;
  followUpDate?: Date;
  createdAt: Date;
}

const VisitSchema = new Schema<IVisit>(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    diagnosis: { type: String, required: true },
    prescription: { type: String },
    notes: { type: String },
    followUpDate: { type: Date },
  },
  { timestamps: true }
);

export default models.Visit || mongoose.model<IVisit>("Visit", VisitSchema);
