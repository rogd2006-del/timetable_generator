// Usage: npm run seed  (requires MONGODB_URI in .env.local; loaded via node --env-file)
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI is not set."); process.exit(1); }

await mongoose.connect(uri);
const db = mongoose.connection.db;
const now = new Date();
const email = "admin@example.com";

await db.collection("users").deleteOne({ email });
const { insertedId: owner } = await db.collection("users").insertOne({
  name: "Demo Admin", email, password: await bcrypt.hash("password123", 10),
  role: "admin", createdAt: now, updatedAt: now,
});
const o = (extra) => ({ ...extra, owner, createdAt: now, updatedAt: now });

for (const c of ["courses","faculty","classrooms","sections","timeslots","timetables","timetableentries"]) {
  await db.collection(c).deleteMany({ owner });
}

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const periods = [["09:00","10:00"],["10:00","11:00"],["11:00","12:00"],["12:00","13:00",true],["14:00","15:00"],["15:00","16:00"]];
const slotDocs = days.flatMap((day) => periods.map(([s,e,br], i) =>
  o({ day, startTime: s, endTime: e, order: i, isBreak: !!br, label: br ? "Lunch Break" : "" })));
await db.collection("timeslots").insertMany(slotDocs);

const fac = ["Dr. Sharma","Prof. Patel","Dr. Khan","Prof. Singh"].map((name, i) =>
  o({ name, employeeId: `EMP-${100+i}`, email: `f${i}@college.edu`, department: "Computer Science", subjects: [], unavailableSlots: [] }));
const facRes = await db.collection("faculty").insertMany(fac);
const F = Object.values(facRes.insertedIds);

const rooms = [["A101",60,"Classroom"],["A102",60,"Classroom"],["B201",80,"Classroom"],["Lab-1",40,"Laboratory"],["Lab-2",40,"Laboratory"]]
  .map(([roomNumber,capacity,type]) => o({ roomNumber, building: "Main", capacity, type, available: true }));
await db.collection("classrooms").insertMany(rooms);

const secRes = await db.collection("sections").insertMany(["CSE-A","CSE-B"].map((sectionName) =>
  o({ sectionName, department: "Computer Science", semester: 4, studentCount: 40, academicYear: "2026-2027" })));
const S = Object.values(secRes.insertedIds);

const base = [
  ["CS201","Data Structures",0,4,"Lecture"],
  ["CS202","Database Management",1,3,"Lecture"],
  ["CS203","Operating Systems",2,3,"Lecture"],
  ["CS204","Computer Networks",3,3,"Lecture"],
  ["CS205","Web Development Lab",1,2,"Practical"],
];
const courses = S.flatMap((sec, si) => base.map(([courseCode,courseName,fi,lecturesPerWeek,type]) =>
  o({ courseCode, courseName, faculty: F[(fi+si)%4], section: sec, credits: 3, lecturesPerWeek,
      duration: type === "Practical" ? 2 : 1, preferredRoom: null, type })));
await db.collection("courses").insertMany(courses);

console.log(`Seeded. Login: ${email} / password123`);
await mongoose.disconnect();
