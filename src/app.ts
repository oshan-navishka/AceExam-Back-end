import express from "express";
import cors from "cors";
import path from "path";

import authRouter from "./routes/auth.route";
import subjectRouter from "./routes/subject.route";
import examRouter from "./routes/exam.route";
import noteRouter from "./routes/note.route";
import studyPlanRouter from "./routes/studyPlan.route";
import generatedPaperRouter from "./routes/generatedPaper.route";
import examResultRouter from "./routes/examResult.route";
import analyticsRouter from "./routes/analytics.route";

const app = express();

app.use(
  cors({
    origin: [
      "https://ace-exam-front-end-z9bj.vercel.app"
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "🎯 AceExam AI Backend Running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      subjects: "/api/subjects",
      exams: "/api/exams",
      notes: "/api/notes",
      studyPlans: "/api/study-plans",
      papers: "/api/papers",
      results: "/api/results",
      analytics: "/api/analytics",
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/exams", examRouter);
app.use("/api/notes", noteRouter);
app.use("/api/study-plans", studyPlanRouter);
app.use("/api/papers", generatedPaperRouter);
app.use("/api/results", examResultRouter);
app.use("/api/analytics", analyticsRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);

  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large. Max 20MB." });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;
