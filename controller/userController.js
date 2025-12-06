import asyncHandler from "express-async-handler";
import User from "../schemas/userSchema.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";
import {
  handleErrorResponse,
  handleSuccessResponse,
  handleAlreadyExists,
  parsePagination,
} from "../utils/responseHandlers.js";
import { generateToken } from "../utils/jwtUtils.js";
import crypto from "crypto";

export const createUser = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { name, email, phone, password, role } = req.body;

    logger.info({
      msg: "USER creation request received",
      email,
      phone,
      ip: req.ip,
    });

    // 1. Check existing user
    const existing = await User.findOne({
      $or: [{ email }, { phone }],
    })
      .lean()
      .session(session);

    if (existing) {
      await session.abortTransaction();
      return handleAlreadyExists(res, "User", email || phone || "email/phone");
    }

    // 2. Create new user
    const [user] = await User.create(
      [
        {
          name,
          email,
          phone,
          password,
          role: role || "CASHIER",
          status: "ACTIVE",
        },
      ],
      { session }
    );

    logger.info({
      msg: "User created successfully",
      userId: user._id,
      email: user.email,
      phone: user.phone,
    });

    await session.commitTransaction();

    return handleSuccessResponse(
      res,
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      "User created successfully"
    );
  } catch (error) {
    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch (err) {
      logger.error("Error aborting transaction", err.message);
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: `Duplicate value for ${Object.keys(error.keyPattern)[0]}`,
      });
    }

    return handleErrorResponse(res, error, "Failed to create user");
  } finally {
    session.endSession();
  }
});

export const login = asyncHandler(async (req, res) => {
  try {
    const { identifier, password } = req.body;

    logger.info({
      msg: "Login request received",
      identifier,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Validation: identifier must be email or phone
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneRegex = /^\d{8,15}$/; // Saudi or general phone

    const isEmail = emailRegex.test(identifier);
    const isPhone = phoneRegex.test(identifier);

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email or phone number.",
      });
    }

    // Find user
    const user = await User.findOne(
      isEmail ? { email: identifier } : { phone: identifier }
    ).select("+password"); // include password field

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/phone or password",
      });
    }

    if (user.status === "INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Contact admin.",
      });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/phone or password",
      });
    }

    // Generate JWT
    const token = generateToken(user);

    logger.info({
      msg: "User login successful",
      userId: user._id,
      role: user.role,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        token,
      },
    });
  } catch (error) {
    logger.error({
      msg: "Error during login",
      error: error.message,
      ip: req.ip,
    });

    return handleErrorResponse(res, error, "Error logging in");
  }
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const t0 = Date.now();
  const { page, pageSize, skip } = parsePagination(req.query);
  const { role, q, sortField = "createdAt", sortOrder = "desc" } = req.query;

  try {
    const query = {};

    if (role) query.role = role.toUpperCase();

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const sort = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(pageSize).lean(),
      User.countDocuments(query),
    ]);

    logger.info({
      msg: "getAllUsers",
      total,
      page,
      pageSize,
      durationMs: Date.now() - t0,
      ip: req.ip,
      user: req.user?.id,
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email || null,
        phone: u.phone || null,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error({
      msg: "Error fetching users",
      error: error?.message,
      stack: error?.stack,
    });
    return handleErrorResponse(res, error, "Failed to fetch users");
  }
});

export const getUserById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await User.findById(id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    logger.info({
      msg: "User retrieved successfully",
      userId: user._id,
      ip: req.ip,
      requestedBy: req.user?.id,
    });

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email || null,
        phone: user.phone || null,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error({
      msg: "Error retrieving user by ID",
      error: error.message,
      stack: error.stack,
    });
    return handleErrorResponse(res, error, "Failed to retrieve user");
  }
});

