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
import Invoice from "../schemas/invoiceSchema.js";
import logger from "../utils/logger.js";
// Create Sale
export const createSale = asyncHandler(async (req, res) => {
  // 1️⃣ Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) return handleErrorResponse(res, errors.array());

  const { product, weight, quantity, sellingPrice, purchasePrice } = req.body;

  // 2️⃣ Check product existence
  const prod = await Product.findById(product);
  if (!prod) return handleErrorResponse(res, "Product", product);

  // 3️⃣ Calculate amounts assuming sellingPrice includes VAT
  const totalSale = +(sellingPrice * quantity).toFixed(2); // VAT-inclusive
  const netAmount = +(totalSale / 1.15).toFixed(2); // Net before VAT
  const vatAmount = +(totalSale - netAmount).toFixed(2); // VAT amount
  const profit = +(netAmount - purchasePrice * quantity).toFixed(2);

  // 4️⃣ Create sale document
  const sale = await Sale.create({
    product,
    weight: weight || 0,
    quantity,
    sellingPrice,
    purchasePrice,
    netAmount,
    vatPercentage: 15,
    vatAmount,
    totalWithVat: totalSale,
    profit,
  });

  // 5️⃣ Send response
  return handleSuccessResponse(res, "Sale created successfully", sale);
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

export const getVatSummary = asyncHandler(async (req, res) => {
  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [todayVat, monthVat, yearVat] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfToday }, status: "ACTIVE" } },
      { $group: { _id: null, totalVat: { $sum: "$vatAmount" } } },
    ]),

    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, status: "ACTIVE" } },
      { $group: { _id: null, totalVat: { $sum: "$vatAmount" } } },
    ]),

    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfYear }, status: "ACTIVE" } },
      { $group: { _id: null, totalVat: { $sum: "$vatAmount" } } },
    ]),
  ]);

  return handleSuccessResponse(res, "VAT summary fetched", {
    todayVat: todayVat[0]?.totalVat || 0,
    monthVat: monthVat[0]?.totalVat || 0,
    yearVat: yearVat[0]?.totalVat || 0,
  });
});

export const getVatInvoicePreview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id)
    .populate({
      path: "sales",
      populate: { path: "product" },
    })
    .lean();

  if (!invoice) return sendNotFound(res, "Invoice", id);

  // Return structured VAT breakdown for preview
  return handleSuccessResponse(res, "Invoice VAT preview", {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.createdAt,
    customerName: invoice.customerName || "N/A",

    totals: {
      totalNetAmount: invoice.totalNetAmount,
      totalVatAmount: invoice.totalVatAmount,
      totalAmount: invoice.totalAmount,
      totalProfit: invoice.totalProfit,
    },

    items: invoice.sales.map((s) => ({
      productName: s.product?.name,
      quantity: s.quantity,
      sellingPrice: s.sellingPrice,
      netAmount: s.netAmount,
      vatPercentage: s.vatPercentage,
      vatAmount: s.vatAmount,
      totalWithVat: s.totalWithVat,
    })),

    qrCode: invoice.qrCode || null, // ZATCA QR ready
  });
});

export const getDashboardStats = async (req, res) => {
  try {
    const result = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$netAmount" },
          totalRevenue: { $sum: "$totalWithVat" },
          totalProfit: { $sum: "$profit" },
        },
      },
    ]);

    const data = result[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalProfit: 0,
    };

    logger.info("Fetched dashboard statistics");

    return res.status(200).json({
      success: true,
      msg: "Dashboard stats fetched successfully",
      data,
    });
  } catch (error) {
    console.log(error);
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      msg: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

export const getRecentOrders = async (req, res) => {
  try {
    const { limit = 10, status } = req.query; // default 10 orders

    const filter = {};
    if (status) filter.status = status;

    const recentOrders = await Sale.find(filter)
      .populate("product", "name price") // include product details
      .populate("invoiceId", "invoiceNumber") // include invoice info if needed
      .sort({ createdAt: -1 }) // newest first
      .limit(Number(limit));

    logger.info("Fetched recent orders");

    return res.status(200).json({
      success: true,
      msg: "Recent orders fetched successfully",
      data: recentOrders,
    });
  } catch (error) {
    console.log(error);
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      msg: "Failed to fetch recent orders",
      error: error.message,
    });
  }
};

export const getDailyRevenue = async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    // Set start/end times
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    // Aggregate sales
    const results = await Sale.aggregate([
      {
        $facet: {
          today: [
            { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$netAmount" },
                totalRevenue: { $sum: "$totalWithVat" },
              },
            },
          ],
          yesterday: [
            {
              $match: {
                createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
              },
            },
            {
              $group: {
                _id: null,
                totalSales: { $sum: "$netAmount" },
                totalRevenue: { $sum: "$totalWithVat" },
              },
            },
          ],
        },
      },
    ]);

    const todayData = results[0].today[0] || { totalSales: 0, totalRevenue: 0 };
    const yesterdayData = results[0].yesterday[0] || {
      totalSales: 0,
      totalRevenue: 0,
    };

    logger.info("Fetched today and yesterday revenue stats");

    return res.status(200).json({
      success: true,
      msg: "Daily revenue fetched successfully",
      data: {
        today: todayData,
        yesterday: yesterdayData,
      },
    });
  } catch (error) {
    console.log(error);
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      msg: "Failed to fetch daily revenue",
      error: error.message,
    });
  }
};
