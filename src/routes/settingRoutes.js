const express = require("express");
const {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/settingController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/public", getPublicSettings);
router.get("/", protectAdmin, getAdminSettings);
router.put("/", protectAdmin, updateAdminSettings);

module.exports = router;
