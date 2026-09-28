"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageHeader, EmptyState, LoadingBlock, Badge, PrimaryButton, SecondaryButton, TextInput, Select } from "@/components/Ui";

const TYPES = ["Classroom", "Laboratory", "Seminar Hall"];
const EMPTY = { roomNumber: "", building: "", capacity: "", type: "Classroom", available: true };

export default function ClassroomsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
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
      const res = await api.get("/api/classrooms");
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
    return items.filter((c) => {
      const matchesSearch =
        !search ||
        c.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
        (c.building || "").toLowerCase().includes(search.toLowerCase());
      const matchesType = !typeFilter || c.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      roomNumber: item.roomNumber,
      building: item.building || "",
      capacity: item.capacity,
      type: item.type,
      available: item.available,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) };
      if (editing) {
        await api.put(`/api/classrooms/${editing._id}`, payload);
        toast.success("Classroom updated.");
      } else {
        await api.post("/api/classrooms", payload);
        toast.success("Classroom added.");
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
      await api.del(`/api/classrooms/${deleteTarget._id}`);
      toast.success("Classroom deleted.");
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
        title="Classrooms"
        description="Rooms, labs and seminar halls available for scheduling."
        action={<PrimaryButton onClick={openCreate}>+ Add Classroom</PrimaryButton>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <TextInput
          placeholder="Search by room number or building..."
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
          icon="🏫"
          title="No classrooms yet"
          description="Add your first classroom, laboratory, or seminar hall to get started."
          action={<PrimaryButton onClick={openCreate}>+ Add Classroom</PrimaryButton>}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Room</th>
                <th className="text-left px-4 py-3">Building</th>
                <th className="text-left px-4 py-3">Capacity</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.roomNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{c.building || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.capacity}</td>
                  <td className="px-4 py-3">
                    <Badge color={c.type === "Laboratory" ? "sky" : c.type === "Seminar Hall" ? "amber" : "indigo"}>
                      {c.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={c.available ? "emerald" : "rose"}>{c.available ? "Available" : "Unavailable"}</Badge>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Classroom" : "Add Classroom"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Room number"
            required
            value={form.roomNumber}
            onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
            placeholder="A101"
          />
          <TextInput
            label="Building"
            value={form.building}
            onChange={(e) => setForm({ ...form, building: e.target.value })}
            placeholder="Main Block"
          />
          <TextInput
            label="Capacity"
            type="number"
            min={1}
            required
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="rounded border-slate-300"
            />
            Available for scheduling
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Classroom"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete classroom?"
        description={`This will permanently remove "${deleteTarget?.roomNumber}". This cannot be undone.`}
      />
    </div>
  );
}
