import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Clinic from "@/models/Clinic";

// GET /api/portal/clinics — public endpoint
// Returns the list of active clinics for the patient self-registration dropdown.
export async function GET() {
  await connectDB();

  const clinics = await Clinic.find({ isActive: true })
    .select("_id name slug")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({ clinics });
}
