const express = require("express");
const {
	createOrder,
	createStripeSession,
	confirmStripeOrder,
	getOrders,
	updateOrderStatus,
} = require("../controllers/orderController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", createOrder);
router.post("/stripe/session", createStripeSession);
router.post("/stripe/confirm", confirmStripeOrder);
router.get("/", protectAdmin, getOrders);
router.put("/:id/status", protectAdmin, updateOrderStatus);

module.exports = router;
