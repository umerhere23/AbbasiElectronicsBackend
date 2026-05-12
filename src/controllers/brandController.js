const { Brand } = require("../models");

const getBrands = async (req, res, next) => {
  try {
    const brands = await Brand.findAll({ order: [["name", "ASC"]] });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
};

const createBrand = async (req, res, next) => {
  try {
    const { name, image, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const existing = await Brand.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const brand = await Brand.create({
      name: name.trim(),
      image,
      description,
      createdBy: req.admin?.id || req.admin?._id,
    });

    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, image, description } = req.body;

    const brand = await Brand.findByPk(id);
    if (!brand) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    if (name && name.trim() !== brand.name) {
      const existing = await Brand.findOne({ where: { name: name.trim() } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Brand name already in use" });
      }
      brand.name = name.trim();
    }

    await brand.update({
      image: image ?? brand.image,
      description: description ?? brand.description,
    });

    const updated = await brand.reload();
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Brand.findByPk(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Brand not found" });
    }

    await deleted.destroy();

    res.status(200).json({ success: true, message: "Brand deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteAllBrands = async (req, res, next) => {
  try {
    const result = await Brand.destroy({ where: {} });
    res.status(200).json({
      success: true,
      message: `${result} brand(s) deleted successfully`,
      data: { deletedCount: result },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  deleteAllBrands,
};
