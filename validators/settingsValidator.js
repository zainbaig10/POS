import { body } from "express-validator";

export const validateUpdateSettings = [
  body("shopName")
    .optional()
    .isString()
    .trim()
    .withMessage("Shop name must be a string"),
  body("trn").optional().isString().trim().withMessage("TRN must be a string"),
  body("address")
    .optional()
    .isString()
    .trim()
    .withMessage("Address must be a string"),
  body("phone")
    .optional()
    .matches(/^[0-9]{9,15}$/)
    .withMessage("Phone must be a valid number with 9-15 digits"),
];
