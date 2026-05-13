const { StoreSetting } = require("../models");

const DEFAULT_KEY = "default";

const getOrCreateSettings = async () => {
  let settings = await StoreSetting.findOne({ where: { key: DEFAULT_KEY } });

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
        smallDeliveryCharge: Number(settings.smallDeliveryCharge || 0),
        bigDeliveryCharge: Number(settings.bigDeliveryCharge || 0),
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
    const { smallDeliveryCharge, bigDeliveryCharge, deliveryCharge, whatsappNumber } = req.body;
    const settings = await getOrCreateSettings();

    const normalizeCharge = (value, label) => {
      const normalized = Number(value);
      if (Number.isNaN(normalized) || normalized < 0) {
        throw new Error(`${label} must be a valid non-negative number`);
      }
      return normalized;
    };

    try {
      if (smallDeliveryCharge !== undefined) {
        settings.smallDeliveryCharge = normalizeCharge(smallDeliveryCharge, "Small delivery charge");
      }

      if (bigDeliveryCharge !== undefined) {
        settings.bigDeliveryCharge = normalizeCharge(bigDeliveryCharge, "Big delivery charge");
      }

      if (deliveryCharge !== undefined) {
        settings.deliveryCharge = normalizeCharge(deliveryCharge, "Delivery charge");
      }

      if (whatsappNumber !== undefined) {
        settings.whatsappNumber = String(whatsappNumber || "").trim();
      }
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message,
      });
    }

    await settings.save();
    const saved = await settings.reload();

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
