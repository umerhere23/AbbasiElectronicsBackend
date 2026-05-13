const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const {
  Order,
  OrderItem,
  OrderFeedback,
  Product,
  ProductFeedback,
  StoreSetting,
} = require("../models");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const isUUID = (value) =>
  typeof value === "string" &&
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

const buildInvoiceHtml = (order) => {
  const statusLabel = String(order.status || "pending").toUpperCase();
  const paymentLabel = String(order.paymentMethod || "cod").toUpperCase();
  const statusColor =
    order.status === "delivered"
      ? "#1f6b3f"
      : order.status === "cancelled"
        ? "#8f2c20"
        : "#1b4e7d";

  const rows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:10px;border:1px solid #dbe5f1;">${item.productName}</td>
        <td style="padding:10px;border:1px solid #dbe5f1;text-align:center;">${item.quantity}</td>
        <td style="padding:10px;border:1px solid #dbe5f1;text-align:right;">PKR ${Number(item.unitPrice || 0).toLocaleString()}</td>
        <td style="padding:10px;border:1px solid #dbe5f1;text-align:right;">PKR ${Number(item.lineTotal || 0).toLocaleString()}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#142230;max-width:760px;margin:0 auto;background:#f5f7fb;padding:16px;">
      <div style="background:#24338f;color:#ffffff;border-radius:12px 12px 0 0;padding:14px 16px;">
        <h2 style="margin:0;font-size:21px;line-height:1.2;">Abbasi Electronics</h2>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.95;">Order Invoice</p>
      </div>

      <div style="background:#ffffff;border:1px solid #d9e4f2;border-top:0;border-radius:0 0 12px 12px;padding:16px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;">
          <div>
            <p style="margin:0 0 4px;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin:0 0 4px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p style="margin:0;"><strong>Customer:</strong> ${order.customerName}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 6px;"><strong>Payment:</strong> ${paymentLabel}</p>
            <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#eef5ff;border:1px solid #cadcf2;color:${statusColor};font-weight:700;font-size:12px;">${statusLabel}</span>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
          <thead>
            <tr>
              <th style="padding:10px;border:1px solid #dbe5f1;text-align:left;background:#eef5fd;color:#133b59;">Item</th>
              <th style="padding:10px;border:1px solid #dbe5f1;text-align:center;background:#eef5fd;color:#133b59;">Qty</th>
              <th style="padding:10px;border:1px solid #dbe5f1;text-align:right;background:#eef5fd;color:#133b59;">Unit Price</th>
              <th style="padding:10px;border:1px solid #dbe5f1;text-align:right;background:#eef5fd;color:#133b59;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top:14px;margin-left:auto;max-width:280px;border:1px solid #d9e4f2;background:#f8fbff;border-radius:10px;padding:10px;">
          <p style="margin:4px 0;display:flex;justify-content:space-between;">
            <span>Subtotal</span>
            <strong>PKR ${Number(order.subTotal || 0).toLocaleString()}</strong>
          </p>
          <p style="margin:4px 0;display:flex;justify-content:space-between;">
            <span>Delivery</span>
            <strong>PKR ${Number(order.deliveryCharge || 0).toLocaleString()}</strong>
          </p>
          <p style="margin:8px 0 0;padding-top:8px;border-top:1px dashed #c8d8ea;display:flex;justify-content:space-between;font-size:17px;color:#0f3d5f;">
            <span><strong>Total</strong></span>
            <strong>PKR ${Number(order.totalAmount || 0).toLocaleString()}</strong>
          </p>
        </div>

        <div style="margin-top:14px;padding-top:10px;border-top:1px solid #e3ebf5;color:#4c6178;font-size:13px;">
          Thank you for shopping with Abbasi Electronics.
        </div>
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
      subject: `Invoice - Order ${order.id}`,
      html: buildInvoiceHtml(order),
    });
  } catch (error) {
    // Email is best-effort and should not block order completion.
    console.warn("Invoice email failed:", error.message);
  }
};

