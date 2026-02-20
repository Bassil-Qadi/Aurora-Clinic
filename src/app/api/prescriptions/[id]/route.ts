import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Prescription from "@/models/Prescription";
import AuditLog from "@/models/AuditLog";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    await connectDB();
  
    const { id } = await context.params; // 👈 unwrap here
  
    const prescription = await Prescription.findById(id)
      .populate("patient")
      .populate("doctor");
  
    return NextResponse.json(prescription);
  }

  export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    await connectDB();
  
    const { id } = await context.params;
    const body = await req.json();
    const { userId, ...updateData } = body;
  
    // 1️⃣ Find existing prescription
    const existing = await Prescription.findById(id);
  
    if (!existing) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 }
      );
    }
  
    // 2️⃣ Mark current as superseded
    await Prescription.findByIdAndUpdate(id, {
      isSuperseded: true,
    });
  
    // 3️⃣ Create new version
    const newVersion = await Prescription.create({
      ...existing.toObject(),
      ...updateData,
      _id: undefined, // force new document
      version: existing.version + 1,
      previousVersion: existing._id,
      isSuperseded: false,
      updatedBy: userId,
      updatedAt: new Date(),
    });
  
    // 4️⃣ Audit log
    await AuditLog.create({
      action: "UPDATE",
      entity: "Prescription",
      entityId: newVersion._id,
      performedBy: userId,
      details: {
        previousVersion: existing._id,
        newVersion: newVersion._id,
      },
    });
  
    return NextResponse.json(newVersion);
  }
  

  export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
  ) {
    await connectDB();
    const { id } = await context.params;
    const { userId } = await req.json();
    const session = await getServerSession(authOptions);

    if (session?.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can delete prescriptions" },
        { status: 403 }
      );
    }
  
    await Prescription.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    });
  
    await AuditLog.create({
      action: "DELETE",
      entity: "Prescription",
      entityId: id,
      performedBy: userId,
    });
  
    return NextResponse.json({ success: true });
  }
  