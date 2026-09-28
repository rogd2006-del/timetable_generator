"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageHeader, EmptyState, LoadingBlock, Badge, PrimaryButton, SecondaryButton, TextInput } from "@/components/Ui";

const EMPTY = { name: "", employeeId: "", email: "", department: "", subjects: "" };

export default function FacultyPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [unavailable, setUnavailable] = useState(new Set()); // "day|slotId"
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [facultyRes, slotsRes] = await Promise.all([
        api.get("/api/faculty"),
        api.get("/api/time-slots"),
      ]);
      setItems(facultyRes.data);
      setTimeSlots(slotsRes.data.filter((s) => !s.isBreak));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter(
      (f) =>
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        f.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const daysWithSlots = useMemo(() => {
    const byDay = new Map();
    for (const s of timeSlots) {
      if (!byDay.has(s.day)) byDay.set(s.day, []);
      byDay.get(s.day).push(s);
    }
    for (const list of byDay.values()) list.sort((a, b) => a.order - b.order);
    return byDay;
  }, [timeSlots]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setUnavailable(new Set());
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      employeeId: item.employeeId,
      email: item.email,
      department: item.department,
      subjects: (item.subjects || []).join(", "),
    });
    setUnavailable(new Set((item.unavailableSlots || []).map((u) => `${u.day}|${u.timeSlot}`)));
    setModalOpen(true);
  }

  function toggleSlot(day, slotId) {
    const key = `${day}|${slotId}`;
    setUnavailable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        subjects: form.subjects
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        unavailableSlots: [...unavailable].map((key) => {
          const [day, timeSlot] = key.split("|");
          return { day, timeSlot };
        }),
      };
      if (editing) {
        await api.put(`/api/faculty/${editing._id}`, payload);
        toast.success("Faculty updated.");
      } else {
        await api.post("/api/faculty", payload);
        toast.success("Faculty added.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/faculty/${deleteTarget._id}`);
      toast.success("Faculty deleted.");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Faculty"
        description="Instructors, their subjects, and unavailable time slots."
        action={<PrimaryButton onClick={openCreate}>+ Add Faculty</PrimaryButton>}
      />

      <TextInput
        placeholder="Search by name, employee ID or department..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-80 mb-4"
      />

      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🧑‍🏫"
          title="No faculty yet"
          description="Add faculty members so they can be assigned to courses."
          action={<PrimaryButton onClick={openCreate}>+ Add Faculty</PrimaryButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Employee ID</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Subjects</th>
                <th className="text-left px-4 py-3">Unavailable slots</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((f) => (
                <tr key={f._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{f.name}</td>
                  <td className="px-4 py-3 text-slate-600">{f.employeeId}</td>
                  <td className="px-4 py-3 text-slate-600">{f.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(f.subjects || []).slice(0, 3).map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                      {f.subjects?.length > 3 && <Badge>+{f.subjects.length - 3}</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.unavailableSlots?.length || 0}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(f)} className="text-indigo-600 hover:underline text-sm font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(f)}
                      className="text-rose-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Faculty" : "Add Faculty"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dr. Sharma"
            />
            <TextInput
              label="Employee ID"
              required
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              placeholder="EMP-1024"
            />
            <TextInput
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="sharma@college.edu"
            />
            <TextInput
              label="Department"
              required
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Computer Science"
            />
          </div>
          <TextInput
            label="Subjects (comma separated)"
            value={form.subjects}
            onChange={(e) => setForm({ ...form, subjects: e.target.value })}
            placeholder="Data Structures, Operating Systems"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Unavailable time slots{" "}
              <span className="text-slate-400 font-normal">
                (click to toggle — {timeSlots.length === 0 ? "add time slots first" : "these will never be used for this faculty"})
              </span>
            </label>
            {daysWithSlots.size === 0 ? (
              <p className="text-sm text-slate-400 italic">No time slots configured yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin border border-slate-200 rounded-lg p-3">
                {[...daysWithSlots.entries()].map(([day, slots]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{day}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {slots.map((s) => {
                        const key = `${day}|${s._id}`;
                        const active = unavailable.has(key);
                        return (
                          <button
                            type="button"
                            key={s._id}
                            onClick={() => toggleSlot(day, s._id)}
                            className={`text-xs px-2 py-1 rounded-md border ${
                              active
                                ? "bg-rose-600 text-white border-rose-600"
                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {s.startTime}-{s.endTime}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Faculty"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete faculty member?"
        description={`This will permanently remove "${deleteTarget?.name}". This cannot be undone.`}
      />
    </div>
  );
}
