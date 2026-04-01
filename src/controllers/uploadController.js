const uploadProductImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Image file is required",
    });
  }

  const imagePath = `/uploads/products/${req.file.filename}`;
  const imageUrl = `${req.protocol}://${req.get("host")}${imagePath}`;

  return res.status(201).json({
    success: true,
    data: {
      imagePath,
      imageUrl,
      filename: req.file.filename,
    },
  });
};

const uploadCategoryImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Image file is required",
    });
  }

  const imagePath = `/uploads/categories/${req.file.filename}`;
  const imageUrl = `${req.protocol}://${req.get("host")}${imagePath}`;

  return res.status(201).json({
    success: true,
    data: {
      imagePath,
      imageUrl,
      filename: req.file.filename,
    },
  });
};

const uploadBrandImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Image file is required",
    });
  }

  const imagePath = `/uploads/brands/${req.file.filename}`;
  const imageUrl = `${req.protocol}://${req.get("host")}${imagePath}`;

  return res.status(201).json({
    success: true,
    data: {
      imagePath,
      imageUrl,
      filename: req.file.filename,
    },
  });
};

module.exports = {
  uploadProductImage,
  uploadCategoryImage,
  uploadBrandImage,
};
