import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import {
  requireAuth,
  assertBelongsToClinic,
  assertDoctorInClinic,
} from "@/lib/apiAuth";
import Patient from "@/models/Patient";
import { updateVisitSchema, patchVisitSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;

  const visit = await Visit.findOne({ _id: id, clinicId: user.clinicId })
    .populate("patient")
    .populate("doctor")
    .populate("appointment");

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  return NextResponse.json(visit);
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(["doctor", "admin"]);
    if (!auth.success) return auth.response;
    const { user } = auth;

    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    const validation = updateVisitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const existingVisit = await Visit.findOne({
      _id: id,
      clinicId: user.clinicId,
    });

    if (!existingVisit) {
      return NextResponse.json(
        { error: "Visit not found" },
        { status: 404 }
      );
    }

    const { User } = await import("@/models/User");
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    // updateVisitSchema accepts `patient`, so an update could otherwise
    // re-point an existing visit at another clinic's patient.
    if (updateData.patient !== undefined) {
      const patientCheck = await assertBelongsToClinic(
        Patient,
        updateData.patient,
        user.clinicId,
        "Patient"
      );
      if (!patientCheck.ok) return patientCheck.response;
    }

    // Handle doctor field based on role
    if (updateData.doctor !== undefined) {
      if (currentUser.role === "doctor") {
        if (
          updateData.doctor &&
          updateData.doctor !== currentUser._id.toString()
        ) {
          const doctorCheck = await assertDoctorInClinic(
            updateData.doctor,
            user.clinicId
          );
          if (!doctorCheck.ok) return doctorCheck.response;
        } else {
          updateData.doctor = currentUser._id.toString();
        }
      } else {
        if (!updateData.doctor) {
          return NextResponse.json(
            { error: "Doctor ID is required." },
            { status: 400 }
          );
        }
        const doctorCheck = await assertDoctorInClinic(
          updateData.doctor,
          user.clinicId
        );
        if (!doctorCheck.ok) return doctorCheck.response;
      }
    }

    if (updateData.followUpDate) {
      updateData.followUpDate = new Date(updateData.followUpDate);
    }

    const updated = await Visit.findOneAndUpdate(
      { _id: id, clinicId: user.clinicId },
      updateData,
      { returnDocument: "after", runValidators: true }
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating visit:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
      }));
      return NextResponse.json(
        { error: "Validation error", errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["doctor", "admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { id } = await params;
  const body = await req.json();

  const validation = patchVisitSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const visit = await Visit.findOneAndUpdate(
    { _id: id, clinicId: user.clinicId },
    validation.data,
    { new: true }
  );

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  return NextResponse.json(visit);
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

  const deleted = await Visit.findOneAndDelete({
    _id: id,
    clinicId: user.clinicId,
  });

  if (!deleted) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
