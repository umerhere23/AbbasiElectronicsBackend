const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const adminName = process.env.SUPER_ADMIN_NAME || "Super Admin";
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@abbasi.com";
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "Admin@123";

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      existingAdmin.name = adminName;
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log(`Super admin updated: ${adminEmail}`);
    } else {
      await Admin.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
      });
      console.log(`Super admin created: ${adminEmail}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Seeding super admin failed:", error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
