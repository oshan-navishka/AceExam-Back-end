import { Request, Response } from "express";
import ExamResult from "../models/examResult.model";
import GeneratedPaper from "../models/generatedPaper.model";
import Subject from "../models/subject.model";
import { evaluateExam, AnswerSubmission } from "../services/gemini.service";

export const submitExam = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { paperId, answers = [], timeTaken = 0 } = req.body;

    if (!paperId) {
      return res.status(400).json({ success: false, message: "paperId is required" });
    }

    const paper = await GeneratedPaper.findOne({
      _id: paperId,
      userId: user.id,
    }).populate("subjectId", "name");

    if (!paper) {
      return res.status(404).json({ success: false, message: "Paper not found" });
    }

    const subjectName = (paper.subjectId as any)?.name || "Unknown Subject";

    const submissions: AnswerSubmission[] = (paper.questions as any[]).map(
      (q: any, idx: number) => {
        const studentEntry = answers.find(
          (a: any) => Number(a.questionIndex) === idx
        );

        return {
          questionIndex: idx,
          question: q.question,
          questionType: q.type,
          studentAnswer: studentEntry?.studentAnswer || "",
          correctAnswer: q.answer || "",
          marks: q.marks || 1,
        };
      }
    );

    const evaluation = await evaluateExam(subjectName, submissions);

    const result = await ExamResult.create({
      paperId,
      subjectId: paper.subjectId,
      userId: user.id,
      answers: evaluation.answers,
      totalMarks: evaluation.totalMarks,
      marksObtained: evaluation.marksObtained,
      percentage: evaluation.percentage,
      aiAnalysis: evaluation.aiAnalysis,
      timeTaken: Number(timeTaken),
      submittedAt: new Date(),
    });

    res.status(201).json({ success: true, result });
  } catch (error: any) {
    console.error("submitExam error:", error);

    if (error?.message?.includes("Gemini") || error?.message?.includes("API key")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({ success: false, message: "Server Error", error: error?.message });
  }
};

export const getMyResults = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const filter: any = { userId: user.id };

    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.paperId) filter.paperId = req.query.paperId;

    const results = await ExamResult.find(filter)
      .populate("subjectId", "name code")
      .populate("paperId", "title difficulty totalQuestions")
      .select("-answers") 
      .sort({ submittedAt: -1 });

    res.status(200).json({ success: true, count: results.length, results });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getResultById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const result = await ExamResult.findOne({
      _id: req.params.id,
      userId: user.id,
    })
      .populate("subjectId", "name code")
      .populate("paperId", "title difficulty totalQuestions duration");

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deleteResult = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const result = await ExamResult.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    res.status(200).json({ success: true, message: "Result deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
