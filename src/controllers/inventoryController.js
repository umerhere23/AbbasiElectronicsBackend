const { InventoryLog } = require("../models");

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

    const logs = await InventoryLog.findAll({
      where: filter,
      order: [["createdAt", "DESC"]],
      limit: 300,
    });

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
