import mongoose from "mongoose";

const MedicationSchema = new mongoose.Schema({
  name: String,
  dosage: String,
  frequency: String,
  duration: String,
});

const PrescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
    },
    medications: [MedicationSchema],
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.models.Prescription ||
  mongoose.model("Prescription", PrescriptionSchema);
