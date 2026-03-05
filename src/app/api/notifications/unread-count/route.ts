import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/apiAuth";

// GET /api/notifications/unread-count — Quick unread count for the bell badge
export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const count = await Notification.countDocuments({
    recipient: user.id,
    isRead: false,
  });

  return NextResponse.json({ count });
}
