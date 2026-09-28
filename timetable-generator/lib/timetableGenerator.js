/**
 * Timetable generation engine.
 *
 * This module is intentionally framework/DB agnostic: it accepts plain
 * JavaScript objects and returns plain JavaScript objects. This makes it
 * easy to unit test (see tests/timetableGenerator.test.js) without needing
 * a MongoDB connection, and keeps business logic separate from the API
 * layer (app/api/timetable/generate/route.js just adapts Mongoose
 * documents into this shape and back).
 *
 * ALGORITHM
 * ---------
 * 1. Expand every course into N "sessions" (N = lecturesPerWeek), each of
 *    which needs `duration` consecutive non-break time slots on the same day.
 * 2. Sort sessions by most-constrained-first (fewest legal room/day/slot
 *    options), a standard CSP heuristic ("minimum remaining values") that
 *    dramatically reduces backtracking.
 * 3. Use recursive backtracking with forward-checking: for each session, try
 *    candidate (day, startSlot, classroom) combinations (shuffled + scored by
 *    soft-constraint preference), assign the first one that doesn't violate a
 *    hard constraint, recurse, and backtrack on failure.
 * 4. If a session has no legal placement after exhausting all candidates and
 *    backtracking, it is reported as "unscheduled" with a human-readable
 *    reason instead of silently producing an invalid timetable.
 *
 * HARD CONSTRAINTS (never violated in the output):
 *  - A faculty member cannot teach two sessions in the same slot.
 *  - A classroom cannot host two sessions in the same slot.
 *  - A section cannot attend two sessions in the same slot.
 *  - Faculty "unavailable" slots are never used.
 *  - Classroom capacity must be >= section studentCount.
 *  - Practical courses only use Laboratory-type rooms.
 *  - Break slots are never scheduled into.
 *  - A multi-slot session only uses consecutive, same-day, non-break slots.
 *
 * SOFT CONSTRAINTS (best-effort, scored heuristically):
 *  - Spread a course's sessions across different days.
 *  - Avoid more than MAX_CONSECUTIVE consecutive slots for the same
 *    faculty/section.
 *  - Prefer preferredRoom for a course when it fits.
 *  - Avoid the very first/last slot of the day when alternatives exist.
 */

const MAX_CONSECUTIVE = 3; // soft cap on back-to-back classes for a faculty/section
const BACKTRACK_LIMIT = 200000; // safety valve against pathological inputs

