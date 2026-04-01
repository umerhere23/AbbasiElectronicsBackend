const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const maxRetries = Number(process.env.MONGO_CONNECT_RETRIES || 5);
  const retryDelayMs = Number(process.env.MONGO_RETRY_DELAY_MS || 3000);

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment variables");
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return;
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

module.exports = connectDB;
