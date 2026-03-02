import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import { User } from "@/models/User";

// ─── GET /api/super-admin/users ─────────────────────────────
// List all users across all clinics (excludes super_admin)
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role"); // "admin" | "doctor" | "receptionist"
  const clinicId = searchParams.get("clinicId");
  const active = searchParams.get("active"); // "true" | "false"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  // Build filter
  const filter: Record<string, any> = {
    role: { $ne: "super_admin" },
  };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) filter.role = role;
  if (clinicId) filter.clinicId = clinicId;
  if (active === "true") filter.isActive = true;
  if (active === "false") filter.isActive = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .populate("clinicId", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
