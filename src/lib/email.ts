import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Transport — configure via SMTP env vars.
// Falls back to a "no-op" transport that logs to console in dev.
// ---------------------------------------------------------------------------
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Dev fallback — logs to console instead of sending
  console.warn(
    "⚠️  SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS). " +
      "Emails will be logged to the console."
  );
  return null;
}

const FROM_ADDRESS =
  process.env.SMTP_FROM || "noreply@clinic-system.local";

// ---------------------------------------------------------------------------
// Low-level send helper
// ---------------------------------------------------------------------------
export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev mode: log email to console
    console.log("\n📧 ─── Email (dev) ─────────────────────────────────");
    console.log(`  To:      ${opts.to}`);
    console.log(`  Subject: ${opts.subject}`);
    console.log(`  Body:    ${opts.text || "(HTML only)"}`);
    console.log("────────────────────────────────────────────────────\n");
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    console.log(`✅ Email sent to ${opts.to} — messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send email to ${opts.to}:`, err);
    throw err; // Re-throw so callers can handle/log the real error
  }
}

// ---------------------------------------------------------------------------
// Shared HTML wrapper
// ---------------------------------------------------------------------------
function wrapHtml(title: string, body: string, clinicName?: string): string {
  const clinic = clinicName || "Clinic System";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">${clinic}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${clinic}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template: Password Reset
// ---------------------------------------------------------------------------
export interface PasswordResetEmailData {
  recipientName: string;
  recipientEmail: string;
  resetUrl: string;
  clinicName?: string;
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData) {
  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Password Reset</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#334155;">Hi ${data.recipientName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">
      We received a request to reset your password. Click the button below to set a new password.
      This link expires in <strong>1 hour</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#0ea5e9;border-radius:8px;">
          <a href="${data.resetUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">If you didn't request this, you can safely ignore this email.</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;word-break:break-all;">
      Or copy this link: ${data.resetUrl}
    </p>`;

  return sendMail({
    to: data.recipientEmail,
    subject: "Reset Your Password",
    html: wrapHtml("Password Reset", body, data.clinicName),
    text: `Hi ${data.recipientName},\n\nReset your password using this link (expires in 1 hour):\n${data.resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}

// ---------------------------------------------------------------------------
// Template: Appointment Confirmation
// ---------------------------------------------------------------------------
export interface AppointmentConfirmEmailData {
  patientName: string;
  patientEmail: string;
  appointmentDate: string; // pre-formatted
  appointmentTime: string; // pre-formatted
  doctorName?: string;
  reason?: string;
  clinicName?: string;
}

export async function sendAppointmentConfirmationEmail(
  data: AppointmentConfirmEmailData
) {
  const doctorRow = data.doctorName
    ? `<tr>
        <td style="padding:8px 12px;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">Doctor</td>
        <td style="padding:8px 12px;font-size:14px;color:#0f172a;border-bottom:1px solid #f1f5f9;">Dr. ${data.doctorName}</td>
      </tr>`
    : "";

  const reasonRow = data.reason
    ? `<tr>
        <td style="padding:8px 12px;font-size:14px;color:#64748b;">Reason</td>
        <td style="padding:8px 12px;font-size:14px;color:#0f172a;">${data.reason}</td>
      </tr>`
    : "";

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Appointment Confirmed</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#334155;">Hi ${data.patientName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">
      Your appointment has been scheduled. Here are the details:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">Date</td>
        <td style="padding:8px 12px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${data.appointmentDate}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:14px;color:#64748b;border-bottom:1px solid #f1f5f9;">Time</td>
        <td style="padding:8px 12px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #f1f5f9;">${data.appointmentTime}</td>
      </tr>
      ${doctorRow}
      ${reasonRow}
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;">
      If you need to cancel or reschedule, please contact the clinic or use the patient portal.
    </p>`;

  return sendMail({
    to: data.patientEmail,
    subject: `Appointment Confirmed — ${data.appointmentDate} at ${data.appointmentTime}`,
    html: wrapHtml("Appointment Confirmed", body, data.clinicName),
    text: `Hi ${data.patientName},\n\nYour appointment is confirmed.\n\nDate: ${data.appointmentDate}\nTime: ${data.appointmentTime}${data.doctorName ? `\nDoctor: Dr. ${data.doctorName}` : ""}${data.reason ? `\nReason: ${data.reason}` : ""}\n\nIf you need to reschedule, contact the clinic.`,
  });
}

// ---------------------------------------------------------------------------
// Template: Appointment Status Change
// ---------------------------------------------------------------------------
export interface AppointmentStatusEmailData {
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  previousStatus: string;
  newStatus: string;
  clinicName?: string;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  waiting: "Waiting",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#6b7280",
  waiting: "#ca8a04",
  in_progress: "#2563eb",
  completed: "#16a34a",
  cancelled: "#dc2626",
  no_show: "#ea580c",
};

export async function sendAppointmentStatusEmail(
  data: AppointmentStatusEmailData
) {
  const label = STATUS_LABELS[data.newStatus] || data.newStatus;
  const color = STATUS_COLORS[data.newStatus] || "#6b7280";

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Appointment Update</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#334155;">Hi ${data.patientName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">
      Your appointment on <strong>${data.appointmentDate}</strong> at <strong>${data.appointmentTime}</strong> has been updated.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="padding:10px 20px;background:${color};color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;">
          Status: ${label}
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;">
      If you have any questions, please contact the clinic.
    </p>`;

  return sendMail({
    to: data.patientEmail,
    subject: `Appointment ${label} — ${data.appointmentDate}`,
    html: wrapHtml("Appointment Update", body, data.clinicName),
    text: `Hi ${data.patientName},\n\nYour appointment on ${data.appointmentDate} at ${data.appointmentTime} status is now: ${label}.\n\nContact the clinic if you have questions.`,
  });
}

// ---------------------------------------------------------------------------
// Template: Welcome / Account Created
// ---------------------------------------------------------------------------
export interface WelcomeEmailData {
  recipientName: string;
  recipientEmail: string;
  loginUrl: string;
  clinicName?: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Welcome!</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#334155;">Hi ${data.recipientName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">
      Your account has been created successfully. You can now log in to access your dashboard.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#0ea5e9;border-radius:8px;">
          <a href="${data.loginUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
            Log In
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:#64748b;">
      If you didn't create this account, please contact the clinic.
    </p>`;

  return sendMail({
    to: data.recipientEmail,
    subject: "Welcome — Your Account Is Ready",
    html: wrapHtml("Welcome", body, data.clinicName),
    text: `Hi ${data.recipientName},\n\nYour account has been created. Log in here: ${data.loginUrl}\n\nIf you didn't create this account, contact the clinic.`,
  });
}

