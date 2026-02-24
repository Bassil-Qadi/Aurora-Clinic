import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MedicalDocument from "@/models/MedicalDocument";
import { requireAuth } from "@/lib/apiAuth";

// Get document with file data (for download/view)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();
  const { docId } = await params;

  const doc = await MedicalDocument.findOne({
    _id: docId,
    clinicId: user.clinicId,
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  // Return the file as a proper binary response
  const buffer = Buffer.from(doc.fileData, "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${doc.originalName}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}

// Delete document
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await requireAuth(["doctor", "admin"]);
  if (!auth.success) return auth.response;
  const { user } = auth;

  await connectDB();
  const { docId } = await params;

  const doc = await MedicalDocument.findOneAndDelete({
    _id: docId,
    clinicId: user.clinicId,
  });

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Document deleted successfully." });
}
