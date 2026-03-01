import mongoose, { Schema, model, models } from "mongoose";

/**
 * Subscription — tracks each clinic's active subscription lifecycle.
 * One active subscription per clinic at a time.
 */
const SubscriptionSchema = new Schema(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    // PayPal subscription data
    paypalSubscriptionId: { type: String, default: "" },

    status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "past_due",
        "suspended",
        "cancelled",
        "expired",
      ],
      default: "trialing",
      index: true,
    },

    // Billing period
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },

    // Trial
    trialStart: { type: Date },
    trialEnd: { type: Date },

    // Cancellation
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

// Only one active subscription per clinic
SubscriptionSchema.index(
  { clinicId: 1, status: 1 },
  { unique: false }
);

export default models.Subscription ||
  model("Subscription", SubscriptionSchema);
