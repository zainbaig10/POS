import { body, param } from "express-validator";
import mongoose from "mongoose";

export const createSaleValidator = [
  body("product")
    .notEmpty()
    .withMessage("Product ID is required")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid product ID"),

  body("weight").optional().isNumeric().withMessage("Weight must be a number"),
  body("quantity").notEmpty().isNumeric().withMessage("Quantity is required"),
  body("sellingPrice")
    .notEmpty()
    .isNumeric()
    .withMessage("Selling price is required"),
  body("purchasePrice")
    .notEmpty()
    .isNumeric()
    .withMessage("Purchase price is required"),
  body("invoiceId")
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid invoice ID"),
];

export const getSaleByIdValidator = [
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid sale ID"),
];

export const updateSaleValidator = [
  param("id")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid sale ID"),
  body("weight").optional().isNumeric().withMessage("Weight must be a number"),
  body("quantity")
    .optional()
    .isNumeric()
    .withMessage("Quantity must be a number"),
  body("sellingPrice")
    .optional()
    .isNumeric()
    .withMessage("Selling price must be a number"),
  body("purchasePrice")
    .optional()
    .isNumeric()
    .withMessage("Purchase price must be a number"),
  body("status")
    .optional()
    .isIn(["ACTIVE", "CANCELLED"])
    .withMessage("Status must be ACTIVE or CANCELLED"),
];

export const deleteSaleValidator = getSaleByIdValidator;
