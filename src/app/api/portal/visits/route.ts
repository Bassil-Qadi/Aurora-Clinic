import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { requirePortalAuth } from "@/lib/portalAuth";

// GET /api/portal/visits - List patient's completed visits (limited info)
export async function GET() {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const visits = await Visit.find({
    patient: auth.patient!.patientId,
    clinicId: auth.patient!.clinicId,
    completed: true,
  })
    .select("diagnosis notes followUpDate createdAt doctor vitalSigns")
    .populate("doctor", "name")
    .sort({ createdAt: -1 })
    .limit(50);

  return NextResponse.json({ visits });
}
