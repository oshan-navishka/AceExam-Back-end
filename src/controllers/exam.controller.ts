import { Request, Response } from "express";
import Exam from "../models/exam.model";

export const createExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const exam = await Exam.create({
      ...req.body,
      userId: user.id,
    });

    res.status(201).json({ success: true, exam });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getExams = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const exams = await Exam.find({ userId: user.id })
      .populate("subjectId", "name code")
      .sort({ examDate: 1 }); // ascending — closest exam first

    res.status(200).json({ success: true, count: exams.length, exams });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getUpcomingExams = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const exams = await Exam.find({
      userId: user.id,
      examDate: { $gte: new Date() },
    })
      .populate("subjectId", "name code")
      .sort({ examDate: 1 });

    res.status(200).json({ success: true, count: exams.length, exams });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getExamById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const exam = await Exam.findOne({
      _id: req.params.id,
      userId: user.id,
    }).populate("subjectId", "name code");

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    res.status(200).json({ success: true, exam });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const updateExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    res.status(200).json({ success: true, exam });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deleteExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const exam = await Exam.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    res.status(200).json({ success: true, message: "Exam deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
