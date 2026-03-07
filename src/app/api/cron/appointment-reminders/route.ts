import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import Clinic from "@/models/Clinic";
import User from "@/models/User";
import { sendAppointmentReminderEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";

/**
 * Cron job endpoint to send appointment reminders 24 hours before appointments
 * 
 * This endpoint should be called periodically (e.g., every hour) by:
 * - Netlify Scheduled Functions
 * - External cron services (cron-job.org, EasyCron, etc.)
 * - Or manually for testing
 * 
 * Security: Add authentication header check if needed
 * Example: Check for Authorization header with a secret token
 */
export async function GET(req: Request) {
  // Optional: Add authentication check
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Calculate the target time window (24 hours from now)
    const now = new Date();
    const targetTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Find appointments that are approximately 24 hours away (±1 hour window)
    // and haven't had reminders sent yet
    const startWindow = new Date(targetTime.getTime() - 60 * 60 * 1000); // 23 hours
    const endWindow = new Date(targetTime.getTime() + 60 * 60 * 1000); // 25 hours

    const appointments = await Appointment.find({
      date: {
        $gte: startWindow,
        $lte: endWindow,
      },
      status: "scheduled", // Only send reminders for scheduled appointments
      reminderSent24h: { $ne: true }, // Haven't sent reminder yet
    })
      .populate("patient", "firstName lastName email phone")
      .populate("doctor", "name")
      .populate("clinicId", "name phone address")
      .lean();

    if (appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No appointments need reminders at this time",
        processed: 0,
      });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        appointmentId: string;
        patientName: string;
        status: "success" | "failed" | "skipped";
        reason?: string;
      }>,
    };

    // Process each appointment
    for (const appointment of appointments) {
      const patient = appointment.patient as any;
      const doctor = appointment.doctor as any;
      const clinic = appointment.clinicId as any;

      // Skip if patient doesn't have required contact info
      if (!patient || (!patient.email && !patient.phone)) {
        results.skipped++;
        results.details.push({
          appointmentId: appointment._id.toString(),
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : "Unknown",
          status: "skipped",
          reason: "No email or phone number",
        });
        continue;
      }

      const appointmentDate = new Date(appointment.date);
      const timeStr = appointmentDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const patientName = `${patient.firstName} ${patient.lastName}`;
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard`
        : undefined;

      let emailSent = false;
      let whatsappSent = false;

      // Send email reminder
      if (patient.email) {
        try {
          await sendAppointmentReminderEmail({
            recipientName: patientName,
            recipientEmail: patient.email,
            appointmentDate,
            appointmentTime: timeStr,
            appointmentType: appointment.type || "in_person",
            doctorName: doctor?.name,
            clinicName: clinic?.name,
            clinicPhone: clinic?.phone,
            clinicAddress: clinic?.address,
            reason: appointment.reason,
            portalUrl,
          });
          emailSent = true;
        } catch (err) {
          console.error(`Failed to send email reminder for appointment ${appointment._id}:`, err);
        }
      }

      // Send WhatsApp reminder
      if (patient.phone) {
        try {
          const whatsappMessage = `Hi ${patientName},\n\nThis is a reminder that you have an appointment scheduled for tomorrow.\n\n📅 Date: ${appointmentDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\n🕐 Time: ${timeStr}\n${doctor?.name ? `👨‍⚕️ Doctor: ${doctor.name}\n` : ""}${appointment.reason ? `📋 Reason: ${appointment.reason}\n` : ""}${appointment.type === "video" ? "💻 Type: Video Consultation\n" : "🏥 Type: In-Person Appointment\n"}${clinic?.phone ? `\nIf you need to reschedule, please contact us at ${clinic.phone}.` : ""}\n\nWe look forward to seeing you!`;
          
          whatsappSent = await sendWhatsApp({
            to: patient.phone,
            message: whatsappMessage,
          });
        } catch (err) {
          console.error(`Failed to send WhatsApp reminder for appointment ${appointment._id}:`, err);
        }
      }

      // Mark reminder as sent if at least one channel succeeded
      if (emailSent || whatsappSent) {
        await Appointment.updateOne(
          { _id: appointment._id },
          {
            $set: {
              reminderSent24h: true,
              reminderSentAt24h: new Date(),
            },
          }
        );

        results.success++;
        results.details.push({
          appointmentId: appointment._id.toString(),
          patientName,
          status: "success",
          reason: `Email: ${emailSent ? "sent" : "skipped"}, WhatsApp: ${whatsappSent ? "sent" : "skipped"}`,
        });
      } else {
        results.failed++;
        results.details.push({
          appointmentId: appointment._id.toString(),
          patientName,
          status: "failed",
          reason: "Both email and WhatsApp failed or unavailable",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${appointments.length} appointments`,
      processed: appointments.length,
      results,
    });
  } catch (error: any) {
    console.error("Error processing appointment reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process reminders",
      },
      { status: 500 }
    );
  }
}

// Also support POST for external cron services
export async function POST(req: Request) {
  return GET(req);
}
