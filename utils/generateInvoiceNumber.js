import Invoice from "../schemas/invoiceSchema.js";

/**
 * Generates the next invoice number in sequence.
 * If no invoices exist yet, starts at 1000.
 */
export const generateInvoiceNumber = async () => {
  // Find the latest invoice
  const lastInvoice = await Invoice.findOne()
    .sort({ invoiceNumber: -1 })
    .lean();

  if (!lastInvoice) return 1000; // starting invoice number

  return lastInvoice.invoiceNumber + 1;
};
