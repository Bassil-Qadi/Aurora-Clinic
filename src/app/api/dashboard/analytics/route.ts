import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Visit from "@/models/Visit";
import { requireAuth } from "@/lib/apiAuth";
import mongoose from "mongoose";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const clinicId = new mongoose.Types.ObjectId(user.clinicId);
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  const appointments = await Appointment.aggregate([
    { $match: { clinicId, date: { $gte: start, $lte: end } } },
    { $group: { _id: { $month: "$date" }, count: { $sum: 1 } } },
  ]);

  const visits = await Visit.aggregate([
    { $match: { clinicId, createdAt: { $gte: start, $lte: end } } },
    { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
  ]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    appointments: appointments.find((a) => a._id === i + 1)?.count || 0,
    visits: visits.find((v) => v._id === i + 1)?.count || 0,
  }));

  return NextResponse.json(months);
}
