import "dotenv/config";
import bcrypt from "bcrypt";
import { connectDB } from "./db";
import { User } from "../models/User";

async function seedAdmin() {
  try {
    await connectDB();

    const existing = await User.findOne({
      email: "admin@clinic.com",
    });

    if (existing) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    await User.create({
      name: "Clinic Admin",
      email: "admin@clinic.com",
      passwordHash: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("✅ Admin user created successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();
