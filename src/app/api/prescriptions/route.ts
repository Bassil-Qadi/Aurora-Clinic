import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";

export async function POST(req: Request) {
  await connectDB();

  const session = await getServerSession(authOptions);
  const body = await req.json();

  if (session?.user?.role !== "doctor") {
    return new Response("Unauthorized", { status: 403 });
  }

  const prescription = await Prescription.create(body);

  return NextResponse.json({ prescription });
}

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient");
  const visit = searchParams.get("visit");

  const query: any = {
    isDeleted: false,
    isSuperseded: { $ne: true },
  };

  if (patientId) query.patient = patientId;
  if (visit) query.visit = visit;

  query.isDeleted = false;

  const prescriptions = await Prescription.find(query)
    .populate("patient")
    .populate("doctor")
    .populate("visit")
    .sort({ createdAt: -1 });

  return NextResponse.json({ prescriptions });
}
