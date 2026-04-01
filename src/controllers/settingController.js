const StoreSetting = require("../models/StoreSetting");

const DEFAULT_KEY = "default";

const getOrCreateSettings = async () => {
  let settings = await StoreSetting.findOne({ key: DEFAULT_KEY });

  if (!settings) {
    settings = await StoreSetting.create({ key: DEFAULT_KEY });
  }

  return settings;
};

const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: {
        deliveryCharge: Number(settings.deliveryCharge || 0),
        whatsappNumber: settings.whatsappNumber || "",
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAdminSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return next(error);
  }
};

const updateAdminSettings = async (req, res, next) => {
  try {
    const { deliveryCharge, whatsappNumber } = req.body;
    const settings = await getOrCreateSettings();

    if (deliveryCharge !== undefined) {
      const normalizedCharge = Number(deliveryCharge);
      if (Number.isNaN(normalizedCharge) || normalizedCharge < 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery charge must be a valid non-negative number",
        });
      }
      settings.deliveryCharge = normalizedCharge;
    }

    if (whatsappNumber !== undefined) {
      settings.whatsappNumber = String(whatsappNumber || "").trim();
    }

    const saved = await settings.save();

    return res.status(200).json({
      success: true,
      message: "Store settings updated successfully",
      data: saved,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
};
