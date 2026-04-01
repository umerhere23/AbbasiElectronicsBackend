const express = require("express");
const {
	createOrder,
	createStripeSession,
	confirmStripeOrder,
	getOrders,
	updateOrderStatus,
	getOrderById,
	trackOrder,
	submitOrderFeedback,
} = require("../controllers/orderController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", createOrder);
router.post("/stripe/session", createStripeSession);
router.post("/stripe/confirm", confirmStripeOrder);
router.get("/track", trackOrder);
router.get("/:id", getOrderById);
router.post("/:id/feedback", submitOrderFeedback);
router.get("/", protectAdmin, getOrders);
router.put("/:id/status", protectAdmin, updateOrderStatus);

module.exports = router;
