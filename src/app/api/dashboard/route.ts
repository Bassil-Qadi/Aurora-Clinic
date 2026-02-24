import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import { requireAuth } from "@/lib/apiAuth";
import mongoose from "mongoose";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const clinicFilter = { clinicId: new mongoose.Types.ObjectId(user.clinicId) };

  const totalPatients = await Patient.countDocuments(clinicFilter);
  const totalAppointments = await Appointment.countDocuments(clinicFilter);
  const totalVisits = await Visit.countDocuments(clinicFilter);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayAppointments = await Appointment.countDocuments({
    ...clinicFilter,
    date: { $gte: todayStart, $lte: todayEnd },
  });

  const upcomingAppointments = await Appointment.find({
    ...clinicFilter,
    date: { $gte: todayStart },
    status: { $nin: ["completed", "cancelled", "no_show"] },
  })
    .populate("patient")
    .populate("doctor")
    .sort({ date: 1 })
    .limit(5);

  const recentVisits = await Visit.find(clinicFilter)
    .populate("patient")
    .sort({ createdAt: -1 })
    .limit(5);

  // Doctor waiting queue
  const waitingQueue = await Appointment.find({
    ...clinicFilter,
    status: "waiting",
  })
    .populate("patient")
    .populate("doctor")
    .sort({ date: 1 })
    .limit(20);

  const appointmentStatus = await Appointment.aggregate([
    { $match: clinicFilter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const doctorWorkload = await Appointment.aggregate([
    { $match: clinicFilter },
    { $group: { _id: "$doctor", appointments: { $sum: 1 } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "doctor",
      },
    },
    { $unwind: "$doctor" },
    { $match: { "doctor.role": "doctor" } },
    { $project: { name: "$doctor.name", appointments: 1 } },
  ]);

  return NextResponse.json({
    totalPatients,
    totalAppointments,
    totalVisits,
    todayAppointments,
    upcomingAppointments,
    recentVisits,
    waitingQueue,
    appointmentStatus,
    doctorWorkload,
  });
}
