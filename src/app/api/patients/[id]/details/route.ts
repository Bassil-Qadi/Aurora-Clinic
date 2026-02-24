import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import { requireAuth } from "@/lib/apiAuth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  const { id } = await context.params;

  await connectDB();

  const patient = await Patient.findOne({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!patient) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  const appointments = await Appointment.find({
    patient: id,
    clinicId: user.clinicId,
  }).sort({ date: -1 });

  const visits = await Visit.find({
    patient: id,
    clinicId: user.clinicId,
  }).sort({ createdAt: -1 });

  return NextResponse.json({
    patient,
    appointments,
    visits,
  });
}
