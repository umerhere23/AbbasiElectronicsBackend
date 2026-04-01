const dotenv = require("dotenv");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");
const Product = require("../models/Product");

dotenv.config();

const productTemplates = [
  { name: "Samsung 55in QLED TV", category: "TV & Audio", price: 219999, stockCount: 12, onSale: true, salePercent: 8 },
  { name: "LG 43in UHD Smart TV", category: "TV & Audio", price: 124999, stockCount: 14, onSale: false, salePercent: 0 },
  { name: "Sony HT-S40R Soundbar", category: "TV & Audio", price: 69999, stockCount: 9, onSale: true, salePercent: 12 },
  { name: "Haier Inverter AC 1.5 Ton", category: "Appliances", price: 185000, stockCount: 10, onSale: true, salePercent: 10 },
  { name: "Dawlance Refrigerator 14 CFT", category: "Appliances", price: 138500, stockCount: 8, onSale: false, salePercent: 0 },
  { name: "Panasonic Microwave Oven", category: "Appliances", price: 45999, stockCount: 16, onSale: true, salePercent: 7 },
  { name: "iPhone 15 128GB", category: "Mobiles", price: 324999, stockCount: 7, onSale: false, salePercent: 0 },
  { name: "Samsung Galaxy S24", category: "Mobiles", price: 274999, stockCount: 9, onSale: true, salePercent: 6 },
  { name: "Xiaomi Redmi Note 13", category: "Mobiles", price: 82999, stockCount: 20, onSale: true, salePercent: 9 },
  { name: "HP Pavilion 15 Laptop", category: "Computing", price: 214999, stockCount: 11, onSale: true, salePercent: 11 },
  { name: "Lenovo IdeaPad Slim 3", category: "Computing", price: 149999, stockCount: 13, onSale: false, salePercent: 0 },
  { name: "Dell Inspiron 14", category: "Computing", price: 182500, stockCount: 10, onSale: true, salePercent: 5 },
  { name: "Anker PowerCore 20000", category: "Accessories", price: 17999, stockCount: 30, onSale: true, salePercent: 15 },
  { name: "Logitech MX Master 3S", category: "Accessories", price: 31999, stockCount: 22, onSale: false, salePercent: 0 },
  { name: "Apple AirPods Pro 2", category: "Accessories", price: 79999, stockCount: 18, onSale: true, salePercent: 10 },
  { name: "Canon EOS 2000D Kit", category: "Cameras", price: 174999, stockCount: 6, onSale: true, salePercent: 8 },
  { name: "Nikon D5600 Kit", category: "Cameras", price: 228999, stockCount: 5, onSale: false, salePercent: 0 },
  { name: "GoPro HERO 12", category: "Cameras", price: 144999, stockCount: 7, onSale: true, salePercent: 10 },
  { name: "PlayStation 5 Console", category: "Gaming", price: 244999, stockCount: 9, onSale: false, salePercent: 0 },
  { name: "Xbox Series X", category: "Gaming", price: 229999, stockCount: 8, onSale: true, salePercent: 6 },
];

const seedProducts = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@abbasi.com";
    const admin = await Admin.findOne({ email: adminEmail }) || (await Admin.findOne());

    if (!admin) {
      throw new Error("No admin found. Run seed:admin first.");
    }

    for (const template of productTemplates) {
      const salePrice = template.onSale
        ? Number((template.price * (1 - template.salePercent / 100)).toFixed(2))
        : template.price;

      await Product.findOneAndUpdate(
        { name: template.name },
        {
          ...template,
          salePrice,
          inStock: template.stockCount > 0,
          image: `https://picsum.photos/seed/${encodeURIComponent(template.name)}/800/600`,
          createdBy: admin._id,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`Seeded ${productTemplates.length} products.`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding products failed:", error.message);
    process.exit(1);
  }
};

seedProducts();
