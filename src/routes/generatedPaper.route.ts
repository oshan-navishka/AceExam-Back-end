import express from "express";
import {
  generatePaper,
  getPapers,
  getPaperById,
  downloadPaper,
  deletePaper,
} from "../controllers/generatedPaper.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.use(protect);

router.post("/generate", generatePaper);
router.get("/", getPapers);
router.get("/:id/download", downloadPaper);
router.get("/:id", getPaperById);
router.delete("/:id", deletePaper);

export default router;
