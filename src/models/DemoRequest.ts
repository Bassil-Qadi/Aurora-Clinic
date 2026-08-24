import { Schema, model, models } from "mongoose";

/**
 * DemoRequest — an inbound sales lead from the public landing page.
 *
 * Deliberately *not* tenant-scoped: a lead exists before any clinic does.
 * Only super admins may read these.
 */
const DemoRequestSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    clinicName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, default: "", trim: true },

    // Rough size signal — drives which plan to pitch.
    doctorCount: {
      type: String,
      enum: ["1", "2-5", "6-15", "16+"],
      default: "1",
    },

    message: { type: String, default: "", trim: true },

    // Which language the lead used — worth knowing before calling them.
    locale: { type: String, enum: ["en", "ar"], default: "en" },

    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "won", "lost"],
      default: "new",
      index: true,
    },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

DemoRequestSchema.index({ createdAt: -1 });

export default models.DemoRequest || model("DemoRequest", DemoRequestSchema);
