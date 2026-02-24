import mongoose, { Schema, Document, models } from "mongoose";

export interface IMedicalDocument extends Document {
  clinicId: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  visit?: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number; // bytes
  category:
    | "lab_result"
    | "imaging"
    | "prescription"
    | "referral"
    | "consent"
    | "insurance"
    | "other";
  description?: string;
  fileData: string; // base64 encoded file data
  createdAt: Date;
}

const MedicalDocumentSchema = new Schema<IMedicalDocument>(
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
      index: true,
    },
    visit: {
      type: Schema.Types.ObjectId,
      ref: "Visit",
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    category: {
      type: String,
      enum: [
        "lab_result",
        "imaging",
        "prescription",
        "referral",
        "consent",
        "insurance",
        "other",
      ],
      default: "other",
    },
    description: { type: String },
    fileData: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.MedicalDocument ||
  mongoose.model<IMedicalDocument>("MedicalDocument", MedicalDocumentSchema);
