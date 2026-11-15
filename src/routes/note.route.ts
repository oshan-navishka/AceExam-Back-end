import express from "express";
import {
  uploadNote,
  getNotes,
  getNoteById,
  getNotePdf,
  updateNote,
  deleteNote,
} from "../controllers/note.controller";
import { protect } from "../middleware/auth.middleware";
import { uploadNote as uploadMiddleware } from "../middleware/upload.middleware";

const router = express.Router();

router.use(protect);

router.get("/", getNotes);
router.get("/:id", getNoteById);
router.get("/:id/pdf", getNotePdf);
router.post("/", uploadMiddleware, uploadNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;
