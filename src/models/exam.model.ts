import mongoose from "mongoose";

const ExamSchema = new mongoose.Schema(
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

    examDate: {
      type: Date,
      required: true,
    },

    venue: {
      type: String,
      default: "",
    },

    duration: {
      // in minutes
      type: Number,
      default: 120,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Exam", ExamSchema);
