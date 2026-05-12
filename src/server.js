require("dotenv").config();

const { connectDB, sequelize } = require("./config/db");
const app = require("./app");
const seedSuperAdmin = require("./seeder/seedSuperAdmin");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    const { Admin } = require("./models");
    await seedSuperAdmin(Admin);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nShutting down gracefully...");
      await sequelize.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
