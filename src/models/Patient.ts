import mongoose, { Schema, Document, models } from "mongoose";

export interface IPatient extends Document {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: "male" | "female";
  phone: string;
  email?: string;
  address?: string;
  createdAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

export default models.Patient || mongoose.model<IPatient>("Patient", PatientSchema);
