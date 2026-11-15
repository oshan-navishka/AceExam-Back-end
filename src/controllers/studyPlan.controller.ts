import { Request, Response } from "express";
import StudyPlan from "../models/studyPlan.model";
import Note from "../models/note.model";
import Exam from "../models/exam.model";
import Subject from "../models/subject.model";
import { generateStudyPlan } from "../services/gemini.service";


export const generatePlan = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subjectId, dailyStudyHours = 4, topics = [] } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: "subjectId is required" });
    }

    const subject = await Subject.findOne({ _id: subjectId, userId: user.id });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    const exam = await Exam.findOne({
      subjectId,
      userId: user.id,
      examDate: { $gte: new Date() },
    }).sort({ examDate: 1 });

    if (!exam) {
      return res.status(400).json({
        success: false,
        message: "No upcoming exam found for this subject. Please add an exam date first.",
      });
    }

    const notes = await Note.find({ subjectId, userId: user.id }).select("extractedText");
    const notesContext = notes
      .map((n) => n.extractedText)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);

    const result = await generateStudyPlan({
      subjectName: subject.name,
      examDate: exam.examDate.toISOString().split("T")[0],
      topics,
      dailyStudyHours: Number(dailyStudyHours),
      notesContext,
    });

    const plan = await StudyPlan.findOneAndUpdate(
      { subjectId, userId: user.id },
      {
        subjectId,
        userId: user.id,
        examDate: exam.examDate,
        dailyStudyHours: Number(dailyStudyHours),
        topics,
        rawPlan: result.rawPlan,
        schedule: result.schedule,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ success: true, plan });
  } catch (error: any) {
    console.error("generatePlan error:", error);

    if (error?.message?.includes("Gemini") || error?.message?.includes("API key")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({ success: false, message: "Server Error", error: error?.message });
  }
};

export const getMyPlans = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const plans = await StudyPlan.find({ userId: user.id })
      .populate("subjectId", "name code")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: plans.length, plans });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getPlanById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const plan = await StudyPlan.findOne({
      _id: req.params.id,
      userId: user.id,
    }).populate("subjectId", "name code");

    if (!plan) {
      return res.status(404).json({ success: false, message: "Study plan not found" });
    }

    res.status(200).json({ success: true, plan });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getPlanBySubject = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const plan = await StudyPlan.findOne({
      subjectId: req.params.subjectId,
      userId: user.id,
    }).populate("subjectId", "name code");

    if (!plan) {
      return res.status(404).json({ success: false, message: "No study plan for this subject" });
    }

    res.status(200).json({ success: true, plan });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const plan = await StudyPlan.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    });

    if (!plan) {
      return res.status(404).json({ success: false, message: "Study plan not found" });
    }

    res.status(200).json({ success: true, message: "Study plan deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
