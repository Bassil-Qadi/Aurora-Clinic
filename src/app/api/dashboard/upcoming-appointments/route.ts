import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";

export async function GET() {
  await connectDB();

  const now = new Date();

  const upcomingAppointments = await Appointment.find({
    date: { $gte: now },
    status: { $ne: "cancelled" },
  })
    .populate("patient")
    .populate("doctor")
    .sort({ date: 1 })
    .limit(5);

  return NextResponse.json(upcomingAppointments);
}