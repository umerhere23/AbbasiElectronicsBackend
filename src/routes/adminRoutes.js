const express = require("express");
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  getAdminOverview,
} = require("../controllers/adminController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/me", protectAdmin, getAdminProfile);
router.get("/overview", protectAdmin, getAdminOverview);

module.exports = router;
