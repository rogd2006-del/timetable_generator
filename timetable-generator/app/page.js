import Link from "next/link";

const FEATURES = [
  {
    title: "Conflict-free by design",
    desc: "A backtracking constraint solver guarantees faculty, room, and section clashes never make it into a generated timetable.",
    icon: "🛡️",
  },
  {
    title: "Smart scheduling engine",
    desc: "Balances soft preferences too — spreading subjects across days, respecting preferred rooms, and avoiding overloaded days.",
    icon: "🧠",
  },
  {
    title: "Full course & faculty control",
    desc: "Manage courses, faculty availability, classrooms, sections and time slots with a clean, searchable interface.",
    icon: "📚",
  },
  {
    title: "Instant conflict detection",
    desc: "Every save is re-checked for faculty, room, section, and capacity conflicts, with clear, actionable messages.",
    icon: "🔍",
  },
  {
    title: "Export & share",
    desc: "Export section, faculty, or classroom timetables to CSV or a print-ready PDF layout in one click.",
    icon: "📤",
  },
  {
    title: "Optional AI assistant",
    desc: "Plug in an API key to get plain-English explanations of conflicts and suggested fixes — fully optional.",
    icon: "✨",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Set up your data",
    desc: "Add courses, faculty (with unavailable slots), classrooms, student sections, and your weekly time slots.",
  },
  {
    step: "2",
    title: "Generate",
    desc: "Click Generate Timetable. The scheduling engine runs a constraint-based search and builds a conflict-free schedule.",
  },
  {
    step: "3",
    title: "Review & refine",
    desc: "Check any unscheduled classes, review warnings, and manually adjust individual slots if you like.",
  },
  {
    step: "4",
    title: "Publish & export",
    desc: "Save the timetable, then export per-section, per-faculty, or per-room views as CSV or PDF.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg text-indigo-700">
            <span className="text-2xl">🗓️</span>
            Smart Timetable Generator
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-indigo-700"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
            Built for colleges &amp; schools
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Conflict-free timetables,
            <br className="hidden sm:block" /> generated in minutes.
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Enter your courses, faculty, classrooms and sections. Smart Timetable Generator
            automatically builds a clash-free weekly schedule using a real constraint-satisfaction
            engine — no manual spreadsheet juggling.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition"
            >
              Get Started — it&apos;s free
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900">Everything you need to schedule a term</h2>
          <p className="mt-3 text-slate-600">
            Purpose-built tools for the parts of timetabling that actually take time.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white">How it works</h2>
            <p className="mt-3 text-slate-300">From blank dashboard to published timetable in four steps.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="rounded-2xl bg-slate-800 p-6 border border-slate-700">
                <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Ready to stop building timetables by hand?</h2>
        <p className="mt-4 text-slate-600">
          Create a free account and generate your first conflict-free timetable today.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-block px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow-md hover:bg-indigo-700 transition"
        >
          Get Started
        </Link>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto max-w-7xl px-6 text-sm text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Smart Timetable Generator</span>
          <span>Built with Next.js, MongoDB &amp; a constraint-based scheduling engine.</span>
        </div>
      </footer>
    </div>
  );
}
