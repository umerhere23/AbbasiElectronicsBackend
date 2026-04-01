const express = require("express");
const { getSales, createSale, updateSale, deleteSale, deleteAllSales } = require("../controllers/saleController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protectAdmin, getSales);
router.post("/", protectAdmin, createSale);
router.patch("/:saleId", protectAdmin, updateSale);
router.delete("/:saleId", protectAdmin, deleteSale);
router.delete("/all", protectAdmin, deleteAllSales);

module.exports = router;
