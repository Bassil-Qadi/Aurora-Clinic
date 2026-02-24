import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MedicalDocument from "@/models/MedicalDocument";
import Patient from "@/models/Patient";
import { requireAuth } from "@/lib/apiAuth";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const VALID_CATEGORIES = [
  "lab_result",
  "imaging",
  "prescription",
  "referral",
  "consent",
  "insurance",
  "other",
];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();
  const { id } = await params;

  // Verify patient belongs to this clinic
  const patient = await Patient.findOne({ _id: id, clinicId: user.clinicId });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const documents = await MedicalDocument.find({
    patient: id,
    clinicId: user.clinicId,
  })
    .select("-fileData") // Don't send file data in listing
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 });

  return NextResponse.json({ documents });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["doctor", "admin", "receptionist"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();
  const { id } = await params;

  // Verify patient belongs to this clinic
  const patient = await Patient.findOne({ _id: id, clinicId: user.clinicId });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    const { fileName, mimeType, fileData, category, description, visit } = body;

    if (!fileName || !mimeType || !fileData) {
      return NextResponse.json(
        { error: "fileName, mimeType, and fileData are required." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Allowed: PDF, JPEG, PNG, WebP, GIF, DOC, DOCX.`,
        },
        { status: 400 }
      );
    }

    // Calculate file size from base64
    const base64Data = fileData.includes(",")
      ? fileData.split(",")[1]
      : fileData;
    const fileSizeBytes = Math.ceil((base64Data.length * 3) / 4);

    if (fileSizeBytes > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10 MB limit." },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: "Invalid document category." },
        { status: 400 }
      );
    }

    const uniqueFileName = `${crypto.randomUUID()}_${fileName}`;

    const doc = await MedicalDocument.create({
      clinicId: user.clinicId,
      patient: id,
      visit: visit || undefined,
      uploadedBy: user.id,
      fileName: uniqueFileName,
      originalName: fileName,
      mimeType,
      fileSize: fileSizeBytes,
      category: category || "other",
      description: description || "",
      fileData: base64Data,
    });

    // Return without the full fileData for a lighter response
    const response = doc.toObject();
    delete response.fileData;

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document." },
      { status: 500 }
    );
  }
}
