const express = require("express");
const { protectAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const { uploadProductImage } = require("../controllers/uploadController");

const router = express.Router();

router.post("/product-image", protectAdmin, upload.single("image"), uploadProductImage);

module.exports = router;
