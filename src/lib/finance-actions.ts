"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  DocumentData,
  DocumentReference,
  SetOptions,
} from "firebase/firestore";
import { firebase } from "./firebase";
import {
  feeStructureSchema,
  FeeStructureSchema,
  officePaymentSchema,
  OfficePaymentSchema,
  paymentSubmissionSchema,
  PaymentSubmissionSchema,
  remittanceSchema,
  RemittanceSchema,
} from "./formValidationSchemas";
import { computeAccount, parseAllocations, paymentId, pickBand, splitInvoice } from "./funding";

export { parseAllocations };
import { sum, toShillings } from "./money";
import { keywordsFor } from "./search";
import type {
  FeeStructure,
  FundingBand,
  FundingScheme,
  InstitutionSettings,
  Invoice,
  Payer,
  Payment,
  Programme,
  Student,
} from "./types";

const db = () => firebase().db;
const ref = (path: string) => doc(db(), path);
const fullName = (p: { name?: string; surname?: string }) => `${p.name ?? ""} ${p.surname ?? ""}`.trim();

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const yearSlug = (academicYear: string) => academicYear.replace("/", "-");

// Either a batch or a transaction; both are used with merge.
type Writer = { set: (ref: DocumentReference, data: DocumentData, options: SetOptions) => unknown };

