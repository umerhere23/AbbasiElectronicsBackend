const Stripe = require("stripe");
const Order = require("../models/Order");
const Product = require("../models/Product");
const StoreSetting = require("../models/StoreSetting");
const StripeCheckout = require("../models/StripeCheckout");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const normalizeOrderInput = (payload) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerCity,
    customerPostalCode,
    paymentMethod,
    note,
    items,
  } = payload;

  return {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerCity,
    customerPostalCode,
    paymentMethod,
    note,
    items,
  };
};

const validateOrderInput = ({ customerName, customerEmail, customerPhone, customerAddress, items }) => {
  if (!customerName || !customerEmail || !customerPhone || !customerAddress) {
    return "Customer name, email, phone, and address are required";
  }

  if (!Array.isArray(items) || items.length === 0) {
    return "Order items are required";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(customerEmail)) {
    return "Please provide a valid email address";
  }

  return "";
};

const prepareOrderItems = async (items) => {
  const productIds = items.map((item) => item.productId);
  const productDocs = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(productDocs.map((product) => [String(product._id), product]));

  const normalizedItems = [];
  let subTotal = 0;

  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    if (Number.isNaN(quantity) || quantity < 1) {
      throw new Error("Quantity must be at least 1 for each item");
    }

    const product = productMap.get(String(item.productId));
    if (!product) {
      throw new Error("One or more selected products are invalid");
    }

    if (!product.inStock || Number(product.stockCount || 0) < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    const unitPrice = product.onSale ? Number(product.salePrice || product.price) : Number(product.price);
    const lineTotal = Number((unitPrice * quantity).toFixed(2));

    normalizedItems.push({
      product: product._id,
      productName: product.name,
      quantity,
      unitPrice,
      lineTotal,
      _productDoc: product,
    });

    subTotal += lineTotal;
  }

  return {
    normalizedItems,
    subTotal: Number(subTotal.toFixed(2)),
  };
};

const applyInventoryAndCreateOrder = async ({
  customerName,
  customerEmail,
  customerPhone,
  customerAddress,
  customerCity,
  customerPostalCode,
  note,
  paymentMethod,
  paymentStatus,
  stripeSessionId,
  normalizedItems,
  deliveryCharge,
}) => {
  const orderItems = normalizedItems.map(({ _productDoc, ...keep }) => keep);
  const subTotal = Number(
    orderItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0).toFixed(2)
  );
  const totalAmount = Number((subTotal + Number(deliveryCharge || 0)).toFixed(2));

  const order = await Order.create({
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerCity,
    customerPostalCode,
    paymentMethod,
    paymentStatus,
    stripeSessionId: stripeSessionId || "",
    note,
    subTotal,
    deliveryCharge: Number(deliveryCharge || 0),
    items: orderItems,
    totalAmount,
  });

  for (const item of normalizedItems) {
    const product = item._productDoc;
    const previousStock = Number(product.stockCount || 0);
    product.stockCount = Math.max(0, previousStock - item.quantity);
    product.soldCount = Number(product.soldCount || 0) + item.quantity;
    product.inStock = product.stockCount > 0;
    await product.save();

    await recordInventoryLog({
      productId: product._id,
      type: paymentMethod === "stripe" ? "order" : "order",
      quantityChange: -item.quantity,
      previousStock,
      newStock: product.stockCount,
      note: paymentMethod === "stripe" ? "Paid Stripe order" : "COD order",
      referenceType: "order",
      referenceId: String(order._id),
      performedBy: null,
    });
  }

  return order;
};

const createOrder = async (req, res, next) => {
  try {
    const data = normalizeOrderInput(req.body);
    const validationMessage = validateOrderInput(data);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    if (data.paymentMethod && data.paymentMethod !== "cod") {
      return res.status(400).json({
        success: false,
        message: "Use Stripe option for online payment",
      });
    }

    const { normalizedItems } = await prepareOrderItems(data.items);
    const settings = await StoreSetting.findOne({ key: "default" });
    const deliveryCharge = Number(settings?.deliveryCharge || 0);

    const order = await applyInventoryAndCreateOrder({
      ...data,
      paymentMethod: "cod",
      paymentStatus: "cod_pending",
      normalizedItems,
      deliveryCharge,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

const createStripeSession = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured. Add STRIPE_SECRET_KEY in backend .env",
      });
    }

    const data = normalizeOrderInput(req.body);
    const validationMessage = validateOrderInput(data);
    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const { normalizedItems, subTotal } = await prepareOrderItems(data.items);
    const settings = await StoreSetting.findOne({ key: "default" });
    const deliveryCharge = Number(settings?.deliveryCharge || 0);

    const origin = req.body.clientBaseUrl || process.env.FRONTEND_URL || "http://localhost:5173";

    const lineItems = normalizedItems.map((item) => ({
      price_data: {
        currency: "pkr",
        product_data: {
          name: item.productName,
        },
        unit_amount: Math.round(Number(item.unitPrice || 0) * 100),
      },
      quantity: item.quantity,
    }));

    if (deliveryCharge > 0) {
      lineItems.push({
        price_data: {
          currency: "pkr",
          product_data: {
            name: "Delivery Charges",
          },
          unit_amount: Math.round(deliveryCharge * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${origin}/cart?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?stripe=cancel`,
      customer_email: data.customerEmail,
      metadata: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
      },
    });

    await StripeCheckout.create({
      sessionId: session.id,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerCity: data.customerCity,
      customerPostalCode: data.customerPostalCode,
      note: data.note,
      items: normalizedItems.map((item) => ({
        productId: item.product,
        quantity: item.quantity,
      })),
    });

    return res.status(200).json({
      success: true,
      data: {
        url: session.url,
        sessionId: session.id,
        subTotal,
        deliveryCharge,
        totalAmount: Number((subTotal + deliveryCharge).toFixed(2)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const confirmStripeOrder = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: "Stripe is not configured" });
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required" });
    }

    const pending = await StripeCheckout.findOne({ sessionId });
    if (!pending) {
      return res.status(404).json({ success: false, message: "Stripe checkout session not found" });
    }

    if (pending.processed && pending.orderId) {
      const existingOrder = await Order.findById(pending.orderId);
      return res.status(200).json({ success: true, data: existingOrder });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment is not completed for this Stripe session",
      });
    }

    const { normalizedItems } = await prepareOrderItems(
      pending.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    const settings = await StoreSetting.findOne({ key: "default" });
    const deliveryCharge = Number(settings?.deliveryCharge || 0);

    const order = await applyInventoryAndCreateOrder({
      customerName: pending.customerName,
      customerEmail: pending.customerEmail,
      customerPhone: pending.customerPhone,
      customerAddress: pending.customerAddress,
      customerCity: pending.customerCity,
      customerPostalCode: pending.customerPostalCode,
      note: pending.note,
      paymentMethod: "stripe",
      paymentStatus: "paid",
      stripeSessionId: sessionId,
      normalizedItems,
      deliveryCharge,
    });

    pending.processed = true;
    pending.orderId = order._id;
    await pending.save();

    return res.status(200).json({
      success: true,
      message: "Stripe order confirmed successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  createStripeSession,
  confirmStripeOrder,
  getOrders,
  updateOrderStatus,
};
