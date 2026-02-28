import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import Appointment from "@/models/Appointment";
import { requireAuth } from "@/lib/apiAuth";
import mongoose from "mongoose";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const clinicFilter = { clinicId: new mongoose.Types.ObjectId(user.clinicId) };

  // Get all active doctors
  const doctors = await User.find({
    ...clinicFilter,
    role: "doctor",
    isActive: true,
  }).select("name email _id");

  // Get all appointments that are currently in progress
  const currentAppointments = await Appointment.find({
    ...clinicFilter,
    status: "in_progress",
  }).select("doctor");

  // Create a set of doctor IDs who have appointments in progress
  const doctorsWithAppointments = new Set(
    currentAppointments
      .map((apt) => apt.doctor?.toString())
      .filter((id) => id !== null && id !== undefined)
  );

  // Map doctors with their status
  const doctorSlots = doctors.map((doctor) => ({
    _id: doctor._id.toString(),
    name: doctor.name,
    email: doctor.email,
    isInAppointment: doctorsWithAppointments.has(doctor._id.toString()),
  }));

  return NextResponse.json({ doctorSlots });
}
