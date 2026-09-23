"use client";

import { Notice, withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { classification, DEFAULT_PASS_MARK, unitOutcome, UnitOutcome, weightedMean } from "@/lib/grading";
import { col, useLiveDoc, useLiveQuery } from "@/lib/live";
import { ownerFilters } from "@/lib/scope";
import type { Programme, Result, Student, Subject } from "@/lib/types";
import { documentId, query, where } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const STATUS: Record<UnitOutcome["status"], string> = {
  complete: "",
  incomplete: "Incomplete",
  supplementary: "Supplementary",
  passed_supplementary: "Passed (supp.)",
};

const TranscriptPage = () => {
  const { role, user, institution } = useAuth();
  const params = useSearchParams();
  const id = params.get("id") ?? (role === "student" ? user?.uid : null);

  const children = useLiveQuery<Student>(
    () => (role === "parent" && !id && user ? query(col("students"), where("parentId", "==", user.uid)) : null),
    `tr-children|${role}|${id}`
  );
  const student = useLiveDoc<Student>(id ? `students/${id}` : null);
  const programme = useLiveDoc<Programme>(student.data?.programmeId ? `programmes/${student.data.programmeId}` : null);
  const results = useLiveQuery<Result>(
    () =>
      id
        ? query(col("results"), ...ownerFilters(role, user?.uid), ...(role === "student" ? [] : [where("studentId", "==", id)]))
        : null,
    `tr-results|${id}|${role}`
  );
  const subjectIds = Array.from(new Set(results.data.map((r) => r.subjectId))).slice(0, 30);
  const subjects = useLiveQuery<Subject>(
    () => (subjectIds.length ? query(col("subjects"), where(documentId(), "in", subjectIds)) : null),
    `tr-subjects|${subjectIds.join(",")}`
  );

  if (role === "parent" && !id) {
    return (
      <div className="bg-surface p-4 rounded-md m-4 mt-0 flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Transcript</h1>
        {children.data.map((c) => (
          <Link key={c.id} href={`/transcript?id=${c.id}`} className="underline text-sm">
            {c.name} {c.surname} ({c.admissionNo})
          </Link>
        ))}
      </div>
    );
  }
  if (!id) return <div className="m-4"><Notice tone="error">Choose a student.</Notice></div>;
  if (student.loading || results.loading) return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  if (!student.data) return <div className="m-4"><Notice tone="error">{student.error ?? "Student not found."}</Notice></div>;

  const passMark = programme.data?.passMark ?? DEFAULT_PASS_MARK;
  const cap = institution?.supplementaryCap ?? 50;
  const credit = (sid: string) => subjects.data.find((s) => s.id === sid)?.creditHours ?? 3;

  // Group marks by semester, then by unit.
  const semesters = new Map<string, Map<string, Result[]>>();
  for (const r of results.data) {
    const key = `${r.academicYear}|${r.semester}`;
    if (!semesters.has(key)) semesters.set(key, new Map());
    const units = semesters.get(key)!;
    if (!units.has(r.subjectId)) units.set(r.subjectId, []);
    units.get(r.subjectId)!.push(r);
  }
  const ordered = Array.from(semesters.entries()).sort(([a], [b]) => a.localeCompare(b));

  const all: { mark: number | null; creditHours: number }[] = [];
  const s = student.data;

  return (
    <div className="bg-surface p-4 rounded-md m-4 mt-0 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={40} height={40} />
          <div>
            <h1 className="text-lg font-semibold">Provisional transcript</h1>
            <p className="text-sm text-gray-500">
              {s.name} {s.surname}, {s.admissionNo}, {s.programmeName ?? "no programme"}
            </p>
          </div>
        </div>
        <button onClick={() => window.print()} className="text-xs underline text-gray-500 print:hidden">Print</button>
      </div>
      {!ordered.length && <p className="text-sm text-gray-400">No marks recorded yet.</p>}
      {ordered.map(([key, units]) => {
        const [year, sem] = key.split("|");
        const rows = Array.from(units.entries()).map(([sid, rs]) => {
          const outcome = unitOutcome(
            rs.map((r) => ({ kind: r.assessmentKind, score: r.score, maxScore: r.maxScore })),
            passMark,
            cap
          );
          all.push({ mark: outcome.mark, creditHours: credit(sid) });
          return { sid, rs, outcome };
        });
        const mean = weightedMean(rows.map((r) => ({ mark: r.outcome.mark, creditHours: credit(r.sid) })));
        return (
          <section key={key}>
            <h2 className="font-semibold text-sm mb-2">
              {year}, semester {sem}
              {mean !== null && <span className="text-gray-500 font-normal"> · mean {mean}</span>}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-1">Code</th>
                    <th>Unit</th>
                    <th className="text-right">CF</th>
                    <th className="text-right">CAT /30</th>
                    <th className="text-right">Exam /70</th>
                    <th className="text-right">Total</th>
                    <th className="text-center">Grade</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ sid, rs, outcome }) => (
                    <tr key={sid} className="border-b border-gray-100">
                      <td className="py-1 whitespace-nowrap">{rs[0].subjectCode}</td>
                      <td>{rs[0].subjectName}</td>
                      <td className="text-right">{credit(sid)}</td>
                      <td className="text-right">{outcome.coursework ?? "-"}</td>
                      <td className="text-right">{outcome.exam ?? "-"}</td>
                      <td className="text-right font-medium">{outcome.mark ?? "-"}</td>
                      <td className={`text-center ${outcome.grade === "E" ? "text-red-500" : ""}`}>{outcome.grade ?? "-"}</td>
                      <td className="text-xs text-gray-500">{STATUS[outcome.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
      {ordered.length > 0 && (
        <div className="bg-lamaSkyLight rounded-md p-3 text-sm">
          Weighted mean so far: <strong>{weightedMean(all) ?? "-"}</strong>. Classification if it stays there:{" "}
          <strong>{classification(weightedMean(all))}</strong>. Pass mark {passMark}; supplementaries capped at {cap}.
          CF is credit hours.
        </div>
      )}
      <p className="text-[11px] text-gray-400">
        Provisional. Marks are confirmed by the department and faculty board before an official transcript is issued.
      </p>
    </div>
  );
};

export default withSuspense(TranscriptPage);
