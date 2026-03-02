import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/apiAuth";
import AuditLog from "@/models/AuditLog";

// ─── GET /api/super-admin/audit-logs ────────────────────────
// Global audit log with filters
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get("clinicId");
  const action = searchParams.get("action"); // "CREATE" | "UPDATE" | "DELETE"
  const entity = searchParams.get("entity"); // "Prescription" | etc.
  const userId = searchParams.get("userId");
  const from = searchParams.get("from"); // ISO date
  const to = searchParams.get("to"); // ISO date
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30")));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};

  if (clinicId) filter.clinicId = clinicId;
  if (action) filter.action = action.toUpperCase();
  if (entity) filter.entity = entity;
  if (userId) filter.performedBy = userId;

  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("performedBy", "name email role")
      .populate("clinicId", "name slug")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
