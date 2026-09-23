"use client";

import { createUserWithEmailAndPassword, deleteUser, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firebase, provisioningAuth, usernameToEmail } from "./firebase";
import {
  announcementSchema,
  AnnouncementSchema,
  assignmentSchema,
  AssignmentSchema,
  classSchema,
  ClassSchema,
  departmentSchema,
  DepartmentSchema,
  eventSchema,
  EventSchema,
  examSchema,
  ExamSchema,
  facultySchema,
  FacultySchema,
  institutionSchema,
  InstitutionSchema,
  lessonSchema,
  LessonSchema,
  messageSchema,
  MessageSchema,
  parentSchema,
  ParentSchema,
  programmeSchema,
  ProgrammeSchema,
  resultSchema,
  ResultSchema,
  staffSchema,
  StaffSchema,
  studentSchema,
  StudentSchema,
  subjectSchema,
  SubjectSchema,
  teacherSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import { DEFAULT_PAYERS, DEFAULT_SCHEMES } from "./funding";
import { keywordsFor } from "./search";
import type {
  Assignment,
  Exam,
  Grade,
  InstitutionSettings,
  Lesson,
  Parent,
  Role,
  SchoolClass,
  Student,
  Subject,
  Teacher,
} from "./types";

const db = () => firebase().db;
const ref = (path: string) => doc(db(), path);
const fullName = (p: { name?: string; surname?: string } | null | undefined) =>
  p ? `${p.name ?? ""} ${p.surname ?? ""}`.trim() : "";
const blank = (v: string | undefined | null) => (v ? v : null);

const read = async <T>(path: string): Promise<T> => {
  const snap = await getDoc(ref(path));
  if (!snap.exists()) throw new Error(`Not found: ${path}`);
  return { id: snap.id, ...snap.data() } as T;
};

const readOptional = async <T>(path: string | null | undefined): Promise<T | null> => {
  if (!path || path.endsWith("/")) return null;
  const snap = await getDoc(ref(path));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
};

export const institution = () => read<InstitutionSettings & { id: string }>("settings/institution");

// Writes more than one Firestore batch allows (500) in chunks.
const batchUpdate = async (updates: { ref: DocumentReference; data: object }[]) => {
  for (let i = 0; i < updates.length; i += 450) {
    const b = writeBatch(db());
    for (const u of updates.slice(i, i + 450)) b.update(u.ref, u.data);
    await b.commit();
  }
};

// Keeps copied names (a unit's name on every lesson, exam and mark) in step
// after a rename. Renames are rare, so paying for these writes then is
// cheaper than joining on every read.
const propagate = async (collections: string[], field: string, value: string, data: object) => {
  const updates: { ref: DocumentReference; data: object }[] = [];
  for (const c of collections) {
    const snap = await getDocs(query(collection(db(), c), where(field, "==", value)));
    snap.forEach((d) => updates.push({ ref: d.ref, data }));
  }
  await batchUpdate(updates);
};

// ---------- accounts ----------

// Creates the login through a separate Firebase app instance, so the admin
// stays signed in. Returns the new user id and a function that removes the
// login again if saving the profile fails.
const provisionLogin = async (username: string, password: string | undefined) => {
  if (!password) throw new Error("A password is required for a new account.");
  const auth = provisioningAuth();
  const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(username), password);
  return {
    uid: cred.user.uid,
    rollback: async () => {
      await deleteUser(cred.user).catch(() => undefined);
    },
    done: () => signOut(auth),
  };
};

const withNewLogin = async (
  username: string,
  password: string | undefined,
  write: (uid: string) => Promise<void>
) => {
  const login = await provisionLogin(username, password);
  try {
    await write(login.uid);
  } catch (e) {
    await login.rollback();
    throw e;
  } finally {
    await login.done().catch(() => undefined);
  }
  return login.uid;
};

const userDoc = (role: Role, username: string, name: string, surname: string) => ({
  role,
  username: username.toLowerCase(),
  displayName: `${name} ${surname}`,
  active: true,
  createdAt: serverTimestamp(),
});

const personFields = (d: {
  username: string;
  name: string;
  surname: string;
  email?: string;
  phone?: string;
  img?: string | null;
}) => ({
  username: d.username.toLowerCase(),
  name: d.name,
  surname: d.surname,
  email: blank(d.email),
  phone: blank(d.phone),
  img: d.img ?? null,
});

