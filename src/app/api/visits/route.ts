import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const search = searchParams.get("search") || "";

  // Base query: search within visit text fields
  const query: { $or?: any[] } & Record<string, any> = search
    ? {
        $or: [
          { diagnosis: { $regex: search, $options: "i" } },
          { notes: { $regex: search, $options: "i" } },
          { prescription: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  // If search is provided, also allow matching on patient name/phone
  if (search) {
    const Patient = (await import("@/models/Patient")).default;
    const matchingPatients = await Patient.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    const patientIds = matchingPatients.map((p: any) => p._id);

    query.$or = [
      ...(query.$or || []),
      { patient: { $in: patientIds } },
    ];
  }

  const [visits, total] = await Promise.all([
    Visit.find(query)
      .populate("patient")
      .populate("appointment")
      .populate("doctor")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Visit.countDocuments(query),
  ]);

  return NextResponse.json({
    visits,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const body = await req.json();

    // Validate required fields
    if (!body.patient) {
      return NextResponse.json(
        { error: "Patient is required" },
        { status: 400 }
      );
    }

    if (!body.diagnosis) {
      return NextResponse.json(
        { error: "Diagnosis is required" },
        { status: 400 }
      );
    }

    // Get user role and ID from session
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

    let doctorId: string;

    // If user is a doctor, automatically use their own ID
    if (currentUser.role === "doctor") {
      doctorId = currentUser._id.toString();
      // Optionally allow doctor to assign to another doctor if provided
      if (body.doctor && body.doctor !== doctorId) {
        // Verify the provided doctor ID exists and is a doctor
        const assignedDoctor = await User.findById(body.doctor);
        if (assignedDoctor && assignedDoctor.role === "doctor") {
          doctorId = body.doctor;
        }
        // If invalid, silently use the logged-in doctor's ID
      }
    } 
    // If user is admin, they must provide a doctor ID
    else if (currentUser.role === "admin") {
      if (!body.doctor) {
        return NextResponse.json(
          { error: "Doctor ID is required. Please select a doctor." },
          { status: 400 }
        );
      }
      
      // Verify the provided doctor ID exists and is a doctor
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
    } 
    // For other roles (receptionist, etc.), require doctor ID
    else {
      if (!body.doctor) {
        return NextResponse.json(
          { error: "Doctor ID is required" },
          { status: 400 }
        );
      }
      
      const assignedDoctor = await User.findById(body.doctor);
      if (!assignedDoctor || assignedDoctor.role !== "doctor") {
        return NextResponse.json(
          { error: "Invalid doctor ID" },
          { status: 400 }
        );
      }
      
      doctorId = body.doctor;
    }

    // Prepare visit data
    const visitData = {
      patient: body.patient,
      doctor: doctorId,
      diagnosis: body.diagnosis,
      appointment: body.appointment || undefined,
      prescription: body.prescription || body.treatment || undefined, // Support both 'prescription' and 'treatment' fields
      notes: body.notes || undefined,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : undefined,
    };

    const visit = await Visit.create(visitData);

    return NextResponse.json(visit, { status: 201 });
  } catch (error: any) {
    console.error("Error creating visit:", error);
    
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
