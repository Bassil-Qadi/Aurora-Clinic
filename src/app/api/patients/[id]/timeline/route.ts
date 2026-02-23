import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await params;

  const visits = await Visit.find({ patient: id })
    .populate("doctor", "name")
    .sort({ createdAt: -1 });

  const timeline = visits.map((visit) => ({
    id: visit._id,
    date: visit.createdAt,
    diagnosis: visit.diagnosis,
    prescription: visit.prescription,
    notes: visit.notes,
    doctor: visit.doctor?.name,
    followUpDate: visit.followUpDate,
  }));

  return NextResponse.json(timeline);
}