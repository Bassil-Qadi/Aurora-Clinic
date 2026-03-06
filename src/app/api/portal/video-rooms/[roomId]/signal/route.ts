import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VideoRoom from "@/models/VideoRoom";
import Patient from "@/models/Patient";
import { requirePortalAuth } from "@/lib/portalAuth";

/**
 * POST /api/portal/video-rooms/[roomId]/signal
 * Patient posts signaling data (answer, ICE candidates).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

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
    clinicId: auth.patient!.clinicId,
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

  // Register patient as callee
  if (from === "callee" && !room.calleeId) {
    const patient = await Patient.findById(auth.patient!.patientId).lean() as any;
    room.calleeId = auth.patient!.patientId;
    room.calleeName = patient
      ? `${patient.firstName} ${patient.lastName}`
      : "Patient";
    room.calleeRole = "patient";
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
 * GET /api/portal/video-rooms/[roomId]/signal?after=<timestamp>&role=<caller|callee>
 * Patient polls for signaling data from the doctor.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");
  const role = searchParams.get("role");

  const room = await VideoRoom.findOne({
    _id: roomId,
    clinicId: auth.patient!.clinicId,
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  // Return signals from the other party
  const otherParty = role === "caller" ? "callee" : "caller";
  let signals = room.signals
    .filter((s: any) => s.from === otherParty)
    .map((s: any) => ({
      from: s.from,
      type: s.type,
      data: s.data,
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    }));

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
    callerName: room.callerName,
    callerId: room.callerId,
  });
}
