import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VideoRoom from "@/models/VideoRoom";
import { requireAuth } from "@/lib/apiAuth";

/**
 * GET /api/video-rooms/[roomId]
 * Get room info (caller or callee).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { roomId } = await params;

  const room = await VideoRoom.findOne({
    _id: roomId,
    clinicId: user.clinicId,
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({ room });
}

/**
 * PATCH /api/video-rooms/[roomId]
 * Update room status (end call).
 * Body: { status: "ended" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { roomId } = await params;
  const body = await req.json();

  const room = await VideoRoom.findOne({
    _id: roomId,
    clinicId: user.clinicId,
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (body.status === "ended") {
    room.status = "ended";
    room.endedAt = new Date();
    await room.save();
  }

  return NextResponse.json({ room });
}
