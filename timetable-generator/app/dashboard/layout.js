import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = { name: session.name, role: session.role };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-8">{children}</main>
    </div>
  );
}
