"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageHeader, EmptyState, LoadingBlock, PrimaryButton, SecondaryButton, TextInput } from "@/components/Ui";

const EMPTY = { sectionName: "", department: "", semester: "", studentCount: "", academicYear: "" };

export default function SectionsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/sections");
      setItems(res.data);
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
      (s) =>
        !search ||
        s.sectionName.toLowerCase().includes(search.toLowerCase()) ||
        s.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      sectionName: item.sectionName,
      department: item.department,
      semester: item.semester,
      studentCount: item.studentCount,
      academicYear: item.academicYear,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        semester: Number(form.semester),
        studentCount: Number(form.studentCount),
      };
      if (editing) {
        await api.put(`/api/sections/${editing._id}`, payload);
        toast.success("Section updated.");
      } else {
        await api.post("/api/sections", payload);
        toast.success("Section added.");
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
      await api.del(`/api/sections/${deleteTarget._id}`);
      toast.success("Section deleted.");
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
        title="Sections"
        description="Student groups such as CSE-A, CSE-B, IT-A."
        action={<PrimaryButton onClick={openCreate}>+ Add Section</PrimaryButton>}
      />

      <TextInput
        placeholder="Search by section name or department..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="sm:w-72 mb-4"
      />

      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No sections yet"
          description="Add student sections/groups before creating courses."
          action={<PrimaryButton onClick={openCreate}>+ Add Section</PrimaryButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Section</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Semester</th>
                <th className="text-left px-4 py-3">Students</th>
                <th className="text-left px-4 py-3">Academic Year</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.sectionName}</td>
                  <td className="px-4 py-3 text-slate-600">{s.department}</td>
                  <td className="px-4 py-3 text-slate-600">{s.semester}</td>
                  <td className="px-4 py-3 text-slate-600">{s.studentCount}</td>
                  <td className="px-4 py-3 text-slate-600">{s.academicYear}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(s)} className="text-indigo-600 hover:underline text-sm font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(s)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Section" : "Add Section"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Section name"
            required
            value={form.sectionName}
            onChange={(e) => setForm({ ...form, sectionName: e.target.value })}
            placeholder="CSE-A"
          />
          <TextInput
            label="Department"
            required
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="Computer Science"
          />
          <TextInput
            label="Semester"
            type="number"
            min={1}
            max={12}
            required
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
          />
          <TextInput
            label="Student count"
            type="number"
            min={1}
            required
            value={form.studentCount}
            onChange={(e) => setForm({ ...form, studentCount: e.target.value })}
          />
          <TextInput
            label="Academic year"
            required
            value={form.academicYear}
            onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            placeholder="2026-2027"
          />
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Section"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete section?"
        description={`This will permanently remove "${deleteTarget?.sectionName}". This cannot be undone.`}
      />
    </div>
  );
}
