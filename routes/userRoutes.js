import express from "express";
import { validate } from "../middleware/validate.js";

import {
  validateChangePassword,
  validateCreateUser,
  validateDeleteUserById,
  validateForgotPassword,
  validateGetUserById,
  validateLogin,
  validateResetPassword,
  validateUpdateUserById,
} from "../validators/userValidator.js";

import {
  createUser,
  login,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  changePassword,
  forgotPassword,
  resetPasswordByAdmin,
} from "../controller/userController.js";

import {
  authenticateJWT,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.route("/createUser").post(
  // authenticateJWT,
  // authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateCreateUser,
  validate,
  createUser
);

userRouter.route("/login").post(validateLogin, login);

userRouter.route("/getAllUsers").get(getAllUsers);

userRouter
  .route("/getById/:id")
  .get(authenticateJWT, validateGetUserById, validate, getUserById);

userRouter
  .route("/updateById/:id")
  .patch(
    authenticateJWT,
    authorizeRoles("SUPERADMIN", "ADMIN"),
    validateUpdateUserById,
    validate,
    updateUserById
  );

userRouter
  .route("/deleteById/:id")
  .delete(
    authenticateJWT,
    authorizeRoles("SUPER_ADMIN", "ADMIN"),
    validateDeleteUserById,
    validate,
    deleteUserById
  );

userRouter
  .route("/changePassword")
  .patch(authenticateJWT, validateChangePassword, changePassword);

userRouter
  .route("/forgotPassword")
  .post(validateForgotPassword, forgotPassword);

userRouter
  .route("/reset-password/:id")
  .patch(
    authenticateJWT,
    authorizeRoles("SUPER_ADMIN", "ADMIN"),
    validateResetPassword,
    validate,
    resetPasswordByAdmin
  );

export default userRouter;
