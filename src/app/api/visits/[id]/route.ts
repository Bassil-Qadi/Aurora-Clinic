import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;
    const body = await req.json();

    // Check if visit exists
    const existingVisit = await Visit.findById(id);
    if (!existingVisit) {
      return NextResponse.json(
        { error: "Visit not found" },
        { status: 404 }
      );
    }

    // Get user role and ID from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const { User } = await import("@/models/User");
    const currentUser = await User.findById(session.user.id);
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Handle doctor field based on user role
    let doctorId: string | undefined;

    // If doctor field is being updated
    if (body.doctor !== undefined) {
      // If user is a doctor, they can only assign to themselves or another doctor
      if (currentUser.role === "doctor") {
        // If they're trying to assign to another doctor, verify it
        if (body.doctor && body.doctor !== currentUser._id.toString()) {
          const assignedDoctor = await User.findById(body.doctor);
          if (assignedDoctor && assignedDoctor.role === "doctor") {
            doctorId = body.doctor;
          } else {
            // Invalid doctor ID, use current doctor's ID
            doctorId = currentUser._id.toString();
          }
        } else {
          // Assigning to themselves or not changing
          doctorId = currentUser._id.toString();
        }
      } 
      // If user is admin, they can assign to any doctor
      else if (currentUser.role === "admin") {
        if (body.doctor) {
          const assignedDoctor = await User.findById(body.doctor);
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
          doctorId = body.doctor;
        } else {
          return NextResponse.json(
            { error: "Doctor ID is required for admin users" },
            { status: 400 }
          );
        }
      } 
      // For other roles, require valid doctor
      else {
        if (body.doctor) {
          const assignedDoctor = await User.findById(body.doctor);
          if (!assignedDoctor || assignedDoctor.role !== "doctor") {
            return NextResponse.json(
              { error: "Invalid doctor ID" },
              { status: 400 }
            );
          }
          doctorId = body.doctor;
        }
      }
    }

    // Prepare update data
    const updateData: any = { ...body };
    if (doctorId !== undefined) {
      updateData.doctor = doctorId;
    }

    // Handle date conversion
    if (updateData.followUpDate) {
      updateData.followUpDate = new Date(updateData.followUpDate);
    }

    const updated = await Visit.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating visit:", error);
    
    // Handle validation errors
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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectDB();

  const { id } = await context.params;

  await Visit.findByIdAndDelete(id);

  return NextResponse.json({ message: "Deleted successfully" });
}
