import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProductById,
  deleteProductById,
} from "../controller/productController.js";

import {
  createProductValidator,
  updateProductValidator,
} from "../validators/productValidator.js";

const router = express.Router();

router.post("/create", createProductValidator, createProduct);
router.get("/getAll", getAllProducts);
router.get("/getById/:id", getProductById);
router.put("/update/:id", updateProductValidator, updateProductById);
router.delete("/delete/:id", deleteProductById);

export default router;
