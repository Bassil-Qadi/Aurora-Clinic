import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/db";
import Patient from "../../../../models/Patient";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const updated = await Patient.findByIdAndUpdate(id, body, {
    returnDocument: "after", // fixes mongoose deprecation warning
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await context.params;

  await Patient.findByIdAndDelete(id);

  return NextResponse.json({ message: "Deleted successfully" });
}
