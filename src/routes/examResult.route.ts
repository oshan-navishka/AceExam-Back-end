import express from "express";
import {
  submitExam,
  getMyResults,
  getResultById,
  deleteResult,
} from "../controllers/examResult.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.post("/submit", submitExam);
router.get("/", getMyResults);
router.get("/:id", getResultById);
router.delete("/:id", deleteResult);

export default router;
