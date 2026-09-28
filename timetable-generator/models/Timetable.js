import mongoose from "mongoose";

const UnscheduledSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const TimetableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["complete", "partial", "failed"],
      default: "partial",
    },
    unscheduled: [UnscheduledSchema],
    conflictCount: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Timetable || mongoose.model("Timetable", TimetableSchema);
