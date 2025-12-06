import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    weight: { type: Number, required: true }, // if unit = weight
    quantity: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    totalSale: { type: Number, required: true }, // quantity * sellingPrice
    profit: { type: Number, required: true }, // totalSale - (quantity * purchasePrice)
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: false,
    },
    status: { type: String, enum: ["ACTIVE", "CANCELLED"], default: "ACTIVE" }, // soft delete
  },
  { timestamps: true }
);

export default mongoose.model("Sale", saleSchema);
