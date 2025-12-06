import { body } from "express-validator";

// Create Product Validator
export const createProductValidator = [
  body("name").notEmpty().withMessage("Name is required"),

  body("unit")
    .notEmpty()
    .withMessage("Unit is required")
    .isIn(["WEIGHT", "PIECE"])
    .withMessage("Unit must be WEIGHT or PIECE"),

  body("weight")
    .custom((value, { req }) => {
      if (
        req.body.unit === "WEIGHT" &&
        (value === undefined || value === null)
      ) {
        throw new Error("Weight is required when unit is WEIGHT");
      }
      return true;
    })
    .optional()
    .isNumeric()
    .withMessage("Weight must be a number"),

  body("purchasePrice")
    .notEmpty()
    .withMessage("Purchase price is required")
    .isNumeric()
    .withMessage("Purchase price must be a number"),

  body("sellingPrice")
    .notEmpty()
    .withMessage("Selling price is required")
    .isNumeric()
    .withMessage("Selling price must be a number"),

  body("stock").optional().isNumeric().withMessage("Stock must be a number"),

  body("image").optional().isString().withMessage("Image must be a string"),
];

// Update Product Validator
export const updateProductValidator = [
  body("unit")
    .optional()
    .isIn(["WEIGHT", "PIECE"])
    .withMessage("Unit must be WEIGHT or PIECE"),

  body("weight").optional().isNumeric().withMessage("Weight must be a number"),

  body("purchasePrice")
    .optional()
    .isNumeric()
    .withMessage("Purchase price must be a number"),

  body("sellingPrice")
    .optional()
    .isNumeric()
    .withMessage("Selling price must be a number"),

  body("stock").optional().isNumeric().withMessage("Stock must be a number"),

  body("image").optional().isString().withMessage("Image must be a string"),
];
