const express = require("express");
const { getSales, createSale, deleteAllSales } = require("../controllers/saleController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protectAdmin, getSales);
router.post("/", protectAdmin, createSale);
router.delete("/all", protectAdmin, deleteAllSales);

module.exports = router;
