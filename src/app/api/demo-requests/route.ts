import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DemoRequest from "@/models/DemoRequest";
import { requireSuperAdmin } from "@/lib/apiAuth";
import { demoRequestSchema } from "@/lib/validations";
import { sendMail } from "@/lib/email";

// How long the same email must wait before submitting again.
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

/**
 * POST /api/demo-requests — public.
 * Captures a sales lead from the landing page.
 */
export async function POST(req: Request) {
  await connectDB();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validation = demoRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const data = validation.data;

  // This endpoint is public and unauthenticated — throttle repeat submissions
  // from the same address so the inbox cannot be trivially flooded.
  const recent = await DemoRequest.findOne({
    email: data.email.toLowerCase(),
    createdAt: { $gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
  }).select("_id");

  if (recent) {
    // Report success — the lead is already captured, and telling a stranger
    // that this address was seen recently is information we needn't give away.
    return NextResponse.json({ success: true, duplicate: true }, { status: 202 });
  }

  const lead = await DemoRequest.create(data);

  // ── Notify whoever handles sales (fire & forget) ──
  const salesInbox = process.env.SALES_NOTIFICATION_EMAIL || process.env.SMTP_FROM;
  if (salesInbox) {
    const rows = [
      ["Name", data.name],
      ["Clinic", data.clinicName],
      ["Email", data.email],
      ["Phone", data.phone],
      ["Country", data.country || "—"],
      ["Doctors", data.doctorCount || "—"],
      ["Language", data.locale || "en"],
      ["Message", data.message || "—"],
    ];

    sendMail({
      to: salesInbox,
      subject: `New demo request — ${data.clinicName}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html: `
        <h2 style="font-family:sans-serif">New demo request</h2>
        <table style="font-family:sans-serif;border-collapse:collapse">
          ${rows
            .map(
              ([k, v]) =>
                `<tr>
                   <td style="padding:4px 12px 4px 0;color:#64748b">${k}</td>
                   <td style="padding:4px 0"><strong>${String(v).replace(/</g, "&lt;")}</strong></td>
                 </tr>`
            )
            .join("")}
        </table>
      `,
    }).catch((err) => console.error("Demo request notification failed:", err));
  }

  return NextResponse.json({ success: true, id: String(lead._id) }, { status: 201 });
}

/**
 * GET /api/demo-requests — super admin only.
 * Leads are not tenant-scoped, so this is deliberately the strictest guard.
 */
export async function GET(req: Request) {
  const auth = await requireSuperAdmin();
  if (!auth.success) return auth.response;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));

  const query: Record<string, unknown> = {};
  if (status) query.status = status;

  const [requests, total] = await Promise.all([
    DemoRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DemoRequest.countDocuments(query),
  ]);

  return NextResponse.json({
    requests,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
