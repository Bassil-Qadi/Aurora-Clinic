import mongoose from "mongoose";

const ClinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true },
    address: String,
    phone: String,
    email: String,
    logo: String,
    isActive: { type: Boolean, default: true },
    settings: {
      workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" },
      },
      workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5], // Mon–Fri
      },
      appointmentDuration: { type: Number, default: 30 }, // minutes
      currency: { type: String, default: "USD" },
      timezone: { type: String, default: "UTC" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Clinic ||
  mongoose.model("Clinic", ClinicSchema);
