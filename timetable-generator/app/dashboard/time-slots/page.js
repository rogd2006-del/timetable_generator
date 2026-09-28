"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageHeader, EmptyState, LoadingBlock, Badge, PrimaryButton, SecondaryButton, TextInput, Select } from "@/components/Ui";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY = { day: "Monday", startTime: "", endTime: "", order: 0, isBreak: false, label: "" };

export default function TimeSlotsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/time-slots");
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

  const byDay = useMemo(() => {
    const map = new Map(DAYS.map((d) => [d, []]));
    for (const s of items) {
      if (!map.has(s.day)) map.set(s.day, []);
      map.get(s.day).push(s);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [items]);

  function openCreate(day) {
    setEditing(null);
    const existingForDay = items.filter((s) => s.day === day);
    setForm({ ...EMPTY, day, order: existingForDay.length });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      order: item.order,
      isBreak: item.isBreak,
      label: item.label || "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (editing) {
        await api.put(`/api/time-slots/${editing._id}`, payload);
        toast.success("Time slot updated.");
      } else {
        await api.post("/api/time-slots", payload);
        toast.success("Time slot added.");
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
      await api.del(`/api/time-slots/${deleteTarget._id}`);
      toast.success("Time slot deleted.");
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
        title="Time Slots"
        description="Define working days, periods, and lunch/break windows."
        action={<PrimaryButton onClick={() => openCreate("Monday")}>+ Add Time Slot</PrimaryButton>}
      />

      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState
          icon="⏰"
          title="No time slots yet"
          description="Add periods for each working day, e.g. 09:00-10:00, and mark lunch breaks."
          action={<PrimaryButton onClick={() => openCreate("Monday")}>+ Add Time Slot</PrimaryButton>}
        />
      ) : (
        <div className="space-y-6">
          {DAYS.filter((d) => byDay.get(d)?.length).map((day) => (
            <div key={day} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">{day}</h3>
                <button
                  onClick={() => openCreate(day)}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  + Add slot
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {byDay.get(day).map((s) => (
                  <div key={s._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-700 w-28">
                        {s.startTime} - {s.endTime}
                      </span>
                      {s.isBreak ? (
                        <Badge color="amber">{s.label || "Break"}</Badge>
                      ) : (
                        <Badge color="indigo">Class period</Badge>
                      )}
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => openEdit(s)} className="text-indigo-600 hover:underline text-xs font-medium">
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="text-rose-600 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Time Slot" : "Add Time Slot"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Start time"
              type="time"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <TextInput
              label="End time"
              type="time"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <TextInput
            label="Order (position within the day, starting at 0)"
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isBreak}
              onChange={(e) => setForm({ ...form, isBreak: e.target.checked })}
              className="rounded border-slate-300"
            />
            This is a break / lunch period (no classes will be scheduled here)
          </label>
          {form.isBreak && (
            <TextInput
              label="Label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Lunch Break"
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <SecondaryButton type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Time Slot"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete time slot?"
        description="This will permanently remove this time slot. This cannot be undone."
      />
    </div>
  );
}