export const updateUserById = asyncHandler(async (req, res) => {
  const requestId = new mongoose.Types.ObjectId().toString();

  try {
    const { id } = req.params;

    logger.info({
      msg: "updateUserById called",
      requestId,
      userId: id,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn({ msg: "Invalid user ID format", requestId, userId: id });
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID format" });
    }

    const userDoc = await User.findById(id).lean();
    if (!userDoc) {
      logger.warn({ msg: "User not found", requestId, userId: id });
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Allowed fields from your schema
    const allowedUserFields = ["name", "email", "phone", "status"];

    const raw = req.body || {};
    const userUpdates = {};

    for (const key of allowedUserFields) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        if (key === "email" && typeof raw[key] === "string")
          userUpdates.email = raw[key].trim().toLowerCase();
        else if (key === "phone" && typeof raw[key] === "string")
          userUpdates.phone = raw[key].trim();
        else if (key === "name" && typeof raw[key] === "string")
          userUpdates.name = raw[key].trim();
        else userUpdates[key] = raw[key];
      }
    }

    // Reject forbidden fields
    const forbiddenFields = ["password", "role"];
    for (const f of forbiddenFields) {
      if (raw[f] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `${f} cannot be updated`,
        });
      }
    }

    // Validate email/phone formats
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneRegex = /^[5-9]\d{8,14}$/;

    if (userUpdates.email && !emailRegex.test(userUpdates.email)) {
      logger.warn({ msg: "Invalid email format", requestId });
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    if (userUpdates.phone && !phoneRegex.test(userUpdates.phone)) {
      logger.warn({ msg: "Invalid phone format", requestId });
      return res
        .status(400)
        .json({ success: false, message: "Invalid phone format" });
    }

    // Uniqueness checks
    if (userUpdates.email) {
      const exists = await User.findOne({ email: userUpdates.email })
        .select("_id")
        .lean();
      if (exists && String(exists._id) !== id) {
        return handleAlreadyExists(res, "User", { email: userUpdates.email });
      }
    }

    if (userUpdates.phone) {
      const exists = await User.findOne({ phone: userUpdates.phone })
        .select("_id")
        .lean();
      if (exists && String(exists._id) !== id) {
        return handleAlreadyExists(res, "User", { phone: userUpdates.phone });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: userUpdates },
      { new: true, runValidators: true, context: "query" }
    )
      .select("_id name email phone role status")
      .lean();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    logger.error({
      msg: "Error during user update",
      error: error?.message,
      stack: error?.stack,
    });
    return handleErrorResponse(res, error, "Failed to update user");
  }
});

export const deleteUserById = asyncHandler(async (req, res) => {
  const requestId = new mongoose.Types.ObjectId().toString();

  try {
    const { id } = req.params;

    logger.info({
      msg: "deleteUserById called",
      requestId,
      userId: id,
      performedBy: req.user?.id,
      ip: req.ip,
      ua: req.headers["user-agent"],
    });

    // Validate: user cannot delete himself
    if (req.user?.id === id) {
      logger.warn({
        msg: "User attempted to delete self",
        requestId,
        userId: id,
      });
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const userDoc = await User.findById(id).lean();
    if (!userDoc) {
      logger.warn({ msg: "User not found", requestId, userId: id });
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // If already INACTIVE
    if (userDoc.status === "INACTIVE") {
      logger.warn({
        msg: "User already inactive",
        requestId,
        userId: id,
      });

      return res.status(400).json({
        success: false,
        message: "User is already inactive",
      });
    }

    // Perform soft delete (set status INACTIVE)
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { status: "INACTIVE" } },
      { new: true, runValidators: true }
    )
      .select("_id name email phone role status")
      .lean();

    logger.info({
      msg: "User soft-deleted successfully",
      requestId,
      userId: id,
    });

    return res.status(200).json({
      success: true,
      message: "User deleted (set to INACTIVE) successfully",
      data: updatedUser,
    });
  } catch (error) {
    logger.error({
      msg: "Error during user deletion",
      error: error?.message,
      stack: error?.stack,
    });
    return handleErrorResponse(res, error, "Failed to delete user");
  }
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const user = await User.findById(userId).select("+password");
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch)
    return res
      .status(401)
      .json({ success: false, message: "Current password is incorrect" });

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json({ success: true, message: "Password changed successfully" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;

  const user = await User.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  // Generate token and expiry (e.g., 1 hour)
  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send token via email/SMS (pseudo)
  console.log(`Send this token to user: ${resetToken}`);

  return res
    .status(200)
    .json({ success: true, message: "Password reset token sent" });
});

const generateTempPassword = () => Math.random().toString(36).slice(-10); // 10 chars

export const resetPasswordByAdmin = asyncHandler(async (req, res) => {
  const requestId = new mongoose.Types.ObjectId().toString();
  const { id } = req.params;

  console.log({
    msg: "resetPasswordByAdmin called",
    requestId,
    admin: req.user.id,
    targetUser: id,
  });

  // --- Validate ID format ---
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID format",
    });
  }

  const user = await User.findById(id).select("+password");
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // --- Role based protection ---
  if (user.role === "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Cannot reset SUPER_ADMIN password",
    });
  }

  // Generate temporary password
  const tempPassword = generateTempPassword();
  user.password = tempPassword;
  await user.save();

  console.log({
    msg: "Password reset successfully",
    requestId,
    tempPassword,
  });

  return res.status(200).json({
    success: true,
    message: "Temporary password generated successfully",
    tempPassword: tempPassword, // Admin will see this
  });
});
