import { Timestamp } from "firebase/firestore";

// Role keys keep the original names; the interface shows them as
// Lecturer (teacher) and Guardian (parent). "finance" is the bursar's office.
export type Role = "admin" | "finance" | "teacher" | "student" | "parent";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  finance: "Finance office",
  teacher: "Lecturer",
  student: "Student",
  parent: "Guardian",
};

export type Sex = "MALE" | "FEMALE";
export type Day = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY";

type Base = { id: string; createdAt?: Timestamp; updatedAt?: Timestamp };

// Every searchable record stores lowercase word prefixes, because Firestore
// has no substring search. See lib/search.ts.
type Searchable = { keywords?: string[] };

// Records are archived, never deleted: institutions must keep academic and
// financial history, and a browser cannot delete another user's login.
type Archivable = { active: boolean };

export type UserDoc = Base & {
  role: Role;
  username: string;
  displayName: string;
  active: boolean;
};

export type Person = Base &
  Searchable &
  Archivable & {
    username: string;
    name: string;
    surname: string;
    email?: string | null;
    phone?: string | null;
    img?: string | null;
  };

// Personal details only the person, their guardian and the office may read.
export type PrivateProfile = {
  id: string;
  address?: string;
  bloodType?: string;
  birthday?: Timestamp | null;
  sex?: Sex;
  nationalId?: string;
  county?: string;
  parentId?: string | null;
};

export type Admin = Person;

export type Teacher = Person & {
  staffNo?: string;
  sex?: Sex;
  departmentId?: string | null;
  departmentName?: string | null;
  subjectIds: string[];
  subjectNames: string[];
};

export type Sponsorship = "GSS" | "SSP";

export const SPONSORSHIP_LABEL: Record<Sponsorship, string> = {
  GSS: "Government sponsored (KUCCPS)",
  SSP: "Self-sponsored",
};

export type StudentStatus =
  | "active"
  | "deferred"
  | "suspended"
  | "discontinued"
  | "graduated";

export type Student = Person & {
  admissionNo: string;
  sex?: Sex;
  parentId?: string | null;
  parentName?: string | null;
  classId: string;
  className: string;
  gradeId: string;
  gradeLevel: number;
  programmeId?: string | null;
  programmeName?: string | null;
  sponsorship: Sponsorship;
  fundingBand?: number | null;
  kuccpsIndex?: string | null;
  status: StudentStatus;
};

export type Parent = Person & {
  relationship?: string;
};

// Year of study.
export type Grade = Base & { level: number };

// Cohort or stream: programme + year of study + intake.
export type SchoolClass = Base &
  Searchable &
  Archivable & {
    name: string;
    capacity: number;
    studentCount: number;
    gradeId: string;
    gradeLevel: number;
    supervisorId?: string | null;
    supervisorName?: string | null;
    programmeId?: string | null;
    programmeName?: string | null;
    intake?: string;
  };

// Unit (course).
export type Subject = Base &
  Searchable &
  Archivable & {
    code: string;
    name: string;
    creditHours: number;
    departmentId?: string | null;
    teacherIds: string[];
    teacherNames: string[];
  };

// Timetable slot. Times are "HH:mm" strings so they do not shift with time
// zones or daylight saving.
export type Lesson = Base &
  Searchable &
  Archivable & {
    name: string;
    day: Day;
    slot: string;
    startTime: string;
    endTime: string;
    venue?: string;
    subjectId: string;
    subjectName: string;
    subjectCode?: string;
    classId: string;
    className: string;
    teacherId: string;
    teacherName: string;
  };

type LessonLink = {
  lessonId: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  semester: number;
};

export type ExamKind = "main" | "supplementary" | "special";

export type Exam = Base &
  Searchable &
  Archivable &
  LessonLink & {
    title: string;
    kind: ExamKind;
    startTime: Timestamp;
    endTime: Timestamp;
    venue?: string;
    maxScore: number;
  };

export type AssignmentKind = "cat" | "assignment";

export type Assignment = Base &
  Searchable &
  Archivable &
  LessonLink & {
    title: string;
    kind: AssignmentKind;
    startDate: Timestamp;
    dueDate: Timestamp;
    maxScore: number;
  };

export type Result = Base &
  Searchable &
  Omit<LessonLink, "lessonId"> & {
    score: number;
    maxScore: number;
    examId?: string | null;
    assignmentId?: string | null;
    assessmentTitle: string;
    assessmentKind: ExamKind | AssignmentKind;
    studentId: string;
    studentName: string;
    admissionNo: string;
    parentId?: string | null;
    date: Timestamp;
  };

export type Attendance = Base & {
  date: string; // YYYY-MM-DD
  present: boolean;
  studentId: string;
  studentName: string;
  parentId?: string | null;
  lessonId: string;
  subjectName: string;
  classId: string;
  teacherId: string;
};

