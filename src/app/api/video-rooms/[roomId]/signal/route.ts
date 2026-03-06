import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VideoRoom from "@/models/VideoRoom";
import { requireAuth } from "@/lib/apiAuth";

/**
 * POST /api/video-rooms/[roomId]/signal
 * Post a signaling message (offer, answer, or ICE candidate).
 * Body: { from: "caller"|"callee", type: "offer"|"answer"|"ice-candidate", data: any }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { roomId } = await params;
  const body = await req.json();
  const { from, type, data } = body;

  if (!from || !type || !data) {
    return NextResponse.json(
      { error: "Missing required fields: from, type, data." },
      { status: 400 }
    );
  }

  const room = await VideoRoom.findOne({
    _id: roomId,
    clinicId: user.clinicId,
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (room.status === "ended") {
    return NextResponse.json(
      { error: "This call has ended." },
      { status: 400 }
    );
  }

  // If callee is joining, register them
  if (from === "callee" && !room.calleeId) {
    room.calleeId = user.id;
    room.calleeName = user.name;
    room.calleeRole = user.role;
    room.status = "active";
    room.startedAt = new Date();
  }

  room.signals.push({
    from,
    type,
    data,
    createdAt: new Date(),
  });

  await room.save();

  return NextResponse.json({ success: true });
}

/**
 * GET /api/video-rooms/[roomId]/signal?after=<timestamp>&role=<caller|callee>
 * Poll for new signals after a given timestamp, filtered for the other party.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");
  const role = searchParams.get("role"); // "caller" or "callee"

  const room = await VideoRoom.findOne({
    _id: roomId,
    clinicId: user.clinicId,
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  // Filter signals: return messages FROM the other party
  const otherParty = role === "caller" ? "callee" : "caller";
  let signals = room.signals
    .filter((s: any) => s.from === otherParty)
    .map((s: any) => ({
      from: s.from,
      type: s.type,
      data: s.data,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    }));

  // Filter by timestamp if provided
  if (after) {
    const afterTimestamp = Number(after);
    signals = signals.filter((s: any) => {
      const signalTime = new Date(s.createdAt).getTime();
      return signalTime > afterTimestamp;
    });
  }

  return NextResponse.json({
    signals,
    roomStatus: room.status,
    calleeName: room.calleeName,
    calleeId: room.calleeId,
  });
}