// Archiving replaces deleting. The record stays for the institution's
// history; the person can no longer sign in.
export const setArchived = async (collectionName: string, id: string, archived: boolean) => {
  const b = writeBatch(db());
  b.update(ref(`${collectionName}/${id}`), { active: !archived, updatedAt: serverTimestamp() });
  if (["admins", "teachers", "students", "parents"].includes(collectionName)) {
    b.update(ref(`users/${id}`), { active: !archived });
  }
  if (collectionName === "students") {
    const s = await read<Student>(`students/${id}`);
    if (s.classId) b.update(ref(`classes/${s.classId}`), { studentCount: increment(archived ? -1 : 1) });
  }
  await b.commit();
};

// ---------- units (subjects) ----------

const teacherNames = async (ids: string[]) =>
  Promise.all(ids.map(async (id) => fullName(await read<Teacher>(`teachers/${id}`))));

export const createSubject = async (input: SubjectSchema) => {
  const d = subjectSchema.parse(input);
  const names = await teacherNames(d.teachers);
  const subjectRef = doc(collection(db(), "subjects"));
  const b = writeBatch(db());
  b.set(subjectRef, {
    code: d.code.toUpperCase(),
    name: d.name,
    creditHours: d.creditHours,
    departmentId: blank(d.departmentId),
    teacherIds: d.teachers,
    teacherNames: names,
    active: true,
    keywords: keywordsFor(d.code, d.name),
    createdAt: serverTimestamp(),
  });
  await b.commit();
  await syncTeacherSubjects(subjectRef.id, d.name, [], d.teachers);
};

export const updateSubject = async (input: SubjectSchema) => {
  const d = subjectSchema.parse(input);
  if (!d.id) throw new Error("Missing unit id");
  const before = await read<Subject>(`subjects/${d.id}`);
  const names = await teacherNames(d.teachers);
  await updateDoc(ref(`subjects/${d.id}`), {
    code: d.code.toUpperCase(),
    name: d.name,
    creditHours: d.creditHours,
    departmentId: blank(d.departmentId),
    teacherIds: d.teachers,
    teacherNames: names,
    keywords: keywordsFor(d.code, d.name),
    updatedAt: serverTimestamp(),
  });
  await syncTeacherSubjects(d.id, d.name, before.teacherIds ?? [], d.teachers);
  if (before.name !== d.name || before.code !== d.code.toUpperCase()) {
    await propagate(["lessons", "exams", "assignments", "results"], "subjectId", d.id, {
      subjectName: d.name,
      subjectCode: d.code.toUpperCase(),
    });
  }
};

// Lecturer documents list the units they teach; keep both sides in step.
const syncTeacherSubjects = async (
  subjectId: string,
  subjectName: string,
  before: string[],
  after: string[]
) => {
  const touched = Array.from(new Set([...before, ...after]));
  for (const tid of touched) {
    const t = await read<Teacher>(`teachers/${tid}`);
    const ids = new Set(t.subjectIds ?? []);
    if (after.includes(tid)) ids.add(subjectId);
    else ids.delete(subjectId);
    const list = Array.from(ids);
    const names = await Promise.all(
      list.map(async (sid) => (sid === subjectId ? subjectName : (await read<Subject>(`subjects/${sid}`)).name))
    );
    await updateDoc(ref(`teachers/${tid}`), { subjectIds: list, subjectNames: names });
  }
};

// ---------- classes (cohorts) ----------

const classFields = async (d: ClassSchema) => {
  const grade = await read<Grade>(`grades/${d.gradeId}`);
  const supervisor = await readOptional<Teacher>(d.supervisorId ? `teachers/${d.supervisorId}` : null);
  const programme = await readOptional<{ name: string }>(d.programmeId ? `programmes/${d.programmeId}` : null);
  return {
    name: d.name,
    capacity: d.capacity,
    gradeId: d.gradeId,
    gradeLevel: grade.level,
    supervisorId: supervisor ? supervisor.id : null,
    supervisorName: supervisor ? fullName(supervisor) : null,
    programmeId: programme ? d.programmeId : null,
    programmeName: programme ? programme.name : null,
    intake: d.intake ?? "",
    keywords: keywordsFor(d.name, programme?.name, d.intake),
  };
};

