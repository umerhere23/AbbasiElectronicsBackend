const InventoryLog = require("../models/InventoryLog");

const getInventoryLogs = async (req, res, next) => {
  try {
    const { productId, type, search } = req.query;

    const filter = {};
    if (productId) {
      filter.product = productId;
    }
    if (type) {
      filter.type = type;
    }

    const logs = await InventoryLog.find(filter)
      .populate("product", "name category")
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(300);

    const filteredLogs = search
      ? logs.filter((log) => {
          const haystack = `${log.product?.name || ""} ${log.note || ""} ${log.type || ""}`.toLowerCase();
          return haystack.includes(String(search).toLowerCase());
        })
      : logs;

    return res.status(200).json({
      success: true,
      count: filteredLogs.length,
      data: filteredLogs,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getInventoryLogs,
};
