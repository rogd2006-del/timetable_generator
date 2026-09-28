"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import { PageHeader, PrimaryButton, TextInput, Badge, Spinner } from "@/components/Ui";

export default function GeneratePage() {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/api/timetable/generate", { name: name || undefined });
      setResult(res.data);
      if (res.data.status === "complete") {
        toast.success("Timetable generated with zero conflicts!");
      } else if (res.data.status === "partial") {
        toast.info("Timetable generated with some classes unscheduled.");
      } else {
        toast.error("Could not schedule any classes. Check your data.");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Generate Timetable"
        description="Runs the constraint-based scheduling engine over your current courses, faculty, classrooms and time slots."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm max-w-2xl">
        <TextInput
          label="Timetable name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Timetable ${new Date().toLocaleDateString()}`}
        />
        <PrimaryButton onClick={handleGenerate} disabled={generating} className="mt-4">
          {generating && <Spinner className="w-4 h-4" />}
          {generating ? "Generating..." : "⚙️ Generate Timetable"}
        </PrimaryButton>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 max-w-3xl space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-slate-900">Generation status</h2>
              <Badge
                color={result.status === "complete" ? "emerald" : result.status === "partial" ? "amber" : "rose"}
              >
                {result.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              {result.entries.length} class session(s) scheduled · {result.unscheduled.length} unscheduled ·{" "}
              {result.conflicts.length} conflict(s) detected.
            </p>
            <div className="mt-4 flex gap-3">
              <PrimaryButton onClick={() => router.push(`/dashboard/timetable?id=${result.timetable._id}`)}>
                View Timetable
              </PrimaryButton>
            </div>
          </div>

          {result.unscheduled.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="font-semibold text-amber-800 mb-3">
                ⚠️ {result.unscheduled.length} class(es) could not be scheduled
              </h3>
              <ul className="space-y-2 text-sm text-amber-800">
                {result.unscheduled.map((u, i) => (
                  <li key={i} className="bg-white/60 rounded-lg px-3 py-2">
                    <span className="font-medium">{u.courseCode}</span>: {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.conflicts.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <h3 className="font-semibold text-rose-800 mb-3">❌ {result.conflicts.length} conflict(s) detected</h3>
              <ul className="space-y-2 text-sm text-rose-800">
                {result.conflicts.map((c, i) => (
                  <li key={i} className="bg-white/60 rounded-lg px-3 py-2">
                    {c.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