/** Deterministic-ish shuffle so repeated generations aren't identical, but stable per call. */
function shuffle(array, rand) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mulberry32(seed) {
  let t = seed;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (...parts) => parts.join("|");

/**
 * Groups time slots by day and sorts each day's slots by `order`, so
 * consecutive-slot lookups are simple array-index math.
 */
function buildDaySlotIndex(timeSlots) {
  const byDay = new Map();
  for (const slot of timeSlots) {
    if (!byDay.has(slot.day)) byDay.set(slot.day, []);
    byDay.get(slot.day).push(slot);
  }
  for (const slots of byDay.values()) {
    slots.sort((a, b) => a.order - b.order);
  }
  return byDay;
}

/** Builds a lookup: courseId -> [session0, session1, ...] each needing placement. */
function expandSessions(courses) {
  const sessions = [];
  for (const course of courses) {
    const count = Math.max(1, Number(course.lecturesPerWeek) || 1);
    for (let i = 0; i < count; i++) {
      sessions.push({
        id: `${course.id}__${i}`,
        course,
      });
    }
  }
  return sessions;
}

function facultyIsUnavailable(faculty, day, slotId) {
  if (!faculty.unavailable) return false;
  return faculty.unavailable.has(key(day, slotId));
}

function roomFitsCourse(room, course, section) {
  if (!room.available) return false;
  if (room.capacity < section.studentCount) return false;
  if (course.type === "Practical" && room.type !== "Laboratory") return false;
  return true;
}

/**
 * Returns the list of consecutive slot windows (arrays of `duration` slots)
 * available on a given day for a course, respecting breaks.
 */
function consecutiveWindows(daySlots, duration) {
  const windows = [];
  for (let i = 0; i + duration <= daySlots.length; i++) {
    const window = daySlots.slice(i, i + duration);
    if (window.some((s) => s.isBreak)) continue;
    windows.push(window);
  }
  return windows;
}

function countConsecutiveUsage(busyMap, entityId, day, daySlots, window) {
  // Counts how many consecutive slots (including the candidate window) the
  // entity would be occupied for, by scanning outward from the window.
  const busySet = (day2, slotId) => busyMap.has(key(entityId, day2, slotId));
  let count = window.length;
  const startIdx = daySlots.findIndex((s) => s.id === window[0].id);
  const endIdx = startIdx + window.length - 1;

  let i = startIdx - 1;
  while (i >= 0 && busySet(day, daySlots[i].id)) {
    count++;
    i--;
  }
  let j = endIdx + 1;
  while (j < daySlots.length && busySet(day, daySlots[j].id)) {
    count++;
    j++;
  }
  return count;
}

/**
 * Generates a conflict-free (hard constraints) timetable.
 *
 * @param {Object} input
 * @param {Array} input.courses - [{id, courseCode, courseName, facultyId, sectionId, lecturesPerWeek, duration, type, preferredRoomId}]
 * @param {Array} input.faculty - [{id, name, unavailable: Set<"day|slotId">}]
 * @param {Array} input.classrooms - [{id, roomNumber, capacity, type, available}]
 * @param {Array} input.sections - [{id, sectionName, studentCount}]
 * @param {Array} input.timeSlots - [{id, day, order, isBreak}]
 * @param {number} [seed] - optional RNG seed for reproducibility in tests
 * @returns {{status: 'complete'|'partial'|'failed', entries: Array, unscheduled: Array, conflicts: Array}}
 */
export function generateTimetable(input, seed = Date.now()) {
  const { courses, faculty, classrooms, sections, timeSlots } = input;
  const rand = mulberry32(seed);

  const facultyById = new Map(faculty.map((f) => [f.id, f]));
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const daySlotIndex = buildDaySlotIndex(timeSlots);
  const days = [...daySlotIndex.keys()];

  const sessions = expandSessions(courses);

  // Precompute candidate windows per session (day+consecutive-slots+room),
  // used both for the most-constrained-first ordering and for search.
  const candidatesFor = (session) => {
    const course = session.course;
    const section = sectionById.get(course.sectionId);
    const facultyMember = facultyById.get(course.facultyId);
    const duration = Math.max(1, Number(course.duration) || 1);
    if (!section || !facultyMember) return [];

    const fittingRooms = classrooms.filter((r) => roomFitsCourse(r, course, section));
    if (fittingRooms.length === 0) return [];

    const out = [];
    for (const day of days) {
      const daySlots = daySlotIndex.get(day);
      const windows = consecutiveWindows(daySlots, duration);
      for (const window of windows) {
        const anyUnavailable = window.some((slot) =>
          facultyIsUnavailable(facultyMember, day, slot.id)
        );
        if (anyUnavailable) continue;
        for (const room of fittingRooms) {
          out.push({ day, window, room, daySlots });
        }
      }
    }
    return out;
  };

  // Most-constrained-first: sessions with fewer valid candidates are placed first.
  const sessionCandidates = new Map();
  for (const session of sessions) {
    sessionCandidates.set(session.id, candidatesFor(session));
  }
  const orderedSessions = sessions
    .filter((s) => sessionCandidates.get(s.id).length > 0 || true)
    .sort((a, b) => sessionCandidates.get(a.id).length - sessionCandidates.get(b.id).length);

  const facultyBusy = new Map(); // key(facultyId, day, slotId) -> sessionId
  const classroomBusy = new Map();
  const sectionBusy = new Map();
  const daySessionCountByCourse = new Map(); // key(courseId, day) -> count, for day-spread soft constraint

  const assignments = []; // final placements
  const unscheduled = [];
  let backtrackSteps = 0;

  function scoreCandidate(session, cand) {
    // Lower is better. Penalize: same-day repeat of this course, exceeding
    // MAX_CONSECUTIVE, not using preferred room, and first/last slot of day.
    let score = rand() * 2; // small randomization so results aren't robotic
    const course = session.course;

    const sameDayCount = daySessionCountByCourse.get(key(course.id, cand.day)) || 0;
    score += sameDayCount * 5; // prefer spreading across days

    if (course.preferredRoomId && cand.room.id !== course.preferredRoomId) score += 2;

    const facultyConsecutive = countConsecutiveUsage(
      facultyBusy,
      course.facultyId,
      cand.day,
      cand.daySlots,
      cand.window
    );
    const sectionConsecutive = countConsecutiveUsage(
      sectionBusy,
      course.sectionId,
      cand.day,
      cand.daySlots,
      cand.window
    );
    if (facultyConsecutive > MAX_CONSECUTIVE) score += 10;
    if (sectionConsecutive > MAX_CONSECUTIVE) score += 10;

    const idxFirst = cand.daySlots.findIndex((s) => s.id === cand.window[0].id);
    const idxLast = cand.daySlots.findIndex(
      (s) => s.id === cand.window[cand.window.length - 1].id
    );
    if (idxFirst === 0 || idxLast === cand.daySlots.length - 1) score += 1;

    return score;
  }

  function isFree(cand, session) {
    const course = session.course;
    for (const slot of cand.window) {
      if (facultyBusy.has(key(course.facultyId, cand.day, slot.id))) return false;
      if (classroomBusy.has(key(cand.room.id, cand.day, slot.id))) return false;
      if (sectionBusy.has(key(course.sectionId, cand.day, slot.id))) return false;
    }
    return true;
  }

  function place(cand, session) {
    const course = session.course;
    for (const slot of cand.window) {
      facultyBusy.set(key(course.facultyId, cand.day, slot.id), session.id);
      classroomBusy.set(key(cand.room.id, cand.day, slot.id), session.id);
      sectionBusy.set(key(course.sectionId, cand.day, slot.id), session.id);
    }
    const k = key(course.id, cand.day);
    daySessionCountByCourse.set(k, (daySessionCountByCourse.get(k) || 0) + 1);
  }

  function unplace(cand, session) {
    const course = session.course;
    for (const slot of cand.window) {
      facultyBusy.delete(key(course.facultyId, cand.day, slot.id));
      classroomBusy.delete(key(cand.room.id, cand.day, slot.id));
      sectionBusy.delete(key(course.sectionId, cand.day, slot.id));
    }
    const k = key(course.id, cand.day);
    daySessionCountByCourse.set(k, Math.max(0, (daySessionCountByCourse.get(k) || 1) - 1));
  }

  function backtrack(index) {
    if (index >= orderedSessions.length) return true;
    backtrackSteps++;
    if (backtrackSteps > BACKTRACK_LIMIT) return false;

    const session = orderedSessions[index];
    const rawCandidates = sessionCandidates.get(session.id);

    if (rawCandidates.length === 0) {
      unscheduled.push({
        courseId: session.course.id,
        courseCode: session.course.courseCode,
        reason: unscheduledReason(session.course),
      });
      return backtrack(index + 1);
    }

    const scored = rawCandidates
      .map((c) => ({ c, s: scoreCandidate(session, c) }))
      .sort((a, b) => a.s - b.s);

    for (const { c: cand } of scored) {
      if (!isFree(cand, session)) continue;
      place(cand, session);
      assignments.push({ session, candidate: cand });

      const ok = backtrack(index + 1);
      if (ok) return true;

      assignments.pop();
      unplace(cand, session);
    }

    // No placement worked for this session even after trying every
    // candidate: record it as unscheduled and continue with the rest so a
    // single hard case doesn't blank out the whole timetable.
    unscheduled.push({
      courseId: session.course.id,
      courseCode: session.course.courseCode,
      reason: "No conflict-free slot/room combination available after search.",
    });
    return backtrack(index + 1);
  }

  function unscheduledReason(course) {
    const section = sectionById.get(course.sectionId);
    const facultyMember = facultyById.get(course.facultyId);
    if (!facultyMember) return "Assigned faculty not found.";
    if (!section) return "Assigned section not found.";
    const fittingRooms = classrooms.filter((r) => roomFitsCourse(r, course, section));
    if (fittingRooms.length === 0) {
      if (course.type === "Practical") {
        return "No available laboratory with sufficient capacity for this section.";
      }
      return "No available classroom with sufficient capacity for this section.";
    }
    return "Faculty has no free, available time slot of the required duration (check unavailable slots).";
  }

  backtrack(0);

  const entries = assignments.flatMap(({ session, candidate }) =>
    candidate.window.map((slot) => ({
      courseId: session.course.id,
      facultyId: session.course.facultyId,
      sectionId: session.course.sectionId,
      classroomId: candidate.room.id,
      timeSlotId: slot.id,
      day: candidate.day,
      type: session.course.type,
    }))
  );

  const status =
    unscheduled.length === 0 ? "complete" : entries.length === 0 ? "failed" : "partial";

  return {
    status,
    entries,
    unscheduled,
    conflicts: [], // populated by lib/conflictDetection.js against saved entries
  };
}

export default generateTimetable;
