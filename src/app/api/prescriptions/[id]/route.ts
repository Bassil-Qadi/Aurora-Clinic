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
  
    const updated = await Prescription.findByIdAndUpdate(
      id,
      {
        ...body,
        updatedAt: new Date(),
        updatedBy: body.userId, // pass from frontend
      },
      { new: true }
    );
  
    await AuditLog.create({
      action: "UPDATE",
      entity: "Prescription",
      entityId: id,
      performedBy: body.userId,
      details: body,
    });
  
    return NextResponse.json(updated);
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
  