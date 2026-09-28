import mongoose from "mongoose";

const TimetableEntrySchema = new mongoose.Schema(
  {
    timetable: { type: mongoose.Schema.Types.ObjectId, ref: "Timetable", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: "TimeSlot", required: true },
    day: { type: String, required: true },
    type: { type: String, enum: ["Lecture", "Practical", "Tutorial"], default: "Lecture" },
  },
  { timestamps: true }
);

export default mongoose.models.TimetableEntry ||
  mongoose.model("TimetableEntry", TimetableEntrySchema);
