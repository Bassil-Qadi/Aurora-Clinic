import mongoose from "mongoose";

const PasswordResetTokenSchema = new mongoose.Schema(
  {
    // For staff (User model) resets
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // For patient portal (PatientAccount model) resets
    patientAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientAccount",
    },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete expired tokens (TTL index)
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
