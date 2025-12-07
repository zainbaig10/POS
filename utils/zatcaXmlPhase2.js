// utils/zatcaXmlPhase2.js
import { create } from "xmlbuilder2";
import dayjs from "dayjs";

/**
 * Build full UBL 2.1 Invoice XML with Phase-2 extensions (Signature, hashes, QR TLV, cert)
 * params.invoice must have:
 *  - uuid, currentInvoiceHash, previousInvoiceHash, signature (base64), publicKey (pem), qrCode (base64 TLV)
 *  - sales populated with product info
 */
export function buildUblInvoiceXmlPhase2({ invoice, seller, customer = null }) {
  const issueDate = dayjs(invoice.createdAt).format("YYYY-MM-DD");
  const issueTime = dayjs(invoice.createdAt).format("HH:mm:ss");
  const invoiceId = String(invoice.invoiceNumber || invoice._id);
  const currency = invoice.currency || "SAR";

  const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("Invoice", {
    xmlns: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
    "xmlns:cac":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
    "xmlns:cbc":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "xmlns:ext":
      "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
    "xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
    "xmlns:sac":
      "urn:oasis:names:specification:ubl:schema:xsd:AdditionalAggregateComponents-2",
  });

  doc.ele("cbc:UBLVersionID").txt("2.1").up();
  doc.ele("cbc:CustomizationID").txt("urn:cen.eu:en16931:2017").up();
  doc.ele("cbc:ProfileID").txt("SaudiInvoice").up();
  doc.ele("cbc:ID").txt(invoiceId).up();
  doc.ele("cbc:CopyIndicator").txt("false").up();
  doc.ele("cbc:IssueDate").txt(issueDate).up();
  doc.ele("cbc:IssueTime").txt(issueTime).up();
  doc.ele("cbc:InvoiceTypeCode").txt("380").up();
  doc.ele("cbc:DocumentCurrencyCode").txt(currency).up();

  // UBLExtensions - Phase2 container
  const ublExt = doc.ele("ext:UBLExtensions");

  // 1) extension: placeholder for SignedProperties / signature timestamp etc.
  const ext1 = ublExt.ele("ext:UBLExtension").ele("ext:ExtensionContent");
  // put signed properties placeholder (could include timestamp)
  ext1
    .ele("sac:SignedProperties")
    .ele("sac:SigningTime")
    .txt(issueDate + "T" + issueTime)
    .up()
    .up()
    .up();

  // 2) extension: digital signature info (we'll include signature value and key info)
  const ext2 = ublExt.ele("ext:UBLExtension").ele("ext:ExtensionContent");
  // embed basic ds:Signature element (simple representation)
  const dsig = ext2.ele("ds:Signature");
  dsig
    .ele("ds:SignedInfo")
    .ele("ds:CanonicalizationMethod", {
      Algorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
    })
    .up()
    .up();
  // SignatureValue
  dsig
    .ele("ds:SignatureValue")
    .txt(invoice.signature || "")
    .up();
  // KeyInfo with public key in PEM
  const ki = dsig.ele("ds:KeyInfo");
  const x509 = ki.ele("ds:X509Data");
  // For simplicity add the publicKey PEM as X509Certificate element; in real flow you'd include the actual certificate base64 without headers
  x509
    .ele("ds:X509Certificate")
    .txt(
      (invoice.publicKey || "")
        .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "")
        .replace(/\n/g, "")
    )
    .up();
  ki.up();
  dsig.up();
  ext2.up();

  // 3) extension: ZATCA custom properties - previous/current hash, uuid, QR TLV base64
  const ext3 = ublExt.ele("ext:UBLExtension").ele("ext:ExtensionContent");
  const zatca = ext3.ele("sac:InvoiceReference");
  zatca
    .ele("sac:UUID")
    .txt(invoice.uuid || "")
    .up();
  zatca
    .ele("sac:PreviousInvoiceHash")
    .txt(invoice.previousInvoiceHash || "")
    .up();
  zatca
    .ele("sac:CurrentInvoiceHash")
    .txt(invoice.currentInvoiceHash || "")
    .up();
  zatca
    .ele("sac:Signature")
    .txt(invoice.signature || "")
    .up();
  // QR TLV (base64) as node
  zatca
    .ele("sac:QRCode")
    .txt(invoice.qrCode || "")
    .up();
  ext3.up();

  ublExt.up();

  // Supplier (same as previous builder)
  const supplier = doc.ele("cac:AccountingSupplierParty").ele("cac:Party");
  supplier.ele("cac:PartyName").ele("cbc:Name").txt(seller.shopName).up().up();
  supplier
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
  const addr = supplier.ele("cac:PostalAddress");
  if (seller.address) addr.ele("cbc:StreetName").txt(seller.address).up();
  if (seller.phone) addr.ele("cbc:Telephone").txt(seller.phone).up();
  addr.up();
  supplier.up().up();

  // Customer
  if (customer && (customer.name || customer.trn)) {
    const customerEle = doc.ele("cac:AccountingCustomerParty").ele("cac:Party");
    if (customer.name)
      customerEle
        .ele("cac:PartyName")
        .ele("cbc:Name")
        .txt(customer.name)
        .up()
        .up();
    if (customer.trn)
      customerEle
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
    if (customer.address) {
      const caddr = customerEle.ele("cac:PostalAddress");
      caddr.ele("cbc:StreetName").txt(customer.address).up();
      caddr.up();
    }
    customerEle.up().up();
  }

  // TaxTotal + LegalMonetaryTotal and InvoiceLines (same as earlier builder)
  const taxTotal = doc.ele("cac:TaxTotal");
  taxTotal
    .ele("cbc:TaxAmount", { currencyID: currency })
    .txt(invoice.totalVatAmount.toFixed(2))
    .up();
  const taxSubTotal = taxTotal.ele("cac:TaxSubtotal");
  taxSubTotal
    .ele("cbc:TaxableAmount", { currencyID: currency })
    .txt(invoice.totalNetAmount.toFixed(2))
    .up();
  taxSubTotal
    .ele("cbc:TaxAmount", { currencyID: currency })
    .txt(invoice.totalVatAmount.toFixed(2))
    .up();
  taxSubTotal
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
  taxTotal.up();

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

  let lineId = 1;
  for (const s of invoice.sales) {
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

    const price = line.ele("cac:Price");
    price
      .ele("cbc:PriceAmount", { currencyID: currency })
      .txt((s.totalWithVat / s.quantity).toFixed(2))
      .up();
    price.up();

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

    line.up();
  }

  const xml = doc.end({ prettyPrint: true });
  return xml;
}
