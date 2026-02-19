import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  action: String, // CREATE, UPDATE, DELETE
  entity: String, // Prescription
  entityId: String,
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: Object,
});

export default mongoose.models.AuditLog ||
  mongoose.model("AuditLog", AuditLogSchema);
