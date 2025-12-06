import asyncHandler from "express-async-handler";
import Invoice from "../schemas/invoiceSchema.js";
import Sale from "../schemas/saleSchema.js";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import {
  handleErrorResponse,
  handleAlreadyExists,
} from "../utils/responseHandlers.js";

// Generate next invoice number (simple increment, replace with better logic in prod)
const generateInvoiceNumber = async () => {
  const lastInvoice = await Invoice.findOne()
    .sort({ invoiceNumber: -1 })
    .lean();
  return lastInvoice ? lastInvoice.invoiceNumber + 1 : 1001;
};

export const createInvoice = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { sales, customerName } = req.body;

  // Fetch sales details
  const salesDocs = await Sale.find({ _id: { $in: sales } }).lean();
  if (salesDocs.length !== sales.length) {
    return res
      .status(400)
      .json({ success: false, msg: "Some sales not found" });
  }

  const totalAmount = salesDocs.reduce((acc, s) => acc + s.totalSale, 0);
  const totalProfit = salesDocs.reduce((acc, s) => acc + s.profit, 0);

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await Invoice.create({
    invoiceNumber,
    sales,
    totalAmount,
    totalProfit,
    customerName,
  });

  res.status(201).json({
    success: true,
    msg: "Invoice created successfully",
    data: invoice,
  });
});

export const getAllInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().populate("sales").lean();
  res.status(200).json({ success: true, data: invoices });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id).populate("sales").lean();
  if (!invoice)
    return res.status(404).json({ success: false, msg: "Invoice not found" });

  res.status(200).json({ success: true, data: invoice });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { id } = req.params;
  const { sales, customerName } = req.body;

  const updateFields = {};

  if (sales) {
    const salesDocs = await Sale.find({ _id: { $in: sales } }).lean();
    if (salesDocs.length !== sales.length)
      return res
        .status(400)
        .json({ success: false, msg: "Some sales not found" });

    updateFields.sales = sales;
    updateFields.totalAmount = salesDocs.reduce(
      (acc, s) => acc + s.totalSale,
      0
    );
    updateFields.totalProfit = salesDocs.reduce((acc, s) => acc + s.profit, 0);
  }

  if (customerName) updateFields.customerName = customerName;

  const updatedInvoice = await Invoice.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).lean();
  if (!updatedInvoice)
    return res.status(404).json({ success: false, msg: "Invoice not found" });

  res.status(200).json({
    success: true,
    msg: "Invoice updated successfully",
    data: updatedInvoice,
  });
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Invoice.findByIdAndDelete(id).lean();
  if (!deleted)
    return res.status(404).json({ success: false, msg: "Invoice not found" });

  res.status(200).json({ success: true, msg: "Invoice deleted successfully" });
});
