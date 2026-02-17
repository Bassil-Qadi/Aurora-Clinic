import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";

export async function GET() {
  await connectDB();

  const visits = await Visit.find()
    .populate("patient")
    .populate("appointment")
    .sort({ createdAt: -1 });

  return NextResponse.json(visits);
}

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const visit = await Visit.create(body);

  return NextResponse.json(visit, { status: 201 });
}
