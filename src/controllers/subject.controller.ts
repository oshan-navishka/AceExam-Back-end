import { Request, Response } from "express";
import Subject from "../models/subject.model";

export const createSubject = async (
  req: Request,
  res: Response
) => {
  try {

    const user = (req as any).user;

    const subject = await Subject.create({
    ...req.body,
    userId: user.id,
    });

    res.status(201).json({
      success: true,
      subject,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
      error
    });

  }
  console.log(error);
};
