"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageHeader, EmptyState, LoadingBlock, Badge, PrimaryButton, SecondaryButton, TextInput, Select } from "@/components/Ui";

const TYPES = ["Lecture", "Practical", "Tutorial"];
const EMPTY = {
  courseCode: "",
  courseName: "",
  faculty: "",
  section: "",
  credits: "",
  lecturesPerWeek: "",
  duration: 1,
  preferredRoom: "",
  type: "Lecture",
};

export default function CoursesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [coursesRes, facultyRes, sectionsRes, roomsRes] = await Promise.all([
        api.get("/api/courses"),
        api.get("/api/faculty"),
        api.get("/api/sections"),
        api.get("/api/classrooms"),
      ]);
      setItems(coursesRes.data);
      setFacultyOptions(facultyRes.data);
      setSectionOptions(sectionsRes.data);
      setRoomOptions(roomsRes.data);
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
    return items.filter((c) => {
      const matchesSearch =
        !search ||
        c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
        c.courseName.toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  function openCreate() {
    if (facultyOptions.length === 0 || sectionOptions.length === 0) {
      toast.error("Add at least one faculty member and one section before creating a course.");
      return;
    }
    setEditing(null);
    setForm({ ...EMPTY, faculty: facultyOptions[0]._id, section: sectionOptions[0]._id });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      courseCode: item.courseCode,
      courseName: item.courseName,
      faculty: item.faculty?._id || item.faculty,
      section: item.section?._id || item.section,
      credits: item.credits,
      lecturesPerWeek: item.lecturesPerWeek,
      duration: item.duration,
      preferredRoom: item.preferredRoom?._id || item.preferredRoom || "",
      type: item.type,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        credits: Number(form.credits),
        lecturesPerWeek: Number(form.lecturesPerWeek),
        duration: Number(form.duration),
        preferredRoom: form.preferredRoom || null,
      };
      if (editing) {
        await api.put(`/api/courses/${editing._id}`, payload);
        toast.success("Course updated.");
      } else {
        await api.post("/api/courses", payload);
        toast.success("Course added.");
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
      await api.del(`/api/courses/${deleteTarget._id}`);
      toast.success("Course deleted.");
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
        title="Courses"
        description="Define what needs to be scheduled: subject, faculty, section and weekly load."
        action={<PrimaryButton onClick={openCreate}>+ Add Course</PrimaryButton>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <TextInput
          placeholder="Search by course code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-72"
        />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-48">
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No courses yet"
          description="Add faculty and sections first, then create courses to be scheduled."
          action={<PrimaryButton onClick={openCreate}>+ Add Course</PrimaryButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Faculty</th>
                <th className="text-left px-4 py-3">Section</th>
                <th className="text-left px-4 py-3">Lectures/wk</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.courseCode}</td>
                  <td className="px-4 py-3 text-slate-600">{c.courseName}</td>
                  <td className="px-4 py-3 text-slate-600">{c.faculty?.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.section?.sectionName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.lecturesPerWeek}</td>
                  <td className="px-4 py-3">
                    <Badge color={c.type === "Practical" ? "sky" : c.type === "Tutorial" ? "amber" : "indigo"}>
                      {c.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(c)} className="text-indigo-600 hover:underline text-sm font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Course" : "Add Course"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Course code"
              required
              value={form.courseCode}
              onChange={(e) => setForm({ ...form, courseCode: e.target.value })}
              placeholder="CS301"
            />
            <TextInput
              label="Course name"
              required
              value={form.courseName}
              onChange={(e) => setForm({ ...form, courseName: e.target.value })}
              placeholder="Database Management Systems"
            />
            <Select label="Faculty" required value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
              {facultyOptions.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select label="Section" required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {sectionOptions.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.sectionName}
                </option>
              ))}
            </Select>
            <TextInput
              label="Credits"
              type="number"
              min={1}
              max={10}
              required
              value={form.credits}
              onChange={(e) => setForm({ ...form, credits: e.target.value })}
            />
            <TextInput
              label="Lectures per week"
              type="number"
              min={1}
              max={20}
              required
              value={form.lecturesPerWeek}
              onChange={(e) => setForm({ ...form, lecturesPerWeek: e.target.value })}
            />
            <TextInput
              label="Duration (consecutive slots per class)"
              type="number"
              min={1}
              max={3}
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select
              label="Preferred room (optional)"
              value={form.preferredRoom}
              onChange={(e) => setForm({ ...form, preferredRoom: e.target.value })}
              className="sm:col-span-2"
            >
              <option value="">No preference</option>
              {roomOptions.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.roomNumber} ({r.type})
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Course"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete course?"
        description={`This will permanently remove "${deleteTarget?.courseCode}". This cannot be undone.`}
      />
    </div>
  );
}
