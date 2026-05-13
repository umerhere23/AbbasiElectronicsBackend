const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// Define all models
const Admin = sequelize.define("Admin", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    lowercase: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("admin"),
    defaultValue: "admin",
  },
}, {
  timestamps: true,
  tableName: "admins",
});

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    lowercase: true,
  },
}, {
  timestamps: true,
  tableName: "users",
});

const Category = sequelize.define("Category", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  image: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "categories",
});

const Brand = sequelize.define("Brand", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  image: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "brands",
});

const ProductFeedback = sequelize.define("ProductFeedback", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  message: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  submittedByEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    lowercase: true,
  },
  isVisible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  tableName: "product_feedbacks",
});

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stockCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  soldCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  onSale: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  salePercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: { min: 0, max: 100 },
  },
  salePrice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: "General",
  },
  brandId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  brand: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  image: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  viewerCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  inStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  size: {
    type: DataTypes.ENUM("small", "big"),
    defaultValue: "small",
  },
}, {
  timestamps: true,
  tableName: "products",
});

const OrderItem = sequelize.define("OrderItem", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  lineTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: "order_items",
});

const Order = sequelize.define("Order", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    lowercase: true,
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerCity: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  customerPostalCode: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  paymentMethod: {
    type: DataTypes.ENUM("cod", "bank", "jazzcash", "card"),
    defaultValue: "cod",
  },
  paymentStatus: {
    type: DataTypes.ENUM("cod_pending", "pending", "paid"),
    defaultValue: "cod_pending",
  },
  note: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  subTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  deliveryCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("pending", "confirmed", "shipped", "delivered", "cancelled"),
    defaultValue: "pending",
  },
  trackingId: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  statusHistory: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  isRestockedOnCancel: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: "orders",
});

const OrderFeedback = sequelize.define("OrderFeedback", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 },
  },
  message: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  submittedByEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    lowercase: true,
  },
}, {
  timestamps: true,
  tableName: "order_feedbacks",
});

const Sale = sequelize.define("Sale", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantitySold: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  finalUnitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  soldBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  saleGroupId: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
}, {
  timestamps: true,
  tableName: "sales",
});

const ContactMessage = sequelize.define("ContactMessage", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    lowercase: true,
  },
  subject: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "new",
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isReplied: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: "contact_messages",
});

const InventoryLog = sequelize.define("InventoryLog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  quantityChange: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  previousStock: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  newStock: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  referenceType: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  referenceId: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  performedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reference: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  details: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
}, {
  timestamps: true,
  tableName: "inventory_logs",
});

const StoreSetting = sequelize.define("StoreSetting", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  storeName: {
    type: DataTypes.STRING,
    defaultValue: "Abbasi Electronics",
  },
  storeEmail: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  storePhone: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  storeAddress: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  smallDeliveryCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  bigDeliveryCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  deliveryCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  minimumOrderAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  freeDemonAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  key: {
    type: DataTypes.STRING,
    unique: true,
  },
  whatsappNumber: {
    type: DataTypes.STRING,
    defaultValue: "923485172609",
  },
}, {
  timestamps: true,
  tableName: "store_settings",
});

const StripeCheckout = sequelize.define("StripeCheckout", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  customerId: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: "usd",
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "open",
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  customerName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  customerPhone: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  customerAddress: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  customerCity: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  customerPostalCode: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  note: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  items: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: "stripe_checkouts",
});

// Define relationships
Product.hasMany(ProductFeedback, { foreignKey: "productId", as: "feedbacks", onDelete: "CASCADE" });
ProductFeedback.belongsTo(Product, { foreignKey: "productId" });

Product.belongsTo(Category, { foreignKey: "categoryId", as: "categoryRef" });
Category.hasMany(Product, { foreignKey: "categoryId" });

Product.belongsTo(Brand, { foreignKey: "brandId", as: "brandRef" });
Brand.hasMany(Product, { foreignKey: "brandId" });

Product.belongsTo(Admin, { foreignKey: "createdBy", as: "creator" });
Admin.hasMany(Product, { foreignKey: "createdBy" });

Category.belongsTo(Admin, { foreignKey: "createdBy", as: "creator" });
Admin.hasMany(Category, { foreignKey: "createdBy" });

Brand.belongsTo(Admin, { foreignKey: "createdBy", as: "creator" });
Admin.hasMany(Brand, { foreignKey: "createdBy" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });

OrderItem.belongsTo(Product, { foreignKey: "productId" });
Product.hasMany(OrderItem, { foreignKey: "productId" });

Order.hasMany(OrderFeedback, { foreignKey: "orderId", as: "feedbacks", onDelete: "CASCADE" });
OrderFeedback.belongsTo(Order, { foreignKey: "orderId" });

Sale.belongsTo(Product, { foreignKey: "productId", as: "product" });
Product.hasMany(Sale, { foreignKey: "productId" });

Sale.belongsTo(Admin, { foreignKey: "soldBy", as: "soldByUser" });
Admin.hasMany(Sale, { foreignKey: "soldBy" });

InventoryLog.belongsTo(Product, { foreignKey: "productId", as: "product" });
Product.hasMany(InventoryLog, { foreignKey: "productId" });

InventoryLog.belongsTo(Admin, { foreignKey: "performedBy", as: "performedByUser" });
Admin.hasMany(InventoryLog, { foreignKey: "performedBy" });

StripeCheckout.belongsTo(Order, { foreignKey: "orderId", as: "order" });
Order.hasMany(StripeCheckout, { foreignKey: "orderId" });

module.exports = {
  sequelize,
  Admin,
  User,
  Category,
  Brand,
  Product,
  ProductFeedback,
  Order,
  OrderItem,
  OrderFeedback,
  Sale,
  ContactMessage,
  InventoryLog,
  StoreSetting,
  StripeCheckout,
};
