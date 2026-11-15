import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    question: { type: String, required: true },
    questionType: {
      type: String,
      enum: ["mcq", "structured", "essay"],
      required: true,
    },
    studentAnswer: { type: String, default: "" },
    correctAnswer: { type: String, default: "" },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 1 },
    aiFeedback: { type: String, default: "" },
  },
  { _id: false }
);

const ExamResultSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeneratedPaper",
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

    answers: [AnswerSchema],

    totalMarks: { type: Number, default: 0 },
    marksObtained: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },

    aiAnalysis: {
      strongAreas: [{ type: String }],
      weakAreas: [{ type: String }],
      summary: { type: String, default: "" },
    },

    timeTaken: {
      type: Number,
      default: 0,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ExamResult", ExamResultSchema);
