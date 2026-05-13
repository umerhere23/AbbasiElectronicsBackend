const { Op } = require("sequelize");
const { Product, Category, Brand, ProductFeedback, OrderItem } = require("../models");
const { recordInventoryLog } = require("../utils/inventoryLogger");

const isUUID = (val) => {
  if (!val || typeof val !== "string") return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
};

const normalizeImageList = (images, primaryImage) => {
  const values = Array.isArray(images)
    ? images
    : typeof images === "string"
      ? images.split(/\r?\n|,/)
      : [];

  const normalized = values
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (primaryImage) {
    const primary = String(primaryImage).trim();
    if (primary && !normalized.includes(primary)) {
      normalized.unshift(primary);
    }
  }

  return [...new Set(normalized)];
};
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
    const {
      category,
      categoryId,
      brand,
      brandId,
      onSale,
      search,
      minPrice,
      maxPrice,
      sort,
      stockStatus,
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (brand) {
      filter.brand = brand;
    }

    if (brandId) {
      filter.brandId = brandId;
    }

    if (onSale === "true") {
      filter.onSale = true;
    }

    if (stockStatus === "soldOut") {
      filter.stockCount = { [Op.lte]: 0 };
    } else if (stockStatus === "low") {
      filter.stockCount = { [Op.gt]: 0, [Op.lte]: 5 };
    } else if (stockStatus === "inStock") {
      filter.stockCount = { [Op.gt]: 0 };
    }

    if (search) {
      filter.name = { [Op.iLike]: `%${search}%` };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price[Op.gte] = Number(minPrice);
      }
      if (maxPrice) {
        filter.price[Op.lte] = Number(maxPrice);
      }
    }

    const sortMap = {
      newest: [["createdAt", "DESC"]],
      oldest: [["createdAt", "ASC"]],
      priceAsc: [["salePrice", "ASC"]],
      priceDesc: [["salePrice", "DESC"]],
      nameAsc: [["name", "ASC"]],
      nameDesc: [["name", "DESC"]],
    };

    const sortQuery = sortMap[sort] || [["createdAt", "DESC"]];

    const products = await Product.findAll({
      where: filter,
      order: sortQuery,
      include: [{ model: ProductFeedback, as: "feedbacks" }],
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const getSaleItems = async (req, res, next) => {
  try {
    const saleItems = await Product.findAll({
      where: { onSale: true },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, data: saleItems });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }

    const product = await Product.findByPk(id, {
      include: [{ model: ProductFeedback, as: "feedbacks" }],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Increment viewer count
    await product.increment("viewerCount", { by: 1 });

    // Calculate sales in last 10 hours
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const recentSalesCount = await OrderItem.count({
      where: {
        productId: id,
        createdAt: {
          [Op.gte]: tenHoursAgo,
        },
      },
    });

    // Add stats to product data
    const productData = product.toJSON();
    productData.stats = {
      currentViewers: product.viewerCount + 1, // +1 for current viewer
      recentSalesCount: recentSalesCount,
      soldInLastTenHours: recentSalesCount,
    };

    return res.status(200).json({ success: true, data: productData });
  } catch (error) {
    return next(error);
  }
};

const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, stockCount, onSale, salePercent, category, categoryId, brand, brandId, image, images, size } = req.body;

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

    // Validate size
    const validSizes = ["small", "big"];
    const normalizedSize = (size || "small").toLowerCase();
    if (!validSizes.includes(normalizedSize)) {
      return res.status(400).json({
        success: false,
        message: "Size must be 'small' or 'big'",
      });
    }

    const isOnSale = Boolean(onSale);
    const pricing = buildSalePricing(numericPrice, isOnSale, salePercent);

    const adminId = req.admin?.id || req.admin?._id || null;

    let categoryName = category || "General";
    let categoryRef = null;

    if (categoryId) {
      let categoryDoc = null;
      if (isUUID(categoryId)) {
        categoryDoc = await Category.findByPk(categoryId);
      } else {
        categoryDoc = await Category.findOne({ where: { name: categoryId } });
      }

      if (!categoryDoc) {
        categoryName = categoryId;
        categoryRef = null;
      } else {
        categoryName = categoryDoc.name;
        categoryRef = categoryDoc.id;
      }
    }

    let brandName = brand || "";
    let brandRef = null;

    if (brandId) {
      let brandDoc = null;
      if (isUUID(brandId)) {
        brandDoc = await Brand.findByPk(brandId);
      } else {
        brandDoc = await Brand.findOne({ where: { name: brandId } });
      }

      if (!brandDoc) {
        brandName = brandId;
        brandRef = null;
      } else {
        brandName = brandDoc.name;
        brandRef = brandDoc.id;
      }
    }

    const productImages = normalizeImageList(images, image);

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
      brand: brandName,
      brandId: brandRef,
      image,
      images: productImages,
      size: normalizedSize,
      createdBy: adminId,
    });

    if (numericStockCount > 0) {
      await recordInventoryLog({
        productId: product.id,
        type: "manual_add",
        quantityChange: numericStockCount,
        previousStock: 0,
        newStock: numericStockCount,
        note: "Initial stock at product creation",
        referenceType: "product",
        referenceId: String(product.id),
        performedBy: adminId,
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
    const { name, description, price, stockCount, onSale, salePercent, category, categoryId, brand, brandId, image, images, size } = req.body;

    if (!isUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const previousStock = Number(product.stockCount || 0);
    const nextPrice = price !== undefined ? Number(price) : Number(product.price);
    const nextStockCount = stockCount !== undefined ? Number(stockCount) : Number(product.stockCount);
    const nextOnSale = onSale !== undefined ? Boolean(onSale) : Boolean(product.onSale);

    if (Number.isNaN(nextPrice) || nextPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid positive number",
      });
    }

    if (Number.isNaN(nextStockCount) || nextStockCount < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock count must be 0 or more",
      });
    }

    // Validate size
    if (size) {
      const validSizes = ["small", "big"];
      const normalizedSize = size.toLowerCase();
      if (!validSizes.includes(normalizedSize)) {
        return res.status(400).json({
          success: false,
          message: "Size must be 'small' or 'big'",
        });
      }
      product.size = normalizedSize;
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = nextPrice;
    product.stockCount = nextStockCount;
    product.onSale = nextOnSale;
    if (categoryId) {
      let categoryDoc = null;
      if (isUUID(categoryId)) {
        categoryDoc = await Category.findByPk(categoryId);
      } else {
        categoryDoc = await Category.findOne({ where: { name: categoryId } });
      }

      if (!categoryDoc) {
        product.category = categoryId;
        product.categoryId = null;
      } else {
        product.categoryId = categoryDoc.id;
        product.category = categoryDoc.name;
      }
    } else {
      product.category = category ?? product.category;
    }
    if (brandId) {
      let brandDoc = null;
      if (isUUID(brandId)) {
        brandDoc = await Brand.findByPk(brandId);
      } else {
        brandDoc = await Brand.findOne({ where: { name: brandId } });
      }

      if (!brandDoc) {
        product.brand = brandId;
        product.brandId = null;
      } else {
        product.brandId = brandDoc.id;
        product.brand = brandDoc.name;
      }
    } else {
      product.brand = brand ?? product.brand;
    }
    const productImages = normalizeImageList(images, image ?? product.image);
    product.image = image ?? product.image;
    product.images = productImages.length ? productImages : product.images;
    product.inStock = product.stockCount > 0;

    const pricing = buildSalePricing(product.price, product.onSale, salePercent ?? product.salePercent);
    product.salePercent = pricing.salePercent;
    product.salePrice = pricing.salePrice;

    const updatedProduct = await product.save();

    const newStock = Number(updatedProduct.stockCount || 0);
    const diff = newStock - previousStock;
    if (diff !== 0) {
      await recordInventoryLog({
        productId: updatedProduct.id,
        type: "adjustment",
        quantityChange: diff,
        previousStock,
        newStock,
        note: "Stock changed via product edit",
        referenceType: "product",
        referenceId: String(updatedProduct.id),
        performedBy: req.admin?.id || req.admin?._id || null,
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

    if (!isUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }

    const deletedProduct = await Product.findByPk(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await deletedProduct.destroy();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteProductsBulk = async (req, res, next) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || !productIds.length) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one product id",
      });
    }

    const result = await Product.destroy({ where: { id: { [Op.in]: productIds } } });

    return res.status(200).json({
      success: true,
      message: `${result} product(s) deleted successfully`,
      data: { deletedCount: result },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteAllProducts = async (req, res, next) => {
  try {
    const result = await Product.destroy({ where: {} });

    return res.status(200).json({
      success: true,
      message: `${result} product(s) deleted successfully`,
      data: { deletedCount: result },
    });
  } catch (error) {
    return next(error);
  }
};

const updateProductStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Valid product id is required",
      });
    }
    const { adjustment, note } = req.body;

    const numericAdjustment = Number(adjustment);
    if (Number.isNaN(numericAdjustment) || numericAdjustment === 0) {
      return res.status(400).json({
        success: false,
        message: "Adjustment must be a non-zero number",
      });
    }

    const product = await Product.findByPk(id);
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
      productId: saved.id,
      type: numericAdjustment > 0 ? "manual_add" : "manual_remove",
      quantityChange: numericAdjustment,
      previousStock,
      newStock: nextStock,
      note: note || "Stock manually updated",
      referenceType: "product",
      referenceId: String(saved.id),
      performedBy: req.admin?.id || req.admin?._id || null,
    });

    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    return next(error);
  }
};

