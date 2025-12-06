import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controller/settingsController.js";
import { validateUpdateSettings } from "../validators/settingsValidator.js";
import { validate } from "../middleware/validate.js";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/get",
  authenticateJWT,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getSettings
);

// Update settings
router.patch(
  "/update",
  authenticateJWT,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateUpdateSettings,
  validate,
  updateSettings
);
export default router;
