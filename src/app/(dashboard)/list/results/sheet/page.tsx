"use client";

import { Notice, withSuspense } from "@/components/ui/Page";
import { saveResultsSheet } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { letterGrade } from "@/lib/grading";
import { col, useLiveDoc, useLiveQuery } from "@/lib/live";
import type { Assignment, Exam, Result, Student } from "@/lib/types";
import { orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

// Enter or correct the marks of a whole class for one CAT, assignment or exam.
const MarkSheetPage = () => {
  const { role, user } = useAuth();
  const assessment = useSearchParams().get("assessment") ?? "";
  const [kind, id] = assessment.split(":");
  const path = id && (kind === "exam" || kind === "assignment") ? `${kind}s/${id}` : null;
  const a = useLiveDoc<Exam | Assignment>(path);

  const students = useLiveQuery<Student>(
    () =>
      a.data
        ? query(col("students"), where("classId", "==", a.data.classId), where("active", "==", true), orderBy("surname"))
        : null,
    `sheet-students|${a.data?.classId}`
  );
  const existing = useLiveQuery<Result>(
    () =>
      a.data
        ? query(
            col("results"),
            ...(role === "teacher" ? [where("teacherId", "==", user?.uid ?? "")] : []),
            where(kind === "exam" ? "examId" : "assignmentId", "==", id)
          )
        : null,
    `sheet-results|${assessment}|${role}`
  );

  const [scores, setScores] = useState<Record<string, number | "">>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, number | ""> = {};
    for (const r of existing.data) next[r.studentId] = r.score;
    setScores((prev) => ({ ...next, ...prev }));
    // Keep what the lecturer has typed; fill in saved marks around it.
  }, [existing.data]);

  if (!path) return <div className="m-4"><Notice tone="error">Open a mark sheet from an exam or CAT.</Notice></div>;
  if (a.loading) return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  if (!a.data) return <div className="m-4"><Notice tone="error">Assessment not found.</Notice></div>;
  const max = a.data.maxScore;

  const invalid = Object.entries(scores).filter(([, v]) => v !== "" && (Number(v) < 0 || Number(v) > max));

  const save = async () => {
    if (invalid.length) {
      setError(`Scores must be between 0 and ${max}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveResultsSheet(assessment, scores);
      toast("Marks saved!");
    } catch (e) {
      setError((e as { code?: string }).code === "permission-denied" ? "Only the lecturer of this unit can enter these marks." : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface p-4 rounded-md flex-1 m-4 mt-0 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">
          Mark sheet: {a.data.subjectCode} {a.data.title}
        </h1>
        <p className="text-sm text-gray-500">
          {a.data.className}, out of {max}. Leave a box empty for a student who has not been marked.
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Student</th>
              <th>Admission No.</th>
              <th>Score</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.data.map((s) => {
              const v = scores[s.id] ?? "";
              const bad = v !== "" && (Number(v) < 0 || Number(v) > max);
              return (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="py-2">{s.name} {s.surname}</td>
                  <td>{s.admissionNo}</td>
                  <td>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={0}
                      max={max}
                      value={v}
                      onChange={(e) => setScores((p) => ({ ...p, [s.id]: e.target.value === "" ? "" : Number(e.target.value) }))}
                      className={`ring-[1.5px] ${bad ? "ring-red-400" : "ring-gray-300"} p-1 rounded-md w-20`}
                      aria-label={`Score for ${s.name} ${s.surname}`}
                    />
                  </td>
                  <td className="text-gray-500">{v === "" || bad ? "" : letterGrade((Number(v) / max) * 100)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 items-center">
        <button onClick={save} disabled={busy} className="bg-blue-400 text-white p-2 px-6 rounded-md disabled:opacity-60">
          {busy ? "Saving..." : "Save marks"}
        </button>
        <Link href={kind === "exam" ? "/list/exams" : "/list/assignments"} className="text-sm text-gray-500 underline">
          Back
        </Link>
      </div>
    </div>
  );
};

export default withSuspense(MarkSheetPage);
