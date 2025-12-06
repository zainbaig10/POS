import express from "express";
import {
  createSale,
  getAllSales,
  getSaleById,
  updateSale,
  deleteSale,
} from "../controller/saleController.js";
import {
  createSaleValidator,
  getSaleByIdValidator,
  updateSaleValidator,
  deleteSaleValidator,
} from "../validators/saleValidator.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

router.post("/create", createSaleValidator, validate, createSale);
router.get("/getAll", getAllSales);
router.get("/getById/:id", getSaleByIdValidator, validate, getSaleById);
router.patch("/update/:id", updateSaleValidator, validate, updateSale);
router.delete("/delete/:id", deleteSaleValidator, validate, deleteSale);

export default router;
