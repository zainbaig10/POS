import { create } from "xmlbuilder2";

export const generateInvoiceXml = (invoice) => {
  const issueDate = invoice.createdAt.toISOString().split("T")[0];
  const issueTime = invoice.createdAt.toISOString().split("T")[1].split(".")[0];

  const xmlObj = {
    Invoice: {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@xmlns:cac":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc":
        "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "cbc:UBLVersionID": "2.1",
      "cbc:CustomizationID": "urn:cen.eu:en16931:2017",
      "cbc:ProfileID": "SaudiInvoice",
      "cbc:ID": invoice._id.toString(),
      "cbc:CopyIndicator": "false",
      "cbc:IssueDate": issueDate,
      "cbc:IssueTime": issueTime,
      "cbc:InvoiceTypeCode": "380",
      "cbc:DocumentCurrencyCode": "SAR",
      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cac:PartyName": { "cbc:Name": process.env.COMPANY_NAME },
          "cac:PartyTaxScheme": {
            "cbc:CompanyID": process.env.COMPANY_VAT,
            "cac:TaxScheme": { "cbc:ID": "VAT" },
          },
        },
      },
      "cac:AccountingCustomerParty": {
        "cac:Party": {
          "cac:PartyName": { "cbc:Name": invoice.customerName },
        },
      },
      "cac:TaxTotal": {
        "cbc:TaxAmount": {
          "@currencyID": "SAR",
          "#": invoice.totalVatAmount.toFixed(2),
        },
      },
      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": {
          "@currencyID": "SAR",
          "#": invoice.totalNetAmount.toFixed(2),
        },
        "cbc:TaxExclusiveAmount": {
          "@currencyID": "SAR",
          "#": invoice.totalNetAmount.toFixed(2),
        },
        "cbc:TaxInclusiveAmount": {
          "@currencyID": "SAR",
          "#": invoice.totalAmount.toFixed(2),
        },
        "cbc:PayableAmount": {
          "@currencyID": "SAR",
          "#": invoice.totalAmount.toFixed(2),
        },
      },
    },
  };

  const xml = create(xmlObj).end({ prettyPrint: true });
  return xml;
};
