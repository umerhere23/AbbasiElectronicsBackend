const express = require("express");
const { protectAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const categoryUpload = require("../middlewares/categoryUploadMiddleware");
const { uploadProductImage, uploadCategoryImage } = require("../controllers/uploadController");

const router = express.Router();

router.post("/product-image", protectAdmin, upload.single("image"), uploadProductImage);
router.post("/category-image", protectAdmin, categoryUpload.single("image"), uploadCategoryImage);

module.exports = router;
