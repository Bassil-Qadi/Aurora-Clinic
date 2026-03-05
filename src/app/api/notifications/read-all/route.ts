import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/apiAuth";

// PATCH /api/notifications/read-all — Mark all notifications as read
export async function PATCH() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const result = await Notification.updateMany(
    { recipient: user.id, isRead: false },
    { $set: { isRead: true } }
  );

  return NextResponse.json({
    success: true,
    modifiedCount: result.modifiedCount,
  });
}
