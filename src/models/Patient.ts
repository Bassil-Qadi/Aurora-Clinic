import mongoose, { Schema, Document, models } from "mongoose";

export interface IMedicalHistory {
  bloodType?: string;
  allergies?: string[];
  chronicConditions?: string[];
  pastSurgeries?: { name: string; date?: string; notes?: string }[];
  familyHistory?: string[];
  currentMedications?: string[];
  immunizations?: { name: string; date?: string }[];
  smokingStatus?: "never" | "former" | "current";
  alcoholUse?: "none" | "occasional" | "moderate" | "heavy";
  notes?: string;
}

export interface IPatient extends Document {
  clinicId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: "male" | "female";
  phone: string;
  email?: string;
  address?: string;
  medicalHistory?: IMedicalHistory;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber?: string;
  };
  createdAt: Date;
}

const MedicalHistorySchema = new Schema(
  {
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
    },
    allergies: [{ type: String }],
    chronicConditions: [{ type: String }],
    pastSurgeries: [
      {
        name: { type: String },
        date: { type: String },
        notes: { type: String },
      },
    ],
    familyHistory: [{ type: String }],
    currentMedications: [{ type: String }],
    immunizations: [
      {
        name: { type: String },
        date: { type: String },
      },
    ],
    smokingStatus: {
      type: String,
      enum: ["never", "former", "current", ""],
    },
    alcoholUse: {
      type: String,
      enum: ["none", "occasional", "moderate", "heavy", ""],
    },
    notes: { type: String },
  },
  { _id: false }
);

const PatientSchema = new Schema<IPatient>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
    medicalHistory: { type: MedicalHistorySchema, default: undefined },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
    },
    insuranceInfo: {
      provider: { type: String },
      policyNumber: { type: String },
      groupNumber: { type: String },
    },
  },
  { timestamps: true }
);

export default models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);
