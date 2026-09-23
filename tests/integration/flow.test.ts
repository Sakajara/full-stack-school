// End-to-end run of the app's own actions against the Auth and Firestore
// emulators, signing in as each role in turn. Run with: npm run test:flow
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { beforeAll, describe, expect, it } from "vitest";
import * as A from "@/lib/actions";
import * as F from "@/lib/finance-actions";
import { firebase, usernameToEmail } from "@/lib/firebase";
import type { Account, Invoice, Payment, Student } from "@/lib/types";

const PROJECT = "demo-chuo";
const { auth, db } = firebase();

const as = async (username: string, password: string) => {
  await signOut(auth);
  await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
};

const one = async <T>(col: string, field: string, value: unknown) => {
  const s = await getDocs(query(collection(db, col), where(field, "==", value)));
  expect(s.size, `${col} where ${field} == ${value}`).toBe(1);
  return { id: s.docs[0].id, ...s.docs[0].data() } as T;
};

const account = async (id: string) => (await getDoc(doc(db, "accounts", id))).data() as Account;

const ids: Record<string, string> = {};

beforeAll(async () => {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
});

describe("a semester at a Kenyan university", () => {
  it("sets up the institution once", async () => {
    await A.bootstrap(
      { username: "registrar", password: "registrar-pass", name: "Grace", surname: "Wanjiru" },
      {
        name: "Test University",
        shortName: "TU",
        academicYear: "2026/2027",
        semester: 1,
        paybill: "123456",
        examCardThreshold: 50,
        supplementaryCap: 50,
      }
    );
    expect((await getDoc(doc(db, "meta/setup"))).exists()).toBe(true);
    expect((await getDocs(collection(db, "fundingSchemes"))).size).toBe(4);
    // A second setup is refused.
    await signOut(auth);
    await expect(
      A.bootstrap(
        { username: "intruder", password: "intruder-pass", name: "X", surname: "Y" },
        { name: "X", shortName: "XX", academicYear: "2026/2027", semester: 1, examCardThreshold: 0, supplementaryCap: 50 }
      )
    ).rejects.toThrow();
  });

  it("builds the academic structure", async () => {
    await as("registrar", "registrar-pass");
    await A.saveFaculty({ code: "spas", name: "School of Pure and Applied Sciences" });
    const fac = await one<{ id: string }>("faculties", "code", "SPAS");
    await A.saveDepartment({ code: "csc", name: "Computer Science", facultyId: fac.id });
    const dept = await one<{ id: string }>("departments", "code", "CSC");
    await A.saveProgramme({
      code: "sc211", name: "BSc Computer Science", level: "degree", departmentId: dept.id,
      durationYears: 4, semestersPerYear: 2, passMark: 40,
    });
    ids.programme = (await one<{ id: string }>("programmes", "code", "SC211")).id;
    await A.createClass({ name: "CS Y1 2026", capacity: 2, gradeId: "year-1", programmeId: ids.programme, intake: "Sep 2026" });
    ids.class = (await one<{ id: string }>("classes", "name", "CS Y1 2026")).id;
    await A.createStaff({ username: "bursar", password: "bursar-pass", name: "Otieno", surname: "Ouma", role: "finance" });
  });

  it("admits people with their own logins", async () => {
    await A.createTeacher({
      username: "l001", password: "lecturer-pass", name: "Achieng", surname: "Odhiambo",
      birthday: new Date(1985, 1, 1), sex: "FEMALE", subjects: [],
    });
    ids.teacher = (await one<{ id: string }>("teachers", "username", "l001")).id;
    await A.createSubject({ code: "sco 101", name: "Programming I", creditHours: 3, teachers: [ids.teacher] });
    ids.subject = (await one<{ id: string }>("subjects", "code", "SCO 101")).id;
    const t = (await getDoc(doc(db, "teachers", ids.teacher))).data()!;
    expect(t.subjectNames).toEqual(["Programming I"]);

    await A.createParent({ username: "0712345678", password: "parent-pass", name: "Mary", surname: "Kamau", phone: "0712345678" });
    ids.parent = (await one<{ id: string }>("parents", "username", "0712345678")).id;

    const student = (adm: string, name: string, band: number | "", sponsorship: "GSS" | "SSP") => ({
      username: adm, password: "student-pass", name, surname: "Kamau", birthday: new Date(2006, 5, 5),
      sex: "MALE" as const, gradeId: "year-1", classId: ids.class, parentId: ids.parent,
      sponsorship, fundingBand: band, status: "active" as const,
    });
    await A.createStudent(student("SC211-0001/2026", "Brian", 3, "GSS"));
    await A.createStudent(student("SC211-0002/2026", "Cynthia", "", "SSP"));
    ids.s1 = (await one<Student>("students", "admissionNo", "SC211-0001/2026")).id;
    ids.s2 = (await one<Student>("students", "admissionNo", "SC211-0002/2026")).id;

    // The class holds two; a third admission is refused and leaves no login behind.
    await expect(A.createStudent(student("SC211-0003/2026", "Dan", 1, "GSS"))).rejects.toThrow(/full/);
    expect((await getDoc(doc(db, "classes", ids.class))).data()!.studentCount).toBe(2);
    await expect(signInWithEmailAndPassword(auth, usernameToEmail("SC211-0003/2026"), "student-pass")).rejects.toThrow();
    await as("registrar", "registrar-pass");

    // Usernames are unique.
    await expect(A.createStudent(student("SC211-0001/2026", "Copy", 1, "GSS"))).rejects.toThrow();
  });

  it("keeps copied names in step after a rename", async () => {
    await A.createLesson({
      name: "Lecture", day: "MONDAY", startTime: "08:00", endTime: "10:00", venue: "LH 1",
      subjectId: ids.subject, classId: ids.class, teacherId: ids.teacher,
    });
    ids.lesson = (await one<{ id: string }>("lessons", "venue", "LH 1")).id;
    // Same venue, overlapping time: refused.
    await expect(
      A.createLesson({
        name: "Clash", day: "MONDAY", startTime: "09:00", endTime: "11:00", venue: "lh 1",
        subjectId: ids.subject, classId: ids.class, teacherId: ids.teacher,
      })
    ).rejects.toThrow(/Clashes/);
    await A.updateSubject({ id: ids.subject, code: "SCO 101", name: "Introduction to Programming", creditHours: 3, teachers: [ids.teacher] });
    expect((await getDoc(doc(db, "lessons", ids.lesson))).data()!.subjectName).toBe("Introduction to Programming");
  });

  it("lets the lecturer set and mark assessments, but only their own", async () => {
    await as("l001", "lecturer-pass");
    await A.createAssignment({ title: "CAT 1", kind: "cat", startDate: new Date(), dueDate: new Date(), maxScore: 30, lessonId: ids.lesson });
    await A.createExam({
      title: "End of semester", kind: "main", startTime: new Date(2026, 11, 1, 9), endTime: new Date(2026, 11, 1, 11),
      maxScore: 100, lessonId: ids.lesson,
    });
    const cat = await one<{ id: string }>("assignments", "title", "CAT 1");
    const exam = await one<{ id: string }>("exams", "title", "End of semester");
    await A.saveResultsSheet(`assignment:${cat.id}`, { [ids.s1]: 24, [ids.s2]: 9 });
    await A.saveResultsSheet(`exam:${exam.id}`, { [ids.s1]: 70, [ids.s2]: 30 });
    await expect(A.saveResult({ assessment: `exam:${exam.id}`, studentId: ids.s1, score: 101 })).rejects.toThrow(/more than 100/);

    const lesson = (await getDoc(doc(db, "lessons", ids.lesson))).data();
    const students = await getDocs(query(collection(db, "students"), where("classId", "==", ids.class)));
    await A.markAttendance(
      { id: ids.lesson, ...lesson } as never,
      "2026-09-21",
      students.docs.map((d) => ({ student: { id: d.id, ...d.data() } as Student, present: d.id === ids.s1 }))
    );
    const marks = await getDocs(query(collection(db, "results"), where("teacherId", "==", ids.teacher)));
    expect(marks.size).toBe(4);
  });

  it("keeps a student to their own records", async () => {
    await as("SC211-0001/2026", "student-pass");
    const mine = await getDocs(query(collection(db, "results"), where("studentId", "==", ids.s1)));
    expect(mine.size).toBe(2);
    await expect(getDocs(query(collection(db, "results"), where("studentId", "==", ids.s2)))).rejects.toThrow();
    await expect(getDoc(doc(db, "students", ids.s2))).rejects.toThrow();
    await expect(updateDoc(doc(db, "students", ids.s1), { fundingBand: 1 })).rejects.toThrow();
    await expect(A.createSubject({ code: "HACK", name: "x", creditHours: 1, teachers: [] })).rejects.toThrow();
  });

  it("bills the semester split between payers", async () => {
    await as("bursar", "bursar-pass");
    for (const sponsorship of ["GSS", "SSP"] as const) {
      await F.saveFeeStructure({
        programmeId: ids.programme, sponsorship, gradeLevel: 1, academicYear: "2026/2027", semester: 1,
        items: sponsorship === "GSS"
          ? [{ name: "Tuition", amount: 90000 }, { name: "Activity", amount: 10000 }]
          : [{ name: "Tuition", amount: 120000 }],
      });
    }
    const run = await F.issueInvoicesForClass({ classId: ids.class, gssSchemeId: "scheme-1", sspSchemeId: "scheme-4" });
    expect(run.issued).toBe(2);
    // Running it again bills nobody twice.
    const again = await F.issueInvoicesForClass({ classId: ids.class, gssSchemeId: "scheme-1", sspSchemeId: "scheme-4" });
    expect(again.issued).toBe(0);

    const inv = await one<Invoice>("invoices", "studentId", ids.s1);
    expect(inv.total).toBe(100000);
    expect(Object.fromEntries(inv.splits.map((s) => [s.payer, s.expected]))).toEqual({
      universities_fund: 50000, helb: 30000, household: 20000,
    });
    const a1 = await account(ids.s1);
    expect(a1.billed).toBe(100000);
    expect(a1.byPayer.helb.expected).toBe(30000);
    expect((await account(ids.s2)).byPayer.household.expected).toBe(120000);
  });

  it("takes an M-Pesa payment reported by a guardian, once, after the office verifies it", async () => {
    await as("0712345678", "parent-pass");
    await F.submitPayment(auth.currentUser!.uid, {
      studentId: ids.s1, method: "MPESA", reference: "sjk4h7x2pq", amount: 20000, paidOn: new Date(),
    });
    await expect(
      F.submitPayment(auth.currentUser!.uid, {
        studentId: ids.s1, method: "MPESA", reference: "SJK4H7X2PQ", amount: 20000, paidOn: new Date(),
      })
    ).rejects.toThrow(/already been recorded/);
    // The guardian can see the balance but it has not moved yet.
    expect((await account(ids.s1)).paid).toBe(0);

    await as("bursar", "bursar-pass");
    await F.verifyPayment("MPESA_SJK4H7X2PQ", auth.currentUser!.uid);
    await expect(F.verifyPayment("MPESA_SJK4H7X2PQ", auth.currentUser!.uid)).rejects.toThrow(/verified, not pending/);
    const a1 = await account(ids.s1);
    expect(a1.paid).toBe(20000);
    expect(a1.balance).toBe(80000);
    expect(a1.byPayer.household.received).toBe(20000);
  });

  it("allocates a HELB transfer across students and shows the shortfall", async () => {
    const r = await F.recordRemittance(auth.currentUser!.uid, {
      payer: "helb", method: "EFT", reference: "HELB-2026-S1-TU", receivedOn: new Date(), total: 25000,
      allocations: "SC211-0001/2026, 18,000",
    });
    expect(r).toEqual({ allocated: 18000, students: 1, unallocated: 7000 });
    await expect(
      F.recordRemittance(auth.currentUser!.uid, {
        payer: "helb", method: "EFT", reference: "HELB-2026-S1-TU", receivedOn: new Date(), total: 25000,
        allocations: "SC211-0001/2026, 18000",
      })
    ).rejects.toThrow(/already recorded/);
    const a1 = await account(ids.s1);
    expect(a1.byPayer.helb).toEqual({ expected: 30000, received: 18000 });
    expect(a1.paid).toBe(38000);

    // The summary always matches the ledger.
    const rebuilt = await F.rebuildAccount(ids.s1);
    expect(rebuilt.balance).toBe(62000);
    expect(rebuilt.byPayer.helb).toEqual({ expected: 30000, received: 18000 });

    // A bounced payment is reversed, not deleted.
    await F.reversePayment("MPESA_SJK4H7X2PQ", auth.currentUser!.uid, "Reversed by Safaricom");
    expect((await account(ids.s1)).balance).toBe(82000);
    const p = (await getDoc(doc(db, "payments", "MPESA_SJK4H7X2PQ"))).data() as Payment;
    expect(p.status).toBe("reversed");
  });

  it("archives instead of deleting, and an archived person cannot sign in to data", async () => {
    await as("registrar", "registrar-pass");
    await A.setArchived("students", ids.s2, true);
    expect((await getDoc(doc(db, "classes", ids.class))).data()!.studentCount).toBe(1);
    await as("SC211-0002/2026", "student-pass");
    await expect(getDoc(doc(db, "students", ids.s2))).resolves.toBeDefined();
    await expect(getDocs(collection(db, "announcements"))).rejects.toThrow();
  });
});
