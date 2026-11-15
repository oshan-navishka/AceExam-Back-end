import express from "express";
import {
  createExam,
  getExams,
  getUpcomingExams,
  getExamById,
  updateExam,
  deleteExam,
} from "../controllers/exam.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect); // all exam routes require auth

router.get("/upcoming", getUpcomingExams);
router.get("/", getExams);
router.get("/:id", getExamById);
router.post("/", createExam);
router.put("/:id", updateExam);
router.delete("/:id", deleteExam);

export default router;
