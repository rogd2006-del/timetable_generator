import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

export const metadata = {
  title: "Smart Timetable Generator",
  description:
    "Generate conflict-free college timetables in minutes. Manage courses, faculty, classrooms and sections, then auto-schedule with one click.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
