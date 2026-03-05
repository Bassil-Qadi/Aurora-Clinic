import mongoose, { Schema, Document, models } from "mongoose";

export interface ISignalMessage {
  from: string; // "caller" | "callee"
  type: "offer" | "answer" | "ice-candidate";
  data: any;
  createdAt: Date;
}

export interface IVideoRoom extends Document {
  clinicId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId; // The user/patient who created the room
  status: "waiting" | "active" | "ended";
  callerRole: string; // e.g. "doctor", "patient"
  callerId: string;
  callerName: string;
  calleeRole?: string;
  calleeId?: string;
  calleeName?: string;
  signals: ISignalMessage[];
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SignalMessageSchema = new Schema<ISignalMessage>(
  {
    from: { type: String, required: true },
    type: {
      type: String,
      enum: ["offer", "answer", "ice-candidate"],
      required: true,
    },
    data: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const VideoRoomSchema = new Schema<IVideoRoom>(
  {
    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
    },
    callerRole: { type: String, required: true },
    callerId: { type: String, required: true },
    callerName: { type: String, required: true },
    calleeRole: { type: String },
    calleeId: { type: String },
    calleeName: { type: String },
    signals: [SignalMessageSchema],
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-expire rooms after 2 hours
VideoRoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 60 * 60 });

export default models.VideoRoom ||
  mongoose.model<IVideoRoom>("VideoRoom", VideoRoomSchema);
