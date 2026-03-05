import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VideoRoom from "@/models/VideoRoom";
import Appointment from "@/models/Appointment";
import { requireAuth } from "@/lib/apiAuth";

/**
 * POST /api/video-rooms
 * Create a new video room (doctor/staff starts a video consultation).
 * Body: { appointmentId? }
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const body = await req.json().catch(() => ({}));
  const { appointmentId } = body;

  // If appointmentId is provided, validate it
  let appointment: any = null;
  if (appointmentId) {
    appointment = await Appointment.findOne({
      _id: appointmentId,
      clinicId: user.clinicId,
    }).populate("patient");

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found." },
        { status: 404 }
      );
    }

    // Check if a room already exists for this appointment
    const existingRoom = await VideoRoom.findOne({
      appointmentId,
      clinicId: user.clinicId,
      status: { $ne: "ended" },
    });

    if (existingRoom) {
      return NextResponse.json({
        room: existingRoom,
        alreadyExists: true,
      });
    }
  }

  const room = await VideoRoom.create({
    clinicId: user.clinicId,
    appointmentId: appointmentId || undefined,
    createdBy: user.id,
    callerRole: user.role,
    callerId: user.id,
    callerName: user.name,
    status: "waiting",
  });

  // If appointment, link room to appointment
  if (appointment) {
    appointment.videoRoomId = String(room._id);
    await appointment.save();
  }

  return NextResponse.json({ room }, { status: 201 });
}
