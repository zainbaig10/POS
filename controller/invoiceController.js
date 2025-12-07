import asyncHandler from "express-async-handler";
import Invoice from "../schemas/invoiceSchema.js";
import Sale from "../schemas/saleSchema.js";
import mongoose from "mongoose";
import { validationResult } from "express-validator";
import {
  handleErrorResponse,
  handleAlreadyExists,
  handleSuccessResponse,
} from "../utils/responseHandlers.js";
import Settings from "../schemas/settingsSchema.js";
import { generateZatcaTLV } from "../utils/zatca.js";
import { generateInvoiceNumber } from "../utils/generateInvoiceNumber.js";
import { v4 as uuidv4 } from "uuid";
import {
  generateInvoiceHash,
  signInvoiceHash,
  getPublicKey,
} from "../utils/zatcaPhase2.js";
import product from "../schemas/productSchema.js";

// Generate next invoice number (simple increment, replace with better logic in prod)

export const createInvoice = asyncHandler(async (req, res) => {
  // 1️⃣ Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendBadRequest(res, errors.array());

  const { sales, customerName } = req.body;

  // 2️⃣ Fetch sale items
  const salesDocs = await Sale.find({ _id: { $in: sales } }).lean();
  if (salesDocs.length !== sales.length)
    return sendBadRequest(res, "Some sales not found");

  // 3️⃣ Calculate totals
  const totalNetAmount = salesDocs.reduce((acc, s) => acc + s.netAmount, 0);
  const totalVatAmount = salesDocs.reduce((acc, s) => acc + s.vatAmount, 0);
  const totalAmount = salesDocs.reduce((acc, s) => acc + s.totalWithVat, 0);
  const totalProfit = salesDocs.reduce((acc, s) => acc + s.profit, 0);

  // 4️⃣ Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // -------------------------------------------------------------
  // ⚠️ CRITICAL FIX:
  // You were fetching LAST INVOICE *after* inserting new invoice.
  // But your new invoice becomes "last", making chaining WRONG.
  // -------------------------------------------------------------

  const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  const previousInvoiceHash = lastInvoice
    ? lastInvoice.currentInvoiceHash
    : null;

  // 5️⃣ Create invoice document FIRST (minimal fields only)
  const invoice = await Invoice.create({
    invoiceNumber,
    sales,
    totalNetAmount,
    totalVatAmount,
    totalAmount,
    totalProfit,
    customerName,
    previousInvoiceHash,
  });

  // 6️⃣ Generate ZATCA TLV QR code
  const settings = await Settings.findOne();
  if (settings) {
    invoice.qrCode = generateZatcaTLV(
      settings.shopName,
      settings.trn,
      invoice.createdAt.toISOString(),
      invoice.totalAmount,
      invoice.totalVatAmount
    );
  }

  // 7️⃣ Phase-2: Generate invoice hash + signature
  const invoiceDataForHash = {
    uuid: invoice.uuid, // include UUID in hash
    invoiceNumber,
    sales,
    totalNetAmount,
    totalVatAmount,
    totalAmount,
    totalProfit,
    customerName,
    createdAt: invoice.createdAt.toISOString(),
  };

  // Generate current invoice hash
  const currentInvoiceHash = generateInvoiceHash(invoiceDataForHash);

  // Digitally sign the hash (ECC / ECDSA)
  const signature = signInvoiceHash(currentInvoiceHash);

  // Load stored public key to attach into invoice
  const publicKey = getPublicKey();

  // 8️⃣ Add Phase-2 data
  invoice.uuid = uuidv4();
  invoice.currentInvoiceHash = currentInvoiceHash;
  invoice.signature = signature;
  invoice.publicKey = publicKey;

  // 9️⃣ Save final invoice with signature + QR
  await invoice.save();

  // 🔟 Send response
  return handleSuccessResponse(res, "Invoice created successfully", invoice);
});

export const getAllInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find().populate("sales").lean();
  res.status(200).json({ success: true, data: invoices });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id)
    .populate({
      path: "sales",
      populate: {
        path: "product",
        model: "Product",
        select: "name unit weight sellingPrice",
      },
    })
    .lean();

  if (!invoice)
    return res.status(404).json({
      success: false,
      msg: "Invoice not found",
    });

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
