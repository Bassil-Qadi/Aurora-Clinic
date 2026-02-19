import { NextResponse } from "next/server";
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

    const existing = await Prescription.findById(id);

    await Prescription.findByIdAndUpdate(id, {
      isSuperseded: true,
    });

    const newVersion = await Prescription.create({
      ...body,
      version: existing.version + 1,
      previousVersion: existing._id,
    });
  
    await AuditLog.create({
      action: "UPDATE",
      entity: "Prescription",
      entityId: id,
      performedBy: body.userId,
      details: body,
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
  