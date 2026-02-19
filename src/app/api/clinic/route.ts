import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Clinic from "@/models/Clinic";

export async function GET() {
  await connectDB();
  const clinic = await Clinic.findOne();
  return NextResponse.json(clinic);
}
