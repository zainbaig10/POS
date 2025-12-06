import { check, validationResult } from "express-validator";
import { body, param } from "express-validator";
import mongoose from "mongoose";

export const validateCreateUser = [
  // Name
  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .trim(),

  // Email (optional but must be valid if provided)
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .trim(),

  // Phone (optional but must be valid if provided)
  body("phone")
    .optional()
    .matches(/^[0-9]{8,15}$/)
    .withMessage("Phone must be 8–15 digits")
    .trim(),

  // At least one of email OR phone must be present
  body().custom((value) => {
    if (!value.email && !value.phone) {
      throw new Error("Either email or phone is required");
    }
    return true;
  }),

  // Password
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be 6–20 characters long"),

  // Role
  body("role")
    .optional()
    .isIn(["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER"])
    .withMessage("Invalid role provided"),

  // Status
  body("status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE"])
    .withMessage("Status must be ACTIVE or INACTIVE"),
];

export const validateLogin = [
  check("identifier")
    .notEmpty()
    .withMessage("Email or phone is required")
    .bail()
    .custom((value) => {
      const isEmail = /^\S+@\S+\.\S+$/.test(value);
      const isPhone = /^\d{8,15}$/.test(value);
      if (!isEmail && !isPhone) {
        throw new Error("Enter a valid email or phone number");
      }
      return true;
    }),

  check("password").notEmpty().withMessage("Password is required"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => err.msg),
      });
    }
    next();
  },
];

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const validateGetUserById = [
  param("id").custom((value) => {
    if (!isObjectId(value)) {
      throw new Error("Invalid user ID");
    }
    return true;
  }),
];

export const validateUpdateUserById = [
  param("id").isMongoId().withMessage("Invalid user ID"),

  body("name").optional().isString().trim(),
  body("email").optional().isEmail().withMessage("Invalid email"),
  body("phone").optional().isString().trim(),
  body("status").optional().isIn(["ACTIVE", "INACTIVE"]),

  // Forbidden
  body("password").not().exists().withMessage("Password cannot be updated"),
  body("role").not().exists().withMessage("Role cannot be updated"),
];

export const validateDeleteUserById = [
  param("id").isMongoId().withMessage("Valid user ID is required"),
];

export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6, max: 20 })
    .withMessage("Password must be 6-20 characters"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => err.msg),
      });
    }
    next();
  },
];

export const validateForgotPassword = [
  body("identifier").notEmpty().withMessage("Email or phone is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array().map((err) => err.msg),
      });
    }
    next();
  },
];

export const validateResetPassword = [
  param("id").isMongoId().withMessage("Invalid user ID"),
];
