// utils/zatcaXml.js
import { create } from "xmlbuilder2";
import dayjs from "dayjs";

/**
 * Build UBL 2.1 Invoice XML compliant with ZATCA simplified invoice requirements.
 * This is a good, auditable starting point. For full validation use ZATCA XSDs.
 *
 * @param {Object} params
 * @param {Object} params.invoice - invoice document from DB (with totals, sales array populated)
 * @param {Object} params.seller - settings doc: { shopName, trn, address, phone }
 * @param {Object} [params.customer] - optional customer: { name, trn?, address? }
 * @returns {String} XML string (UTF-8)
 */
export function buildUblInvoiceXml({ invoice, seller, customer = null }) {
  // basic vars
  const issueDate = dayjs(invoice.createdAt).format("YYYY-MM-DD");
  const issueTime = dayjs(invoice.createdAt).format("HH:mm:ss");
  const invoiceId = String(invoice.invoiceNumber || invoice._id);
  const currency = invoice.currency || "SAR"; // default SAR

  // root element + namespaces (common UBL 2.1 namespaces)
  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("Invoice", {
    xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "xmlns:cac":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "xmlns:cbc":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "xmlns:ext":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
  });

  // UBL version & profile (ZATCA expects specific customization/profile values)
  doc.ele("cbc:UBLVersionID").txt("2.1").up();
  doc.ele("cbc:CustomizationID").txt("urn:cen.eu:en16931:2017").up(); // or ZATCA supplied
  doc.ele("cbc:ProfileID").txt("SaudiInvoice").up(); // example profile
  doc.ele("cbc:ID").txt(invoiceId).up();
  doc.ele("cbc:CopyIndicator").txt("false").up();
  doc.ele("cbc:IssueDate").txt(issueDate).up();
  doc.ele("cbc:IssueTime").txt(issueTime).up();
  doc.ele("cbc:InvoiceTypeCode").txt("380").up(); // 380 = commercial invoice
  doc.ele("cbc:DocumentCurrencyCode").txt(currency).up();

  // Supplier (Seller)
  const supplier = doc.ele("cac:AccountingSupplierParty");
  const supplierParty = supplier.ele("cac:Party");
  supplierParty
    .ele("cac:PartyName")
    .ele("cbc:Name")
    .txt(seller.shopName)
    .up()
    .up();
  // Supplier Tax Scheme (TRN)
  supplierParty
    .ele("cac:PartyTaxScheme")
    .ele("cbc:CompanyID")
    .txt(seller.trn)
    .up()
    .ele("cac:TaxScheme")
    .ele("cbc:ID")
    .txt("VAT")
    .up()
    .up()
    .up();

  // Supplier postal address
  const addr = supplierParty.ele("cac:PostalAddress");
  if (seller.address) {
    addr.ele("cbc:StreetName").txt(seller.address).up();
  }
  if (seller.phone) addr.ele("cbc:Telephone").txt(seller.phone).up();
  addr.up(); // end PostalAddress
  supplierParty.up(); // end Party
  supplier.up(); // end AccountingSupplierParty

  // Customer (Buyer) - optional for B2C, include name if present
  if (customer && (customer.name || customer.trn)) {
    const customerEle = doc.ele("cac:AccountingCustomerParty");
    const customerParty = customerEle.ele("cac:Party");
    if (customer.name)
      customerParty
        .ele("cac:PartyName")
        .ele("cbc:Name")
        .txt(customer.name)
        .up()
        .up();
    if (customer.trn) {
      customerParty
        .ele("cac:PartyTaxScheme")
        .ele("cbc:CompanyID")
        .txt(customer.trn)
        .up()
        .ele("cac:TaxScheme")
        .ele("cbc:ID")
        .txt("VAT")
        .up()
        .up()
        .up();
    }
    if (customer.address) {
      const caddr = customerParty.ele("cac:PostalAddress");
      caddr.ele("cbc:StreetName").txt(customer.address).up();
      caddr.up();
    }
    customerParty.up();
    customerEle.up();
  }

  // Tax Total (invoice level)
  const taxTotal = doc.ele("cac:TaxTotal");
  taxTotal
    .ele("cbc:TaxAmount", { currencyID: currency })
    .txt(invoice.totalVatAmount.toFixed(2))
    .up();

  // Tax Subtotal (single VAT rate assumed 15%)
  const taxSubTotal = taxTotal.ele("cac:TaxSubtotal");
  taxSubTotal
    .ele("cbc:TaxableAmount", { currencyID: currency })
    .txt(invoice.totalNetAmount.toFixed(2))
    .up();
  taxSubTotal
    .ele("cbc:TaxAmount", { currencyID: currency })
    .txt(invoice.totalVatAmount.toFixed(2))
    .up();
  const taxCategory = taxSubTotal.ele("cac:TaxCategory");
  taxCategory.ele("cbc:ID").txt("S").up(); // S = Standard rate
  taxCategory.ele("cac:TaxScheme").ele("cbc:ID").txt("VAT").up().up();
  taxSubTotal.up(); // end TaxSubtotal
  taxTotal.up(); // end TaxTotal

  // LegalMonetaryTotal
  const monetary = doc.ele("cac:LegalMonetaryTotal");
  monetary
    .ele("cbc:LineExtensionAmount", { currencyID: currency })
    .txt(invoice.totalNetAmount.toFixed(2))
    .up();
  monetary
    .ele("cbc:TaxExclusiveAmount", { currencyID: currency })
    .txt(invoice.totalNetAmount.toFixed(2))
    .up();
  monetary
    .ele("cbc:TaxInclusiveAmount", { currencyID: currency })
    .txt(invoice.totalAmount.toFixed(2))
    .up();
  monetary
    .ele("cbc:PayableAmount", { currencyID: currency })
    .txt(invoice.totalAmount.toFixed(2))
    .up();
  monetary.up();

  // Invoice Lines
  // invoice.sales must be populated with product info and contain per-line net/vat/total
  let lineId = 1;
  for (const s of invoice.sales) {
    // expected sale doc: { quantity, sellingPrice, netAmount, vatAmount, totalWithVat, product: { name } }
    const line = doc.ele("cac:InvoiceLine");
    line.ele("cbc:ID").txt(String(lineId++)).up();
    line
      .ele("cbc:InvoicedQuantity", { unitCode: s.unit || "EA" })
      .txt(String(s.quantity))
      .up();
    line
      .ele("cbc:LineExtensionAmount", { currencyID: currency })
      .txt(s.netAmount.toFixed(2))
      .up();

    // item
    const item = line.ele("cac:Item");
    item
      .ele("cbc:Description")
      .txt(s.product?.name || "Item")
      .up();
    item
      .ele("cac:SellersItemIdentification")
      .ele("cbc:ID")
      .txt(s.product?._id?.toString() || "")
      .up()
      .up();
    item.up();

    // price
    const price = line.ele("cac:Price");
    price
      .ele("cbc:PriceAmount", { currencyID: currency })
      .txt((s.totalWithVat / s.quantity).toFixed(2))
      .up();
    price.up();

    // Tax for line
    const lineTaxTotal = line.ele("cac:TaxTotal");
    lineTaxTotal
      .ele("cbc:TaxAmount", { currencyID: currency })
      .txt(s.vatAmount.toFixed(2))
      .up();
    const lineTaxSubtotal = lineTaxTotal.ele("cac:TaxSubtotal");
    lineTaxSubtotal
      .ele("cbc:TaxableAmount", { currencyID: currency })
      .txt(s.netAmount.toFixed(2))
      .up();
    lineTaxSubtotal
      .ele("cbc:TaxAmount", { currencyID: currency })
      .txt(s.vatAmount.toFixed(2))
      .up();
    lineTaxSubtotal
      .ele("cac:TaxCategory")
      .ele("cbc:ID")
      .txt("S")
      .up()
      .ele("cac:TaxScheme")
      .ele("cbc:ID")
      .txt("VAT")
      .up()
      .up()
      .up();
    lineTaxTotal.up();

    line.up(); // end InvoiceLine
  }

  // Finalize and return pretty XML
  const xml = doc.end({ prettyPrint: true });
  return xml;
}
