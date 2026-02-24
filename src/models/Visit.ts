import mongoose, { Schema, Document, models } from "mongoose";

export interface IVitalSigns {
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number; // mmHg
  heartRate?: number; // bpm
  temperature?: number; // °C
  respiratoryRate?: number; // breaths/min
  oxygenSaturation?: number; // SpO2 %
  weight?: number; // kg
  height?: number; // cm
  bmi?: number; // auto-calculated
  bloodGlucose?: number; // mg/dL
  painLevel?: number; // 0–10
}

export interface IVisit extends Document {
  clinicId: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  diagnosis: string;
  prescription?: string;
  notes?: string;
  followUpDate?: Date;
  createdAt: Date;
  completed: boolean;
  aiSummary?: string;
  vitalSigns?: IVitalSigns;
}

const VitalSignsSchema = new Schema(
  {
    bloodPressureSystolic: { type: Number, min: 0 },
    bloodPressureDiastolic: { type: Number, min: 0 },
    heartRate: { type: Number, min: 0 },
    temperature: { type: Number, min: 20, max: 50 },
    respiratoryRate: { type: Number, min: 0 },
    oxygenSaturation: { type: Number, min: 0, max: 100 },
    weight: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    bmi: { type: Number, min: 0 },
    bloodGlucose: { type: Number, min: 0 },
    painLevel: { type: Number, min: 0, max: 10 },
  },
  { _id: false }
);

const VisitSchema = new Schema<IVisit>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: "Clinic", index: true },
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
      required: false,
    },
    diagnosis: { type: String, required: false },
    prescription: { type: String },
    notes: { type: String },
    followUpDate: { type: Date },
    completed: { type: Boolean, default: false },
    aiSummary: { type: String },
    vitalSigns: { type: VitalSignsSchema, default: undefined },
  },
  { timestamps: true }
);

// Auto-calculate BMI when weight and height are set
VisitSchema.pre("save", function () {
  if (this.vitalSigns?.weight && this.vitalSigns?.height) {
    const heightM = this.vitalSigns.height / 100;
    this.vitalSigns.bmi = Math.round((this.vitalSigns.weight / (heightM * heightM)) * 10) / 10;
  }
});

export default models.Visit || mongoose.model<IVisit>("Visit", VisitSchema);
