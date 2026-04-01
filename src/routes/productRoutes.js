const express = require("express");
const {
  getProducts,
  getSaleItems,
  addProduct,
  editProduct,
  deleteProduct,
  updateProductStock,
} = require("../controllers/productController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/sale-items", getSaleItems);
router.post("/", protectAdmin, addProduct);
router.put("/:id", protectAdmin, editProduct);
router.patch("/:id/stock", protectAdmin, updateProductStock);
router.delete("/:id", protectAdmin, deleteProduct);

module.exports = router;