export const createClass = async (input: ClassSchema) => {
  const d = classSchema.parse(input);
  await addDoc(collection(db(), "classes"), {
    ...(await classFields(d)),
    studentCount: 0,
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateClass = async (input: ClassSchema) => {
  const d = classSchema.parse(input);
  if (!d.id) throw new Error("Missing class id");
  const before = await read<SchoolClass>(`classes/${d.id}`);
  if (d.capacity < (before.studentCount ?? 0)) {
    throw new Error(`The class already has ${before.studentCount} students.`);
  }
  const fields = await classFields(d);
  await updateDoc(ref(`classes/${d.id}`), { ...fields, updatedAt: serverTimestamp() });
  if (before.name !== d.name) {
    await propagate(
      ["students", "lessons", "exams", "assignments", "results", "events", "announcements"],
      "classId",
      d.id,
      { className: d.name }
    );
  }
  if (before.gradeLevel !== fields.gradeLevel) {
    await propagate(["students"], "classId", d.id, { gradeId: d.gradeId, gradeLevel: fields.gradeLevel });
  }
};

// ---------- lecturers ----------

const teacherFields = async (d: TeacherSchema) => {
  const subjectIds = d.subjects ?? [];
  const subjects = await Promise.all(subjectIds.map((id) => read<Subject>(`subjects/${id}`)));
  const dept = await readOptional<{ name: string }>(d.departmentId ? `departments/${d.departmentId}` : null);
  return {
    ...personFields(d),
    staffNo: d.staffNo ?? "",
    sex: d.sex,
    departmentId: dept ? d.departmentId : null,
    departmentName: dept ? dept.name : null,
    subjectIds,
    subjectNames: subjects.map((s) => s.name),
    keywords: keywordsFor(d.name, d.surname, d.username, d.staffNo),
  };
};

const privateFields = (d: {
  address?: string;
  bloodType?: string;
  birthday?: Date;
  sex?: "MALE" | "FEMALE";
  nationalId?: string;
  county?: string;
}) => ({
  address: d.address ?? "",
  bloodType: d.bloodType ?? "",
  birthday: d.birthday ? Timestamp.fromDate(d.birthday) : null,
  sex: d.sex ?? null,
  nationalId: d.nationalId ?? "",
  county: d.county ?? "",
});

export const createTeacher = async (input: TeacherSchema) => {
  const d = teacherSchema.parse(input);
  const fields = await teacherFields(d);
  const uid = await withNewLogin(d.username, d.password, async (uid) => {
    const b = writeBatch(db());
    b.set(ref(`users/${uid}`), userDoc("teacher", d.username, d.name, d.surname));
    b.set(ref(`teachers/${uid}`), { ...fields, active: true, createdAt: serverTimestamp() });
    b.set(ref(`private/${uid}`), privateFields(d));
    await b.commit();
  });
  for (const sid of fields.subjectIds) {
    const s = await read<Subject>(`subjects/${sid}`);
    const ids = Array.from(new Set([...(s.teacherIds ?? []), uid]));
    await updateDoc(ref(`subjects/${sid}`), { teacherIds: ids, teacherNames: await teacherNames(ids) });
  }
};

export const updateTeacher = async (input: TeacherSchema) => {
  const d = teacherSchema.parse(input);
  if (!d.id) throw new Error("Missing lecturer id");
  const before = await read<Teacher>(`teachers/${d.id}`);
  const fields = await teacherFields({ ...d, username: before.username });
  const b = writeBatch(db());
  b.update(ref(`teachers/${d.id}`), { ...fields, updatedAt: serverTimestamp() });
  b.set(ref(`private/${d.id}`), privateFields(d), { merge: true });
  b.update(ref(`users/${d.id}`), { displayName: `${d.name} ${d.surname}` });
  await b.commit();

  const beforeIds = before.subjectIds ?? [];
  for (const sid of Array.from(new Set([...beforeIds, ...fields.subjectIds]))) {
    const s = await read<Subject>(`subjects/${sid}`);
    const set = new Set(s.teacherIds ?? []);
    if (fields.subjectIds.includes(sid)) set.add(d.id);
    else set.delete(d.id);
    const ids = Array.from(set);
    await updateDoc(ref(`subjects/${sid}`), { teacherIds: ids, teacherNames: await teacherNames(ids) });
  }
  if (fullName(before) !== fullName(d)) {
    const name = fullName(d);
    await propagate(["lessons", "exams", "assignments", "results"], "teacherId", d.id, { teacherName: name });
    await propagate(["classes"], "supervisorId", d.id, { supervisorName: name });
  }
};

// ---------- guardians ----------

export const createParent = async (input: ParentSchema) => {
  const d = parentSchema.parse(input);
  await withNewLogin(d.username, d.password, async (uid) => {
    const b = writeBatch(db());
    b.set(ref(`users/${uid}`), userDoc("parent", d.username, d.name, d.surname));
    b.set(ref(`parents/${uid}`), {
      ...personFields(d),
      relationship: d.relationship ?? "",
      keywords: keywordsFor(d.name, d.surname, d.username, d.phone),
      active: true,
      createdAt: serverTimestamp(),
    });
    b.set(ref(`private/${uid}`), { address: d.address ?? "", nationalId: d.nationalId ?? "" });
    await b.commit();
  });
};

export const updateParent = async (input: ParentSchema) => {
  const d = parentSchema.parse(input);
  if (!d.id) throw new Error("Missing guardian id");
  const before = await read<Parent>(`parents/${d.id}`);
  const b = writeBatch(db());
  b.update(ref(`parents/${d.id}`), {
    ...personFields({ ...d, username: before.username }),
    relationship: d.relationship ?? "",
    keywords: keywordsFor(d.name, d.surname, before.username, d.phone),
    updatedAt: serverTimestamp(),
  });
  b.set(ref(`private/${d.id}`), { address: d.address ?? "", nationalId: d.nationalId ?? "" }, { merge: true });
  b.update(ref(`users/${d.id}`), { displayName: `${d.name} ${d.surname}` });
  await b.commit();
  if (fullName(before) !== fullName(d)) {
    await propagate(["students"], "parentId", d.id, { parentName: fullName(d) });
  }
};

// ---------- office staff ----------

export const createStaff = async (input: StaffSchema) => {
  const d = staffSchema.parse(input);
  await withNewLogin(d.username, d.password, async (uid) => {
    const b = writeBatch(db());
    b.set(ref(`users/${uid}`), userDoc(d.role, d.username, d.name, d.surname));
    b.set(ref(`admins/${uid}`), {
      ...personFields(d),
      role: d.role,
      keywords: keywordsFor(d.name, d.surname, d.username),
      active: true,
      createdAt: serverTimestamp(),
    });
    await b.commit();
  });
};

// ---------- students ----------

const studentFields = async (d: StudentSchema) => {
  const [klass, grade, parent, programme] = await Promise.all([
    read<SchoolClass>(`classes/${d.classId}`),
    read<Grade>(`grades/${d.gradeId}`),
    readOptional<Parent>(d.parentId ? `parents/${d.parentId}` : null),
    readOptional<{ name: string }>(d.programmeId ? `programmes/${d.programmeId}` : null),
  ]);
  return {
    klass,
    fields: {
      ...personFields(d),
      admissionNo: d.username.toUpperCase(),
      sex: d.sex,
      parentId: parent ? parent.id : null,
      parentName: parent ? fullName(parent) : null,
      classId: d.classId,
      className: klass.name,
      gradeId: d.gradeId,
      gradeLevel: grade.level,
      programmeId: programme ? d.programmeId : (klass.programmeId ?? null),
      programmeName: programme ? programme.name : (klass.programmeName ?? null),
      sponsorship: d.sponsorship,
      fundingBand: d.fundingBand === "" || d.fundingBand === undefined ? null : Number(d.fundingBand),
      kuccpsIndex: blank(d.kuccpsIndex),
      status: d.status,
      keywords: keywordsFor(d.name, d.surname, d.username, d.kuccpsIndex),
    },
  };
};

const CLASS_FULL = "This class is full. Increase its capacity or choose another class.";

export const createStudent = async (input: StudentSchema) => {
  const d = studentSchema.parse(input);
  const { klass, fields } = await studentFields(d);
  if ((klass.studentCount ?? 0) >= klass.capacity) throw new Error(CLASS_FULL);

  await withNewLogin(d.username, d.password, async (uid) => {
    // The capacity check and the count update happen together, so two
    // admissions at the same moment cannot overfill a class.
    await runTransaction(db(), async (tx) => {
      const classRef = ref(`classes/${d.classId}`);
      const current = await tx.get(classRef);
      const c = current.data() as SchoolClass;
      if ((c.studentCount ?? 0) >= c.capacity) throw new Error(CLASS_FULL);
      tx.update(classRef, { studentCount: increment(1) });
      tx.set(ref(`users/${uid}`), userDoc("student", d.username, d.name, d.surname));
      tx.set(ref(`students/${uid}`), { ...fields, active: true, createdAt: serverTimestamp() });
      tx.set(ref(`private/${uid}`), { ...privateFields(d), parentId: fields.parentId });
    });
  });
};

export const updateStudent = async (input: StudentSchema) => {
  const d = studentSchema.parse(input);
  if (!d.id) throw new Error("Missing student id");
  const id = d.id;
  const before = await read<Student>(`students/${id}`);
  const { fields } = await studentFields({ ...d, username: before.username });

  await runTransaction(db(), async (tx) => {
    if (before.classId !== d.classId) {
      const newRef = ref(`classes/${d.classId}`);
      const c = (await tx.get(newRef)).data() as SchoolClass;
      if ((c.studentCount ?? 0) >= c.capacity) throw new Error(CLASS_FULL);
      tx.update(newRef, { studentCount: increment(1) });
      if (before.classId) tx.update(ref(`classes/${before.classId}`), { studentCount: increment(-1) });
    }
    tx.update(ref(`students/${id}`), { ...fields, updatedAt: serverTimestamp() });
    tx.set(ref(`private/${id}`), { ...privateFields(d), parentId: fields.parentId }, { merge: true });
    tx.update(ref(`users/${id}`), { displayName: `${d.name} ${d.surname}` });
  });

  if (fullName(before) !== fullName(d)) {
    await propagate(["results", "attendance", "invoices", "payments"], "studentId", id, {
      studentName: fullName(d),
    });
  }
  if ((before.parentId ?? null) !== fields.parentId) {
    // Guardians read their child's records through this copied field.
    await propagate(["results", "attendance", "invoices", "payments"], "studentId", id, {
      parentId: fields.parentId,
    });
    const account = await readOptional(`accounts/${id}`);
    if (account) await updateDoc(ref(`accounts/${id}`), { parentId: fields.parentId });
  }
};

// ---------- timetable ----------

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const lessonFields = async (d: LessonSchema) => {
  const [subject, klass, teacher] = await Promise.all([
    read<Subject>(`subjects/${d.subjectId}`),
    read<SchoolClass>(`classes/${d.classId}`),
    read<Teacher>(`teachers/${d.teacherId}`),
  ]);
  return {
    name: d.name,
    day: d.day,
    // Sorts the timetable Monday first, then by start time.
    slot: `${DAY_ORDER.indexOf(d.day)}-${d.startTime}`,
    startTime: d.startTime,
    endTime: d.endTime,
    venue: d.venue ?? "",
    subjectId: d.subjectId,
    subjectName: subject.name,
    subjectCode: subject.code,
    classId: d.classId,
    className: klass.name,
    teacherId: d.teacherId,
    teacherName: fullName(teacher),
    keywords: keywordsFor(d.name, subject.name, subject.code, klass.name, fullName(teacher), d.venue),
  };
};

// Lessons that overlap in time for the same class, lecturer or venue.
const clashes = async (d: LessonSchema) => {
  const snap = await getDocs(
    query(collection(db(), "lessons"), where("day", "==", d.day), where("active", "==", true))
  );
  return snap.docs
    .map((s) => ({ id: s.id, ...(s.data() as Omit<Lesson, "id">) }))
    .filter((l) => l.id !== d.id && l.startTime < d.endTime && d.startTime < l.endTime)
    .filter(
      (l) =>
        l.classId === d.classId ||
        l.teacherId === d.teacherId ||
        (!!d.venue && !!l.venue && l.venue.toLowerCase() === d.venue.toLowerCase())
    );
};

const assertNoClash = async (d: LessonSchema) => {
  const c = await clashes(d);
  if (c.length) {
    const l = c[0];
    throw new Error(
      `Clashes with ${l.name} (${l.className}, ${l.teacherName}${l.venue ? `, ${l.venue}` : ""}) ${l.startTime}-${l.endTime}.`
    );
  }
};

export const createLesson = async (input: LessonSchema) => {
  const d = lessonSchema.parse(input);
  await assertNoClash(d);
  await addDoc(collection(db(), "lessons"), {
    ...(await lessonFields(d)),
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateLesson = async (input: LessonSchema) => {
  const d = lessonSchema.parse(input);
  if (!d.id) throw new Error("Missing lesson id");
  await assertNoClash(d);
  const fields = await lessonFields(d);
  await updateDoc(ref(`lessons/${d.id}`), { ...fields, updatedAt: serverTimestamp() });
  const link = {
    subjectId: fields.subjectId,
    subjectName: fields.subjectName,
    subjectCode: fields.subjectCode,
    classId: fields.classId,
    className: fields.className,
    teacherId: fields.teacherId,
    teacherName: fields.teacherName,
  };
  await propagate(["exams", "assignments"], "lessonId", d.id, link);
};

// ---------- assessment ----------

const lessonLink = async (lessonId: string) => {
  const [lesson, inst] = await Promise.all([read<Lesson>(`lessons/${lessonId}`), institution()]);
  return {
    lessonId,
    subjectId: lesson.subjectId,
    subjectName: lesson.subjectName,
    subjectCode: lesson.subjectCode ?? "",
    classId: lesson.classId,
    className: lesson.className,
    teacherId: lesson.teacherId,
    teacherName: lesson.teacherName,
    academicYear: inst.academicYear,
    semester: inst.semester,
  };
};

export const createExam = async (input: ExamSchema) => {
  const d = examSchema.parse(input);
  const link = await lessonLink(d.lessonId);
  await addDoc(collection(db(), "exams"), {
    ...link,
    title: d.title,
    kind: d.kind,
    startTime: Timestamp.fromDate(d.startTime),
    endTime: Timestamp.fromDate(d.endTime),
    venue: d.venue ?? "",
    maxScore: d.maxScore,
    keywords: keywordsFor(d.title, link.subjectName, link.subjectCode, link.className),
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateExam = async (input: ExamSchema) => {
  const d = examSchema.parse(input);
  if (!d.id) throw new Error("Missing exam id");
  const before = await read<Exam>(`exams/${d.id}`);
  const link = await lessonLink(d.lessonId);
  await updateDoc(ref(`exams/${d.id}`), {
    ...link,
    // An exam keeps the semester it was set in.
    academicYear: before.academicYear,
    semester: before.semester,
    title: d.title,
    kind: d.kind,
    startTime: Timestamp.fromDate(d.startTime),
    endTime: Timestamp.fromDate(d.endTime),
    venue: d.venue ?? "",
    maxScore: d.maxScore,
    keywords: keywordsFor(d.title, link.subjectName, link.subjectCode, link.className),
    updatedAt: serverTimestamp(),
  });
};

export const createAssignment = async (input: AssignmentSchema) => {
  const d = assignmentSchema.parse(input);
  const link = await lessonLink(d.lessonId);
  await addDoc(collection(db(), "assignments"), {
    ...link,
    title: d.title,
    kind: d.kind,
    startDate: Timestamp.fromDate(d.startDate),
    dueDate: Timestamp.fromDate(d.dueDate),
    maxScore: d.maxScore,
    keywords: keywordsFor(d.title, link.subjectName, link.subjectCode, link.className),
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateAssignment = async (input: AssignmentSchema) => {
  const d = assignmentSchema.parse(input);
  if (!d.id) throw new Error("Missing assignment id");
  const before = await read<Assignment>(`assignments/${d.id}`);
  const link = await lessonLink(d.lessonId);
  await updateDoc(ref(`assignments/${d.id}`), {
    ...link,
    academicYear: before.academicYear,
    semester: before.semester,
    title: d.title,
    kind: d.kind,
    startDate: Timestamp.fromDate(d.startDate),
    dueDate: Timestamp.fromDate(d.dueDate),
    maxScore: d.maxScore,
    keywords: keywordsFor(d.title, link.subjectName, link.subjectCode, link.className),
    updatedAt: serverTimestamp(),
  });
};

// One mark per student per assessment: the document id is
// "<assessment id>_<student id>", so saving again corrects the mark instead
// of adding a duplicate.
export const saveResult = async (input: ResultSchema) => {
  const d = resultSchema.parse(input);
  const [kind, assessmentId] = d.assessment.split(":");
  if (!assessmentId || (kind !== "exam" && kind !== "assignment")) throw new Error("Choose an assessment");
  const a =
    kind === "exam"
      ? await read<Exam>(`exams/${assessmentId}`)
      : await read<Assignment>(`assignments/${assessmentId}`);
  const student = await read<Student>(`students/${d.studentId}`);
  if (d.score > a.maxScore) throw new Error(`Score cannot be more than ${a.maxScore}.`);
  if (student.classId !== a.classId) throw new Error(`${fullName(student)} is not in ${a.className}.`);

  await setDoc(ref(`results/${assessmentId}_${d.studentId}`), {
    score: d.score,
    maxScore: a.maxScore,
    examId: kind === "exam" ? assessmentId : null,
    assignmentId: kind === "assignment" ? assessmentId : null,
    assessmentTitle: a.title,
    assessmentKind: a.kind,
    studentId: d.studentId,
    studentName: fullName(student),
    admissionNo: student.admissionNo,
    parentId: student.parentId ?? null,
    subjectId: a.subjectId,
    subjectName: a.subjectName,
    subjectCode: a.subjectCode ?? "",
    classId: a.classId,
    className: a.className,
    teacherId: a.teacherId,
    teacherName: a.teacherName,
    academicYear: a.academicYear,
    semester: a.semester,
    date: kind === "exam" ? (a as Exam).startTime : (a as Assignment).dueDate,
    keywords: keywordsFor(a.title, fullName(student), student.admissionNo, a.subjectName, a.subjectCode),
    updatedAt: serverTimestamp(),
  });
};

// Marks for a whole class in one go, from the marking sheet.
export const saveResultsSheet = async (assessment: string, scores: Record<string, number | "">) => {
  for (const [studentId, score] of Object.entries(scores)) {
    if (score === "" || score === null || score === undefined) continue;
    await saveResult({ assessment, studentId, score: Number(score) });
  }
};

// ---------- attendance ----------

export const markAttendance = async (
  lesson: Lesson,
  date: string,
  marks: { student: Student; present: boolean }[]
) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a date");
  const b = writeBatch(db());
  for (const { student, present } of marks) {
    b.set(ref(`attendance/${lesson.id}_${date}_${student.id}`), {
      date,
      present,
      studentId: student.id,
      studentName: fullName(student),
      parentId: student.parentId ?? null,
      lessonId: lesson.id,
      subjectName: lesson.subjectName,
      classId: lesson.classId,
      teacherId: lesson.teacherId,
      updatedAt: serverTimestamp(),
    });
  }
  await b.commit();
};

// ---------- calendar ----------

const classLabel = async (classId?: string) => {
  if (!classId) return { classId: null, className: null };
  const c = await read<SchoolClass>(`classes/${classId}`);
  return { classId, className: c.name };
};

export const createEvent = async (input: EventSchema) => {
  const d = eventSchema.parse(input);
  const c = await classLabel(d.classId);
  await addDoc(collection(db(), "events"), {
    title: d.title,
    description: d.description,
    startTime: Timestamp.fromDate(d.startTime),
    endTime: Timestamp.fromDate(d.endTime),
    ...c,
    keywords: keywordsFor(d.title, c.className),
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateEvent = async (input: EventSchema) => {
  const d = eventSchema.parse(input);
  if (!d.id) throw new Error("Missing event id");
  const c = await classLabel(d.classId);
  await updateDoc(ref(`events/${d.id}`), {
    title: d.title,
    description: d.description,
    startTime: Timestamp.fromDate(d.startTime),
    endTime: Timestamp.fromDate(d.endTime),
    ...c,
    keywords: keywordsFor(d.title, c.className),
    updatedAt: serverTimestamp(),
  });
};

export const createAnnouncement = async (input: AnnouncementSchema) => {
  const d = announcementSchema.parse(input);
  const c = await classLabel(d.classId);
  await addDoc(collection(db(), "announcements"), {
    title: d.title,
    description: d.description,
    date: Timestamp.fromDate(d.date),
    ...c,
    keywords: keywordsFor(d.title, c.className),
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updateAnnouncement = async (input: AnnouncementSchema) => {
  const d = announcementSchema.parse(input);
  if (!d.id) throw new Error("Missing announcement id");
  const c = await classLabel(d.classId);
  await updateDoc(ref(`announcements/${d.id}`), {
    title: d.title,
    description: d.description,
    date: Timestamp.fromDate(d.date),
    ...c,
    keywords: keywordsFor(d.title, c.className),
    updatedAt: serverTimestamp(),
  });
};

// ---------- academic structure ----------

export const saveFaculty = async (input: FacultySchema) => {
  const d = facultySchema.parse(input);
  const data = { code: d.code.toUpperCase(), name: d.name, keywords: keywordsFor(d.code, d.name) };
  if (d.id) {
    await updateDoc(ref(`faculties/${d.id}`), { ...data, updatedAt: serverTimestamp() });
    await propagate(["departments"], "facultyId", d.id, { facultyName: d.name });
  } else {
    await addDoc(collection(db(), "faculties"), { ...data, active: true, createdAt: serverTimestamp() });
  }
};

export const saveDepartment = async (input: DepartmentSchema) => {
  const d = departmentSchema.parse(input);
  const faculty = await read<{ name: string }>(`faculties/${d.facultyId}`);
  const data = {
    code: d.code.toUpperCase(),
    name: d.name,
    facultyId: d.facultyId,
    facultyName: faculty.name,
    keywords: keywordsFor(d.code, d.name, faculty.name),
  };
  if (d.id) {
    await updateDoc(ref(`departments/${d.id}`), { ...data, updatedAt: serverTimestamp() });
    await propagate(["programmes"], "departmentId", d.id, { departmentName: d.name });
    await propagate(["teachers"], "departmentId", d.id, { departmentName: d.name });
  } else {
    await addDoc(collection(db(), "departments"), { ...data, active: true, createdAt: serverTimestamp() });
  }
};

export const saveProgramme = async (input: ProgrammeSchema) => {
  const d = programmeSchema.parse(input);
  const dept = await read<{ name: string }>(`departments/${d.departmentId}`);
  const data = {
    code: d.code.toUpperCase(),
    name: d.name,
    level: d.level,
    departmentId: d.departmentId,
    departmentName: dept.name,
    durationYears: d.durationYears,
    semestersPerYear: d.semestersPerYear,
    passMark: d.passMark,
    keywords: keywordsFor(d.code, d.name, dept.name),
  };
  if (d.id) {
    await updateDoc(ref(`programmes/${d.id}`), { ...data, updatedAt: serverTimestamp() });
    await propagate(["classes", "students", "feeStructures"], "programmeId", d.id, { programmeName: d.name });
  } else {
    await addDoc(collection(db(), "programmes"), { ...data, active: true, createdAt: serverTimestamp() });
  }
};

// ---------- messages ----------

export const sendMessage = async (from: { id: string; name: string }, input: MessageSchema) => {
  const d = messageSchema.parse(input);
  const to = await read<{ displayName: string }>(`users/${d.toId}`).catch(() => null);
  await addDoc(collection(db(), "messages"), {
    fromId: from.id,
    fromName: from.name,
    toId: d.toId,
    toName: to?.displayName ?? "",
    body: d.body,
    sentAt: serverTimestamp(),
    read: false,
  });
};

export const markMessageRead = (id: string) => updateDoc(ref(`messages/${id}`), { read: true });

// ---------- settings and first run ----------

export const saveInstitution = async (input: InstitutionSchema) => {
  const d = institutionSchema.parse(input);
  await setDoc(ref("settings/institution"), { ...d, updatedAt: serverTimestamp() }, { merge: true });
};

// Creates the first administrator, the institution settings, years of
// study, the default payers and funding schemes, all in one batch. The
// security rules allow this exactly once.
export const bootstrap = async (
  admin: { username: string; password: string; name: string; surname: string },
  inst: InstitutionSchema
) => {
  const settings = institutionSchema.parse(inst);
  const { auth } = firebase();
  const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(admin.username), admin.password);
  const uid = cred.user.uid;
  try {
    const b = writeBatch(db());
    b.set(ref("meta/setup"), { adminUid: uid, at: serverTimestamp() });
    b.set(ref(`users/${uid}`), userDoc("admin", admin.username, admin.name, admin.surname));
    b.set(ref(`admins/${uid}`), {
      ...personFields({ username: admin.username, name: admin.name, surname: admin.surname }),
      role: "admin",
      keywords: keywordsFor(admin.name, admin.surname, admin.username),
      active: true,
      createdAt: serverTimestamp(),
    });
    b.set(ref("settings/institution"), { ...settings, updatedAt: serverTimestamp() });
    for (let level = 1; level <= 6; level++) b.set(ref(`grades/year-${level}`), { level });
    for (const p of DEFAULT_PAYERS) b.set(ref(`payers/${p.key}`), p);
    DEFAULT_SCHEMES.forEach((s, i) =>
      b.set(ref(`fundingSchemes/scheme-${i + 1}`), { ...s, createdAt: serverTimestamp() })
    );
    await b.commit();
  } catch (e) {
    await deleteUser(cred.user).catch(() => undefined);
    throw e;
  }
};
