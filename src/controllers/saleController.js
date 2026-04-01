const Product = require("../models/Product");
const Sale = require("../models/Sale");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const normalizeSaleItems = (body) => {
  if (Array.isArray(body.items) && body.items.length) {
    return body.items;
  }

  if (body.productId && body.quantity) {
    return [{
      productId: body.productId,
      quantity: body.quantity,
      discountPercent: body.discountPercent,
    }];
  }

  return [];
};

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
    const { customerName, note } = req.body;
    const items = normalizeSaleItems(req.body);

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: "At least one sale item is required",
      });
    }

    const productIds = [...new Set(items.map((item) => String(item.productId || "")))].filter(Boolean);
    const productDocs = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(productDocs.map((product) => [String(product._id), product]));

    const groupedQuantities = new Map();
    const preparedItems = [];

    for (const item of items) {
      const productId = String(item.productId || "");
      const saleQuantity = Number(item.quantity);
      const manualDiscount = item.discountPercent !== undefined ? Number(item.discountPercent) : null;

      if (!productId) {
        return res.status(400).json({ success: false, message: "Product is required for each item" });
      }

      if (Number.isNaN(saleQuantity) || saleQuantity < 1) {
        return res.status(400).json({ success: false, message: "Each item quantity must be at least 1" });
      }

      const product = productMap.get(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: "One or more selected products were not found" });
      }

      groupedQuantities.set(productId, Number(groupedQuantities.get(productId) || 0) + saleQuantity);

      const appliedDiscount = manualDiscount === null
        ? product.salePercent || 0
        : Math.min(100, Math.max(0, manualDiscount));

      const finalUnitPrice = Number((product.price * (1 - appliedDiscount / 100)).toFixed(2));
      const totalAmount = Number((finalUnitPrice * saleQuantity).toFixed(2));

      preparedItems.push({
        product,
        quantity: saleQuantity,
        discountPercent: appliedDiscount,
        finalUnitPrice,
        totalAmount,
      });
    }

    for (const [productId, totalQty] of groupedQuantities.entries()) {
      const product = productMap.get(productId);
      if (!product.inStock || Number(product.stockCount || 0) < totalQty) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock available for ${product.name}`,
        });
      }
    }

    const saleGroupId = `SG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const createdSales = [];

    for (const item of preparedItems) {
      const sale = await Sale.create({
        product: item.product._id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        discountPercent: item.discountPercent,
        finalUnitPrice: item.finalUnitPrice,
        totalAmount: item.totalAmount,
        customerName,
        note,
        soldBy: req.admin._id,
        saleGroupId,
      });

      const previousStock = Number(item.product.stockCount || 0);
      item.product.stockCount -= item.quantity;
      item.product.soldCount = Number(item.product.soldCount || 0) + item.quantity;

      // Reflect manual sale discount on product so storefront can show reduced prices.
      if (Number(item.discountPercent || 0) > 0) {
        item.product.onSale = true;
        item.product.salePercent = item.discountPercent;
        item.product.salePrice = Number((item.product.price * (1 - item.discountPercent / 100)).toFixed(2));
      }

      item.product.inStock = item.product.stockCount > 0;
      await item.product.save();

      await recordInventoryLog({
        productId: item.product._id,
        type: "sale",
        quantityChange: -item.quantity,
        previousStock,
        newStock: Number(item.product.stockCount || 0),
        note: "Stock reduced via manual sale entry",
        referenceType: "sale",
        referenceId: String(sale._id),
        performedBy: req.admin._id,
      });

      createdSales.push(sale._id);
    }

    const populatedSales = await Sale.find({ _id: { $in: createdSales } })
      .populate("product", "name category")
      .populate("soldBy", "name email")
      .sort({ createdAt: -1 });

    const grandTotal = populatedSales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);

    res.status(201).json({
      success: true,
      data: {
        saleGroupId,
        items: populatedSales,
        itemCount: populatedSales.length,
        grandTotal: Number(grandTotal.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteAllSales = async (req, res, next) => {
  try {
    const result = await Sale.deleteMany({});
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} sale(s) deleted successfully`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};

const updateSale = async (req, res, next) => {
  try {
    const { saleId } = req.params;
    const { quantity, discountPercent } = req.body;

    const sale = await Sale.findById(saleId).populate("product");
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const newQuantity = Number(quantity);
    const newDiscount = Number(discountPercent !== undefined ? discountPercent : sale.discountPercent);

    if (isNaN(newQuantity) || newQuantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    if (isNaN(newDiscount) || newDiscount < 0 || newDiscount > 100) {
      return res.status(400).json({ success: false, message: "Discount must be between 0-100" });
    }

    const product = sale.product;
    const quantityDifference = newQuantity - sale.quantity;

    // Check if new quantity requires additional stock
    if (quantityDifference > 0) {
      if (!product.inStock || Number(product.stockCount || 0) < quantityDifference) {
        return res.status(400).json({
          success: false,
          message: `Not enough additional stock for ${product.name}`,
        });
      }
    }

    // Record old inventory state
    const previousStock = Number(product.stockCount || 0);

    // Update stock
    product.stockCount -= quantityDifference;
    product.soldCount = Number(product.soldCount || 0) + quantityDifference;

    // Update sale discount if changed
    if (newDiscount > 0) {
      product.onSale = true;
      product.salePercent = newDiscount;
      product.salePrice = Number((product.price * (1 - newDiscount / 100)).toFixed(2));
    } else if (newDiscount === 0 && sale.discountPercent > 0) {
      // If discount was removed, unset sale flags if no other sales have discount
      const otherSales = await Sale.find({
        product: product._id,
        _id: { $ne: saleId },
        discountPercent: { $gt: 0 },
      });
      if (!otherSales.length) {
        product.onSale = false;
        product.salePercent = 0;
        product.salePrice = 0;
      }
    }

    product.inStock = product.stockCount > 0;
    await product.save();

    // Update sale
    sale.quantity = newQuantity;
    sale.discountPercent = newDiscount;
    const newFinalUnitPrice = Number((product.price * (1 - newDiscount / 100)).toFixed(2));
    sale.finalUnitPrice = newFinalUnitPrice;
    sale.totalAmount = Number((newFinalUnitPrice * newQuantity).toFixed(2));
    await sale.save();

    // Record inventory change
    await recordInventoryLog({
      productId: product._id,
      type: "adjustment",
      quantityChange: -quantityDifference,
      previousStock,
      newStock: Number(product.stockCount || 0),
      note: `Sale quantity updated from ${sale.quantity} to ${newQuantity}, discount ${newDiscount}%`,
      referenceType: "sale",
      referenceId: String(saleId),
      performedBy: req.admin._id,
    });

    const updatedSale = await Sale.findById(saleId)
      .populate("product", "name category")
      .populate("soldBy", "name email");

    res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      data: updatedSale,
    });
  } catch (error) {
    next(error);
  }
};

const deleteSale = async (req, res, next) => {
  try {
    const { saleId } = req.params;

    const sale = await Sale.findById(saleId).populate("product");
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    const product = sale.product;
    const previousStock = Number(product.stockCount || 0);

    // Restock the inventory
    product.stockCount = Number(product.stockCount || 0) + sale.quantity;
    product.soldCount = Math.max(0, Number(product.soldCount || 0) - sale.quantity);
    product.inStock = product.stockCount > 0;

    // If this was the only sale with a discount, remove discount flags
    if (sale.discountPercent > 0) {
      const otherSalesWithDiscount = await Sale.find({
        product: product._id,
        _id: { $ne: saleId },
        discountPercent: { $gt: 0 },
      });
      if (!otherSalesWithDiscount.length) {
        product.onSale = false;
        product.salePercent = 0;
        product.salePrice = 0;
      }
    }

    await product.save();

    // Record inventory log
    await recordInventoryLog({
      productId: product._id,
      type: "reversal",
      quantityChange: sale.quantity,
      previousStock,
      newStock: Number(product.stockCount || 0),
      note: `Sale deleted - inventory restored (${sale.quantity} unit(s))`,
      referenceType: "sale",
      referenceId: String(saleId),
      performedBy: req.admin._id,
    });

    // Delete the sale
    await Sale.findByIdAndDelete(saleId);

    res.status(200).json({
      success: true,
      message: "Sale deleted successfully and inventory restored",
      data: { deletedSaleId: saleId, restoredQuantity: sale.quantity },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSales,
  createSale,
  updateSale,
  deleteSale,
  deleteAllSales,
};
