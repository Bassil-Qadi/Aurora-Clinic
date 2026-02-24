import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { requireAuth } from "@/lib/apiAuth";
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

    // Handle doctor field based on role
    if (updateData.doctor !== undefined) {
      if (currentUser.role === "doctor") {
        if (
          updateData.doctor &&
          updateData.doctor !== currentUser._id.toString()
        ) {
          const assignedDoctor = await User.findById(updateData.doctor);
          if (assignedDoctor && assignedDoctor.role === "doctor") {
            // keep the provided doctor
          } else {
            updateData.doctor = currentUser._id.toString();
          }
        } else {
          updateData.doctor = currentUser._id.toString();
        }
      } else if (currentUser.role === "admin") {
        if (updateData.doctor) {
          const assignedDoctor = await User.findById(updateData.doctor);
          if (!assignedDoctor) {
            return NextResponse.json(
              { error: "Doctor not found" },
              { status: 404 }
            );
          }
          if (assignedDoctor.role !== "doctor") {
            return NextResponse.json(
              { error: "The selected user is not a doctor" },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: "Doctor ID is required for admin users" },
            { status: 400 }
          );
        }
      } else {
        if (updateData.doctor) {
          const assignedDoctor = await User.findById(updateData.doctor);
          if (!assignedDoctor || assignedDoctor.role !== "doctor") {
            return NextResponse.json(
              { error: "Invalid doctor ID" },
              { status: 400 }
            );
          }
        }
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
