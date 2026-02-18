import { NextResponse } from "next/server";
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
  await connectDB();

  const body = await req.json();

  const visit = await Visit.create(body);

  return NextResponse.json(visit, { status: 201 });
}
