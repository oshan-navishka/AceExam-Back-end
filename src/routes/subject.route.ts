import express from "express";
import { createSubject } from "../controllers/subject.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post(
  "/",
  protect,
  createSubject
);

export default router;