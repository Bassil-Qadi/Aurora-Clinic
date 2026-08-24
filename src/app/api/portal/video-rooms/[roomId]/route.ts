import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requirePortalAuth } from "@/lib/portalAuth";
import { findPortalRoom } from "@/lib/portalVideoRoom";

/**
 * GET /api/portal/video-rooms/[roomId]
 * Get room info for the patient.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const { roomId } = await params;

  const room = await findPortalRoom(roomId, auth.patient!);

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({ room });
}

/**
 * PATCH /api/portal/video-rooms/[roomId]
 * Patient ends the call.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const { roomId } = await params;
  const body = await req.json();

  const room = await findPortalRoom(roomId, auth.patient!);

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
