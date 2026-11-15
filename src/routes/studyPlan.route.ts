import express from "express";
import {
  generatePlan,
  getMyPlans,
  getPlanById,
  getPlanBySubject,
  deletePlan,
} from "../controllers/studyPlan.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.post("/generate", generatePlan);
router.get("/", getMyPlans);
router.get("/subject/:subjectId", getPlanBySubject);
router.get("/:id", getPlanById);
router.delete("/:id", deletePlan);

export default router;
