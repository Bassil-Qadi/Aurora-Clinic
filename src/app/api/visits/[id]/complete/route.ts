import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Appointment from "@/models/Appointment";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  const visit = await Visit.findById(id);

  if (!visit) {
    return NextResponse.json(
      { error: "Visit not found" },
      { status: 404 }
    );
  }

  // Update visit
  visit.completed = true;
  await visit.save();

  // Update appointment
  if (visit.appointment) {
    await Appointment.findByIdAndUpdate(visit.appointment, {
      status: "completed",
    });
  }

  return NextResponse.json({
    success: true,
  });
}