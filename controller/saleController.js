import asyncHandler from "express-async-handler";
import Sale from "../schemas/saleSchema.js";
import Product from "../schemas/productSchema.js";
import { validationResult } from "express-validator";

// Create Sale
export const createSale = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { product, weight, quantity, sellingPrice, purchasePrice, invoiceId } =
    req.body;

  const prod = await Product.findById(product);
  if (!prod)
    return res.status(404).json({ success: false, msg: "Product not found" });

  const totalSale = sellingPrice * quantity;
  const profit = totalSale - purchasePrice * quantity;

  const sale = await Sale.create({
    product,
    weight,
    quantity,
    sellingPrice,
    purchasePrice,
    totalSale,
    profit,
    invoiceId,
  });

  res
    .status(201)
    .json({ success: true, msg: "Sale created successfully", data: sale });
});

// Get All Sales
export const getAllSales = asyncHandler(async (req, res) => {
  const sales = await Sale.find({ status: "ACTIVE" })
    .populate("product")
    .populate("invoiceId")
    .lean();
  res
    .status(200)
    .json({ success: true, msg: "Sales retrieved successfully", data: sales });
});

// Get Sale by ID
export const getSaleById = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const sale = await Sale.findById(req.params.id)
    .populate("product")
    .populate("invoiceId")
    .lean();
  if (!sale)
    return res.status(404).json({ success: false, msg: "Sale not found" });

  res
    .status(200)
    .json({ success: true, msg: "Sale retrieved successfully", data: sale });
});

// Update Sale
export const updateSale = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const sale = await Sale.findById(req.params.id);
  if (!sale)
    return res.status(404).json({ success: false, msg: "Sale not found" });

  const { weight, quantity, sellingPrice, purchasePrice, status } = req.body;

  if (weight !== undefined) sale.weight = weight;
  if (quantity !== undefined) sale.quantity = quantity;
  if (sellingPrice !== undefined) sale.sellingPrice = sellingPrice;
  if (purchasePrice !== undefined) sale.purchasePrice = purchasePrice;
  if (status !== undefined) sale.status = status;

  // Recalculate totals
  sale.totalSale = sale.sellingPrice * sale.quantity;
  sale.profit = sale.totalSale - sale.purchasePrice * sale.quantity;

  await sale.save();

  res
    .status(200)
    .json({ success: true, msg: "Sale updated successfully", data: sale });
});

// Delete Sale (soft delete)
export const deleteSale = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const sale = await Sale.findById(req.params.id);
  if (!sale)
    return res.status(404).json({ success: false, msg: "Sale not found" });

  sale.status = "CANCELLED";
  await sale.save();

  res
    .status(200)
    .json({ success: true, msg: "Sale cancelled successfully", data: sale });
});
