import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";
import { requireAuth } from "@/lib/apiAuth";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;

  // Get all versions connected to this prescription chain
  const versions = await Prescription.find({
    clinicId: user.clinicId,
    $or: [{ _id: id }, { previousVersion: id }],
  })
    .populate("doctor")
    .sort({ version: 1 });

  return NextResponse.json(versions);
}
