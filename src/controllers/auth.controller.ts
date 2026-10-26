import { Request, Response } from "express";
import User from "../models/user.model";

export const registerUser = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await User.create(req.body);

    res.status(200).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};