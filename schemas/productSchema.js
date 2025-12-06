const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    // unit can be "weight" or "piece"
    unit: {
      type: String,
      enum: ["WEIGHT", "PIECE"],
      required: true,
    },

    // weight is only needed when unit = weight
    weight: {
      type: Number, // in grams or kg depending on your decision
      required: function () {
        return this.unit === "WEIGHT";
      },
    },

    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },

    stock: { type: Number, default: 0 },

    image: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
