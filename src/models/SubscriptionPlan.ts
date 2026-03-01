import mongoose, { Schema, model, models } from "mongoose";

/**
 * SubscriptionPlan — defines a plan that clinics can subscribe to.
 * PayPal plan / product IDs are stored here after being created via the API.
 */
const SubscriptionPlanSchema = new Schema(
  {
    name: { type: String, required: true }, // "Basic", "Pro", "Enterprise"
    slug: { type: String, unique: true, required: true }, // "basic", "pro", "enterprise"
    description: { type: String, default: "" },

    // Pricing
    price: { type: Number, required: true }, // in smallest unit (e.g. 20.00 JOD)
    currency: { type: String, default: "USD" },
    interval: {
      type: String,
      enum: ["MONTH", "YEAR"],
      default: "MONTH",
    },

    // PayPal IDs (populated after syncing plans to PayPal)
    paypalProductId: { type: String, default: "" },
    paypalPlanId: { type: String, default: "" },

    // Feature limits
    features: {
      maxDoctors: { type: Number, default: 1 },
      maxPatients: { type: Number, default: 50 },
      maxAppointmentsPerMonth: { type: Number, default: 100 },
      patientPortal: { type: Boolean, default: false },
      aiSummary: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
    },

    // Ordering for display
    sortOrder: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.SubscriptionPlan ||
  model("SubscriptionPlan", SubscriptionPlanSchema);
