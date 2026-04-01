const Product = require("../models/Product");
const Category = require("../models/Category");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const buildSalePricing = (basePrice, onSale, salePercent) => {
  const normalizedPrice = Number(basePrice);
  const normalizedPercent = Math.min(100, Math.max(0, Number(salePercent || 0)));
  const salePrice = onSale
    ? Number((normalizedPrice * (1 - normalizedPercent / 100)).toFixed(2))
    : normalizedPrice;

  return {
    salePercent: onSale ? normalizedPercent : 0,
    salePrice,
  };
};

const getProducts = async (req, res, next) => {
  try {
    const { category, categoryId, onSale, search, minPrice, maxPrice, sort, stockStatus } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (onSale === "true") {
      filter.onSale = true;
    }

    if (stockStatus === "soldOut") {
      filter.stockCount = { $lte: 0 };
    } else if (stockStatus === "low") {
      filter.stockCount = { $gt: 0, $lte: 5 };
    } else if (stockStatus === "inStock") {
      filter.stockCount = { $gt: 0 };
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      priceAsc: { salePrice: 1 },
      priceDesc: { salePrice: -1 },
      nameAsc: { name: 1 },
      nameDesc: { name: -1 },
    };

    const sortQuery = sortMap[sort] || { createdAt: -1 };

    const products = await Product.find(filter).sort(sortQuery);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const getSaleItems = async (req, res, next) => {
  try {
    const saleItems = await Product.find({ onSale: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: saleItems });
  } catch (error) {
    next(error);
  }
};

const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, stockCount, onSale, salePercent, category, categoryId, image } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Product name and price are required",
      });
    }

    const numericPrice = Number(price);
    const numericStockCount = Number(stockCount ?? 0);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    if (Number.isNaN(numericStockCount) || numericStockCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock count must be 0 or more",
      });
    }

    const isOnSale = Boolean(onSale);
    const pricing = buildSalePricing(numericPrice, isOnSale, salePercent);

    let categoryName = category || "General";
    let categoryRef = null;

    if (categoryId) {
      const categoryDoc = await Category.findById(categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ success: false, message: "Invalid category selected" });
      }
      categoryName = categoryDoc.name;
      categoryRef = categoryDoc._id;
    }

    const product = await Product.create({
      name,
      description,
      price: numericPrice,
      stockCount: numericStockCount,
      onSale: isOnSale,
      salePercent: pricing.salePercent,
      salePrice: pricing.salePrice,
      category: categoryName,
      categoryId: categoryRef,
      image,
      createdBy: req.admin._id,
    });

    if (numericStockCount > 0) {
      await recordInventoryLog({
        productId: product._id,
        type: "manual_add",
        quantityChange: numericStockCount,
        previousStock: 0,
        newStock: numericStockCount,
        note: "Initial stock at product creation",
        referenceType: "product",
        referenceId: String(product._id),
        performedBy: req.admin._id,
      });
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stockCount, onSale, salePercent, category, categoryId, image } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const previousStock = Number(product.stockCount || 0);

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = price !== undefined ? Number(price) : product.price;
    product.stockCount = stockCount !== undefined ? Number(stockCount) : product.stockCount;
    product.onSale = onSale !== undefined ? Boolean(onSale) : product.onSale;
    if (categoryId) {
      const categoryDoc = await Category.findById(categoryId);
      if (!categoryDoc) {
        return res.status(400).json({ success: false, message: "Invalid category selected" });
      }
      product.categoryId = categoryDoc._id;
      product.category = categoryDoc.name;
    } else {
      product.category = category ?? product.category;
    }
    product.image = image ?? product.image;
    product.inStock = product.stockCount > 0;

    const pricing = buildSalePricing(product.price, product.onSale, salePercent ?? product.salePercent);
    product.salePercent = pricing.salePercent;
    product.salePrice = pricing.salePrice;

    if (Number.isNaN(product.price) || product.price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    if (Number.isNaN(product.stockCount) || product.stockCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock count must be 0 or more",
      });
    }

    const updatedProduct = await product.save();

    const newStock = Number(updatedProduct.stockCount || 0);
    const diff = newStock - previousStock;
    if (diff !== 0) {
      await recordInventoryLog({
        productId: updatedProduct._id,
        type: "adjustment",
        quantityChange: diff,
        previousStock,
        newStock,
        note: "Stock changed via product edit",
        referenceType: "product",
        referenceId: String(updatedProduct._id),
        performedBy: req.admin._id,
      });
    }

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updateProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { adjustment, note } = req.body;

    const numericAdjustment = Number(adjustment);
    if (Number.isNaN(numericAdjustment) || numericAdjustment === 0) {
      return res.status(400).json({
        success: false,
        message: "Adjustment must be a non-zero number",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const previousStock = Number(product.stockCount || 0);
    const nextStock = previousStock + numericAdjustment;

    if (nextStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Adjustment cannot make stock negative",
      });
    }

    product.stockCount = nextStock;
    product.inStock = nextStock > 0;
    const saved = await product.save();

    await recordInventoryLog({
      productId: saved._id,
      type: numericAdjustment > 0 ? "manual_add" : "manual_remove",
      quantityChange: numericAdjustment,
      previousStock,
      newStock: nextStock,
      note: note || "Stock manually updated",
      referenceType: "product",
      referenceId: String(saved._id),
      performedBy: req.admin._id,
    });

    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProducts,
  getSaleItems,
  addProduct,
  editProduct,
  deleteProduct,
  updateProductStock,
};
