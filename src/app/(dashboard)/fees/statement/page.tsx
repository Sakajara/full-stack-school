"use client";

import FeeSummary from "@/components/FeeSummary";
import { Notice, withSuspense } from "@/components/ui/Page";
import { useAuth } from "@/lib/auth-context";
import { rebuildAccount } from "@/lib/finance-actions";
import { isClearedForExams } from "@/lib/funding";
import { col, useLiveDoc, useLiveQuery } from "@/lib/live";
import { formatKES } from "@/lib/money";
import { ownerFilters } from "@/lib/scope";
import type { Account, Invoice, Lesson, Payment, Student } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { query, where } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

const METHOD: Record<string, string> = { MPESA: "M-Pesa", BANK: "bank deposit", CHEQUE: "cheque", EFT: "EFT", CASH: "cash" };

type Line = { date: Date; ref: string; description: string; debit: number; credit: number; note?: string };

// Exam card: issued only when enough of the fees is paid.
const ExamCard = ({ student }: { student: Student }) => {
  const { institution } = useAuth();
  const account = useLiveDoc<Account>(`accounts/${student.id}`);
  const lessons = useLiveQuery<Lesson>(
    () => query(col("lessons"), where("classId", "==", student.classId), where("active", "==", true)),
    `card-lessons|${student.classId}`
  );
  const units = Array.from(new Map(lessons.data.map((l) => [l.subjectId, l])).values());
  const threshold = institution?.examCardThreshold ?? 100;

  if (account.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!isClearedForExams(account.data, threshold)) {
    return (
      <Notice tone="warn">
        The exam card is issued once {threshold}% of the fees billed is paid. Current balance:{" "}
        {formatKES(account.data?.balance ?? 0)}.
      </Notice>
    );
  }

  return (
    <div className="border-2 border-gray-800 rounded-md p-6 flex flex-col gap-4 print:border-black">
      <div className="flex items-center gap-4">
        <Image src="/logo.png" alt="" width={48} height={48} />
        <div>
          <h2 className="text-lg font-bold">{institution?.name}</h2>
          <p className="text-sm">
            Examination card, {institution?.academicYear} semester {institution?.semester}
          </p>
        </div>
      </div>
      <div className="flex gap-4 items-start">
        <Image
          src={student.img || "/noAvatar.png"}
          alt=""
          width={96}
          height={96}
          className="w-24 h-24 object-cover rounded-md"
          unoptimized={!!student.img}
        />
        <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-gray-500">Name</dt>
          <dd className="font-medium">{student.name} {student.surname}</dd>
          <dt className="text-gray-500">Admission No.</dt>
          <dd className="font-medium">{student.admissionNo}</dd>
          <dt className="text-gray-500">Programme</dt>
          <dd>{student.programmeName ?? "-"}</dd>
          <dt className="text-gray-500">Class</dt>
          <dd>{student.className} (Year {student.gradeLevel})</dd>
        </dl>
      </div>
      <table className="text-sm w-full">
        <thead>
          <tr className="text-left border-b border-gray-300">
            <th className="py-1">Unit code</th>
            <th>Unit</th>
            <th>Invigilator&apos;s signature</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.subjectId} className="border-b border-gray-100">
              <td className="py-2">{u.subjectCode}</td>
              <td>{u.subjectName}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500">
        Fees cleared as at {formatDate(new Date())}. Carry this card and your student ID to every examination.
      </p>
    </div>
  );
};