const buildStatusUpdateHtml = (order, note = "") => {
  const safeNote = String(note || "").trim();
  const statusLabel = String(order.status || "pending").toUpperCase();
  const statusColor =
    order.status === "delivered"
      ? "#1f6b3f"
      : order.status === "cancelled"
        ? "#8f2c20"
        : "#1b4e7d";
  const trackUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/track-order`;

  return `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#142230;max-width:760px;margin:0 auto;background:#f5f7fb;padding:16px;">
      <div style="background:#24338f;color:#ffffff;border-radius:12px 12px 0 0;padding:14px 16px;">
        <h2 style="margin:0;font-size:21px;line-height:1.2;">Abbasi Electronics</h2>
        <p style="margin:6px 0 0;font-size:13px;opacity:0.95;">Order Status Update</p>
      </div>

      <div style="background:#ffffff;border:1px solid #d9e4f2;border-top:0;border-radius:0 0 12px 12px;padding:16px;">
        <p style="margin:0 0 6px;"><strong>Order ID:</strong> ${order.id}</p>
        <p style="margin:0 0 6px;"><strong>Customer:</strong> ${order.customerName}</p>
        <p style="margin:0 0 10px;"><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>

        <div style="margin:0 0 12px;">
          <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:#eef5ff;border:1px solid #cadcf2;color:${statusColor};font-weight:700;font-size:12px;letter-spacing:0.02em;">${statusLabel}</span>
        </div>

        ${safeNote ? `<p style="margin:0 0 12px;"><strong>Admin Note:</strong> ${safeNote}</p>` : ""}

        <a href="${trackUrl}" style="display:inline-block;background:#d07a2f;color:#ffffff;text-decoration:none;border-radius:999px;padding:9px 16px;font-weight:700;font-size:13px;">Track Your Order</a>

        <p style="margin:12px 0 0;color:#4c6178;font-size:13px;">Use your order ID and email on the track page to view latest updates.</p>
      </div>
    </div>
  `;
};

const sendOrderStatusEmail = async (order, note = "") => {
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
      subject: `Order Update - ${String(order.status || "pending").toUpperCase()} (${order.id})`,
      html: buildStatusUpdateHtml(order, note),
    });
  } catch (error) {
    // Email is best-effort and should not block admin actions.
    console.warn("Order status email failed:", error.message);
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
  const productDocs = await Product.findAll({ where: { id: { [Op.in]: productIds } } });
  const productMap = new Map(productDocs.map((product) => [String(product.id), product]));

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
      product: product.id,
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
    note,
    subTotal,
    deliveryCharge: Number(deliveryCharge || 0),
    items: orderItems,
    totalAmount,
    statusHistory: [
      {
        status: "pending",
        note: "Order placed",
        changedBy: "system",
      },
    ],
  });

  await OrderItem.bulkCreate(
    normalizedItems.map((item) => ({
      orderId: order.id,
      productId: item._productDoc.id,
      productName: item._productDoc.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    }))
  );

  for (const item of normalizedItems) {
    const product = item._productDoc;
    const previousStock = Number(product.stockCount || 0);
    product.stockCount = Math.max(0, previousStock - item.quantity);
    product.soldCount = Number(product.soldCount || 0) + item.quantity;
    product.inStock = product.stockCount > 0;
    await product.save();

    await recordInventoryLog({
      productId: product.id,
      type: paymentMethod === "stripe" ? "order" : "order",
      quantityChange: -item.quantity,
      previousStock,
      newStock: product.stockCount,
      note: paymentMethod === "stripe" ? "Paid Stripe order" : "COD order",
      referenceType: "order",
      referenceId: String(order.id),
      performedBy: null,
    });
  }

  return Order.findByPk(order.id, {
    include: [
      {
        model: OrderItem,
        as: "items",
        include: [{ model: Product, attributes: ["id", "name", "category"] }],
      },
      { model: OrderFeedback, as: "feedbacks" },
    ],
  });
};

const restockOrderInventory = async (order, performedByAdminId = null) => {
  const orderItems = await OrderItem.findAll({ where: { orderId: order.id } });

  for (const item of orderItems) {
    const product = await Product.findByPk(item.productId || item.product);
    if (!product) {
      continue;
    }

    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) {
      continue;
    }

    const previousStock = Number(product.stockCount || 0);
    product.stockCount = previousStock + quantity;
    product.soldCount = Math.max(0, Number(product.soldCount || 0) - quantity);
    product.inStock = product.stockCount > 0;
    await product.save();

    await recordInventoryLog({
      productId: product.id,
      type: "adjustment",
      quantityChange: quantity,
      previousStock,
      newStock: product.stockCount,
      note: `Restocked due to order cancellation (${order.id})`,
      referenceType: "order",
      referenceId: String(order.id),
      performedBy: performedByAdminId,
    });
  }
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
        message: "Only cash on delivery is supported",
      });
    }

    const { normalizedItems } = await prepareOrderItems(data.items);
    const settings = await StoreSetting.findOne({ where: { key: "default" } });
    
    // Calculate delivery charge based on product sizes
    let deliveryCharge = 0;
    const hasSmall = normalizedItems.some(item => item._productDoc?.size === "small");
    const hasBig = normalizedItems.some(item => item._productDoc?.size === "big");
    
    if (hasSmall && hasBig) {
      // Mixed sizes - add both charges
      deliveryCharge = Number(settings?.smallDeliveryCharge || 0) + Number(settings?.bigDeliveryCharge || 0);
    } else if (hasSmall) {
      deliveryCharge = Number(settings?.smallDeliveryCharge || 0);
    } else if (hasBig) {
      deliveryCharge = Number(settings?.bigDeliveryCharge || 0);
    }

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

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, attributes: ["id", "name", "category"] }],
        },
        { model: OrderFeedback, as: "feedbacks" },
      ],
      order: [["createdAt", "DESC"]],
    });
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
    const { status, note } = req.body;
    const normalizedNote = String(note || "").trim();

    const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, attributes: ["id", "name", "category"] }],
        },
        { model: OrderFeedback, as: "feedbacks" },
      ],
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const previousStatus = order.status;

    if (status === "cancelled" && !order.isRestockedOnCancel) {
      await restockOrderInventory(order, req.admin?.id || req.admin?._id || null);
      order.isRestockedOnCancel = true;
    }

    order.status = status;
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({
      status,
      note: normalizedNote,
      changedBy: req.admin?.name || req.admin?.email || "admin",
      changedAt: new Date(),
    });

    await order.save();

    if (previousStatus !== status || normalizedNote) {
      await sendOrderStatusEmail(order, normalizedNote);
    }

    if (status === "confirmed") {
      await sendInvoiceEmail(order);
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, attributes: ["id", "name", "category"] }],
        },
        { model: OrderFeedback, as: "feedbacks" },
      ],
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    let restoredQuantity = 0;
    if (!order.isRestockedOnCancel) {
      restoredQuantity = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      await restockOrderInventory(order, req.admin?.id || req.admin?._id || null);
    }

    await order.destroy();

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: {
        orderId: id,
        restoredQuantity,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = String(req.query.email || "").trim().toLowerCase();

    if (!isUUID(id)) {
      return res.status(400).json({ success: false, message: "Valid order ID is required" });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, attributes: ["id", "name", "category"] }],
        },
        { model: OrderFeedback, as: "feedbacks" },
      ],
    });
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

    if (!isUUID(orderId)) {
      return res.status(400).json({ success: false, message: "Valid order ID is required" });
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, attributes: ["id", "name", "category"] }],
        },
        { model: OrderFeedback, as: "feedbacks" },
      ],
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.customerEmail || "").toLowerCase() !== email) {
      return res.status(403).json({ success: false, message: "Order email does not match" });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: order.id,
        customerName: order.customerName,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        latestNote: order.statusHistory?.length
          ? order.statusHistory[order.statusHistory.length - 1].note || ""
          : "",
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

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, attributes: ["id", "name", "category"] }],
        },
        { model: OrderFeedback, as: "feedbacks" },
      ],
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.customerEmail || "").toLowerCase() !== normalizedEmail) {
      return res.status(403).json({ success: false, message: "Order email does not match" });
    }

    // Check if user already submitted feedback for this order
    const existingFeedback = (order.feedbacks || []).find(
      (fb) => String(fb.submittedByEmail || "").toLowerCase() === normalizedEmail
    );

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted feedback for this order",
      });
    }

    const feedbackData = {
      submittedByEmail: normalizedEmail,
      rating: normalizedRating,
      message: String(message || "").trim(),
    };

    await OrderFeedback.create({
      orderId: order.id,
      rating: normalizedRating,
      message: String(message || "").trim(),
      submittedByEmail: normalizedEmail,
    });

    // Add feedback to all products in the order
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const productId = item.productId || item.product?.id;
        if (productId) {
          const product = await Product.findByPk(productId);
          if (product) {
            const productFeedbackExists = await ProductFeedback.findOne({
              where: {
                productId: product.id,
                submittedByEmail: normalizedEmail,
              },
            });

            if (!productFeedbackExists) {
              await ProductFeedback.create({
                productId: product.id,
                rating: normalizedRating,
                message: String(message || "").trim(),
                submittedByEmail: normalizedEmail,
                isVisible: true,
              });
            }
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedbackData,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderById,
  trackOrder,
  submitOrderFeedback,
};
