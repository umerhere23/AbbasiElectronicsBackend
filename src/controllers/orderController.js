const Stripe = require("stripe");
const nodemailer = require("nodemailer");
const Order = require("../models/Order");
const Product = require("../models/Product");
const StoreSetting = require("../models/StoreSetting");
const StripeCheckout = require("../models/StripeCheckout");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

const buildInvoiceHtml = (order) => {
  const rows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #e3e8f0;">${item.productName}</td>
        <td style="padding:8px;border:1px solid #e3e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #e3e8f0;text-align:right;">PKR ${Number(item.unitPrice || 0).toLocaleString()}</td>
        <td style="padding:8px;border:1px solid #e3e8f0;text-align:right;">PKR ${Number(item.lineTotal || 0).toLocaleString()}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#1a2b3c;max-width:760px;margin:0 auto;">
      <h2 style="margin:0 0 8px;">Abbasi Electronics - Invoice</h2>
      <p style="margin:0 0 4px;"><strong>Order ID:</strong> ${order._id}</p>
      <p style="margin:0 0 4px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      <p style="margin:0 0 4px;"><strong>Customer:</strong> ${order.customerName}</p>
      <p style="margin:0 0 14px;"><strong>Payment:</strong> ${String(order.paymentMethod || "cod").toUpperCase()}</p>

      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #e3e8f0;text-align:left;background:#f6f9fd;">Item</th>
            <th style="padding:8px;border:1px solid #e3e8f0;text-align:center;background:#f6f9fd;">Qty</th>
            <th style="padding:8px;border:1px solid #e3e8f0;text-align:right;background:#f6f9fd;">Unit Price</th>
            <th style="padding:8px;border:1px solid #e3e8f0;text-align:right;background:#f6f9fd;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top:14px;text-align:right;">
        <p style="margin:4px 0;"><strong>Subtotal:</strong> PKR ${Number(order.subTotal || 0).toLocaleString()}</p>
        <p style="margin:4px 0;"><strong>Delivery:</strong> PKR ${Number(order.deliveryCharge || 0).toLocaleString()}</p>
        <p style="margin:4px 0;font-size:18px;"><strong>Total:</strong> PKR ${Number(order.totalAmount || 0).toLocaleString()}</p>
      </div>
    </div>
  `;
};

const sendInvoiceEmail = async (order) => {
  try {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass || !from) {
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false") === "true",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: order.customerEmail,
      subject: `Invoice - Order ${order._id}`,
      html: buildInvoiceHtml(order),
    });
  } catch (error) {
    // Email is best-effort and should not block order completion.
    console.warn("Invoice email failed:", error.message);
  }
};

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

    await sendInvoiceEmail(order);

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

    await sendInvoiceEmail(order);

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

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = String(req.query.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.customerEmail || "").toLowerCase() !== email) {
      return res.status(403).json({ success: false, message: "Order email does not match" });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

const trackOrder = async (req, res, next) => {
  try {
    const orderId = String(req.query.orderId || "").trim();
    const email = String(req.query.email || "").trim().toLowerCase();

    if (!orderId || !email) {
      return res.status(400).json({ success: false, message: "Order ID and email are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.customerEmail || "").toLowerCase() !== email) {
      return res.status(403).json({ success: false, message: "Order email does not match" });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: order._id,
        customerName: order.customerName,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const submitOrderFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, rating, message } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRating = Number(rating);

    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    if (Number.isNaN(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.customerEmail || "").toLowerCase() !== normalizedEmail) {
      return res.status(403).json({ success: false, message: "Order email does not match" });
    }

    order.feedbacks.push({
      submittedByEmail: normalizedEmail,
      rating: normalizedRating,
      message: String(message || "").trim(),
    });

    await order.save();

    return res.status(201).json({ success: true, message: "Feedback submitted successfully" });
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
  getOrderById,
  trackOrder,
  submitOrderFeedback,
};
