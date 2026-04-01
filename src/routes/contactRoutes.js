const express = require("express");
const { createContactMessage, getContactMessages } = require("../controllers/contactController");
const { protectAdmin } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/", createContactMessage);
router.get("/", protectAdmin, getContactMessages);

module.exports = router;
