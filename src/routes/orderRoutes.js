const express = require("express");
const {
	createOrder,
	getOrders,
	updateOrderStatus,
	deleteOrder,
	getOrderById,
	trackOrder,
	submitOrderFeedback,
} = require("../controllers/orderController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", createOrder);
router.get("/track", trackOrder);
router.get("/:id", getOrderById);
router.post("/:id/feedback", submitOrderFeedback);
router.get("/", protectAdmin, getOrders);
router.put("/:id/status", protectAdmin, updateOrderStatus);
router.delete("/:id", protectAdmin, deleteOrder);

module.exports = router;
