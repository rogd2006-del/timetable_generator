import connectDB from "@/lib/db";
import Timetable from "@/models/Timetable";
import TimetableEntry from "@/models/TimetableEntry";
import { getSession, unauthorized } from "@/lib/auth";

export async function GET(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  await connectDB();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const timetable = await Timetable.findOne({ _id: id, owner: session.sub });
    if (!timetable) {
      return Response.json({ success: false, message: "Timetable not found." }, { status: 404 });
    }
    const entries = await TimetableEntry.find({ timetable: id })
      .populate("course", "courseCode courseName type")
      .populate("faculty", "name")
      .populate("section", "sectionName")
      .populate("classroom", "roomNumber")
      .populate("timeSlot", "day startTime endTime order isBreak");
    return Response.json({ success: true, data: { timetable, entries } });
  }

  const timetables = await Timetable.find({ owner: session.sub }).sort({ createdAt: -1 });
  return Response.json({ success: true, data: timetables });
}

/** Duplicate a timetable: POST { duplicateFrom: id, name } */
export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    await connectDB();

    if (body.duplicateFrom) {
      const source = await Timetable.findOne({ _id: body.duplicateFrom, owner: session.sub });
      if (!source) {
        return Response.json({ success: false, message: "Source timetable not found." }, { status: 404 });
      }
      const copy = await Timetable.create({
        name: body.name || `${source.name} (copy)`,
        status: source.status,
        unscheduled: source.unscheduled,
        conflictCount: source.conflictCount,
        owner: session.sub,
      });
      const sourceEntries = await TimetableEntry.find({ timetable: source._id });
      if (sourceEntries.length > 0) {
        await TimetableEntry.insertMany(
          sourceEntries.map((e) => ({
            timetable: copy._id,
            course: e.course,
            faculty: e.faculty,
            section: e.section,
            classroom: e.classroom,
            timeSlot: e.timeSlot,
            day: e.day,
            type: e.type,
          }))
        );
      }
      return Response.json({ success: true, data: copy }, { status: 201 });
    }

    return Response.json({ success: false, message: "Unsupported request." }, { status: 400 });
  } catch (err) {
    console.error("timetable POST error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