const toggleFeedbackVisibility = async (req, res, next) => {
  try {
    const { productId, feedbackId } = req.params;
    const { isVisible } = req.body;

    if (isVisible === undefined || typeof isVisible !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVisible must be a boolean",
      });
    }

    const product = await Product.findByPk(productId, {
      include: [{ model: ProductFeedback, as: "feedbacks" }],
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const feedback = Array.isArray(product.feedbacks)
      ? product.feedbacks.find((item) => String(item.id) === String(feedbackId))
      : null;
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    await ProductFeedback.update({ isVisible }, { where: { id: feedbackId, productId } });

    return res.status(200).json({
      success: true,
      message: `Feedback ${isVisible ? "shown" : "hidden"} successfully`,
      data: { ...feedback.toJSON(), isVisible },
    });
  } catch (error) {
    return next(error);
  }
};

const deleteFeedback = async (req, res, next) => {
  try {
    const { productId, feedbackId } = req.params;

    const product = await Product.findByPk(productId, {
      include: [{ model: ProductFeedback, as: "feedbacks" }],
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const feedback = Array.isArray(product.feedbacks)
      ? product.feedbacks.find((item) => String(item.id) === String(feedbackId))
      : null;
    if (!feedback) {
      return res.status(404).json({ success: false, message: "Feedback not found" });
    }

    await ProductFeedback.destroy({ where: { id: feedbackId, productId } });

    return res.status(200).json({
      success: true,
      message: "Feedback removed successfully",
      data: feedback.toJSON(),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProducts,
  getSaleItems,
  getProductById,
  addProduct,
  editProduct,
  deleteProduct,
  deleteProductsBulk,
  deleteAllProducts,
  updateProductStock,
  toggleFeedbackVisibility,
  deleteFeedback,
};
