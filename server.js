import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongooseConnection from "./mongo.js";
import appRoutes from "./routes/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve uploaded product images
app.use("/uploads", express.static("uploads"));

// Database
mongooseConnection();

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "POS Server is running",
  });
});

// Routes
app.use("/api", appRoutes);

// Start server
app.listen(port, () => {
  console.log(`POS Backend running on port ${port}`);
});
