// controllers/invoicePhase2Controller.js
import asyncHandler from "express-async-handler";
import Invoice from "../schemas/invoiceSchema.js";
import Sale from "../schemas/saleSchema.js";
import Settings from "../schemas/settingsSchema.js";
import { signHashBase64, getPublicKey } from "../utils/zatcaSign.js";
import { buildUblInvoiceXmlPhase2 } from "../utils/zatcaXmlPhase2.js";
import {
  handleSuccessResponse,
  handleNotFound,
  handleErrorResponse,
} from "../utils/responseHandlers.js";

export const finalizeInvoicePhase2 = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return handleNotFound(res, "Invoice id required");

  // load invoice with sales & product
  const invoice = await Invoice.findById(id).populate({
    path: "sales",
    populate: { path: "product" },
  });
  if (!invoice) return handleNotFound(res, "Invoice not found");

  // ensure we have currentInvoiceHash calculated
  if (!invoice.currentInvoiceHash)
    return handleNotFound(res, "Invoice hash missing");

  // create signature (base64)
  const signatureBase64 = signHashBase64(invoice.currentInvoiceHash);

  // update invoice with signature and publicKey (if not present)
  invoice.signature = signatureBase64;
  if (!invoice.publicKey) invoice.publicKey = getPublicKey();
  await invoice.save();

  // load seller settings
  const seller = await Settings.findOne().lean();
  if (!seller) return handleNotFound(res, "Settings not configured");

  // Build final XML
  try {
    // convert mongoose document to plain object for builder (it accepts populated sales)
    const invoiceObj = invoice.toObject ? invoice.toObject() : invoice;
    const xml = buildUblInvoiceXmlPhase2({
      invoice: invoiceObj,
      seller,
      customer: { name: invoiceObj.customerName },
    });

    // optional: save to tmp file for inspection
    // fs.writeFileSync(`./tmp/invoice-${invoice.invoiceNumber}.xml`, xml, "utf8");

    res.set("Content-Type", "application/xml");
    return res.status(200).send(xml);
  } catch (err) {
    return handleErrorResponse(res, err, "Failed to build signed invoice XML");
  }
});
