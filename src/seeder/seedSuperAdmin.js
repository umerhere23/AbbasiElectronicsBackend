const bcrypt = require("bcryptjs");

const seedSuperAdmin = async (AdminModel) => {
  try {
    if (!AdminModel) {
      throw new Error("Admin model is required for seeding");
    }

    const adminName = process.env.SUPER_ADMIN_NAME || "Super Admin";
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@abbasi.com";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Umer786@";

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await AdminModel.findOne({ where: { email: adminEmail } });

    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log(`✓ Super admin updated: ${adminEmail}`);
    } else {
      await AdminModel.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
      });
      console.log(`✓ Super admin created: ${adminEmail}`);
    }

    return { success: true, email: adminEmail };
  } catch (error) {
    console.error(`✗ Super admin seeding failed: ${error.message}`);
    throw error;
  }
};

// Allow running as standalone script
if (require.main === module) {
  const dotenv = require("dotenv");
  dotenv.config();
  const { connectDB } = require("../config/db");
  const { Admin } = require("../models");

  connectDB()
    .then(() => seedSuperAdmin(Admin))
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding super admin failed:", error.message);
      process.exit(1);
    });
}

module.exports = seedSuperAdmin;
