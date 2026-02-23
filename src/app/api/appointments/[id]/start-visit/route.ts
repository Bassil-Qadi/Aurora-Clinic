import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please log in." },
      { status: 401 }
    );
  }

  const { id } = await params;

  const appointment = await Appointment.findById(id)
    .populate("patient")
    .populate("doctor");

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  // Prevent duplicate visits
  const existingVisit = await Visit.findOne({ appointment: id });

  if (existingVisit) {
    return NextResponse.json({
      visitId: existingVisit._id,
      alreadyExists: true,
    });
  }

  // Determine which doctor to assign to the visit:
  // - If the appointment already has a doctor set, use that.
  // - Otherwise, fall back to the currently logged-in user (session.user.id).
  const doctorId =
    (appointment.doctor && appointment.doctor._id
      ? appointment.doctor._id
      : appointment.doctor) || session.user.id;

  const visit = await Visit.create({
    patient: appointment.patient,
    doctor: doctorId,
    appointment: appointment._id,
    diagnosis: "",
    notes: "",
  });

  appointment.status = "In Progress";
    await appointment.save();

  return NextResponse.json({
    visitId: visit._id,
    created: true,
  });
}