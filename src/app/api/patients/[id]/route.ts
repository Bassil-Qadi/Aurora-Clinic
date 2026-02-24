import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { requireAuth } from "@/lib/apiAuth";
import { updatePatientSchema } from "@/lib/validations";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;
  const body = await req.json();

  const validation = updatePatientSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const updated = await Patient.findOneAndUpdate(
    { _id: id, clinicId: user.clinicId },
    validation.data,
    { returnDocument: "after" }
  );

  if (!updated) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await context.params;

  const deleted = await Patient.findOneAndDelete({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!deleted) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
