import mongoose from "mongoose";

const DayPlanSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },          
    date: { type: String, default: "" },            
    tasks: [
      {
        topic: { type: String, required: true },
        duration: { type: String, required: true },
        notes: { type: String, default: "" },
      },
    ],
  },
  { _id: false }
);

const StudyPlanSchema = new mongoose.Schema(
  {
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

    dailyStudyHours: {
      type: Number,
      default: 4,
    },

    topics: [
      {
        type: String,
      },
    ],

    rawPlan: {
      type: String,
      default: "",
    },

    schedule: [DayPlanSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("StudyPlan", StudyPlanSchema);
