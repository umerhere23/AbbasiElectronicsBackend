const express = require("express");
const { getInventoryLogs } = require("../controllers/inventoryController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/logs", protectAdmin, getInventoryLogs);

module.exports = router;
