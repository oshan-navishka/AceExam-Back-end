import { Request, Response } from "express";
import User from "../models/user.model";
import bcrypt from "bcryptjs";

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

    res.status(201).json({
      success: true,
      message:
        "User registered successfully",
      user,
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

    res.status(200).json({
      success: true,
      message: "Login Success"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};