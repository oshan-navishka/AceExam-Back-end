import { Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken";

export const registerUser = async (
  req: Request,
  res: Response
) => {
  try {

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({
      email
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(
      user._id.toString(),
      user.role
    );
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(201).json({
      success: true,
      message:
        "User registered successfully",
      user: userResponse,
      token
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
export const loginUser = async (
  req: Request,
  res: Response
) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({
      email
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = generateToken(
      user._id.toString(),
      user.role
    );

    res.status(200).json({
      success: true,
      message: "Login Success",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("getProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email address is already in use by another account",
        });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to change password",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long",
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    const updatedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};