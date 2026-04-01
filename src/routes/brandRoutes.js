const express = require("express");
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  deleteAllBrands,
} = require("../controllers/brandController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", getBrands);
router.post("/", protectAdmin, createBrand);
router.delete("/all", protectAdmin, deleteAllBrands);
router.put("/:id", protectAdmin, updateBrand);
router.delete("/:id", protectAdmin, deleteBrand);

module.exports = router;
