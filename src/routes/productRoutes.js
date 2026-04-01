const express = require("express");
const {
  getProducts,
  addProduct,
  editProduct,
} = require("../controllers/productController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getProducts);
router.post("/", protectAdmin, addProduct);
router.put("/:id", protectAdmin, editProduct);

module.exports = router;
