import mongoose, { Schema, Document, models } from "mongoose";

export type NotificationType =
  | "appointment_created"
  | "appointment_cancelled"
  | "appointment_status_changed"
  | "appointment_no_show"
  | "visit_completed"
  | "portal_booking"
  | "patient_registered"
  | "prescription_created";

export interface INotification extends Document {
  clinicId: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId; // User (staff) who receives the notification
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  link?: string; // Optional in-app navigation link
  metadata?: Record<string, any>; // Extra data (appointmentId, patientName, etc.)
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "appointment_created",
        "appointment_cancelled",
        "appointment_status_changed",
        "appointment_no_show",
        "visit_completed",
        "portal_booking",
        "patient_registered",
        "prescription_created",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Compound index for efficient queries: unread notifications per user
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Auto-expire old notifications after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
