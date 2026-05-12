const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

const connectDB = async () => {
  const maxRetries = Number(process.env.DB_CONNECT_RETRIES || 5);
  const retryDelayMs = Number(process.env.DB_RETRY_DELAY_MS || 3000);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in environment variables");
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log("PostgreSQL Database connection successful");
      
      // Import all models (this defines them with sequelize)
      require("../models");
      
      // Auto-sync tables (creates tables if they don't exist, alter: true updates them)
      await sequelize.sync({ alter: true });
      console.log("Database tables synchronized successfully");
      return sequelize;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.error(
        `Database connection failed (attempt ${attempt}/${maxRetries}):`,
        error.message
      );

      if (isLastAttempt) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, retryDelayMs);
      });
    }
  }
};

module.exports = { connectDB, sequelize };
