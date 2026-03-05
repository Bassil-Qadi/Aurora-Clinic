import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/apiAuth";

// DELETE /api/notifications/[id] — Delete a single notification
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;

  const result = await Notification.deleteOne({
    _id: id,
    recipient: user.id,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { error: "Notification not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