export type SchoolEvent = Base &
  Searchable &
  Archivable & {
    title: string;
    description: string;
    startTime: Timestamp;
    endTime: Timestamp;
    classId?: string | null;
    className?: string | null;
  };

export type Announcement = Base &
  Searchable &
  Archivable & {
    title: string;
    description: string;
    date: Timestamp;
    classId?: string | null;
    className?: string | null;
  };

export type Message = Base & {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  body: string;
  sentAt: Timestamp;
  read: boolean;
};

// ---------- Academic structure ----------

export type Faculty = Base & Searchable & Archivable & { code: string; name: string };

export type Department = Base &
  Searchable &
  Archivable & { code: string; name: string; facultyId: string; facultyName: string };

export type ProgrammeLevel = "certificate" | "diploma" | "degree" | "masters" | "phd";

export type Programme = Base &
  Searchable &
  Archivable & {
    code: string;
    name: string;
    level: ProgrammeLevel;
    departmentId: string;
    departmentName: string;
    durationYears: number;
    semestersPerYear: number;
    passMark: number;
  };

export type InstitutionSettings = {
  name: string;
  shortName: string;
  motto?: string;
  academicYear: string; // e.g. "2026/2027"
  semester: number;
  paybill?: string;
  bankDetails?: string;
  // Share of the semester invoice (0-100) a student must have paid before
  // an exam card is issued.
  examCardThreshold: number;
  supplementaryCap: number;
};

// ---------- Fees and funding ----------

// Who pays. Keys are stable; labels can be renamed (for example when the
// proposed Tertiary Education Funding Authority replaces HELB and the
// Universities Fund).
export type PayerKey = string;

export type Payer = Base &
  Archivable & {
    key: PayerKey;
    name: string;
    kind: "government_scholarship" | "government_loan" | "household" | "bursary" | "sponsor";
  };

export type FundingBand = {
  band: number;
  label: string;
  // Percent of the invoice each payer is expected to cover. Must sum to 100.
  shares: Record<PayerKey, number>;
  upkeep?: number;
};

export type FundingScheme = Base &
  Archivable & {
    name: string;
    description?: string;
    appliesTo: Sponsorship;
    // Used when a student has no band yet.
    defaultBand: number;
    bands: FundingBand[];
  };

export type FeeItem = { name: string; amount: number };

export type FeeStructure = Base &
  Archivable & {
    programmeId: string;
    programmeName: string;
    sponsorship: Sponsorship;
    gradeLevel: number;
    academicYear: string;
    semester: number;
    items: FeeItem[];
    total: number;
  };

export type InvoiceSplit = { payer: PayerKey; payerName: string; expected: number };

export type Invoice = Base &
  Searchable & {
    number: string;
    studentId: string;
    studentName: string;
    admissionNo: string;
    parentId?: string | null;
    classId: string;
    programmeName?: string | null;
    academicYear: string;
    semester: number;
    items: FeeItem[];
    total: number;
    fundingSchemeId?: string | null;
    fundingBand?: number | null;
    splits: InvoiceSplit[];
    issuedAt: Timestamp;
    status: "issued" | "cancelled";
  };

export type PaymentMethod = "MPESA" | "BANK" | "CHEQUE" | "EFT" | "CASH";

export type PaymentStatus = "pending" | "verified" | "rejected" | "reversed";

export type Payment = Base &
  Searchable & {
    // The document id is derived from method + reference, so the same
    // M-Pesa code or bank slip can never be recorded twice.
    studentId: string;
    studentName: string;
    admissionNo: string;
    parentId?: string | null;
    payer: PayerKey;
    payerName: string;
    method: PaymentMethod;
    reference: string;
    amount: number;
    paidOn: Timestamp;
    status: PaymentStatus;
    submittedBy: string;
    verifiedBy?: string | null;
    verifiedAt?: Timestamp | null;
    remittanceId?: string | null;
    academicYear: string;
    semester: number;
    note?: string;
  };

// A lump-sum transfer (HELB, Universities Fund, county bursary, CDF,
// sponsor) allocated across many students.
export type Remittance = Base & {
  payer: PayerKey;
  payerName: string;
  method: PaymentMethod;
  reference: string;
  receivedOn: Timestamp;
  total: number;
  allocated: number;
  academicYear: string;
  semester: number;
  allocations: { studentId: string; studentName: string; admissionNo: string; amount: number }[];
  recordedBy: string;
};

// Running totals per student, kept in step with invoices and payments by the
// finance office in the same transaction. Can be rebuilt from the ledger.
export type Account = {
  id: string; // student id
  studentName: string;
  admissionNo: string;
  parentId?: string | null;
  classId?: string;
  billed: number;
  paid: number;
  balance: number;
  byPayer: Record<PayerKey, { expected: number; received: number }>;
  updatedAt?: Timestamp;
};

// Monthly totals for the finance chart.
export type FinanceMonth = {
  id: string; // YYYY-MM
  billed: number;
  collected: number;
  byPayer: Record<PayerKey, number>;
};
