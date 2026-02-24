import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { requireAuth } from "@/lib/apiAuth";
import { createVisitSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const search = searchParams.get("search") || "";

  const query: Record<string, any> = { clinicId: user.clinicId };

  if (search) {
    const Patient = (await import("@/models/Patient")).default;
    const matchingPatients = await Patient.find({
      clinicId: user.clinicId,
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    const patientIds = matchingPatients.map((p: any) => p._id);

    query.$or = [
      { diagnosis: { $regex: search, $options: "i" } },
      { notes: { $regex: search, $options: "i" } },
      { prescription: { $regex: search, $options: "i" } },
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
    const auth = await requireAuth(["doctor", "admin"]);
    if (!auth.success) return auth.response;
    const { user } = auth;

    await connectDB();

    const body = await req.json();
    const validation = createVisitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const { User } = await import("@/models/User");
    const currentUser = await User.findById(user.id);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let doctorId: string;

    if (currentUser.role === "doctor") {
      doctorId = currentUser._id.toString();
      if (data.doctor && data.doctor !== doctorId) {
        const assignedDoctor = await User.findById(data.doctor);
        if (assignedDoctor && assignedDoctor.role === "doctor") {
          doctorId = data.doctor;
        }
      }
    } else if (currentUser.role === "admin") {
      if (!data.doctor) {
        return NextResponse.json(
          { error: "Doctor ID is required. Please select a doctor." },
          { status: 400 }
        );
      }
      const assignedDoctor = await User.findById(data.doctor);
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
      doctorId = data.doctor;
    } else {
      if (!data.doctor) {
        return NextResponse.json(
          { error: "Doctor ID is required" },
          { status: 400 }
        );
      }
      const assignedDoctor = await User.findById(data.doctor);
      if (!assignedDoctor || assignedDoctor.role !== "doctor") {
        return NextResponse.json(
          { error: "Invalid doctor ID" },
          { status: 400 }
        );
      }
      doctorId = data.doctor;
    }

    const visitData = {
      clinicId: user.clinicId,
      patient: data.patient,
      doctor: doctorId,
      diagnosis: data.diagnosis || "",
      appointment: data.appointment || undefined,
      prescription: data.prescription || data.treatment || undefined,
      notes: data.notes || undefined,
      followUpDate: data.followUpDate
        ? new Date(data.followUpDate)
        : undefined,
    };

    const visit = await Visit.create(visitData);

    return NextResponse.json(visit, { status: 201 });
  } catch (error: any) {
    console.error("Error creating visit:", error);

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
