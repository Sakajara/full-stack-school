import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

let env: RulesTestEnvironment;

const now = Timestamp.now();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-chuo-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

const users: Record<string, { role: string; active: boolean }> = {
  admin: { role: "admin", active: true },
  bursar: { role: "finance", active: true },
  lec: { role: "teacher", active: true },
  lec2: { role: "teacher", active: true },
  stu: { role: "student", active: true },
  stu2: { role: "student", active: true },
  mum: { role: "parent", active: true },
  gone: { role: "admin", active: false },
};

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "meta/setup"), { adminUid: "admin" });
    for (const [id, u] of Object.entries(users)) {
      await setDoc(doc(db, "users", id), { ...u, username: id, displayName: id });
    }
    await setDoc(doc(db, "students/stu"), { name: "S", parentId: "mum", classId: "c1", active: true });
    await setDoc(doc(db, "students/stu2"), { name: "T", parentId: null, classId: "c1", active: true });
    await setDoc(doc(db, "private/stu"), { birthday: now, bloodType: "O+", parentId: "mum" });
    await setDoc(doc(db, "subjects/sub1"), { name: "Unit", active: true });
    await setDoc(doc(db, "lessons/l1"), { teacherId: "lec", classId: "c1", subjectId: "sub1" });
    await setDoc(doc(db, "exams/e1"), { teacherId: "lec", lessonId: "l1", title: "Main" });
    await setDoc(doc(db, "results/e1_stu"), {
      teacherId: "lec", studentId: "stu", parentId: "mum", examId: "e1", score: 50, maxScore: 100,
    });
    await setDoc(doc(db, "results/e1_stu2"), {
      teacherId: "lec", studentId: "stu2", parentId: null, examId: "e1", score: 70, maxScore: 100,
    });
    await setDoc(doc(db, "accounts/stu"), { billed: 100, paid: 0, balance: 100, parentId: "mum" });
    await setDoc(doc(db, "payments/MPESA_SEEN000001"), {
      studentId: "stu", parentId: "mum", status: "verified", amount: 10, submittedBy: "bursar",
    });
  });
});

const as = (id: string | null) =>
  id ? env.authenticatedContext(id).firestore() : env.unauthenticatedContext().firestore();

describe("original review findings stay fixed", () => {
  it("a student cannot create, change or delete lecturers or students", async () => {
    const db = as("stu");
    await assertFails(setDoc(doc(db, "teachers/new"), { name: "x" }));
    await assertFails(updateDoc(doc(db, "students/stu2"), { name: "y" }));
    await assertFails(deleteDoc(doc(db, "subjects/sub1")));
  });

  it("nobody can hard-delete records, not even an admin", async () => {
    await assertFails(deleteDoc(doc(as("admin"), "subjects/sub1")));
    await assertFails(deleteDoc(doc(as("admin"), "students/stu")));
  });

  it("a student cannot open another student's profile", async () => {
    await assertFails(getDoc(doc(as("stu2"), "students/stu")));
    await assertSucceeds(getDoc(doc(as("stu"), "students/stu")));
  });

  it("signed-out visitors and archived accounts see nothing", async () => {
    await assertFails(getDoc(doc(as(null), "subjects/sub1")));
    await assertFails(getDoc(doc(as("gone"), "subjects/sub1")));
    await assertFails(setDoc(doc(as("gone"), "subjects/x"), { name: "x" }));
  });
});

describe("private details", () => {
  it("lecturers cannot read birthdays or blood types", async () => {
    await assertFails(getDoc(doc(as("lec"), "private/stu")));
  });
  it("the student, their guardian and the office can", async () => {
    await assertSucceeds(getDoc(doc(as("stu"), "private/stu")));
    await assertSucceeds(getDoc(doc(as("mum"), "private/stu")));
    await assertSucceeds(getDoc(doc(as("bursar"), "private/stu")));
    await assertFails(getDoc(doc(as("stu2"), "private/stu")));
  });
});

describe("marks", () => {
  it("a lecturer can mark only their own assessments", async () => {
    const mark = { teacherId: "lec", studentId: "stu", examId: "e1", score: 60, maxScore: 100 };
    await assertSucceeds(setDoc(doc(as("lec"), "results/e1_stu"), mark));
    await assertFails(setDoc(doc(as("lec2"), "results/e1_stu"), { ...mark, teacherId: "lec2" }));
  });
  it("scores must be within range", async () => {
    await assertFails(
      setDoc(doc(as("lec"), "results/e1_stu"), {
        teacherId: "lec", studentId: "stu", examId: "e1", score: 101, maxScore: 100,
      })
    );
  });
  it("a student sees only their own marks, a guardian only their child's", async () => {
    await assertSucceeds(getDocs(query(collection(as("stu"), "results"), where("studentId", "==", "stu"))));
    await assertFails(getDocs(query(collection(as("stu"), "results"), where("studentId", "==", "stu2"))));
    await assertSucceeds(getDocs(query(collection(as("mum"), "results"), where("parentId", "==", "mum"))));
    await assertFails(getDocs(collection(as("stu"), "results")));
  });
  it("a lecturer cannot set an exam on someone else's lesson", async () => {
    await assertFails(
      setDoc(doc(as("lec2"), "exams/e2"), { teacherId: "lec2", lessonId: "l1", title: "x" })
    );
    await assertSucceeds(
      setDoc(doc(as("lec"), "exams/e2"), { teacherId: "lec", lessonId: "l1", title: "x" })
    );
  });
});

