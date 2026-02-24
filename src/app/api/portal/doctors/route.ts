import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { requirePortalAuth } from "@/lib/portalAuth";

// GET /api/portal/doctors - List available doctors for booking
export async function GET() {
  const auth = await requirePortalAuth();
  if (!auth.success) return auth.response;

  await connectDB();

  const doctors = await User.find({
    clinicId: auth.patient!.clinicId,
    role: "doctor",
    isActive: true,
  }).select("name email");

  return NextResponse.json({ doctors });
}
