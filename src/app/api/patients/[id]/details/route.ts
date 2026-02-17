import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await connectDB();

  const patient = await Patient.findById(id);

  if (!patient) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  const appointments = await Appointment.find({ patient: id })
    .sort({ date: -1 });

  const visits = await Visit.find({ patient: id })
    .sort({ createdAt: -1 });

  return NextResponse.json({
    patient,
    appointments,
    visits,
  });
}
