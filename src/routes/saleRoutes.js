const express = require("express");
const { getSales, createSale } = require("../controllers/saleController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/", protectAdmin, getSales);
router.post("/", protectAdmin, createSale);

module.exports = router;
