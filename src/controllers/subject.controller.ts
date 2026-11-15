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
      error,
    });
  }
};

export const getSubjects = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;

    let subjects = await Subject.find({
      userId: user.id,
    }).sort({ createdAt: -1 });

    if (subjects.length === 0 || user.role === "admin") {
      subjects = await Subject.find({}).sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const getSubjectById = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;

    let subject = await Subject.findOne({
      _id: req.params.id,
      userId: user.id,
    });

    if (!subject) {
      subject = await Subject.findById(req.params.id);
    }

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      subject,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const updateSubject = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;

    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      subject,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};

export const deleteSubject = async (
  req: Request,
  res: Response
) => {
  try {
    const user = (req as any).user;

    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error,
    });
  }
};
