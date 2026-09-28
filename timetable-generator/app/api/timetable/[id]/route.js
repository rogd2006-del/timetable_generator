import connectDB from "@/lib/db";
import Timetable from "@/models/Timetable";
import TimetableEntry from "@/models/TimetableEntry";
import { getSession, unauthorized } from "@/lib/auth";

/** Rename a timetable, or update/replace a single entry via { entryUpdate }. */
export async function PUT(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  try {
    const body = await request.json();
    await connectDB();

    const timetable = await Timetable.findOne({ _id: id, owner: session.sub });
    if (!timetable) {
      return Response.json({ success: false, message: "Timetable not found." }, { status: 404 });
    }

    if (body.name) {
      timetable.name = body.name;
      await timetable.save();
    }

    if (body.entryUpdate) {
      const { entryId, classroom, timeSlot, day } = body.entryUpdate;
      const entry = await TimetableEntry.findOneAndUpdate(
        { _id: entryId, timetable: id },
        { ...(classroom && { classroom }), ...(timeSlot && { timeSlot }), ...(day && { day }) },
        { new: true }
      );
      if (!entry) {
        return Response.json({ success: false, message: "Entry not found." }, { status: 404 });
      }
    }

    return Response.json({ success: true, data: timetable });
  } catch (err) {
    console.error("update timetable error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;
  await connectDB();
  const deleted = await Timetable.findOneAndDelete({ _id: id, owner: session.sub });
  if (!deleted) {
    return Response.json({ success: false, message: "Timetable not found." }, { status: 404 });
  }
  await TimetableEntry.deleteMany({ timetable: id });
  return Response.json({ success: true });
}
