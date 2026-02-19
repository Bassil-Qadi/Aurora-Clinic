import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const prescription = await Prescription.create(body);

  return NextResponse.json({ prescription });
}

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient");

  const query: any = {};

  if (patientId) query.patient = patientId;

  query.isDeleted = false;

  const prescriptions = await Prescription.find(query)
    .populate("patient")
    .populate("doctor")
    .populate("visit")
    .sort({ createdAt: -1 });

  return NextResponse.json({ prescriptions });
}
