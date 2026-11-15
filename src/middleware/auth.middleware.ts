import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let token = "";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (authHeader) {
      token = authHeader;
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    (req as any).user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};