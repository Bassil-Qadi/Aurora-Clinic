import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/apiAuth";

// GET /api/notifications — List notifications for the current user
export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const unreadOnly = searchParams.get("unread") === "true";

  const filter: Record<string, any> = { recipient: user.id };
  if (unreadOnly) filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: user.id, isRead: false }),
  ]);

  return NextResponse.json({
    notifications,
    total,
    unreadCount,
    page,
    pages: Math.ceil(total / limit),
  });
}
