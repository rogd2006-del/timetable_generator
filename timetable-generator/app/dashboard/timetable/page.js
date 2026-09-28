"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/apiClient";
import { useToast } from "@/components/ToastProvider";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageHeader, EmptyState, LoadingBlock, Badge, PrimaryButton, SecondaryButton, TextInput, Select } from "@/components/Ui";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TYPE_STYLES = {
  Lecture: "bg-indigo-50 border-indigo-300 text-indigo-800",
  Practical: "bg-sky-50 border-sky-300 text-sky-800",
  Tutorial: "bg-amber-50 border-amber-300 text-amber-800",
};

function TimetableInner() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [timetables, setTimetables] = useState([]);
  const [selectedId, setSelectedId] = useState(idParam || "");
  const [detail, setDetail] = useState(null); // { timetable, entries }
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [classrooms, setClassrooms] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  const [filters, setFilters] = useState({ faculty: "", section: "", classroom: "", department: "", semester: "" });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editForm, setEditForm] = useState({ classroom: "", timeSlot: "", day: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadList() {
    setLoadingList(true);
    try {
      const res = await api.get("/api/timetable");
      setTimetables(res.data);
      if (!selectedId && res.data.length > 0) {
        setSelectedId(res.data[0]._id);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetail(id) {
    if (!id) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/timetable?id=${id}`);
      setDetail(res.data);
    } catch (err) {
      toast.error(err.message);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadReferenceData() {
    try {
      const [roomsRes, slotsRes] = await Promise.all([api.get("/api/classrooms"), api.get("/api/time-slots")]);
      setClassrooms(roomsRes.data);
      setTimeSlots(slotsRes.data);
    } catch {
      // non-fatal for viewing
    }
  }

  useEffect(() => {
    loadList();
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
      router.replace(`/dashboard/timetable?id=${selectedId}`, { scroll: false });
    }
  }, [selectedId]);

  const entries = useMemo(() => detail?.entries || [], [detail]);

  const filterOptions = useMemo(() => {
    const faculty = new Map();
    const sections = new Map();
    const rooms = new Map();
    for (const e of entries) {
      if (e.faculty) faculty.set(e.faculty._id, e.faculty.name);
      if (e.section) sections.set(e.section._id, e.section.sectionName);
      if (e.classroom) rooms.set(e.classroom._id, e.classroom.roomNumber);
    }
    return { faculty: [...faculty], sections: [...sections], rooms: [...rooms] };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filters.faculty && e.faculty?._id !== filters.faculty) return false;
      if (filters.section && e.section?._id !== filters.section) return false;
      if (filters.classroom && e.classroom?._id !== filters.classroom) return false;
      return true;
    });
  }, [entries, filters]);

  const daysPresent = useMemo(() => {
    const set = new Set(entries.map((e) => e.day));
    return DAYS.filter((d) => set.has(d));
  }, [entries]);

  const slotsPresent = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      if (e.timeSlot) map.set(e.timeSlot._id, e.timeSlot);
    }
    return [...map.values()].sort((a, b) => a.order - b.order || a.startTime.localeCompare(b.startTime));
  }, [entries]);

  const grid = useMemo(() => {
    const g = new Map(); // key: slotId|day -> [entries]
    for (const e of filteredEntries) {
      const key = `${e.timeSlot?._id}|${e.day}`;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(e);
    }
    return g;
  }, [filteredEntries]);

  function openEntry(entry) {
    setSelectedEntry(entry);
    setEditForm({
      classroom: entry.classroom?._id || "",
      timeSlot: entry.timeSlot?._id || "",
      day: entry.day || "",
    });
    setConflictInfo(null);
  }

  async function saveEdit() {
    setSavingEdit(true);
    try {
      await api.put(`/api/timetable/${selectedId}`, {
        entryUpdate: {
          entryId: selectedEntry._id,
          classroom: editForm.classroom,
          timeSlot: editForm.timeSlot,
          day: editForm.day,
        },
      });
      const check = await api.post("/api/conflicts/check", { timetableId: selectedId });
      setConflictInfo(check.data);
      toast.success("Assignment updated.");
      await loadDetail(selectedId);
      setSelectedEntry(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRename() {
    setBusy(true);
    try {
      await api.put(`/api/timetable/${selectedId}`, { name: renameValue });
      toast.success("Timetable renamed.");
      setRenameOpen(false);
      loadList();
      loadDetail(selectedId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate() {
    setBusy(true);
    try {
      const res = await api.post("/api/timetable", {
        duplicateFrom: selectedId,
        name: `${detail.timetable.name} (copy)`,
      });
      toast.success("Timetable duplicated.");
      await loadList();
      setSelectedId(res.data._id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api.del(`/api/timetable/${selectedId}`);
      toast.success("Timetable deleted.");
      setDeleteOpen(false);
      setSelectedId("");
      setDetail(null);
      loadList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function exportCSV() {
    const rows = [["Day", "Start", "End", "Course Code", "Course Name", "Faculty", "Section", "Room", "Type"]];
    for (const e of filteredEntries) {
      rows.push([
        e.day,
        e.timeSlot?.startTime,
        e.timeSlot?.endTime,
        e.course?.courseCode,
        e.course?.courseName,
        e.faculty?.name,
        e.section?.sectionName,
        e.classroom?.roomNumber,
        e.type,
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail?.timetable?.name || "timetable"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loadingList) return <LoadingBlock />;

  if (timetables.length === 0) {
    return (
      <div>
        <PageHeader title="Timetable" description="View and manage your generated timetables." />
        <EmptyState
          icon="🗓️"
          title="No timetables yet"
          description="Generate your first timetable to see it here."
          action={
            <PrimaryButton onClick={() => router.push("/dashboard/generate")}>⚙️ Generate Timetable</PrimaryButton>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Timetable"
        description="View, filter, edit and export your generated timetables."
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-56">
              {timetables.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <SecondaryButton onClick={() => router.push("/dashboard/generate")}>+ New</SecondaryButton>
          </div>
        }
      />

      {loadingDetail || !detail ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge
              color={detail.timetable.status === "complete" ? "emerald" : detail.timetable.status === "partial" ? "amber" : "rose"}
            >
              {detail.timetable.status}
            </Badge>
            <span className="text-sm text-slate-500">{detail.timetable.conflictCount} conflict(s) at generation time</span>
            <div className="flex-1" />
            <SecondaryButton
              onClick={() => {
                setRenameValue(detail.timetable.name);
                setRenameOpen(true);
              }}
            >
              ✏️ Rename
            </SecondaryButton>
            <SecondaryButton onClick={handleDuplicate} disabled={busy}>
              📄 Duplicate
            </SecondaryButton>
            <SecondaryButton onClick={exportCSV}>⬇️ Export CSV</SecondaryButton>
            <SecondaryButton onClick={() => window.print()}>🖨️ Print / PDF</SecondaryButton>
            <button onClick={() => setDeleteOpen(true)} className="text-sm font-medium text-rose-600 hover:underline px-2">
              Delete
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-6 print:hidden">
            <Select
              value={filters.faculty}
              onChange={(e) => setFilters({ ...filters, faculty: e.target.value })}
              className="w-48"
            >
              <option value="">All faculty</option>
              {filterOptions.faculty.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.section}
              onChange={(e) => setFilters({ ...filters, section: e.target.value })}
              className="w-48"
            >
              <option value="">All sections</option>
              {filterOptions.sections.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.classroom}
              onChange={(e) => setFilters({ ...filters, classroom: e.target.value })}
              className="w-48"
            >
              <option value="">All rooms</option>
              {filterOptions.rooms.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </div>

          {entries.length === 0 ? (
            <EmptyState icon="🗓️" title="No entries in this timetable" description="Nothing was scheduled — check the unscheduled list on the Generate page." />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left text-slate-500 z-10">
                      Time
                    </th>
                    {daysPresent.map((d) => (
                      <th key={d} className="bg-slate-50 border-b border-slate-200 px-3 py-2 text-slate-600 min-w-[160px]">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slotsPresent.map((slot) => (
                    <tr key={slot._id}>
                      <td className="sticky left-0 bg-white border-r border-b border-slate-100 px-3 py-2 font-medium text-slate-600 whitespace-nowrap z-10">
                        {slot.startTime}-{slot.endTime}
                        {slot.isBreak && <Badge color="amber" className="ml-2">Break</Badge>}
                      </td>
                      {daysPresent.map((day) => {
                        const cellEntries = grid.get(`${slot._id}|${day}`) || [];
                        return (
                          <td key={day} className="border-b border-slate-100 px-1.5 py-1.5 align-top">
                            <div className="flex flex-col gap-1">
                              {cellEntries.map((e) => (
                                <button
                                  key={e._id}
                                  onClick={() => openEntry(e)}
                                  className={`text-left rounded-lg border px-2 py-1.5 hover:shadow transition ${
                                    TYPE_STYLES[e.type] || TYPE_STYLES.Lecture
                                  }`}
                                >
                                  <div className="font-semibold">{e.course?.courseCode}</div>
                                  <div className="truncate">{e.faculty?.name}</div>
                                  <div className="flex items-center justify-between text-[11px] opacity-80">
                                    <span>{e.classroom?.roomNumber}</span>
                                    <span>{e.section?.sectionName}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={!!selectedEntry} onClose={() => setSelectedEntry(null)} title="Class Details" wide>
        {selectedEntry && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Course</dt>
                <dd className="font-medium text-slate-800">
                  {selectedEntry.course?.courseCode} — {selectedEntry.course?.courseName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-slate-800">{selectedEntry.type}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Faculty</dt>
                <dd className="font-medium text-slate-800">{selectedEntry.faculty?.name}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Section</dt>
                <dd className="font-medium text-slate-800">{selectedEntry.section?.sectionName}</dd>
              </div>
            </dl>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Edit assignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select label="Day" value={editForm.day} onChange={(e) => setEditForm({ ...editForm, day: e.target.value })}>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Time slot"
                  value={editForm.timeSlot}
                  onChange={(e) => setEditForm({ ...editForm, timeSlot: e.target.value })}
                >
                  {timeSlots
                    .filter((s) => s.day === editForm.day)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.startTime}-{s.endTime} {s.isBreak ? "(break)" : ""}
                      </option>
                    ))}
                </Select>
                <Select
                  label="Classroom"
                  value={editForm.classroom}
                  onChange={(e) => setEditForm({ ...editForm, classroom: e.target.value })}
                >
                  {classrooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <PrimaryButton onClick={saveEdit} disabled={savingEdit} className="mt-4">
                {savingEdit ? "Saving..." : "Save & Check Conflicts"}
              </PrimaryButton>

              {conflictInfo && (
                <div className="mt-4 space-y-2">
                  {conflictInfo.conflicts.length === 0 && conflictInfo.warnings.length === 0 ? (
                    <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                      ✅ No conflicts detected after this change.
                    </p>
                  ) : (
                    <>
                      {conflictInfo.conflicts.map((c, i) => (
                        <p key={i} className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">
                          ERROR: {c.message}
                        </p>
                      ))}
                      {conflictInfo.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                          WARNING: {w.message}
                        </p>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename Timetable">
        <TextInput label="Name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
        <div className="flex justify-end gap-3 mt-4">
          <SecondaryButton onClick={() => setRenameOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleRename} disabled={busy}>
            Save
          </PrimaryButton>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={busy}
        title="Delete this timetable?"
        description="This will permanently remove the timetable and all its scheduled entries."
      />
    </div>
  );
}

export default function TimetablePage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <TimetableInner />
    </Suspense>
  );
}
