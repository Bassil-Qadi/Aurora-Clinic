import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { User } from "../models/User";
import Clinic from "../models/Clinic";

async function seedAdmin() {
  try {
    await connectDB();

    // ── 1. Find or create default clinic ──────────────────
    let clinic = await Clinic.findOne();
    if (!clinic) {
      clinic = await Clinic.create({
        name: "Aurora Clinic",
        slug: "aurora",
        address: "123 Medical Center Drive",
        phone: "+1 234 567 890",
        email: "info@auroraclinic.com",
        isActive: true,
      });
      console.log("✅ Default clinic created");
    } else {
      console.log("ℹ️  Clinic already exists:", clinic.name);
    }

    // ── 2. Find or create admin user ──────────────────────
    const existing = await User.findOne({ email: "admin@clinic.com" });

    if (existing) {
      if (!existing.clinicId) {
        existing.clinicId = clinic._id;
        await existing.save();
        console.log("✅ Admin user updated with clinicId");
      }
      console.log("ℹ️  Admin already exists");
    } else {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await User.create({
        name: "Clinic Admin",
        email: "admin@clinic.com",
        passwordHash: hashedPassword,
        role: "admin",
        isActive: true,
        clinicId: clinic._id,
      });
      console.log("✅ Admin user created successfully");
    }

    // ── 3. Migrate existing records without clinicId ──────
    const Patient = (await import("../models/Patient")).default;
    const Appointment = (await import("../models/Appointment")).default;
    const Visit = (await import("../models/Visit")).default;
    const Prescription = (await import("../models/Prescription")).default;
    const AuditLog = (await import("../models/AuditLog")).default;

    const migrationFilter = {
      $or: [{ clinicId: { $exists: false } }, { clinicId: null }],
    };

    const results = await Promise.all([
      User.updateMany(migrationFilter, { $set: { clinicId: clinic._id } }),
      Patient.updateMany(migrationFilter, { $set: { clinicId: clinic._id } }),
      Appointment.updateMany(migrationFilter, {
        $set: { clinicId: clinic._id },
      }),
      Visit.updateMany(migrationFilter, { $set: { clinicId: clinic._id } }),
      Prescription.updateMany(migrationFilter, {
        $set: { clinicId: clinic._id },
      }),
      AuditLog.updateMany(migrationFilter, {
        $set: { clinicId: clinic._id },
      }),
    ]);

    const totalMigrated = results.reduce(
      (sum, r) => sum + (r.modifiedCount || 0),
      0
    );

    if (totalMigrated > 0) {
      console.log(
        `✅ Migration complete — ${totalMigrated} record(s) updated with clinicId`
      );
    } else {
      console.log("ℹ️  No records needed migration");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
