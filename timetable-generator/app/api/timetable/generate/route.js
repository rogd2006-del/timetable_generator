import connectDB from "@/lib/db";
import Course from "@/models/Course";
import Faculty from "@/models/Faculty";
import Classroom from "@/models/Classroom";
import Section from "@/models/Section";
import TimeSlot from "@/models/TimeSlot";
import Timetable from "@/models/Timetable";
import TimetableEntry from "@/models/TimetableEntry";
import { getSession, unauthorized } from "@/lib/auth";
import { generateTimetable } from "@/lib/timetableGenerator";
import { detectConflicts } from "@/lib/conflictDetection";

/**
 * POST /api/timetable/generate
 * Body: { name?: string }
 * Loads the owner's courses/faculty/classrooms/sections/time-slots from
 * MongoDB, adapts them into the plain-object shape the generator expects,
 * runs the backtracking algorithm, and persists the result as a new
 * Timetable + TimetableEntry documents.
 */
export async function POST(request) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    await connectDB();
    const owner = session.sub;

    const [courses, faculty, classrooms, sections, timeSlots] = await Promise.all([
      Course.find({ owner }),
      Faculty.find({ owner }),
      Classroom.find({ owner }),
      Section.find({ owner }),
      TimeSlot.find({ owner }),
    ]);

    if (courses.length === 0) {
      return Response.json(
        { success: false, message: "Add at least one course before generating a timetable." },
        { status: 400 }
      );
    }
    if (timeSlots.filter((s) => !s.isBreak).length === 0) {
      return Response.json(
        { success: false, message: "Add at least one non-break time slot first." },
        { status: 400 }
      );
    }
    if (classrooms.length === 0) {
      return Response.json(
        { success: false, message: "Add at least one classroom before generating a timetable." },
        { status: 400 }
      );
    }

    const input = {
      courses: courses.map((c) => ({
        id: c._id.toString(),
        courseCode: c.courseCode,
        facultyId: c.faculty.toString(),
        sectionId: c.section.toString(),
        lecturesPerWeek: c.lecturesPerWeek,
        duration: c.duration,
        type: c.type,
        preferredRoomId: c.preferredRoom ? c.preferredRoom.toString() : null,
      })),
      faculty: faculty.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        unavailable: new Set(
          (f.unavailableSlots || []).map((u) => `${u.day}|${u.timeSlot.toString()}`)
        ),
      })),
      classrooms: classrooms.map((r) => ({
        id: r._id.toString(),
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        type: r.type,
        available: r.available,
      })),
      sections: sections.map((s) => ({
        id: s._id.toString(),
        sectionName: s.sectionName,
        studentCount: s.studentCount,
      })),
      timeSlots: timeSlots.map((s) => ({
        id: s._id.toString(),
        day: s.day,
        order: s.order,
        isBreak: s.isBreak,
      })),
    };

    const result = generateTimetable(input);

    const conflicts = detectConflicts(
      result.entries.map((e) => ({
        id: `${e.courseId}-${e.timeSlotId}`,
        courseId: e.courseId,
        facultyId: e.facultyId,
        sectionId: e.sectionId,
        classroomId: e.classroomId,
        timeSlotId: e.timeSlotId,
        day: e.day,
      })),
      { classrooms: input.classrooms, sections: input.sections, faculty: input.faculty }
    );

    const body = await request.json().catch(() => ({}));
    const name = body?.name || `Timetable ${new Date().toLocaleString()}`;

    const timetable = await Timetable.create({
      name,
      status: result.status,
      unscheduled: result.unscheduled.map((u) => ({ course: u.courseId, reason: u.reason })),
      conflictCount: conflicts.length,
      owner,
    });

    if (result.entries.length > 0) {
      await TimetableEntry.insertMany(
        result.entries.map((e) => ({
          timetable: timetable._id,
          course: e.courseId,
          faculty: e.facultyId,
          section: e.sectionId,
          classroom: e.classroomId,
          timeSlot: e.timeSlotId,
          day: e.day,
          type: e.type,
        }))
      );
    }

    return Response.json({
      success: true,
      data: {
        timetable,
        entries: result.entries,
        unscheduled: result.unscheduled,
        conflicts,
        status: result.status,
      },
    });
  } catch (err) {
    console.error("generate timetable error", err);
    return Response.json(
      { success: false, message: err.message || "Timetable generation failed." },
      { status: 500 }
    );
  }
}
