import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await context.params;

  // Get all versions connected to this prescription chain
  const versions = await Prescription.find({
    $or: [
      { _id: id },
      { previousVersion: id },
    ],
  })
    .populate("doctor")
    .sort({ version: 1 });

  return NextResponse.json(versions);
}