describe("fees", () => {
  const submission = {
    studentId: "stu",
    parentId: "mum",
    payer: "household",
    method: "MPESA",
    reference: "SJK4H7X2PQ",
    amount: 5000,
    status: "pending",
    submittedBy: "stu",
    verifiedBy: null,
    remittanceId: null,
  };

  it("a student can report a payment as pending", async () => {
    await assertSucceeds(setDoc(doc(as("stu"), "payments/MPESA_SJK4H7X2PQ"), submission));
  });

  it("a guardian can report a payment for their child", async () => {
    await assertSucceeds(
      setDoc(doc(as("mum"), "payments/MPESA_SJK4H7X2PQ"), { ...submission, submittedBy: "mum" })
    );
  });

  it("a student cannot mark their own payment verified", async () => {
    await assertFails(
      setDoc(doc(as("stu"), "payments/MPESA_SJK4H7X2PQ"), { ...submission, status: "verified" })
    );
  });

  it("the same reference cannot be reported twice", async () => {
    await assertFails(
      setDoc(doc(as("stu"), "payments/MPESA_SEEN000001"), { ...submission, reference: "SEEN000001" })
    );
  });

  it("a student cannot report a payment for someone else", async () => {
    await assertFails(
      setDoc(doc(as("stu2"), "payments/MPESA_OTHER00001"), {
        ...submission, reference: "OTHER00001", submittedBy: "stu2",
      })
    );
  });

  it("a student cannot claim a government payer", async () => {
    await assertFails(
      setDoc(doc(as("stu"), "payments/MPESA_SJK4H7X2PQ"), { ...submission, payer: "helb" })
    );
  });

  it("only the office can edit balances and invoices", async () => {
    await assertFails(updateDoc(doc(as("stu"), "accounts/stu"), { paid: 100 }));
    await assertSucceeds(updateDoc(doc(as("bursar"), "accounts/stu"), { paid: 10 }));
    await assertFails(setDoc(doc(as("lec"), "invoices/i1"), { studentId: "stu", total: 1 }));
  });

  it("a guardian can read their child's balance; others cannot", async () => {
    await assertSucceeds(getDoc(doc(as("mum"), "accounts/stu")));
    await assertFails(getDoc(doc(as("stu2"), "accounts/stu")));
    await assertFails(getDoc(doc(as("lec"), "accounts/stu")));
  });
});

describe("messages", () => {
  it("can be sent only as yourself, read only by the two people", async () => {
    const m = { fromId: "stu", toId: "lec", body: "Hello", read: false, sentAt: now };
    await assertSucceeds(setDoc(doc(as("stu"), "messages/m1"), m));
    await assertFails(setDoc(doc(as("stu2"), "messages/m2"), m));
    await assertSucceeds(getDoc(doc(as("lec"), "messages/m1")));
    await assertFails(getDoc(doc(as("stu2"), "messages/m1")));
    await assertSucceeds(updateDoc(doc(as("lec"), "messages/m1"), { read: true }));
    await assertFails(updateDoc(doc(as("lec"), "messages/m1"), { body: "changed" }));
  });
});

describe("first-run setup", () => {
  it("creates the first admin once, and never again", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await deleteDoc(doc(ctx.firestore(), "meta/setup"));
      await deleteDoc(doc(ctx.firestore(), "users/newbie"));
    });
    const db = as("newbie");
    const b = writeBatch(db);
    b.set(doc(db, "meta/setup"), { adminUid: "newbie" });
    b.set(doc(db, "users/newbie"), { role: "admin", active: true, username: "x", displayName: "x" });
    b.set(doc(db, "settings/institution"), { name: "Test" });
    await assertSucceeds(b.commit());

    const again = as("intruder");
    const b2 = writeBatch(again);
    b2.set(doc(again, "meta/setup"), { adminUid: "intruder" });
    b2.set(doc(again, "users/intruder"), { role: "admin", active: true, username: "y", displayName: "y" });
    await assertFails(b2.commit());
  });

  it("a user cannot promote themselves", async () => {
    await assertFails(updateDoc(doc(as("stu"), "users/stu"), { role: "admin" }));
    await assertFails(setDoc(doc(as("stranger"), "users/stranger"), { role: "admin", active: true }));
  });
});
