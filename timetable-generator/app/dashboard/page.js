import Link from "next/link";
import { getSession } from "@/lib/auth";
import connectDB from "@/lib/db";
import Course from "@/models/Course";
import Faculty from "@/models/Faculty";
import Classroom from "@/models/Classroom";
import Section from "@/models/Section";
import TimeSlot from "@/models/TimeSlot";
import Timetable from "@/models/Timetable";

const CARDS = [
  { key: "courses", label: "Total Courses", icon: "📚", href: "/dashboard/courses", color: "bg-indigo-600" },
  { key: "faculty", label: "Total Faculty", icon: "🧑‍🏫", href: "/dashboard/faculty", color: "bg-sky-600" },
  { key: "classrooms", label: "Total Classrooms", icon: "🏫", href: "/dashboard/classrooms", color: "bg-emerald-600" },
  { key: "sections", label: "Total Sections", icon: "👥", href: "/dashboard/sections", color: "bg-amber-600" },
  { key: "timeSlots", label: "Total Time Slots", icon: "⏰", href: "/dashboard/time-slots", color: "bg-rose-600" },
  { key: "timetables", label: "Generated Timetables", icon: "🗓️", href: "/dashboard/timetable", color: "bg-violet-600" },
];

async function loadCounts(owner) {
  try {
    await connectDB();
    const [courses, faculty, classrooms, sections, timeSlots, timetables, recentTimetables] =
      await Promise.all([
        Course.countDocuments({ owner }),
        Faculty.countDocuments({ owner }),
        Classroom.countDocuments({ owner }),
        Section.countDocuments({ owner }),
        TimeSlot.countDocuments({ owner }),
        Timetable.countDocuments({ owner }),
        Timetable.find({ owner }).sort({ createdAt: -1 }).limit(5),
      ]);
    return {
      ok: true,
      counts: { courses, faculty, classrooms, sections, timeSlots, timetables },
      recentTimetables,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  const { ok, counts, recentTimetables, error } = await loadCounts(session.sub);

  if (!ok) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <h2 className="font-semibold mb-1">Couldn&apos;t connect to the database</h2>
        <p className="text-sm">
          {error || "MongoDB is not reachable right now."} Check <code>MONGODB_URI</code> in your
          environment and try again.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {session.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s what&apos;s happening with your timetables.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/generate"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            ⚙️ Generate Timetable
          </Link>
          <Link
            href="/dashboard/timetable"
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            🗓️ View Timetable
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition flex items-center gap-4"
          >
            <div className={`w-11 h-11 rounded-xl ${c.color} text-white flex items-center justify-center text-xl shrink-0`}>
              {c.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts[c.key]}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900 mb-4">Recent activity</h2>
        {recentTimetables.length === 0 ? (
          <p className="text-sm text-slate-500">
            No timetables generated yet. Head to{" "}
            <Link href="/dashboard/generate" className="text-indigo-600 font-medium hover:underline">
              Generate Timetable
            </Link>{" "}
            to create your first one.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentTimetables.map((t) => (
              <li key={t._id.toString()} className="py-3 flex items-center justify-between">
                <div>
                  <Link
                    href={`/dashboard/timetable?id=${t._id}`}
                    className="font-medium text-slate-800 hover:text-indigo-600"
                  >
                    {t.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleString()} · {t.conflictCount} conflict(s)
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    t.status === "complete"
                      ? "bg-emerald-100 text-emerald-700"
                      : t.status === "partial"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
