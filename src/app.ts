import authRouter from "./routes/auth.route";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import subjectRouter from "./routes/subject.route";

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AceExam Backend Running",
  });
});

app.use(
  "/api/auth",
  authRouter
);

app.use(
  "/api/subjects",
  subjectRouter
);

export default app;