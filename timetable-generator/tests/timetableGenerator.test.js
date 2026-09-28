import { describe, it, expect } from "vitest";
import { generateTimetable } from "../lib/timetableGenerator.js";
import { detectConflicts } from "../lib/conflictDetection.js";

function slot(id, day, order, isBreak = false) {
  return { id, day, order, isBreak };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function buildSlots() {
  const slots = [];
  DAYS.forEach((day) => {
    slots.push(slot(`${day}-1`, day, 0));
    slots.push(slot(`${day}-2`, day, 1));
    slots.push(slot(`${day}-3`, day, 2));
    slots.push(slot(`${day}-break`, day, 3, true));
    slots.push(slot(`${day}-4`, day, 4));
    slots.push(slot(`${day}-5`, day, 5));
  });
  return slots;
}

function baseFixture() {
  return {
    timeSlots: buildSlots(),
    sections: [{ id: "sec1", sectionName: "CSE-A", studentCount: 40 }],
    classrooms: [
      { id: "room1", roomNumber: "A101", capacity: 60, type: "Classroom", available: true },
      { id: "lab1", roomNumber: "Lab-1", capacity: 30, type: "Laboratory", available: true },
    ],
    faculty: [
      { id: "fac1", name: "Dr. Sharma", unavailable: new Set() },
      { id: "fac2", name: "Prof. Patel", unavailable: new Set() },
    ],
  };
}

describe("generateTimetable", () => {
  it("produces a complete, conflict-free timetable for a simple feasible input", () => {
    const fixture = baseFixture();
    const courses = [
      {
        id: "c1",
        courseCode: "DS101",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 3,
        duration: 1,
        type: "Lecture",
      },
      {
        id: "c2",
        courseCode: "DBMS201",
        facultyId: "fac2",
        sectionId: "sec1",
        lecturesPerWeek: 2,
        duration: 1,
        type: "Lecture",
      },
    ];

    const result = generateTimetable({ ...fixture, courses }, 42);

    expect(result.status).toBe("complete");
    expect(result.unscheduled).toHaveLength(0);
    expect(result.entries).toHaveLength(5); // 3 + 2 sessions

    const conflicts = detectConflicts(result.entries, fixture);
    expect(conflicts).toHaveLength(0);
  });

  it("never double-books a faculty member (hard constraint)", () => {
    const fixture = baseFixture();
    // One faculty teaching two different sections' courses heavily -> forces overlap risk.
    const courses = [
      {
        id: "c1",
        courseCode: "OS101",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 8,
        duration: 1,
        type: "Lecture",
      },
      {
        id: "c2",
        courseCode: "CN101",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 8,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 7);
    const conflicts = detectConflicts(result.entries, fixture);
    const facultyConflicts = conflicts.filter((c) => c.category === "faculty");
    expect(facultyConflicts).toHaveLength(0);
  });

  it("never double-books a classroom (hard constraint)", () => {
    const fixture = baseFixture();
    const courses = [
      {
        id: "c1",
        courseCode: "A1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 10,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 3);
    const conflicts = detectConflicts(result.entries, fixture);
    expect(conflicts.filter((c) => c.category === "room")).toHaveLength(0);
  });

  it("never double-books a section (hard constraint)", () => {
    const fixture = baseFixture();
    const courses = [
      {
        id: "c1",
        courseCode: "A1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 6,
        duration: 1,
        type: "Lecture",
      },
      {
        id: "c2",
        courseCode: "A2",
        facultyId: "fac2",
        sectionId: "sec1",
        lecturesPerWeek: 6,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 9);
    const conflicts = detectConflicts(result.entries, fixture);
    expect(conflicts.filter((c) => c.category === "section")).toHaveLength(0);
  });

  it("respects faculty unavailable slots", () => {
    const fixture = baseFixture();
    fixture.faculty[0].unavailable = new Set(
      DAYS.flatMap((d) => [`${d}|${d}-1`, `${d}|${d}-2`, `${d}|${d}-3`, `${d}|${d}-4`])
    );
    const courses = [
      {
        id: "c1",
        courseCode: "A1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 2,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 1);
    for (const entry of result.entries) {
      expect(entry.timeSlotId.endsWith("-5")).toBe(true);
    }
  });

  it("respects classroom capacity", () => {
    const fixture = baseFixture();
    fixture.sections[0].studentCount = 100; // bigger than any room
    const courses = [
      {
        id: "c1",
        courseCode: "A1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 2,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 1);
    expect(result.entries).toHaveLength(0);
    expect(result.unscheduled).toHaveLength(2); // both sessions of the 2-lecture course fail
    expect(result.status).toBe("failed");
  });

  it("requires Practical courses to use a Laboratory", () => {
    const fixture = baseFixture();
    fixture.classrooms[1].capacity = 45; // ensure the lab fits the section size
    const courses = [
      {
        id: "c1",
        courseCode: "LAB1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 2,
        duration: 1,
        type: "Practical",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 1);
    expect(result.entries.length).toBeGreaterThan(0);
    for (const entry of result.entries) {
      expect(entry.classroomId).toBe("lab1");
    }
  });

  it("never schedules into a break slot", () => {
    const fixture = baseFixture();
    const courses = [
      {
        id: "c1",
        courseCode: "A1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 10,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 1);
    for (const entry of result.entries) {
      expect(entry.timeSlotId.includes("break")).toBe(false);
    }
  });

  it("fulfils the exact lecturesPerWeek count when feasible", () => {
    const fixture = baseFixture();
    const courses = [
      {
        id: "c1",
        courseCode: "A1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 4,
        duration: 1,
        type: "Lecture",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 1);
    expect(result.entries).toHaveLength(4);
  });

  it("reports unscheduled classes with a reason when the input is impossible", () => {
    // Only 1 room fits, but capacity is too small, and it's a Practical
    // course needing a Laboratory that doesn't exist.
    const fixture = baseFixture();
    fixture.classrooms = [
      { id: "room1", roomNumber: "A101", capacity: 60, type: "Classroom", available: true },
    ];
    const courses = [
      {
        id: "c1",
        courseCode: "LAB1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 1,
        duration: 1,
        type: "Practical",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 1);
    expect(result.status).toBe("failed");
    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0].reason).toMatch(/laboratory/i);
  });

  it("keeps multi-slot (duration > 1) sessions on consecutive, same-day, non-break slots", () => {
    const fixture = baseFixture();
    const courses = [
      {
        id: "c1",
        courseCode: "LAB1",
        facultyId: "fac1",
        sectionId: "sec1",
        lecturesPerWeek: 2,
        duration: 2,
        type: "Practical",
      },
    ];
    const result = generateTimetable({ ...fixture, courses }, 5);
    // Group entries into sessions of 2 by day+classroom+course, verify slot order adjacency.
    const bySession = new Map();
    for (const e of result.entries) {
      const k = `${e.day}-${e.classroomId}`;
      if (!bySession.has(k)) bySession.set(k, []);
      bySession.get(k).push(e);
    }
    for (const group of bySession.values()) {
      const orders = group
        .map((e) => fixture.timeSlots.find((s) => s.id === e.timeSlotId).order)
        .sort((a, b) => a - b);
      for (let i = 1; i < orders.length; i++) {
        expect(orders[i]).toBe(orders[i - 1] + 1);
      }
    }
  });
});
