import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";

export async function GET() {
  await connectDB();

  const totalPatients = await Patient.countDocuments();
  const totalAppointments = await Appointment.countDocuments();
  const totalVisits = await Visit.countDocuments();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayAppointments = await Appointment.countDocuments({
    date: {
      $gte: todayStart,
      $lte: todayEnd,
    },
  });

  const upcomingAppointments = await Appointment.find({
    date: { $gte: todayStart },
    status: { $nin: ["completed", "cancelled", "no_show"] },
  })
    .populate("patient")
    .populate("doctor")
    .sort({ date: 1 })
    .limit(5);

  const recentVisits = await Visit.find()
    .populate("patient")
    .sort({ createdAt: -1 })
    .limit(5);

  // Doctor waiting queue – patients whose appointment status is "waiting",
  // sorted by date ascending so the longest-waiting patient appears first.
  const waitingQueue = await Appointment.find({
    status: "waiting",
  })
    .populate("patient")
    .populate("doctor")
    .sort({ date: 1 })
    .limit(20);

  const appointmentStatus = await Appointment.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const doctorWorkload = await Appointment.aggregate([
    {
      $group: {
        _id: "$doctor",
        appointments: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users", 
        localField: "_id",
        foreignField: "_id",
        as: "doctor",
      },
    },
    {
      $unwind: "$doctor",
    },
    {
      $match: {
        "doctor.role": "doctor", 
      },
    },
    {
      $project: {
        name: "$doctor.name",
        appointments: 1,
      },
    },
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
    doctorWorkload
  });
}
