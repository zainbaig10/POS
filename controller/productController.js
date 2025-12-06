import Product from "../schemas/productSchema.js";
import { validationResult } from "express-validator";

// CREATE PRODUCT
export const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      msg: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create Product Error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// GET ALL PRODUCTS
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get All Products Error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// GET PRODUCT BY ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, msg: "Product not found" });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// UPDATE PRODUCT
export const updateProductById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!product) {
      return res.status(404).json({ success: false, msg: "Product not found" });
    }

    res.status(200).json({
      success: true,
      msg: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update Product Error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

// DELETE PRODUCT
export const deleteProductById = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, msg: "Product not found" });
    }

    res.status(200).json({
      success: true,
      msg: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
