import { Request, Response } from "express";
import Subject from "../models/subject.model";
import Exam from "../models/exam.model";
import Note from "../models/note.model";
import GeneratedPaper from "../models/generatedPaper.model";
import ExamResult from "../models/examResult.model";
import StudyPlan from "../models/studyPlan.model";

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user.id;
    const isAdmin = user.role === "admin";
    const userFilter = isAdmin ? {} : { userId };

    const [
      rawSubjectCount,
      allSubjects,
      upcomingExamsCount,
      upcomingExams,
      allExams,
      noteCount,
      paperCount,
      results,
      studyPlans,
    ] = await Promise.all([
      Subject.countDocuments(userFilter),
      Subject.find(userFilter).select("name code"),

      Exam.countDocuments({
        ...userFilter,
        examDate: { $gte: new Date() },
      }),

      Exam.find({
        ...userFilter,
        examDate: { $gte: new Date() },
      })
        .populate("subjectId", "name code")
        .sort({ examDate: 1 })
        .limit(5),

      Exam.find(userFilter).sort({ examDate: 1 }),

      Note.countDocuments(userFilter),

      GeneratedPaper.countDocuments(userFilter),

      ExamResult.find(userFilter)
        .populate("subjectId", "name code")
        .populate("paperId", "title difficulty")
        .sort({ submittedAt: -1 }),

      StudyPlan.find(userFilter).select("subjectId"),
    ]);

    let subjectCount = rawSubjectCount;
    if (subjectCount === 0 && !isAdmin) {
      subjectCount = await Subject.countDocuments({});
    }

    const completedPapers = results.length;

    const averageScore =
      completedPapers > 0
        ? Math.round(
            results.reduce((sum, r) => sum + (r.percentage || 0), 0) / completedPapers
          )
        : 0;

    const subjectScoreMap: Record<
      string,
      { name: string; code: string; totalPct: number; count: number }
    > = {};

    results.forEach((r) => {
      const sub = r.subjectId as any;
      if (!sub || !sub.name) return;
      const key = sub._id ? sub._id.toString() : String(sub);
      if (!subjectScoreMap[key]) {
        subjectScoreMap[key] = {
          name: sub.name,
          code: sub.code || sub.name.slice(0, 6).toUpperCase(),
          totalPct: 0,
          count: 0,
        };
      }
      subjectScoreMap[key].totalPct += r.percentage || 0;
      subjectScoreMap[key].count += 1;
    });

    const subjectWiseScores = Object.values(subjectScoreMap)
      .map((s) => ({
        subjectName: s.name,
        subjectCode: s.code,
        averageScore: Math.round(s.totalPct / s.count),
        attempts: s.count,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);

    let weeklyPerformance: {
      day: string;
      date?: string;
      averageScore: number;
      attempts: number;
    }[] = [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyResults = results.filter(
      (r) => new Date(r.submittedAt) >= sevenDaysAgo
    );

    if (weeklyResults.length > 0) {
      const dayMap: Record<string, { day: string; date: string; score: number; count: number }> = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        dayMap[dateKey] = { day: dayName, date: dateKey, score: 0, count: 0 };
      }

      weeklyResults.forEach((r) => {
        const dateKey = new Date(r.submittedAt).toISOString().slice(0, 10);
        if (dayMap[dateKey]) {
          dayMap[dateKey].score += r.percentage || 0;
          dayMap[dateKey].count += 1;
        }
      });

      weeklyPerformance = Object.values(dayMap)
        .filter((d) => d.count > 0)
        .map((d) => ({
          day: d.day,
          date: d.date,
          averageScore: Math.round(d.score / d.count),
          attempts: d.count,
        }));
    }

    if (weeklyPerformance.length === 0 && results.length > 0) {
      const recentAttempts = results.slice(0, 7).reverse(); // oldest to newest
      const attemptDayMap: Record<string, { day: string; date: string; score: number; count: number }> = {};

      recentAttempts.forEach((r) => {
        const d = new Date(r.submittedAt);
        const dateKey = d.toISOString().slice(0, 10);
        const dayLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!attemptDayMap[dateKey]) {
          attemptDayMap[dateKey] = { day: dayLabel, date: dateKey, score: 0, count: 0 };
        }
        attemptDayMap[dateKey].score += r.percentage || 0;
        attemptDayMap[dateKey].count += 1;
      });

      weeklyPerformance = Object.values(attemptDayMap).map((d) => ({
        day: d.day,
        date: d.date,
        averageScore: Math.round(d.score / d.count),
        attempts: d.count,
      }));
    }

    const recentResults = results.slice(0, 5).map((r) => ({
      _id: r._id,
      paperTitle: (r.paperId as any)?.title || "Practice Paper",
      subjectName: (r.subjectId as any)?.name || "General",
      percentage: r.percentage,
      submittedAt: r.submittedAt,
    }));

    const coveredSubjectIds = new Set(
      studyPlans.map((p) => p.subjectId?.toString()).filter(Boolean)
    );
    const studyProgress =
      subjectCount > 0
        ? Math.min(100, Math.round((coveredSubjectIds.size / subjectCount) * 100))
        : 0;

    const nextExam = upcomingExams[0] || null;
    let daysUntilNextExam: number | null = null;
    if (nextExam && nextExam.examDate) {
      const diffMs = new Date(nextExam.examDate).getTime() - Date.now();
      daysUntilNextExam = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    res.status(200).json({
      success: true,
      dashboard: {
        stats: {
          totalSubjects: subjectCount,
          upcomingExamsCount,
          completedPapers,
          averageScore,
          totalNotes: noteCount,
          studyProgress,
          daysUntilNextExam,
        },
        upcomingExams,
        recentResults,
        charts: {
          subjectWiseScores,
          weeklyPerformance,
        },
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getSubjectAnalytics = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    const isAdmin = user.role === "admin";
    const userFilter = isAdmin ? {} : { userId: user.id };

    const [notes, papers, results, exam, studyPlan] = await Promise.all([
      Note.find({
        subjectId,
        $or: [
          { userId: user.id },
          { userId: subject.userId },
        ],
      }).select("title fileName createdAt"),

      GeneratedPaper.find({
        subjectId,
        ...userFilter,
      }).select("title difficulty totalQuestions createdAt"),

      ExamResult.find({
        subjectId,
        ...userFilter,
      }).sort({ submittedAt: 1 }), 

      Exam.findOne({
        subjectId,
        ...userFilter,
        examDate: { $gte: new Date() },
      }).sort({ examDate: 1 }),

      StudyPlan.findOne({
        subjectId,
        ...userFilter,
      }),
    ]);

    const averageScore =
      results.length > 0
        ? Math.round(
            results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length
          )
        : 0;

    const bestScore =
      results.length > 0
        ? Math.max(...results.map((r) => r.percentage || 0))
        : 0;

    const scoreProgression = results.map((r, i) => ({
      attempt: i + 1,
      score: r.percentage,
      date: r.submittedAt,
    }));

    const allWeak: string[] = [];
    const allStrong: string[] = [];
    results.forEach((r) => {
      if (Array.isArray(r.aiAnalysis?.weakAreas)) {
        allWeak.push(...r.aiAnalysis.weakAreas);
      }
      if (Array.isArray(r.aiAnalysis?.strongAreas)) {
        allStrong.push(...r.aiAnalysis.strongAreas);
      }
    });

    const topWeak = [...new Set(allWeak)].slice(0, 5);
    const topStrong = [...new Set(allStrong)].slice(0, 5);

    res.status(200).json({
      success: true,
      analytics: {
        subject,
        stats: {
          totalNotes: notes.length,
          totalPapers: papers.length,
          totalAttempts: results.length,
          averageScore,
          bestScore,
        },
        upcomingExam: exam || null,
        hasStudyPlan: !!studyPlan,
        notes,
        scoreProgression,
        weakAreas: topWeak,
        strongAreas: topStrong,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
