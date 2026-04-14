const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: "923085067642",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("StoreSetting", storeSettingSchema);
