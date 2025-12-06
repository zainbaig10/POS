import asyncHandler from "express-async-handler";
import Settings from "../schemas/settingsSchema.js";
import { validationResult } from "express-validator";
import {
  handleErrorResponse,
  handleAlreadyExists,
} from "../utils/responseHandlers.js";

export const getSettings = asyncHandler(async (req, res) => {
  try {
    const settings = await Settings.findOne().lean();

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: "Settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Settings fetched successfully",
      data: settings,
    });
  } catch (error) {
    return handleErrorResponse(res, error, "Failed to fetch settings");
  }
});

export const updateSettings = asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let settings = await Settings.findOne();
    if (!settings) {
      // Create settings if not exist
      settings = await Settings.create(req.body);
    } else {
      // Update existing settings
      Object.assign(settings, req.body);
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error) {
    return handleErrorResponse(res, error, "Failed to update settings");
  }
});
