import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";

export async function GET(req: Request) {
  await connectDB();

  const appointments = await Appointment.find()
    .populate("patient")
    .sort({ date: -1 });

  return NextResponse.json(appointments);
}

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const appointment = await Appointment.create(body);

  return NextResponse.json(appointment, { status: 201 });
}
