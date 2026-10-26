import express from "express";
import { registerUser, loginUser } from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";


const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get(
  "/profile",
  protect,
  (req, res) => {

    res.status(200).json({
      success: true,
      user: (req as any).user,
    });

  }
);

export default router;