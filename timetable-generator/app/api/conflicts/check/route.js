import connectDB from "@/lib/db";
import TimetableEntry from "@/models/TimetableEntry";
import Classroom from "@/models/Classroom";
import Section from "@/models/Section";
import Faculty from "@/models/Faculty";
import TimeSlot from "@/models/TimeSlot";
import { getSession, unauthorized } from "@/lib/auth";
import { detectConflicts, detectWarnings } from "@/lib/conflictDetection";

/** POST { timetableId } -> { conflicts, warnings } recomputed from current saved entries. */
export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const { timetableId } = await request.json();
    if (!timetableId) {
      return Response.json({ success: false, message: "timetableId is required." }, { status: 400 });
    }
    await connectDB();

    const [entries, classrooms, sections, faculty, timeSlots] = await Promise.all([
      TimetableEntry.find({ timetable: timetableId }),
      Classroom.find({ owner: session.sub }),
      Section.find({ owner: session.sub }),
      Faculty.find({ owner: session.sub }),
      TimeSlot.find({ owner: session.sub }),
    ]);

    const flatEntries = entries.map((e) => ({
      id: e._id.toString(),
      courseId: e.course.toString(),
      facultyId: e.faculty.toString(),
      sectionId: e.section.toString(),
      classroomId: e.classroom.toString(),
      timeSlotId: e.timeSlot.toString(),
      day: e.day,
    }));

    const flatClassrooms = classrooms.map((c) => ({ id: c._id.toString(), roomNumber: c.roomNumber, capacity: c.capacity }));
    const flatSections = sections.map((s) => ({ id: s._id.toString(), sectionName: s.sectionName, studentCount: s.studentCount }));
    const flatFaculty = faculty.map((f) => ({ id: f._id.toString(), name: f.name }));
    const flatTimeSlots = timeSlots.map((s) => ({ id: s._id.toString(), day: s.day, order: s.order, isBreak: s.isBreak }));

    const conflicts = detectConflicts(flatEntries, {
      classrooms: flatClassrooms,
      sections: flatSections,
      faculty: flatFaculty,
    });
    const warnings = detectWarnings(flatEntries, flatTimeSlots);

    return Response.json({ success: true, data: { conflicts, warnings } });
  } catch (err) {
    console.error("conflict check error", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
