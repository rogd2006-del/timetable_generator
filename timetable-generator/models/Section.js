import mongoose from "mongoose";

const SectionSchema = new mongoose.Schema(
  {
    sectionName: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    studentCount: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SectionSchema.index({ owner: 1, sectionName: 1 }, { unique: true });

export default mongoose.models.Section || mongoose.model("Section", SectionSchema);
