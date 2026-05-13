const express = require("express");
const {
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
} = require("../controllers/productController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/sale-items", getSaleItems);
router.get("/:id", getProductById);
router.post("/", protectAdmin, addProduct);
router.delete("/bulk-delete", protectAdmin, deleteProductsBulk);
router.delete("/all", protectAdmin, deleteAllProducts);
router.put("/:id", protectAdmin, editProduct);
router.patch("/:id/stock", protectAdmin, updateProductStock);
router.patch("/:productId/feedback/:feedbackId/visibility", protectAdmin, toggleFeedbackVisibility);
router.delete("/:productId/feedback/:feedbackId", protectAdmin, deleteFeedback);
router.delete("/:id", protectAdmin, deleteProduct);

module.exports = router;
