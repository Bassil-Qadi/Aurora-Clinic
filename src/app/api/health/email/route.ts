import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// GET /api/health/email — diagnostic endpoint to test SMTP configuration
// Remove or protect this route after confirming email works!
export async function GET() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@clinic-system.local";

  // Check if env vars are set (show first/last chars only)
  const mask = (val?: string) =>
    val ? `${val.slice(0, 3)}***${val.slice(-3)}` : "NOT SET";

  const config = {
    SMTP_HOST: host || "NOT SET",
    SMTP_PORT: port,
    SMTP_USER: mask(user),
    SMTP_PASS: pass ? "SET (hidden)" : "NOT SET",
    SMTP_FROM: from,
  };

  if (!host || !user || !pass) {
    return NextResponse.json(
      { status: "error", message: "SMTP env vars missing", config },
      { status: 500 }
    );
  }

  // Try to connect and verify
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // Verify the connection
    await transporter.verify();

    return NextResponse.json({
      status: "ok",
      message: "SMTP connection verified successfully! Transporter is ready to send.",
      config,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        status: "error",
        message: `SMTP connection failed: ${errorMessage}`,
        config,
      },
      { status: 500 }
    );
  }
}
