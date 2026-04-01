const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderFeedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    submittedByEmail: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const orderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    changedBy: {
      type: String,
      trim: true,
      default: "admin",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    customerAddress: {
      type: String,
      required: true,
      trim: true,
    },
    customerCity: {
      type: String,
      trim: true,
      default: "",
    },
    customerPostalCode: {
      type: String,
      trim: true,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "stripe"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["cod_pending", "paid", "failed"],
      default: "cod_pending",
    },
    stripeSessionId: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryCharge: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Order must contain at least one item",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    statusHistory: {
      type: [orderStatusHistorySchema],
      default: [],
    },
    isRestockedOnCancel: {
      type: Boolean,
      default: false,
    },
    feedbacks: {
      type: [orderFeedbackSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
