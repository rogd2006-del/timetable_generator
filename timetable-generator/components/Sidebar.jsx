"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", exact: true },
  { href: "/dashboard/courses", label: "Courses", icon: "📚" },
  { href: "/dashboard/faculty", label: "Faculty", icon: "🧑‍🏫" },
  { href: "/dashboard/classrooms", label: "Classrooms", icon: "🏫" },
  { href: "/dashboard/sections", label: "Sections", icon: "👥" },
  { href: "/dashboard/time-slots", label: "Time Slots", icon: "⏰" },
  { href: "/dashboard/generate", label: "Generate Timetable", icon: "⚙️" },
  { href: "/dashboard/timetable", label: "Timetable", icon: "🗓️" },
  { href: "/dashboard/settings", label: "Settings", icon: "🔧" },
];

function NavLinks({ pathname, onNavigate }) {
  return (
    <nav className="flex-1 px-3 space-y-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    try {
      await api.post("/api/auth/logout", {});
      toast.success("Logged out.");
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-slate-900 text-white flex items-center justify-between px-4 h-14">
        <span className="font-bold flex items-center gap-2">🗓️ Smart Timetable</span>
        <button onClick={() => setMobileOpen((v) => !v)} className="p-2" aria-label="Toggle menu">
          <div className="w-6 h-0.5 bg-white mb-1.5" />
          <div className="w-6 h-0.5 bg-white mb-1.5" />
          <div className="w-6 h-0.5 bg-white" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/60" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 flex flex-col py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 mb-4 font-bold text-white">🗓️ Smart Timetable</div>
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            <div className="px-4 pt-4 border-t border-slate-800 mt-4">
              <p className="text-xs text-slate-400 mb-2">{user?.name} ({user?.role})</p>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-slate-800"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-slate-900 min-h-screen sticky top-0 py-4">
        <div className="px-4 mb-6 font-bold text-white text-lg flex items-center gap-2">
          🗓️ Smart Timetable
        </div>
        <NavLinks pathname={pathname} />
        <div className="px-4 pt-4 mt-4 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-2 truncate">
            {user?.name} <span className="text-slate-500">({user?.role})</span>
          </p>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-300 hover:bg-slate-800"
          >
            🚪 Logout
          </button>
        </div>
      </aside>
    </>
  );
}
