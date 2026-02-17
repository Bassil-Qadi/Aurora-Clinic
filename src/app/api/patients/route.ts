import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import Patient from "../../../models/Patient";

// GET all patients
export async function GET(req: Request) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 5;
  const search = searchParams.get("search") || "";

  const query = search
    ? {
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const total = await Patient.countDocuments(query);

  const patients = await Patient.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return NextResponse.json({
    patients,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}


// CREATE new patient
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const patient = await Patient.create(body);

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create patient" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  await connectDB();

  const updated = await Patient.findByIdAndUpdate(
    id,
    body,
    { returnDocument: "after" } // mongoose v7+
  );

  return NextResponse.json(updated);
}
