import asyncHandler from "express-async-handler";
import Invoice from "../schemas/invoiceSchema.js";
import Sale from "../schemas/saleSchema.js";
import Settings from "../schemas/settingsSchema.js";
import { buildUblInvoiceXml } from "../utils/zatcaXml.js";
import fs from "fs";
import path from "path";
import {
  handleSuccessResponse,
  handleNotFound,
  handleErrorResponse,
} from "../utils/responseHandlers.js";
import escape from "lodash.escape";
import mongoose from "mongoose";

/**
 * GET /api/invoice/:id/xml
 * Returns the UBL 2.1 XML for the invoice (populated sales & product info).
 */
// Escape XML special characters safely
const escapeXml = (str) => (str ? escape(str) : "");

// Main function to generate XML
export const getInvoiceXml = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch invoice from DB
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, msg: "Invoice not found" });
    }

    // Convert createdAt to ISO date for IssueDate
    const issueDate = invoice.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
    const issueTime = invoice.createdAt
      .toISOString()
      .split("T")[1]
      .split(".")[0]; // HH:MM:SS

    // Hardcode supplier info (replace with your real company info)
    const supplierName = "Your Company Name";
    const supplierTaxId = "123456789";

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
    <cbc:ProfileID>SaudiInvoice</cbc:ProfileID>
    <cbc:ID>${invoice._id}</cbc:ID>
    <cbc:CopyIndicator>false</cbc:CopyIndicator>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>

    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${supplierName}</cbc:Name>
            </cac:PartyName>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${supplierTaxId}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyName>
                <cbc:Name>${invoice.customerName}</cbc:Name>
            </cac:PartyName>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${invoice.totalVatAmount.toFixed(
          2
        )}</cbc:TaxAmount>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${invoice.totalNetAmount.toFixed(
          2
        )}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.totalNetAmount.toFixed(
          2
        )}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.totalAmount.toFixed(
          2
        )}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">${invoice.totalAmount.toFixed(
          2
        )}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
</Invoice>`;

    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
