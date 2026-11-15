import mongoose, { Document } from "mongoose";

export interface GeneratedPaperDocument extends Document {
  title: string;
  subjectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions: number;
  duration: number;
  questions: {
    type: "mcq" | "structured" | "essay";
    question: string;
    options: string[];
    answer: string;
    marks: number;
  }[];
  rawResponse: string;
  pdfPath: string;
}

const QuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "structured", "essay"],
      required: true,
    },
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, default: "" },
    marks: { type: Number, default: 1 },
  },
  { _id: false }
);

const GeneratedPaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    totalQuestions: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
      default: 120,
    },

    questions: [QuestionSchema],

    rawResponse: {
      type: String,
      default: "",
    },

    pdfPath: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<GeneratedPaperDocument>("GeneratedPaper", GeneratedPaperSchema);
