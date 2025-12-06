import asyncHandler from "express-async-handler";
import Sale from "../schemas/saleSchema.js";
import Product from "../schemas/productSchema.js";
import { validationResult } from "express-validator";
import dayjs from "dayjs";
import {
  handleAlreadyExists,
  handleErrorResponse,
  handleSuccessResponse,
} from "../utils/responseHandlers.js";
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

export const getTodaySummary = asyncHandler(async (req, res) => {
  const start = dayjs().startOf("day").toDate();
  const end = dayjs().endOf("day").toDate();

  const sales = await Sale.find({
    status: "ACTIVE",
    createdAt: { $gte: start, $lte: end },
  });

  const totalSales = sales.reduce((sum, s) => sum + s.totalSale, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  return handleSuccessResponse(res, "Today's summary", {
    totalSales,
    totalProfit,
    totalOrders: sales.length,
  });
});

// ------------------ 2. DATE RANGE ANALYTICS ------------------
export const getSalesByDateRange = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return handleNotFound(res, "from and to dates are required", 400);
  }

  const sales = await Sale.find({
    status: "ACTIVE",
    createdAt: { $gte: new Date(from), $lte: new Date(to) },
  });

  const totalSales = sales.reduce((sum, s) => sum + s.totalSale, 0);
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  return handleSuccessResponse(res, "Sales analytics", {
    totalSales,
    totalProfit,
    totalOrders: sales.length,
    avgOrderValue: sales.length ? totalSales / sales.length : 0,
  });
});

// ------------------ 3. BEST SELLING PRODUCTS ------------------
export const getBestSellingProducts = asyncHandler(async (req, res) => {
  const data = await Sale.aggregate([
    { $match: { status: "ACTIVE" } },
    {
      $group: {
        _id: "$product",
        totalQuantity: { $sum: "$quantity" },
        totalWeight: { $sum: "$weight" },
        totalSales: { $sum: "$totalSale" },
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 10 },
  ]);

  return handleSuccessResponse(res, "Top selling products", data);
});

// ------------------ 4. DAILY SALES (LAST 7 OR 30 DAYS) ------------------
export const getDailySales = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 7;

  const startDate = dayjs().subtract(days, "day").startOf("day").toDate();

  const data = await Sale.aggregate([
    { $match: { status: "ACTIVE", createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        totalSales: { $sum: "$totalSale" },
        totalProfit: { $sum: "$profit" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return handleSuccessResponse(res, "Daily sales chart", data);
});

// ------------------ 5. MONTHLY SUMMARY ------------------
export const getMonthlySalesSummary = asyncHandler(async (req, res) => {
  const data = await Sale.aggregate([
    { $match: { status: "ACTIVE" } },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalSales: { $sum: "$totalSale" },
        totalProfit: { $sum: "$profit" },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  return handleSuccessResponse(res, "Monthly sales summary", data);
});