const StatementPage = () => {
  const { role, user, institution } = useAuth();
  const params = useSearchParams();
  const id = params.get("id") ?? (role === "student" ? user?.uid : null);
  const showCard = params.get("card") === "1";
  const office = role === "admin" || role === "finance";

  // Guardians pick a child when none is given.
  const children = useLiveQuery<Student>(
    () => (role === "parent" && !id && user ? query(col("students"), where("parentId", "==", user.uid)) : null),
    `st-children|${role}|${id}`
  );

  const student = useLiveDoc<Student>(id ? `students/${id}` : null);
  const scope = [
    ...ownerFilters(role, user?.uid),
    ...(role === "student" ? [] : [where("studentId", "==", id ?? "-")]),
  ];
  const invoices = useLiveQuery<Invoice>(
    () => (id ? query(col("invoices"), ...scope) : null),
    `st-inv|${id}|${role}`
  );
  const payments = useLiveQuery<Payment>(
    () => (id ? query(col("payments"), ...scope) : null),
    `st-pay|${id}|${role}`
  );

  if (role === "parent" && !id) {
    return (
      <div className="bg-white p-4 rounded-md m-4 mt-0 flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Fee statement</h1>
        {children.data.map((c) => (
          <Link key={c.id} href={`/fees/statement?id=${c.id}`} className="underline text-sm">
            {c.name} {c.surname} ({c.admissionNo})
          </Link>
        ))}
        {!children.loading && !children.data.length && <p className="text-sm text-gray-400">No students linked to your account.</p>}
      </div>
    );
  }
  if (!id) return <div className="m-4"><Notice tone="error">Choose a student.</Notice></div>;
  if (student.loading) return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  if (!student.data) return <div className="m-4"><Notice tone="error">{student.error ?? "Student not found."}</Notice></div>;
  const s = student.data;

  // A ledger in date order: invoices are debits, verified payments credits.
  const lines: Line[] = [
    ...invoices.data
      .filter((i) => i.status === "issued")
      .map((i) => ({
        date: i.issuedAt.toDate(),
        ref: i.number,
        description: `Fees ${i.academicYear} semester ${i.semester}`,
        debit: i.total,
        credit: 0,
        note: i.splits.map((x) => `${x.payerName} ${formatKES(x.expected)}`).join(", "),
      })),
    ...payments.data
      .filter((p) => p.status === "verified")
      .map((p) => ({
        date: p.paidOn.toDate(),
        ref: p.reference,
        description: `${p.payerName}, ${METHOD[p.method] ?? p.method}`,
        debit: 0,
        credit: p.amount,
      })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const pending = payments.data.filter((p) => p.status === "pending");

  const rebuild = async () => {
    try {
      const a = await rebuildAccount(s.id);
      toast(`Balance rebuilt from the ledger: ${formatKES(a.balance)}.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-4 pt-0 flex flex-col xl:flex-row gap-4">
      <div className="w-full xl:w-2/3 bg-white p-4 rounded-md flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
          <div>
            <h1 className="text-lg font-semibold">{showCard ? "Exam card" : "Fee statement"}</h1>
            <p className="text-sm text-gray-500">
              {s.name} {s.surname}, {s.admissionNo}
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <Link href={`/fees/statement?id=${s.id}${showCard ? "" : "&card=1"}`} className="underline text-gray-500">
              {showCard ? "Statement" : "Exam card"}
            </Link>
            <button onClick={() => window.print()} className="underline text-gray-500">Print</button>
            {office && <button onClick={rebuild} className="underline text-gray-500">Rebuild balance</button>}
          </div>
        </div>

        {showCard ? (
          <ExamCard student={s} />
        ) : (
          <>
            <div className="hidden print:block">
              <h2 className="text-lg font-bold">{institution?.name}</h2>
              <p className="text-sm">
                Fee statement: {s.name} {s.surname}, {s.admissionNo}, {s.programmeName ?? ""}. Printed {formatDate(new Date())}.
              </p>
            </div>
            {pending.length > 0 && (
              <Notice tone="warn">
                {pending.length} reported payment{pending.length > 1 ? "s are" : " is"} waiting for the finance office to
                verify ({formatKES(pending.reduce((a, p) => a + p.amount, 0))}). They are not counted below yet.
              </Notice>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2">Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => {
                    running += l.debit - l.credit;
                    return (
                      <tr key={i} className="border-b border-gray-100 align-top">
                        <td className="py-2 whitespace-nowrap">{formatDate(l.date)}</td>
                        <td className="font-mono text-xs">{l.ref}</td>
                        <td>
                          {l.description}
                          {l.note && <p className="text-[11px] text-gray-400">{l.note}</p>}
                        </td>
                        <td className="text-right">{l.debit ? formatKES(l.debit) : ""}</td>
                        <td className="text-right">{l.credit ? formatKES(l.credit) : ""}</td>
                        <td className="text-right font-medium">{formatKES(running)}</td>
                      </tr>
                    );
                  })}
                  {!lines.length && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-400">No transactions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {institution?.paybill && (
              <p className="text-xs text-gray-500">
                Pay by M-Pesa Paybill {institution.paybill}, account {s.admissionNo}.
                {institution.bankDetails ? ` Bank: ${institution.bankDetails}.` : ""}
              </p>
            )}
          </>
        )}
      </div>
      <div className="w-full xl:w-1/3 flex flex-col gap-4 print:hidden">
        <FeeSummary studentId={s.id} />
        {(role === "student" || role === "parent") && (
          <Link href="/fees/payments" className="bg-lamaYellow rounded-md p-3 text-sm text-center">
            Report an M-Pesa or bank payment
          </Link>
        )}
      </div>
    </div>
  );
};

export default withSuspense(StatementPage);
