const { InventoryLog, Product } = require("../models");

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
  // optional explicit fields
  productName: explicitProductName,
  action: explicitAction,
  quantity: explicitQuantity,
  reference = "",
  details = "",
}) => {
  // Determine productName: prefer explicit, else fetch product
  let productName = explicitProductName || "";
  if (!productName && productId) {
    try {
      const prod = await Product.findByPk(productId, { attributes: ["name"] });
      if (prod && prod.name) productName = prod.name;
    } catch (e) {
      // ignore lookup errors
    }
  }

  if (!productName) productName = reference || "Unknown Product";

  // Determine action
  let action = explicitAction || type || "update";
  // Normalize some common types
  if (action === "manual_add") action = "add";
  if (action === "manual_remove") action = "remove";

  // Determine quantity: prefer explicit, else derive from quantityChange or stock diff
  let quantity = explicitQuantity;
  if (quantity === undefined || quantity === null) {
    if (typeof quantityChange === "number") quantity = Math.abs(Number(quantityChange));
    else if (typeof previousStock === "number" && typeof newStock === "number") quantity = Math.abs(newStock - previousStock);
    else quantity = 0;
  }

  // Ensure integer
  quantity = Number.isNaN(Number(quantity)) ? 0 : Math.round(Number(quantity));

  await InventoryLog.create({
    productId: productId || null,
    type: type || null,
    quantityChange: typeof quantityChange === "number" ? quantityChange : null,
    previousStock: typeof previousStock === "number" ? previousStock : null,
    newStock: typeof newStock === "number" ? newStock : null,
    note,
    referenceType,
    referenceId,
    performedBy,
    productName,
    action,
    quantity,
    reference,
    details,
  });
};

module.exports = {
  recordInventoryLog,
};
