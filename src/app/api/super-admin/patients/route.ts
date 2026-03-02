import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Patient from "@/models/Patient";

// ─── GET /api/super-admin/patients ──────────────────────────
// List all patients across all clinics (for support / overview)
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const clinicId = searchParams.get("clinicId");
  const gender = searchParams.get("gender"); // "male" | "female"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  if (clinicId) filter.clinicId = clinicId;
  if (gender) filter.gender = gender;

  const [patients, total] = await Promise.all([
    Patient.find(filter)
      .populate("clinicId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Patient.countDocuments(filter),
  ]);

  return NextResponse.json({
    patients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
