import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { requireAuth } from "@/lib/apiAuth";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const now = new Date();

  const upcomingAppointments = await Appointment.find({
    clinicId: user.clinicId,
    date: { $gte: now },
    status: { $nin: ["cancelled", "no_show"] },
  })
    .populate("patient")
    .populate("doctor")
    .sort({ date: 1 })
    .limit(5);

  return NextResponse.json(upcomingAppointments);
}
