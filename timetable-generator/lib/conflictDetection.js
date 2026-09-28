/**
 * Conflict detection over a flat list of timetable entries.
 * Framework agnostic, like timetableGenerator.js, so it can be unit tested
 * and reused both at generation time and after a manual edit.
 *
 * Entry shape: { id, courseId, facultyId, sectionId, classroomId, timeSlotId, day }
 */

const key = (...parts) => parts.join("|");

export function detectConflicts(entries, { classrooms = [], sections = [], faculty = [] } = {}) {
  const conflicts = [];
  const byFacultySlot = new Map();
  const byRoomSlot = new Map();
  const bySectionSlot = new Map();

  const classroomById = new Map(classrooms.map((c) => [c.id, c]));
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const facultyById = new Map(faculty.map((f) => [f.id, f]));

  for (const entry of entries) {
    const slotKey = key(entry.day, entry.timeSlotId);

    const facKey = key(entry.facultyId, slotKey);
    if (byFacultySlot.has(facKey)) {
      conflicts.push({
        type: "error",
        category: "faculty",
        message: `Faculty ${facultyById.get(entry.facultyId)?.name || entry.facultyId} is assigned to two classes on ${entry.day} in the same time slot.`,
        entries: [byFacultySlot.get(facKey), entry.id],
      });
    } else {
      byFacultySlot.set(facKey, entry.id);
    }

    const roomKey = key(entry.classroomId, slotKey);
    if (byRoomSlot.has(roomKey)) {
      conflicts.push({
        type: "error",
        category: "room",
        message: `Room ${classroomById.get(entry.classroomId)?.roomNumber || entry.classroomId} is double-booked on ${entry.day} in the same time slot.`,
        entries: [byRoomSlot.get(roomKey), entry.id],
      });
    } else {
      byRoomSlot.set(roomKey, entry.id);
    }

    const secKey = key(entry.sectionId, slotKey);
    if (bySectionSlot.has(secKey)) {
      conflicts.push({
        type: "error",
        category: "section",
        message: `Section ${sectionById.get(entry.sectionId)?.sectionName || entry.sectionId} has two classes on ${entry.day} in the same time slot.`,
        entries: [bySectionSlot.get(secKey), entry.id],
      });
    } else {
      bySectionSlot.set(secKey, entry.id);
    }

    if (classroomById.get(entry.classroomId) && sectionById.get(entry.sectionId)) {
      const room = classroomById.get(entry.classroomId);
      const section = sectionById.get(entry.sectionId);
      if (room.capacity < section.studentCount) {
        conflicts.push({
          type: "error",
          category: "capacity",
          message: `Room ${room.roomNumber} (capacity ${room.capacity}) is too small for section ${section.sectionName} (${section.studentCount} students).`,
          entries: [entry.id],
        });
      }
    }
  }

  return conflicts;
}

/** Soft-constraint warnings: e.g. too many consecutive classes for a section/faculty. */
export function detectWarnings(entries, timeSlots, { maxConsecutive = 4 } = {}) {
  const warnings = [];
  const slotById = new Map(timeSlots.map((s) => [s.id, s]));

  function consecutiveRuns(groupKeyFn, labelFn) {
    const groups = new Map();
    for (const entry of entries) {
      const slot = slotById.get(entry.timeSlotId);
      if (!slot) continue;
      const gKey = groupKeyFn(entry);
      if (!groups.has(gKey)) groups.set(gKey, []);
      groups.get(gKey).push({ ...entry, order: slot.order });
    }
    for (const [gKey, list] of groups.entries()) {
      list.sort((a, b) => a.order - b.order);
      let run = 1;
      for (let i = 1; i < list.length; i++) {
        if (list[i].order === list[i - 1].order + 1) {
          run++;
        } else {
          run = 1;
        }
        if (run > maxConsecutive) {
          warnings.push({
            type: "warning",
            category: "consecutive",
            message: labelFn(gKey, run),
          });
        }
      }
    }
  }

  consecutiveRuns(
    (e) => key(e.sectionId, e.day),
    (gKey, run) => `Section has ${run} consecutive classes on ${gKey.split("|")[1]}.`
  );
  consecutiveRuns(
    (e) => key(e.facultyId, e.day),
    (gKey, run) => `Faculty has ${run} consecutive classes on ${gKey.split("|")[1]}.`
  );

  return warnings;
}
