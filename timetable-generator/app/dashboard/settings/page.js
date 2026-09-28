import { getSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getSession();
  const aiConfigured = !!process.env.AI_API_KEY;
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm">
        <div>
          <p className="text-slate-500">Name</p>
          <p className="font-medium text-slate-800">{session.name}</p>
        </div>
        <div>
          <p className="text-slate-500">Role</p>
          <p className="font-medium text-slate-800">{session.role}</p>
        </div>
        <div>
          <p className="text-slate-500">AI assistant</p>
          <p className="font-medium text-slate-800">
            {aiConfigured ? "Configured (AI_API_KEY is set)" : "Not configured — the core generator works without it."}
          </p>
        </div>
      </div>
    </div>
  );
}
