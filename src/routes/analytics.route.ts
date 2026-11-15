import express from "express";
import {
  getDashboard,
  getSubjectAnalytics,
} from "../controllers/analytics.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.get("/dashboard", getDashboard);
router.get("/subject/:subjectId", getSubjectAnalytics);

export default router;
