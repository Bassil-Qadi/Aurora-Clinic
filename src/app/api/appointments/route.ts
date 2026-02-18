import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";

export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  const doctor = searchParams.get("doctor");
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const search = searchParams.get("search") || "";

  // Search by patient name or phone or reason (example: "reason" field and patient fields)
  const query: { $or?: any[] } & Record<string, any> = search
    ? {
        $or: [
          { reason: { $regex: search, $options: "i" } },
          { status: { $regex: search, $options: "i" } },
        ],
      }
    : {};

    if (doctor) {
      query.doctor = doctor;
    }

  // To search by patient name, need to use aggregate or filter after populate.
  // We'll fetch appointments with populated patient, then apply search if needed.
  let appointmentsQuery = Appointment.find(query)
    .populate("patient")
    .populate("doctor")
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  let totalQuery = Appointment.countDocuments(query);

  // If searching needed on patient fields, we have to use aggregate or filter after populate.
  // Let's allow searching patient fields: firstName, lastName, phone as in patients API
  if (search) {
    // First, find matching patients
    const Patient = (await import("@/models/Patient")).default;
    const matchingPatients = await Patient.find({
      $or: [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    const patientIds = matchingPatients.map((p: any) => p._id);

    // Extend the query to include matches with patient
    query.$or = [
      ...(query.$or || []),
      { patient: { $in: patientIds } },
    ];

    appointmentsQuery = Appointment.find(query)
      .populate("patient")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    totalQuery = Appointment.countDocuments(query);
  }

  const [appointments, total] = await Promise.all([
    appointmentsQuery,
    totalQuery,
  ]);

  return NextResponse.json({
    appointments,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  await connectDB();

  const body = await req.json();

  const appointment = await Appointment.create(body);

  return NextResponse.json(appointment, { status: 201 });
}