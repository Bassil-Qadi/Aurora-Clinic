import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/apiAuth";

// PATCH /api/notifications/read — Mark specific notification(s) as read
export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json();
  const { ids } = body; // string | string[]

  if (!ids) {
    return NextResponse.json(
      { error: "Missing notification id(s)." },
      { status: 400 }
    );
  }

  const idArray = Array.isArray(ids) ? ids : [ids];

  const result = await Notification.updateMany(
    { _id: { $in: idArray }, recipient: user.id },
    { $set: { isRead: true } }
  );

  return NextResponse.json({
    success: true,
    modifiedCount: result.modifiedCount,
  });
}
