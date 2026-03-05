import { connectDB } from "@/lib/db";
import Notification, { NotificationType } from "@/models/Notification";
import { User } from "@/models/User";

// ─── Core creator ────────────────────────────────────────────
export interface CreateNotificationInput {
  clinicId: string;
  recipientId: string; // single recipient
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(input: CreateNotificationInput) {
  await connectDB();
  return Notification.create({
    clinicId: input.clinicId,
    recipient: input.recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    metadata: input.metadata,
  });
}

// ─── Broadcast to multiple recipients ────────────────────────
export interface BroadcastNotificationInput {
  clinicId: string;
  recipientIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function broadcastNotification(input: BroadcastNotificationInput) {
  if (!input.recipientIds.length) return [];
  await connectDB();

  const docs = input.recipientIds.map((recipientId) => ({
    clinicId: input.clinicId,
    recipient: recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    metadata: input.metadata,
  }));

  return Notification.insertMany(docs);
}

// ─── Convenience: notify all staff of certain roles in a clinic ─
export async function notifyClinicStaff(
  clinicId: string,
  roles: string[],
  data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  },
  excludeUserId?: string
) {
  await connectDB();

  const filter: Record<string, any> = {
    clinicId,
    role: { $in: roles },
    isActive: true,
  };

  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  const staff = await User.find(filter).select("_id").lean();
  const recipientIds = staff.map((u: any) => String(u._id));

  if (!recipientIds.length) return [];

  return broadcastNotification({
    clinicId,
    recipientIds,
    ...data,
  });
}
