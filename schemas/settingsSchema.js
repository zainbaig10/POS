import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, required: true },
    trn: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Settings", settingsSchema);
