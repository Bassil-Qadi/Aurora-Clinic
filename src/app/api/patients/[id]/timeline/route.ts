import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;

  const visits = await Visit.find({
    patient: id,
    clinicId: user.clinicId,
  })
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
