const { Category } = require("../models");

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, image, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existing = await Category.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const category = await Category.create({
      name: name.trim(),
      image,
      description,
      createdBy: req.admin?.id || req.admin?._id,
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, image, description } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({ where: { name: name.trim() } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Category name already in use" });
      }
      category.name = name.trim();
    }

    await category.update({
      image: image ?? category.image,
      description: description ?? category.description,
    });

    const updated = await category.reload();
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByPk(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    await deleted.destroy();

    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteAllCategories = async (req, res, next) => {
  try {
    const result = await Category.destroy({ where: {} });
    res.status(200).json({
      success: true,
      message: `${result} category(s) deleted successfully`,
      data: { deletedCount: result },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  deleteAllCategories,
};
