const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find()
      .populate("product", "name category")
      .populate("soldBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    next(error);
  }
};

const createSale = async (req, res, next) => {
  try {
    const { productId, quantity, discountPercent, customerName, note } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Product and quantity are required",
      });
    }

    const saleQuantity = Number(quantity);
    const manualDiscount = discountPercent !== undefined ? Number(discountPercent) : null;

    if (Number.isNaN(saleQuantity) || saleQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.inStock || product.stockCount < saleQuantity) {
      return res.status(400).json({
        success: false,
        message: "Not enough stock available",
      });
    }

    const appliedDiscount = manualDiscount === null
      ? product.salePercent || 0
      : Math.min(100, Math.max(0, manualDiscount));

    const finalUnitPrice = Number((product.price * (1 - appliedDiscount / 100)).toFixed(2));
    const totalAmount = Number((finalUnitPrice * saleQuantity).toFixed(2));

    const sale = await Sale.create({
      product: product._id,
      quantity: saleQuantity,
      unitPrice: product.price,
      discountPercent: appliedDiscount,
      finalUnitPrice,
      totalAmount,
      customerName,
      note,
      soldBy: req.admin._id,
    });

    const previousStock = Number(product.stockCount || 0);
    product.stockCount -= saleQuantity;
    product.soldCount = Number(product.soldCount || 0) + saleQuantity;
    product.inStock = product.stockCount > 0;
    await product.save();

    await recordInventoryLog({
      productId: product._id,
      type: "sale",
      quantityChange: -saleQuantity,
      previousStock,
      newStock: Number(product.stockCount || 0),
      note: "Stock reduced via manual sale entry",
      referenceType: "sale",
      referenceId: String(sale._id),
      performedBy: req.admin._id,
    });

    const populatedSale = await Sale.findById(sale._id)
      .populate("product", "name category")
      .populate("soldBy", "name email");

    res.status(201).json({ success: true, data: populatedSale });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSales,
  createSale,
};
