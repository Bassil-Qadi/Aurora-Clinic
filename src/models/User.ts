import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "doctor", "receptionist"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    signature: {
      type: String, 
    },
  },
  { timestamps: true }
);

export const User =
  models.User || model("User", UserSchema);
