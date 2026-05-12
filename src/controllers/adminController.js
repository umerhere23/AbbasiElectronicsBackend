const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Admin, Product, Sale, Order, InventoryLog } = require("../models");

const createToken = (adminId) => {
  return jwt.sign({ id: adminId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token: createToken(admin.id),
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token: createToken(admin.id),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: { exclude: ["password"] },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
};

const getAdminOverview = async (req, res, next) => {
  try {
    const [products, sales, orders, inventoryLogs] = await Promise.all([
      Product.findAll({ order: [["createdAt", "DESC"]] }),
      Sale.findAll({ order: [["createdAt", "DESC"]] }),
      Order.findAll({ order: [["createdAt", "DESC"]] }),
      InventoryLog.findAll({ order: [["createdAt", "DESC"]], limit: 50 }),
    ]);

    const totalSalesAmount = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const totalSalesCount = sales.length;
    const totalOrdersCount = orders.length;
    const totalOrdersAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const pendingOrdersCount = orders.filter((order) => order.status === "pending").length;
    const stripeOrdersCount = orders.filter((order) => order.paymentMethod === "stripe").length;
    const codOrdersCount = orders.filter((order) => order.paymentMethod === "cod").length;
    const inStockCount = products.filter((product) => product.inStock).length;
    const soldOutCount = products.filter((product) => Number(product.stockCount || 0) <= 0).length;
    const onSaleCount = products.filter((product) => product.onSale).length;
    const lowStockCount = products.filter((product) => {
      const stock = Number(product.stockCount || 0);
      return stock > 0 && stock <= 5;
    }).length;

    const salesByCategory = sales.reduce((acc, sale) => {
      const category = sale.product?.category || "General";
      acc[category] = (acc[category] || 0) + Number(sale.totalAmount || 0);
      return acc;
    }, {});

    const topCategories = Object.entries(salesByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topSellingProducts = products
      .map((product) => ({
        id: product.id,
        name: product.name,
        soldCount: Number(product.soldCount || 0),
        stockCount: Number(product.stockCount || 0),
      }))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalProducts: products.length,
        totalSalesCount,
        totalSalesAmount,
        totalOrdersCount,
        totalOrdersAmount,
        pendingOrdersCount,
        stripeOrdersCount,
        codOrdersCount,
        inStockCount,
        soldOutCount,
        onSaleCount,
        lowStockCount,
        inventoryMovementCount: inventoryLogs.length,
        topCategories,
        topSellingProducts,
        recentProducts: products.slice(0, 5),
        recentSales: sales.slice(0, 5),
        recentOrders: orders.slice(0, 5),
        recentInventoryLogs: inventoryLogs.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  getAdminOverview,
};
