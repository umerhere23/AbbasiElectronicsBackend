const express = require("express");
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteAllCategories,
} = require("../controllers/categoryController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getCategories);
router.post("/", protectAdmin, createCategory);
router.delete("/all", protectAdmin, deleteAllCategories);
router.put("/:id", protectAdmin, updateCategory);
router.delete("/:id", protectAdmin, deleteCategory);

module.exports = router;
