const express = require("express");
const { protectAdmin } = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");
const categoryUpload = require("../middlewares/categoryUploadMiddleware");
const brandUpload = require("../middlewares/brandUploadMiddleware");
const {
	uploadProductImage,
	uploadCategoryImage,
	uploadBrandImage,
} = require("../controllers/uploadController");

const router = express.Router();

router.post("/product-image", protectAdmin, upload.single("image"), uploadProductImage);
router.post("/category-image", protectAdmin, categoryUpload.single("image"), uploadCategoryImage);
router.post("/brand-image", protectAdmin, brandUpload.single("image"), uploadBrandImage);

module.exports = router;
