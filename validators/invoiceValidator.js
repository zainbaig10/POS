import { body, param } from "express-validator";
import mongoose from "mongoose";

export const validateCreateInvoice = [
  body("sales")
    .isArray({ min: 1 })
    .withMessage("Sales must be an array with at least one item"),
  body("sales.*")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Each sale must be a valid ObjectId"),
  body("customerName").optional().isString().trim(),
];

export const validateUpdateInvoice = [
  param("id")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid invoice ID"),
  body("sales").optional().isArray(),
  body("sales.*")
    .optional()
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Each sale must be a valid ObjectId"),
  body("customerName").optional().isString().trim(),
];

export const validateGetInvoiceById = [
  param("id")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid invoice ID"),
];

export const validateDeleteInvoice = [
  param("id")
    .custom((val) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("Invalid invoice ID"),
];