// Running totals change only through increments, which Firestore applies
// atomically. Two clerks recording payments for the same student at the same
// moment cannot overwrite each other.
const bumpAccount = (
  w: Writer,
  student: Pick<Student, "id" | "admissionNo" | "parentId" | "classId"> & { name: string },
  changes: { payer: string; billed?: number; paid?: number }[]
) => {
  const billed = sum(changes.map((c) => c.billed ?? 0));
  const paid = sum(changes.map((c) => c.paid ?? 0));
  const byPayer: Record<string, object> = {};
  for (const c of changes) {
    byPayer[c.payer] = {
      expected: increment(c.billed ?? 0),
      received: increment(c.paid ?? 0),
    };
  }
  w.set(
    ref(`accounts/${student.id}`),
    {
      studentName: student.name,
      admissionNo: student.admissionNo,
      parentId: student.parentId ?? null,
      ...(student.classId ? { classId: student.classId } : {}),
      billed: increment(billed),
      paid: increment(paid),
      balance: increment(billed - paid),
      byPayer,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const bumpMonth = (w: Writer, when: Date, change: { billed?: number; collected?: number; payer?: string }) => {
  w.set(
    ref(`financeMonths/${monthKey(when)}`),
    {
      billed: increment(change.billed ?? 0),
      collected: increment(change.collected ?? 0),
      ...(change.payer ? { byPayer: { [change.payer]: increment(change.collected ?? 0) } } : {}),
    },
    { merge: true }
  );
};

const readStudent = async (id: string) => {
  const s = await getDoc(ref(`students/${id}`));
  if (!s.exists()) throw new Error("Student not found");
  const data = { id: s.id, ...s.data() } as Student;
  return { ...data, name: fullName(data) };
};

const payerNames = async () => {
  const snap = await getDocs(collection(db(), "payers"));
  return Object.fromEntries(snap.docs.map((d) => [d.id, (d.data() as Payer).name]));
};

const institution = async () => {
  const s = await getDoc(ref("settings/institution"));
  return s.data() as InstitutionSettings;
};

// ---------- fee structures, payers, schemes ----------

export const saveFeeStructure = async (input: FeeStructureSchema) => {
  const d = feeStructureSchema.parse(input);
  const p = await getDoc(ref(`programmes/${d.programmeId}`));
  if (!p.exists()) throw new Error("Programme not found");
  const programme = p.data() as Programme;
  // One structure per programme, sponsorship, year of study and semester.
  const id = `${d.programmeId}_${d.sponsorship}_Y${d.gradeLevel}_${yearSlug(d.academicYear)}_S${d.semester}`;
  if (d.id && d.id !== id) throw new Error("Programme, sponsorship, year and semester cannot be changed.");
  await setDoc(ref(`feeStructures/${id}`), {
    programmeId: d.programmeId,
    programmeName: programme.name,
    sponsorship: d.sponsorship,
    gradeLevel: d.gradeLevel,
    academicYear: d.academicYear,
    semester: d.semester,
    items: d.items,
    total: sum(d.items.map((i) => i.amount)),
    active: true,
    updatedAt: serverTimestamp(),
  });
};

export const savePayer = async (p: { key: string; name: string; kind: Payer["kind"]; active: boolean }) => {
  const key = p.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!key || !p.name.trim()) throw new Error("Key and name are required.");
  await setDoc(ref(`payers/${key}`), { key, name: p.name.trim(), kind: p.kind, active: p.active });
};

export const saveFundingScheme = async (s: Omit<FundingScheme, "createdAt" | "updatedAt">) => {
  for (const b of s.bands) {
    const total = Object.values(b.shares).reduce((a, v) => a + (Number(v) || 0), 0);
    if (total !== 100) throw new Error(`${b.label}: shares add up to ${total}%, not 100%.`);
  }
  if (!s.bands.some((b) => b.band === s.defaultBand)) throw new Error("The default band must exist.");
  const { id, ...data } = s;
  await setDoc(ref(`fundingSchemes/${id || `scheme-${Date.now()}`}`), { ...data, updatedAt: serverTimestamp() });
};

// ---------- invoicing ----------

export type InvoiceRunResult = {
  issued: number;
  skipped: { student: string; reason: string }[];
};

// Issues the semester invoice to every active student in a class. Each
// invoice's id is "<student>_<year>_S<semester>", so running it twice never
// bills anyone twice.
export const issueInvoicesForClass = async (opts: {
  classId: string;
  gssSchemeId: string;
  sspSchemeId: string;
}): Promise<InvoiceRunResult> => {
  const inst = await institution();
  const names = await payerNames();
  const [gss, ssp] = await Promise.all(
    [opts.gssSchemeId, opts.sspSchemeId].map(async (id) => {
      const s = await getDoc(ref(`fundingSchemes/${id}`));
      if (!s.exists()) throw new Error("Choose a funding scheme for each sponsorship type.");
      return { id: s.id, ...s.data() } as FundingScheme;
    })
  );

  const students = await getDocs(
    query(collection(db(), "students"), where("classId", "==", opts.classId), where("active", "==", true))
  );

  const result: InvoiceRunResult = { issued: 0, skipped: [] };
  for (const snap of students.docs) {
    const s = { id: snap.id, ...snap.data() } as Student;
    const label = `${fullName(s)} (${s.admissionNo})`;
    if (s.status !== "active") {
      result.skipped.push({ student: label, reason: `status is ${s.status}` });
      continue;
    }
    if (!s.programmeId) {
      result.skipped.push({ student: label, reason: "no programme set" });
      continue;
    }
    const structureId = `${s.programmeId}_${s.sponsorship}_Y${s.gradeLevel}_${yearSlug(inst.academicYear)}_S${inst.semester}`;
    const fs = await getDoc(ref(`feeStructures/${structureId}`));
    if (!fs.exists()) {
      result.skipped.push({
        student: label,
        reason: `no fee structure for ${s.programmeName}, ${s.sponsorship}, year ${s.gradeLevel}, ${inst.academicYear} semester ${inst.semester}`,
      });
      continue;
    }
    const structure = fs.data() as FeeStructure;
    const scheme = s.sponsorship === "GSS" ? gss : ssp;
    let band: FundingBand;
    try {
      band = pickBand(scheme, s.fundingBand);
    } catch {
      result.skipped.push({ student: label, reason: "funding scheme has no bands" });
      continue;
    }
    const splits = splitInvoice(structure.total, band, names);
    const invoiceId = `${s.id}_${yearSlug(inst.academicYear)}_S${inst.semester}`;

    const issued = await runTransaction(db(), async (tx) => {
      const invRef = ref(`invoices/${invoiceId}`);
      if ((await tx.get(invRef)).exists()) return false;
      const counterRef = ref("counters/invoices");
      const counter = await tx.get(counterRef);
      const next = (counter.exists() ? (counter.data().value as number) : 0) + 1;
      tx.set(counterRef, { value: next });
      const number = `INV-${inst.academicYear.slice(0, 4)}-${String(next).padStart(6, "0")}`;
      const now = new Date();
      tx.set(invRef, {
        number,
        studentId: s.id,
        studentName: fullName(s),
        admissionNo: s.admissionNo,
        parentId: s.parentId ?? null,
        classId: s.classId,
        programmeName: s.programmeName ?? null,
        academicYear: inst.academicYear,
        semester: inst.semester,
        items: structure.items,
        total: structure.total,
        fundingSchemeId: scheme.id,
        fundingBand: band.band,
        splits,
        issuedAt: Timestamp.fromDate(now),
        status: "issued",
        keywords: keywordsFor(number, fullName(s), s.admissionNo),
      });
      bumpAccount(
        tx,
        { ...s, name: fullName(s) },
        splits.map((sp) => ({ payer: sp.payer, billed: sp.expected }))
      );
      bumpMonth(tx, now, { billed: structure.total });
      return true;
    });
    if (issued) result.issued++;
    else result.skipped.push({ student: label, reason: "already invoiced this semester" });
  }
  return result;
};

export const cancelInvoice = async (invoiceId: string) => {
  await runTransaction(db(), async (tx) => {
    const invRef = ref(`invoices/${invoiceId}`);
    const snap = await tx.get(invRef);
    if (!snap.exists()) throw new Error("Invoice not found");
    const inv = snap.data() as Invoice;
    if (inv.status !== "issued") throw new Error("This invoice is already cancelled.");
    tx.update(invRef, { status: "cancelled", updatedAt: serverTimestamp() });
    const who = {
      id: inv.studentId,
      name: inv.studentName,
      admissionNo: inv.admissionNo,
      parentId: inv.parentId ?? null,
      classId: inv.classId,
    };
    bumpAccount(
      tx,
      who,
      inv.splits.map((sp) => ({ payer: sp.payer, billed: -sp.expected }))
    );
    bumpMonth(tx, inv.issuedAt.toDate(), { billed: -inv.total });
  });
};

// ---------- payments ----------

// A student or guardian reports a payment. It is not counted until the
// finance office verifies it against the statement.
export const submitPayment = async (submittedBy: string, input: PaymentSubmissionSchema) => {
  const d = paymentSubmissionSchema.parse(input);
  const s = await readStudent(d.studentId);
  const inst = await institution();
  const reference = d.reference.trim().toUpperCase();
  const id = paymentId(d.method, reference);
  try {
    await setDoc(ref(`payments/${id}`), {
      studentId: s.id,
      studentName: s.name,
      admissionNo: s.admissionNo,
      parentId: s.parentId ?? null,
      payer: "household",
      payerName: "Household",
      method: d.method,
      reference,
      amount: toShillings(d.amount),
      paidOn: Timestamp.fromDate(d.paidOn),
      status: "pending",
      submittedBy,
      verifiedBy: null,
      verifiedAt: null,
      remittanceId: null,
      academicYear: inst.academicYear,
      semester: inst.semester,
      keywords: keywordsFor(reference, s.name, s.admissionNo),
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") {
      throw new Error(
        "This reference has already been recorded. If you think this is a mistake, contact the finance office."
      );
    }
    throw e;
  }
};

// The office records a payment it has already confirmed (counter payment,
// cheque, EFT). It counts immediately.
export const recordPayment = async (officerId: string, input: OfficePaymentSchema) => {
  const d = officePaymentSchema.parse(input);
  const s = await readStudent(d.studentId);
  const inst = await institution();
  const names = await payerNames();
  const reference = d.reference.trim().toUpperCase();
  const id = paymentId(d.method, reference);
  await runTransaction(db(), async (tx) => {
    const payRef = ref(`payments/${id}`);
    if ((await tx.get(payRef)).exists()) throw new Error(`Reference ${reference} is already recorded.`);
    tx.set(payRef, {
      studentId: s.id,
      studentName: s.name,
      admissionNo: s.admissionNo,
      parentId: s.parentId ?? null,
      payer: d.payer,
      payerName: names[d.payer] ?? d.payer,
      method: d.method,
      reference,
      amount: d.amount,
      paidOn: Timestamp.fromDate(d.paidOn),
      status: "verified",
      submittedBy: officerId,
      verifiedBy: officerId,
      verifiedAt: serverTimestamp(),
      remittanceId: null,
      academicYear: inst.academicYear,
      semester: inst.semester,
      note: d.note ?? "",
      keywords: keywordsFor(reference, s.name, s.admissionNo),
      createdAt: serverTimestamp(),
    });
    bumpAccount(tx, s, [{ payer: d.payer, paid: d.amount }]);
    bumpMonth(tx, d.paidOn, { collected: d.amount, payer: d.payer });
  });
};

const transition = async (
  paymentDocId: string,
  from: Payment["status"],
  to: Payment["status"],
  officerId: string,
  note?: string
) => {
  await runTransaction(db(), async (tx) => {
    const payRef = ref(`payments/${paymentDocId}`);
    const snap = await tx.get(payRef);
    if (!snap.exists()) throw new Error("Payment not found");
    const p = snap.data() as Payment;
    if (p.status !== from) throw new Error(`This payment is ${p.status}, not ${from}.`);
    tx.update(payRef, {
      status: to,
      ...(to === "verified" ? { verifiedBy: officerId, verifiedAt: serverTimestamp() } : {}),
      ...(note ? { note } : {}),
      updatedAt: serverTimestamp(),
    });
    const sign = to === "verified" ? 1 : from === "verified" ? -1 : 0;
    if (sign !== 0) {
      bumpAccount(
        tx,
        { id: p.studentId, name: p.studentName, admissionNo: p.admissionNo, parentId: p.parentId ?? null, classId: "" },
        [{ payer: p.payer, paid: sign * p.amount }]
      );
      bumpMonth(tx, p.paidOn.toDate(), { collected: sign * p.amount, payer: p.payer });
    }
  });
};

export const verifyPayment = (id: string, officerId: string) => transition(id, "pending", "verified", officerId);

export const rejectPayment = (id: string, officerId: string, reason: string) =>
  transition(id, "pending", "rejected", officerId, reason);

// Undo a verified payment (for example a bounced cheque).
export const reversePayment = (id: string, officerId: string, reason: string) =>
  transition(id, "verified", "reversed", officerId, reason);

// ---------- remittances ----------

// Records a lump-sum transfer (HELB, Universities Fund, bursary, sponsor)
// and credits each listed student. Nothing is written unless every line
// matches a student and the amounts add up to no more than the transfer.
export const recordRemittance = async (officerId: string, input: RemittanceSchema) => {
  const d = remittanceSchema.parse(input);
  const { rows, errors } = parseAllocations(d.allocations);
  if (errors.length) throw new Error(errors.slice(0, 5).join("\n"));
  const allocated = sum(rows.map((r) => r.amount));
  if (allocated > d.total) {
    throw new Error(`Allocations add up to ${allocated}, more than the transfer of ${d.total}.`);
  }
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.admissionNo)) throw new Error(`${r.admissionNo} is listed twice.`);
    seen.add(r.admissionNo);
  }

  const students: (Student & { name: string })[] = [];
  const missing: string[] = [];
  for (const r of rows) {
    const snap = await getDocs(
      query(collection(db(), "students"), where("admissionNo", "==", r.admissionNo))
    );
    if (snap.empty) missing.push(r.admissionNo);
    else {
      const s = { id: snap.docs[0].id, ...snap.docs[0].data() } as Student;
      students.push({ ...s, name: fullName(s) });
    }
  }
  if (missing.length) throw new Error(`No student with admission number: ${missing.slice(0, 10).join(", ")}`);

  const inst = await institution();
  const names = await payerNames();
  const reference = d.reference.trim().toUpperCase();
  const remittanceId = paymentId(d.method, `${d.payer}-${reference}`);
  const existing = await getDoc(ref(`remittances/${remittanceId}`));
  if (existing.exists()) throw new Error(`Remittance ${reference} from this payer is already recorded.`);

  const allocations = rows.map((r, i) => ({
    studentId: students[i].id,
    studentName: students[i].name,
    admissionNo: r.admissionNo,
    amount: r.amount,
  }));

  // The remittance document goes first, so a retry after a failure finds it
  // and stops rather than crediting students twice.
  await setDoc(ref(`remittances/${remittanceId}`), {
    payer: d.payer,
    payerName: names[d.payer] ?? d.payer,
    method: d.method,
    reference,
    receivedOn: Timestamp.fromDate(d.receivedOn),
    total: d.total,
    allocated,
    academicYear: inst.academicYear,
    semester: inst.semester,
    allocations,
    recordedBy: officerId,
    createdAt: serverTimestamp(),
  });

  for (let i = 0; i < allocations.length; i += 150) {
    const b = writeBatch(db());
    for (const a of allocations.slice(i, i + 150)) {
      const s = students.find((x) => x.id === a.studentId)!;
      b.set(ref(`payments/${paymentId(d.method, `${reference}-${a.admissionNo}`)}`), {
        studentId: s.id,
        studentName: s.name,
        admissionNo: s.admissionNo,
        parentId: s.parentId ?? null,
        payer: d.payer,
        payerName: names[d.payer] ?? d.payer,
        method: d.method,
        reference: `${reference}-${a.admissionNo}`,
        amount: a.amount,
        paidOn: Timestamp.fromDate(d.receivedOn),
        status: "verified",
        submittedBy: officerId,
        verifiedBy: officerId,
        verifiedAt: serverTimestamp(),
        remittanceId,
        academicYear: inst.academicYear,
        semester: inst.semester,
        keywords: keywordsFor(reference, s.name, s.admissionNo),
        createdAt: serverTimestamp(),
      });
      bumpAccount(b, s, [{ payer: d.payer, paid: a.amount }]);
    }
    await b.commit();
  }
  const b = writeBatch(db());
  bumpMonth(b, d.receivedOn, { collected: allocated, payer: d.payer });
  await b.commit();
  return { allocated, students: allocations.length, unallocated: d.total - allocated };
};

// ---------- reconciliation ----------

// Rebuilds a student's running totals from their invoices and payments.
// The ledger is the source of truth; the account is a summary of it.
export const rebuildAccount = async (studentId: string) => {
  const s = await readStudent(studentId);
  const [inv, pay] = await Promise.all([
    getDocs(query(collection(db(), "invoices"), where("studentId", "==", studentId))),
    getDocs(query(collection(db(), "payments"), where("studentId", "==", studentId))),
  ]);
  const account = computeAccount(
    { id: s.id, studentName: s.name, admissionNo: s.admissionNo, parentId: s.parentId ?? null, classId: s.classId },
    inv.docs.map((d) => d.data() as Invoice),
    pay.docs.map((d) => d.data() as Payment)
  );
  const { id, ...data } = account;
  await setDoc(ref(`accounts/${id}`), { ...data, updatedAt: serverTimestamp() });
  return account;
};
