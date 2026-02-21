// src/app/api/visits/[id]/summary/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Prescription from "@/models/Prescription";
import { openaiClient } from "@/lib/openai";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    await connectDB();

    const visit = await Visit.findById(id)
      .populate({
        path: "patient",
        select: "firstName lastName dateOfBirth gender"
      })
      .populate("doctor", "name");

    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Query prescriptions separately since Visit.prescription is a String, not a reference
    const prescriptions = await Prescription.find({
      visit: id,
      isDeleted: { $ne: true },
    }).populate("doctor");

    let generatedSummary: string | undefined;

    // Only call OpenAI if no cached summary or force=true
    if (!visit.aiSummary || force) {
      // Handle Mongoose populated documents - convert to plain object if needed
      const patient = visit.patient ? (visit.patient as any).toObject ? (visit.patient as any).toObject() : visit.patient : {};
      const doctor = visit.doctor || {};
      
      // Debug: Log patient data to check dateOfBirth
      console.log("Patient data:", {
        patientId: patient._id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        dateOfBirthType: typeof patient.dateOfBirth,
        dateOfBirthValue: patient.dateOfBirth,
        dateOfBirthString: patient.dateOfBirth?.toString(),
        dateOfBirthISO: patient.dateOfBirth instanceof Date ? patient.dateOfBirth.toISOString() : null,
        patientKeys: patient ? Object.keys(patient) : "patient is null/undefined",
        rawPatient: JSON.stringify(patient, null, 2)
      });
      
      // Calculate age from dateOfBirth
      const calculateAge = (dateOfBirth: Date | string | undefined): string => {
        if (!dateOfBirth) {
          return "N/A";
        }
        
        try {
          // Convert to Date object - handle Mongoose dates, ISO strings, etc.
          let birthDate: Date;
          
          if (dateOfBirth instanceof Date) {
            birthDate = dateOfBirth;
          } else if (typeof dateOfBirth === 'string') {
            // Handle ISO strings and date strings
            birthDate = new Date(dateOfBirth);
          } else if (typeof dateOfBirth === 'object' && (dateOfBirth as any).toISOString) {
            // Handle Mongoose date objects
            birthDate = new Date((dateOfBirth as any).toISOString());
          } else {
            birthDate = new Date(dateOfBirth as any);
          }
          
          // Validate the date
          if (isNaN(birthDate.getTime())) {
            console.warn("Invalid dateOfBirth:", dateOfBirth);
            return "N/A";
          }
          
          // Get today's date (normalized to midnight for accurate comparison)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Normalize birth date to midnight
          const normalizedBirthDate = new Date(birthDate);
          normalizedBirthDate.setHours(0, 0, 0, 0);
          
          // Calculate age
          let age = today.getFullYear() - normalizedBirthDate.getFullYear();
          
          // Create a date for this year's birthday
          const thisYearBirthday = new Date(today.getFullYear(), normalizedBirthDate.getMonth(), normalizedBirthDate.getDate());
          
          // If birthday hasn't occurred this year, subtract 1
          if (today < thisYearBirthday) {
            age--;
          }
          
          // Log for debugging
          console.log("Age calculation:", {
            dateOfBirth,
            birthDate: normalizedBirthDate.toISOString(),
            today: today.toISOString(),
            thisYearBirthday: thisYearBirthday.toISOString(),
            calculatedAge: age
          });
          
          return age >= 0 ? age.toString() : "N/A";
        } catch (error) {
          console.error("Error calculating age:", error, "dateOfBirth:", dateOfBirth);
          return "N/A";
        }
      };

      const patientName = patient.firstName && patient.lastName
        ? `${patient.firstName} ${patient.lastName}`
        : "N/A";

      const prescriptionText = prescriptions.length > 0
        ? prescriptions
            .map((prescription: any) => {
              if (prescription.medications && prescription.medications.length > 0) {
                return prescription.medications
                  .map((med: any) => 
                    `${med.name || "N/A"} - ${med.dosage || "N/A"} - ${med.frequency || "N/A"} - ${med.duration || "N/A"}`
                  )
                  .join("\n");
              }
              return prescription.notes || "No medications specified";
            })
            .join("\n\n")
        : visit.prescription || "None";

      // Generate a basic fallback summary
      const generateFallbackSummary = (): string => {
        const visitDate = visit.createdAt 
          ? new Date(visit.createdAt).toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })
          : "N/A";
        
        const followUpText = visit.followUpDate
          ? new Date(visit.followUpDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })
          : "None scheduled";

        return `Patient Visit Summary

Patient: ${patientName} (Age: ${calculateAge(patient.dateOfBirth)}, ${patient.gender || "N/A"})
Visit Date: ${visitDate}
Diagnosis: ${visit.diagnosis || "N/A"}

Clinical Notes:
${visit.notes || "No additional notes provided."}

Prescriptions:
${prescriptionText}

Follow-up: ${followUpText}

---
Note: This is an automatically generated summary. For AI-enhanced summaries, please ensure OpenAI API quota is available.`;
      };

      const prompt = `
Summarize this patient visit clearly and professionally.

Patient Info:
- Name: ${patientName}
- Age: ${calculateAge(patient.dateOfBirth)}
- Gender: ${patient.gender || "N/A"}

Visit Date: ${visit.createdAt?.toISOString() || "N/A"}
Diagnosis: ${visit.diagnosis || "N/A"}

Notes:
${visit.notes || "No notes provided"}

Prescriptions:
${prescriptionText}

Next Steps / Follow-up:
${visit.followUpDate ? `Follow-up scheduled for: ${visit.followUpDate.toISOString()}` : "None"}
`;

      // Helper function to update only the aiSummary field to avoid validation issues with populated fields
      const updateSummary = async (summary: string) => {
        await Visit.findByIdAndUpdate(id, { aiSummary: summary }, { runValidators: false });
        return summary;
      };

      // Check if API key is configured
      if (!process.env.OPENAI_API_KEY) {
        // Generate fallback summary if no API key
        const summary = generateFallbackSummary();
        await updateSummary(summary);
        return NextResponse.json({ 
          summary: summary,
          warning: "OpenAI API key not configured. Generated basic summary." 
        });
      }

      try {
        const completion = await openaiClient.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        });

        generatedSummary = completion.choices[0].message?.content || "No summary generated";
        await updateSummary(generatedSummary);
      } catch (error: any) {
        console.error("OpenAI API error:", {
          code: error.code,
          status: error.status,
          message: error.message,
          type: error.type,
        });

        // If quota exceeded or other OpenAI errors, generate fallback summary
        if (error.code === "insufficient_quota" || 
            (error.status === 429 && (error.message?.includes("quota") || error.message?.includes("billing")))) {
          console.warn("OpenAI quota exceeded. Generating fallback summary.");
          const summary = generateFallbackSummary();
          await updateSummary(summary);
          return NextResponse.json({ 
            summary: summary,
            warning: "OpenAI quota exceeded. Generated basic summary. Please add billing to your OpenAI account for AI-enhanced summaries." 
          });
        }
        
        if (error.status === 429) {
          // Rate limit - wait and retry or use fallback
          console.warn("OpenAI rate limit exceeded. Generating fallback summary.");
          const summary = generateFallbackSummary();
          await updateSummary(summary);
          return NextResponse.json({ 
            summary: summary,
            warning: "OpenAI rate limit exceeded. Generated basic summary. Please try again later for AI-enhanced summaries." 
          });
        }

        if (error.status === 401 || error.code === "invalid_api_key") {
          // Invalid API key - use fallback
          console.warn("OpenAI API key invalid. Generating fallback summary.");
          const summary = generateFallbackSummary();
          await updateSummary(summary);
          return NextResponse.json({ 
            summary: summary,
            warning: "OpenAI API key is invalid. Generated basic summary. Please check your OPENAI_API_KEY environment variable." 
          });
        }

        // For other errors, use fallback but log the error
        console.warn("OpenAI API error. Generating fallback summary:", error.message);
        const summary = generateFallbackSummary();
        await updateSummary(summary);
        return NextResponse.json({ 
          summary: summary,
          warning: "Failed to generate AI summary. Generated basic summary instead." 
        });
      }
    }

    // If we generated a summary, use it; otherwise use cached one
    const summaryToReturn = generatedSummary || visit.aiSummary;
    return NextResponse.json({ summary: summaryToReturn });
  } catch (err: any) {
    console.error("Error generating visit summary:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}