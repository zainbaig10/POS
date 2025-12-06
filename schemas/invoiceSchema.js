import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: Number, required: true, unique: true },

    sales: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sale",
      },
    ],

    totalAmount: { type: Number, required: true },
    totalProfit: { type: Number, required: true },

    qrCode: { type: String }, // ZATCA Base64

    customerName: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
