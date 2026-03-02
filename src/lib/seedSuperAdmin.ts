import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { User } from "../models/User";

/**
 * Seed a super_admin user who has cross-clinic access to the
 * Super Admin Dashboard.
 *
 * Usage:  npx tsx src/lib/seedSuperAdmin.ts
 *
 * Environment variables:
 *   SUPER_ADMIN_EMAIL    – defaults to "superadmin@clinic-system.com"
 *   SUPER_ADMIN_PASSWORD – defaults to "superadmin123"
 *   SUPER_ADMIN_NAME     – defaults to "Super Admin"
 */
async function seedSuperAdmin() {
  try {
    await connectDB();

    const email =
      process.env.SUPER_ADMIN_EMAIL || "superadmin@clinic-system.com";
    const password = process.env.SUPER_ADMIN_PASSWORD || "superadmin123";
    const name = process.env.SUPER_ADMIN_NAME || "Super Admin";

    const existing = await User.findOne({ email });

    if (existing) {
      // If the user exists but isn't a super_admin, upgrade them
      if (existing.role !== "super_admin") {
        existing.role = "super_admin";
        existing.clinicId = undefined;
        existing.isActive = true;
        await existing.save();
        console.log(
          `✅ Existing user "${email}" upgraded to super_admin`
        );
      } else {
        console.log(`ℹ️  Super admin already exists: ${email}`);
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10);

      await User.create({
        name,
        email,
        passwordHash,
        role: "super_admin",
        isActive: true,
        // No clinicId — super admins are not tied to any clinic
      });

      console.log(`✅ Super admin created successfully`);
      console.log(`   Email:    ${email}`);
      console.log(`   Password: ${password}`);
      console.log(
        `\n⚠️  Change the default password after first login!`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding super admin:", error);
    process.exit(1);
  }
}

seedSuperAdmin();
