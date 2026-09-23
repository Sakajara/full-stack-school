"use client";

import { Notice, withSuspense } from "@/components/ui/Page";
import { markAttendance } from "@/lib/actions";
import { col, useLiveDoc, useLiveQuery } from "@/lib/live";
import type { Attendance, Lesson, Student } from "@/lib/types";
import { orderBy, query, where } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

// The class register: every student in the lesson's class, marked present
// or absent for one date. Saving again corrects the register.
const MarkAttendancePage = () => {
  const params = useSearchParams();
  const lessonId = params.get("lesson");
  const date = params.get("date") ?? "";
  const lesson = useLiveDoc<Lesson>(lessonId ? `lessons/${lessonId}` : null);
  const students = useLiveQuery<Student>(
    () =>
      lesson.data
        ? query(col("students"), where("classId", "==", lesson.data.classId), where("active", "==", true), orderBy("surname"))
        : null,
    `reg|${lesson.data?.classId}`
  );
  const existing = useLiveQuery<Attendance>(
    () =>
      lesson.data
        ? query(
            col("attendance"),
            where("teacherId", "==", lesson.data.teacherId),
            where("lessonId", "==", lesson.data.id),
            where("date", "==", date)
          )
        : null,
    `reg-existing|${lessonId}|${date}`
  );

  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from what was saved before; students not yet marked default to present.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const s of students.data) next[s.id] = true;
    for (const a of existing.data) next[a.studentId] = a.present;
    setPresent(next);
  }, [students.data, existing.data]);

  if (!lessonId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return <div className="m-4"><Notice tone="error">Choose a lesson and date from the Attendance page.</Notice></div>;
  }
  if (lesson.loading || students.loading) return <p className="p-8 text-sm text-gray-400">Loading register...</p>;
  if (!lesson.data) return <div className="m-4"><Notice tone="error">Lesson not found.</Notice></div>;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await markAttendance(
        lesson.data!,
        date,
        students.data.map((s) => ({ student: s, present: present[s.id] ?? true }))
      );
      toast("Attendance saved!");
    } catch (e) {
      setError((e as { code?: string }).code === "permission-denied" ? "Only the lecturer of this lesson can take its attendance." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const absent = students.data.filter((s) => present[s.id] === false).length;

  return (
    <div className="bg-surface p-4 rounded-md flex-1 m-4 mt-0 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">
          Register: {lesson.data.subjectCode} {lesson.data.subjectName}
        </h1>
        <p className="text-sm text-gray-500">
          {lesson.data.className}, {date}, {lesson.data.startTime}-{lesson.data.endTime}
          {lesson.data.venue ? `, ${lesson.data.venue}` : ""}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {students.data.length - absent} present, {absent} absent.{" "}
          {existing.data.length > 0 && "This register was saved before; saving again updates it."}
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ul className="flex flex-col divide-y divide-gray-100">
        {students.data.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 gap-2">
            <span className="flex items-center gap-3">
              <Image src={s.img || "/noAvatar.png"} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" unoptimized={!!s.img} />
              <span className="text-sm">
                {s.name} {s.surname}
                <span className="block text-[11px] text-gray-400">{s.admissionNo}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setPresent((p) => ({ ...p, [s.id]: !(p[s.id] ?? true) }))}
              className={`text-xs px-3 py-2 rounded-md min-w-[80px] ${present[s.id] === false ? "bg-red-100 text-red-600" : "bg-lamaSkyLight"}`}
              aria-pressed={present[s.id] !== false}
            >
              {present[s.id] === false ? "Absent" : "Present"}
            </button>
          </li>
        ))}
        {!students.data.length && <li className="py-4 text-sm text-gray-400">No students in this class.</li>}
      </ul>
      <div className="flex gap-4 items-center">
        <button onClick={save} disabled={busy || !students.data.length} className="bg-blue-400 text-white p-2 px-6 rounded-md disabled:opacity-60">
          {busy ? "Saving..." : "Save register"}
        </button>
        <Link href="/list/attendance" className="text-sm text-gray-500 underline">Back</Link>
      </div>
    </div>
  );
};

export default withSuspense(MarkAttendancePage);
