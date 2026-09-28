import mongoose from "mongoose";

const TimeSlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    },
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "10:00"
    order: { type: Number, required: true, default: 0 }, // for sorting within a day
    isBreak: { type: Boolean, default: false },
    label: { type: String, trim: true, default: "" }, // e.g. "Lunch Break"
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.TimeSlot || mongoose.model("TimeSlot", TimeSlotSchema);