// ---------------------------------------------------------------------------
// Template: Appointment Reminder (24 hours)
// ---------------------------------------------------------------------------
export interface AppointmentReminderEmailData {
  recipientName: string;
  recipientEmail: string;
  appointmentDate: Date;
  appointmentTime: string;
  appointmentType: "in_person" | "video";
  doctorName?: string;
  clinicName?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  reason?: string;
  portalUrl?: string;
}

export async function sendAppointmentReminderEmail(data: AppointmentReminderEmailData) {
  const dateStr = data.appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const appointmentTypeLabel = data.appointmentType === "video" ? "Video Consultation" : "In-Person Appointment";
  const locationInfo = data.appointmentType === "video" 
    ? `<p style="margin:0 0 16px;font-size:15px;color:#334155;"><strong>Type:</strong> Video Consultation</p>
       <p style="margin:0 0 16px;font-size:15px;color:#334155;">You'll receive a link to join the video call before your appointment.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#334155;"><strong>Location:</strong> ${data.clinicAddress || "Clinic"}</p>`;

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Appointment Reminder</h2>
    <p style="margin:0 0 8px;font-size:15px;color:#334155;">Hi ${data.recipientName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;">
      This is a friendly reminder that you have an appointment scheduled for tomorrow.
    </p>
    
    <div style="background:#f8fafc;border-left:4px solid #0ea5e9;padding:20px;margin:0 0 24px;border-radius:8px;">
      <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;">Appointment Details</p>
      <p style="margin:0 0 8px;font-size:15px;color:#334155;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:0 0 8px;font-size:15px;color:#334155;"><strong>Time:</strong> ${data.appointmentTime}</p>
      ${data.doctorName ? `<p style="margin:0 0 8px;font-size:15px;color:#334155;"><strong>Doctor:</strong> ${data.doctorName}</p>` : ""}
      ${data.reason ? `<p style="margin:0 0 8px;font-size:15px;color:#334155;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
      ${locationInfo}
    </div>

    ${data.clinicPhone ? `<p style="margin:0 0 16px;font-size:15px;color:#334155;">If you need to reschedule or have any questions, please contact us at <strong>${data.clinicPhone}</strong>.</p>` : ""}
    
    ${data.portalUrl ? `
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background:#0ea5e9;border-radius:8px;">
          <a href="${data.portalUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
            View Appointment
          </a>
        </td>
      </tr>
    </table>
    ` : ""}
    
    <p style="margin:0;font-size:13px;color:#64748b;">
      We look forward to seeing you!
    </p>`;

  const textBody = `Hi ${data.recipientName},\n\nThis is a reminder that you have an appointment scheduled for tomorrow.\n\nAppointment Details:\nDate: ${dateStr}\nTime: ${data.appointmentTime}\n${data.doctorName ? `Doctor: ${data.doctorName}\n` : ""}${data.reason ? `Reason: ${data.reason}\n` : ""}Type: ${appointmentTypeLabel}\n${data.appointmentType === "in_person" && data.clinicAddress ? `Location: ${data.clinicAddress}\n` : ""}\n${data.clinicPhone ? `If you need to reschedule, please contact us at ${data.clinicPhone}.\n\n` : ""}We look forward to seeing you!`;

  return sendMail({
    to: data.recipientEmail,
    subject: `Appointment Reminder — ${dateStr} at ${data.appointmentTime}`,
    html: wrapHtml("Appointment Reminder", body, data.clinicName),
    text: textBody,
  });
}