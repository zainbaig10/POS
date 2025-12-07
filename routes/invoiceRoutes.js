import express from "express";
import {
  createInvoice,
  getAllInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} from "../controller/invoiceController.js";
import {
  getInvoiceXml,
  submitInvoiceToSandbox,
} from "../controller/invoiceXmlController.js";
import { finalizeInvoicePhase2 } from "../controller/invoicePhase2Controller.js";
import {
  validateCreateInvoice,
  validateUpdateInvoice,
  validateGetInvoiceById,
  validateDeleteInvoice,
} from "../validators/invoiceValidator.js";
import { validate } from "../middleware/validate.js";
import {
  authenticateJWT,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/create",
  authenticateJWT,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateCreateInvoice,
  validate,
  createInvoice
);

router.get(
  "/getAll",
  authenticateJWT,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getAllInvoices
);

router
  .route("/getById/:id")
  .get(
    authenticateJWT,
    authorizeRoles("SUPER_ADMIN", "ADMIN"),
    validateGetInvoiceById,
    validate,
    getInvoiceById
  );
router
  .route("/update/:id")
  .patch(
    authenticateJWT,
    authorizeRoles("SUPER_ADMIN", "ADMIN"),
    validateUpdateInvoice,
    validate,
    updateInvoice
  );
router
  .route("/delete/:id")
  .delete(
    authenticateJWT,
    authorizeRoles("SUPER_ADMIN", "ADMIN"),
    validateDeleteInvoice,
    validate,
    deleteInvoice
  );

router.get(
  "/:id/xml",
  authenticateJWT,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  getInvoiceXml
);

router.post(
  "/:id/finalize",
  authenticateJWT,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  finalizeInvoicePhase2
);

router.get("/:id/submit-sandbox", submitInvoiceToSandbox);

export default router;
