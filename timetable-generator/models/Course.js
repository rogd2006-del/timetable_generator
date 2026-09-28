import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, required: true, trim: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    credits: { type: Number, required: true, min: 1, max: 10 },
    lecturesPerWeek: { type: Number, required: true, min: 1, max: 20 },
    duration: { type: Number, required: true, default: 1, min: 1, max: 3 }, // in number of consecutive slots
    preferredRoom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", default: null },
    type: { type: String, enum: ["Lecture", "Practical", "Tutorial"], default: "Lecture" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

CourseSchema.index({ owner: 1, courseCode: 1, section: 1 }, { unique: true });

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
