import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: Number, required: true, unique: true },
    sales: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sale" }],

    // Summary totals
    totalNetAmount: { type: Number, required: true },
    totalVatAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    totalProfit: { type: Number, required: true },

    // ZATCA QR code
    qrCode: { type: String },

    // Phase-2 fields
    previousInvoiceHash: { type: String },
    currentInvoiceHash: { type: String },
    eccSignature: { type: String },
    publicKey: { type: String },
    uuid: { type: String },

    customerName: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
