import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    weight: { type: Number, required: true },
    quantity: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },

    // Net = quantity * sellingPrice
    netAmount: { type: Number, required: true },

    // VAT Fields
    vatPercentage: { type: Number, default: 15 }, // KSA Standard VAT
    vatAmount: { type: Number, required: true }, // netAmount * 0.15
    totalWithVat: { type: Number, required: true }, // netAmount + vatAmount

    // Profit calc stays the same
    profit: { type: Number, required: true },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Sale", saleSchema);
