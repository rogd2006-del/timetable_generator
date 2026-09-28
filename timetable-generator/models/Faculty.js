import mongoose from "mongoose";

/** An unavailable slot references a day + timeSlot the faculty member cannot teach. */
const UnavailableSlotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    timeSlot: { type: mongoose.Schema.Types.ObjectId, ref: "TimeSlot", required: true },
  },
  { _id: false }
);

const FacultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true },
    subjects: [{ type: String, trim: true }],
    unavailableSlots: [UnavailableSlotSchema],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

FacultySchema.index({ owner: 1, employeeId: 1 }, { unique: true });

export default mongoose.models.Faculty || mongoose.model("Faculty", FacultySchema);
