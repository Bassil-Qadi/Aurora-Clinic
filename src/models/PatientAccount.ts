import mongoose, { Schema, Document, models } from "mongoose";

export interface IPatientAccount extends Document {
  clinicId: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

const PatientAccountSchema = new Schema<IPatientAccount>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound unique index: email per clinic
PatientAccountSchema.index({ email: 1, clinicId: 1 }, { unique: true });

export default models.PatientAccount ||
  mongoose.model<IPatientAccount>("PatientAccount", PatientAccountSchema);
