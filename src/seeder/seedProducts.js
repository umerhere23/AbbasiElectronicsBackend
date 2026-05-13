const dotenv = require("dotenv");
dotenv.config();

const { connectDB } = require("../config/db");
const { Admin, Product, Category, Brand } = require("../models");

const productTemplates = [
  {
    name: "Samsung 55in QLED TV",
    description: "55-inch QLED display with HDR support and smart apps.",
    category: "TV & Audio",
    brand: "Samsung",
    price: 219999,
    stockCount: 12,
    onSale: true,
    salePercent: 8,
    size: "big",
    images: [
      "https://picsum.photos/seed/samsung-qled-1/900/600",
      "https://picsum.photos/seed/samsung-qled-2/900/600",
      "https://picsum.photos/seed/samsung-qled-3/900/600",
    ],
  },
  {
    name: "LG 43in UHD Smart TV",
    description: "43-inch UHD smart TV with webOS and built-in streaming.",
    category: "TV & Audio",
    brand: "LG",
    price: 124999,
    stockCount: 14,
    onSale: false,
    salePercent: 0,
    size: "big",
    images: [
      "https://picsum.photos/seed/lg-uhd-1/900/600",
      "https://picsum.photos/seed/lg-uhd-2/900/600",
    ],
  },
  {
    name: "Haier Inverter AC 1.5 Ton",
    description: "Energy-efficient inverter AC with fast cooling.",
    category: "Appliances",
    brand: "Haier",
    price: 185000,
    stockCount: 10,
    onSale: true,
    salePercent: 10,
    size: "big",
    images: [
      "https://picsum.photos/seed/haier-ac-1/900/600",
      "https://picsum.photos/seed/haier-ac-2/900/600",
    ],
  },
  {
    name: "Dawlance Refrigerator 14 CFT",
    description: "Spacious 14 CFT refrigerator with efficient cooling performance.",
    category: "Appliances",
    brand: "Dawlance",
    price: 138500,
    stockCount: 8,
    onSale: false,
    salePercent: 0,
    size: "big",
    images: [
      "https://picsum.photos/seed/dawlance-fridge-1/900/600",
      "https://picsum.photos/seed/dawlance-fridge-2/900/600",
    ],
  },
  {
    name: "Panasonic Microwave Oven",
    description: "Compact microwave oven for daily heating and cooking.",
    category: "Appliances",
    brand: "Panasonic",
    price: 45999,
    stockCount: 16,
    onSale: true,
    salePercent: 7,
    size: "small",
    images: [
      "https://picsum.photos/seed/panasonic-microwave-1/900/600",
      "https://picsum.photos/seed/panasonic-microwave-2/900/600",
    ],
  },
  {
    name: "Samsung Galaxy S24",
    description: "Flagship Android smartphone with premium camera setup.",
    category: "Mobiles",
    brand: "Samsung",
    price: 274999,
    stockCount: 9,
    onSale: true,
    salePercent: 6,
    size: "small",
    images: [
      "https://picsum.photos/seed/samsung-s24-1/900/600",
      "https://picsum.photos/seed/samsung-s24-2/900/600",
    ],
  },
  {
    name: "Xiaomi Redmi Note 13",
    description: "Value smartphone with AMOLED display and long battery life.",
    category: "Mobiles",
    brand: "Xiaomi",
    price: 82999,
    stockCount: 20,
    onSale: true,
    salePercent: 9,
    size: "small",
    images: [
      "https://picsum.photos/seed/redmi-note-1/900/600",
      "https://picsum.photos/seed/redmi-note-2/900/600",
    ],
  },
  {
    name: "HP Pavilion 15 Laptop",
    description: "Performance laptop for office, study, and multimedia tasks.",
    category: "Computing",
    brand: "HP",
    price: 214999,
    stockCount: 11,
    onSale: true,
    salePercent: 11,
    size: "big",
    images: [
      "https://picsum.photos/seed/hp-pavilion-1/900/600",
      "https://picsum.photos/seed/hp-pavilion-2/900/600",
    ],
  },
  {
    name: "Anker PowerCore 20000",
    description: "High-capacity power bank with fast charging support.",
    category: "Accessories",
    brand: "Anker",
    price: 17999,
    stockCount: 30,
    onSale: true,
    salePercent: 15,
    size: "small",
    images: [
      "https://picsum.photos/seed/anker-powercore-1/900/600",
      "https://picsum.photos/seed/anker-powercore-2/900/600",
    ],
  },
  {
    name: "Apple AirPods Pro 2",
    description: "Premium wireless earbuds with ANC and immersive audio.",
    category: "Accessories",
    brand: "Apple",
    price: 79999,
    stockCount: 18,
    onSale: true,
    salePercent: 10,
    size: "small",
    images: [
      "https://picsum.photos/seed/airpods-pro-1/900/600",
      "https://picsum.photos/seed/airpods-pro-2/900/600",
    ],
  },
];

const getOrCreateCategory = async (name, adminId) => {
  const existing = await Category.findOne({ where: { name } });
  if (existing) {
    return existing;
  }

  return Category.create({
    name,
    description: `${name} category`,
    createdBy: adminId,
  });
};

const getOrCreateBrand = async (name, adminId) => {
  const existing = await Brand.findOne({ where: { name } });
  if (existing) {
    return existing;
  }

  return Brand.create({
    name,
    description: `${name} brand`,
    createdBy: adminId,
  });
};

const seedProducts = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.SUPER_ADMIN_EMAIL || "superadmin@abbasi.com";
    const admin = (await Admin.findOne({ where: { email: adminEmail } })) || (await Admin.findOne());

    if (!admin) {
      throw new Error("No admin found. Run seed:admin first.");
    }

    for (const template of productTemplates) {
      const categoryDoc = await getOrCreateCategory(template.category, admin.id);
      const brandDoc = await getOrCreateBrand(template.brand, admin.id);

      const salePrice = template.onSale
        ? Number((template.price * (1 - template.salePercent / 100)).toFixed(2))
        : template.price;

      const values = {
        ...template,
        category: categoryDoc.name,
        categoryId: categoryDoc.id,
        brand: brandDoc.name,
        brandId: brandDoc.id,
        salePrice,
        inStock: template.stockCount > 0,
        image: `https://picsum.photos/seed/${encodeURIComponent(template.name)}/800/600`,
        images: template.images || [],
        createdBy: admin.id,
      };

      const existingProduct = await Product.findOne({ where: { name: template.name } });

      if (existingProduct) {
        await existingProduct.update(values);
      } else {
        await Product.create(values);
      }
    }

    console.log(`Seeded ${productTemplates.length} products.`);
    process.exit(0);
  } catch (error) {
    console.error("Seeding products failed:", error.message);
    process.exit(1);
  }
};

seedProducts();
