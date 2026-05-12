const { InventoryLog } = require("../models");

const recordInventoryLog = async ({
  productId,
  type,
  quantityChange,
  previousStock,
  newStock,
  note = "",
  referenceType = "",
  referenceId = "",
  performedBy = null,
}) => {
  await InventoryLog.create({
    product: productId,
    type,
    quantityChange,
    previousStock,
    newStock,
    note,
    referenceType,
    referenceId,
    performedBy,
  });
};

module.exports = {
  recordInventoryLog,
};
