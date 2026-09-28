import mongoose from "mongoose";

const ClassroomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, trim: true },
    building: { type: String, trim: true, default: "" },
    capacity: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      enum: ["Classroom", "Laboratory", "Seminar Hall"],
      default: "Classroom",
    },
    available: { type: Boolean, default: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ClassroomSchema.index({ owner: 1, roomNumber: 1 }, { unique: true });

export default mongoose.models.Classroom || mongoose.model("Classroom", ClassroomSchema);
