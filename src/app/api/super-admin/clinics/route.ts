import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import Clinic from "@/models/Clinic";
import { User } from "@/models/User";
import Patient from "@/models/Patient";
import Subscription from "@/models/Subscription";

// ─── GET /api/super-admin/clinics ───────────────────────────
// List all clinics with enrichment (user count, patient count, subscription)
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status"); // "active" | "inactive"
  const subStatus = searchParams.get("subscriptionStatus"); // e.g. "trialing"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  // Build filter
  const filter: Record<string, any> = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }

  if (status === "active") filter.isActive = true;
  if (status === "inactive") filter.isActive = false;

  if (subStatus) filter.subscriptionStatus = subStatus;

  const [clinics, total] = await Promise.all([
    Clinic.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("subscriptionPlanId")
      .lean(),
    Clinic.countDocuments(filter),
  ]);

  // Enrich with counts
  const clinicIds = clinics.map((c: any) => c._id);

  const [userCounts, patientCounts] = await Promise.all([
    User.aggregate([
      { $match: { clinicId: { $in: clinicIds }, role: { $ne: "super_admin" } } },
      { $group: { _id: "$clinicId", count: { $sum: 1 } } },
    ]),
    Patient.aggregate([
      { $match: { clinicId: { $in: clinicIds } } },
      { $group: { _id: "$clinicId", count: { $sum: 1 } } },
    ]),
  ]);

  const userCountMap = Object.fromEntries(
    userCounts.map((u: any) => [u._id.toString(), u.count])
  );
  const patientCountMap = Object.fromEntries(
    patientCounts.map((p: any) => [p._id.toString(), p.count])
  );

  const enriched = clinics.map((clinic: any) => ({
    ...clinic,
    userCount: userCountMap[clinic._id.toString()] || 0,
    patientCount: patientCountMap[clinic._id.toString()] || 0,
  }));

  return NextResponse.json({
    clinics: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ─── POST /api/super-admin/clinics ──────────────────────────
// Create a new clinic (super admin can create clinics manually)
export async function POST(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const body = await req.json();

  const { name, slug, address, phone, email, settings } = body;

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: "Clinic name is required (min 2 characters)." },
      { status: 400 }
    );
  }

  // Check slug uniqueness if provided
  if (slug) {
    const existing = await Clinic.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: "A clinic with this slug already exists." },
        { status: 409 }
      );
    }
  }

  const clinic = await Clinic.create({
    name,
    slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    address,
    phone,
    email,
    settings,
    isActive: true,
    subscriptionStatus: "none",
  });

  return NextResponse.json(clinic, { status: 201 });
}
