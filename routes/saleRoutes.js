import express from "express";
import {
  createSale,
  getAllSales,
  getSaleById,
  updateSale,
  deleteSale,
  getTodaySummary,
  getSalesByDateRange,
  getBestSellingProducts,
  getDailySales,
  getMonthlySalesSummary,
} from "../controller/saleController.js";
import {
  createSaleValidator,
  getSaleByIdValidator,
  updateSaleValidator,
  deleteSaleValidator,
} from "../validators/saleValidator.js";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/create", createSaleValidator, validate, createSale);
router.get("/getAll", getAllSales);
router.get("/getById/:id", getSaleByIdValidator, validate, getSaleById);
router.patch("/update/:id", updateSaleValidator, validate, updateSale);
router.delete("/delete/:id", deleteSaleValidator, validate, deleteSale);
router.get(
  "/today",
  authenticateJWT,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getTodaySummary
);

router.get(
  "/range",
  authenticateJWT,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getSalesByDateRange
);

router.get(
  "/best-selling",
  authenticateJWT,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getBestSellingProducts
);

router.get(
  "/daily",
  authenticateJWT,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getDailySales
);

router.get(
  "/monthly",
  authenticateJWT,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getMonthlySalesSummary
);

export default router;
