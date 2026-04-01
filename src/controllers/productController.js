const Product = require("../models/Product");

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
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, stockCount, onSale, salePercent, category, image, inStock } = req.body;

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

    const product = await Product.create({
      name,
      description,
      price: numericPrice,
      stockCount: numericStockCount,
      onSale: isOnSale,
      salePercent: pricing.salePercent,
      salePrice: pricing.salePrice,
      category,
      image,
      inStock: inStock !== undefined ? inStock : numericStockCount > 0,
      createdBy: req.admin._id,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stockCount, onSale, salePercent, category, image, inStock } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.price = price !== undefined ? Number(price) : product.price;
    product.stockCount = stockCount !== undefined ? Number(stockCount) : product.stockCount;
    product.onSale = onSale !== undefined ? Boolean(onSale) : product.onSale;
    product.category = category ?? product.category;
    product.image = image ?? product.image;
    product.inStock = inStock !== undefined ? inStock : product.stockCount > 0;

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

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  addProduct,
  editProduct,
};
