import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const id = z.string().optional();
const requiredId = (what: string) => z.string().min(1, { message: `${what} is required!` });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Use HH:MM (24-hour)" });

const username = z
  .string()
  .trim()
  .min(3, { message: "Username must be at least 3 characters long!" })
  .max(40, { message: "Username must be at most 40 characters long!" })
  .regex(/^[A-Za-z0-9._\-/]+$/, {
    message: "Use letters, digits, dot, dash, underscore or slash only.",
  });

// Required when creating an account, optional when updating it. Passwords of
// existing users are changed by the users themselves (see Settings).
const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long!" })
  .optional()
  .or(z.literal(""));

const personBase = {
  id,
  username,
  password,
  name: z.string().trim().min(1, { message: "First name is required!" }),
  surname: z.string().trim().min(1, { message: "Last name is required!" }),
  email: z.string().trim().email({ message: "Invalid email address!" }).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?254|0)?[17]\d{8}$/, { message: "Use a Kenyan number, e.g. 0712345678" })
    .optional()
    .or(z.literal("")),
  address: optionalText,
  img: z.string().optional().nullable(),
};

const personalDetails = {
  bloodType: optionalText,
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  nationalId: optionalText,
  county: optionalText,
};

export const subjectSchema = z.object({
  id,
  code: z.string().trim().min(2, { message: "Unit code is required, e.g. SCO 201" }),
  name: z.string().trim().min(1, { message: "Unit name is required!" }),
  creditHours: z.coerce.number().int().min(1).max(20),
  departmentId: optionalText,
  teachers: z.array(z.string()).default([]), // lecturer ids
});

export type SubjectSchema = z.infer<typeof subjectSchema>;

export const classSchema = z.object({
  id,
  name: z.string().trim().min(1, { message: "Class name is required!" }),
  capacity: z.coerce.number().int().min(1, { message: "Capacity is required!" }),
  gradeId: requiredId("Year of study"),
  supervisorId: optionalText,
  programmeId: optionalText,
  intake: optionalText,
});

export type ClassSchema = z.infer<typeof classSchema>;

export const teacherSchema = z.object({
  ...personBase,
  ...personalDetails,
  staffNo: optionalText,
  departmentId: optionalText,
  subjects: z.array(z.string()).optional(), // unit ids
});

export type TeacherSchema = z.infer<typeof teacherSchema>;

export const studentSchema = z.object({
  ...personBase,
  ...personalDetails,
  gradeId: requiredId("Year of study"),
  classId: requiredId("Class"),
  parentId: optionalText,
  programmeId: optionalText,
  sponsorship: z.enum(["GSS", "SSP"], { message: "Sponsorship is required!" }),
  fundingBand: z.coerce.number().int().min(1).max(10).optional().or(z.literal("")),
  kuccpsIndex: optionalText,
  status: z.enum(["active", "deferred", "suspended", "discontinued", "graduated"]).default("active"),
});

export type StudentSchema = z.infer<typeof studentSchema>;

export const parentSchema = z.object({
  ...personBase,
  phone: z
    .string()
    .trim()
    .regex(/^(\+?254|0)?[17]\d{8}$/, { message: "Use a Kenyan number, e.g. 0712345678" }),
  relationship: optionalText,
  nationalId: optionalText,
});

export type ParentSchema = z.infer<typeof parentSchema>;

export const staffSchema = z.object({
  ...personBase,
  role: z.enum(["admin", "finance"]),
});

export type StaffSchema = z.infer<typeof staffSchema>;

export const lessonSchema = z
  .object({
    id,
    name: z.string().trim().min(1, { message: "Lesson name is required!" }),
    day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]),
    startTime: time,
    endTime: time,
    venue: optionalText,
    subjectId: requiredId("Unit"),
    classId: requiredId("Class"),
    teacherId: requiredId("Lecturer"),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type LessonSchema = z.infer<typeof lessonSchema>;

export const examSchema = z
  .object({
    id,
    title: z.string().trim().min(1, { message: "Title is required!" }),
    kind: z.enum(["main", "supplementary", "special"]).default("main"),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    venue: optionalText,
    maxScore: z.coerce.number().int().min(1).max(1000).default(100),
    lessonId: requiredId("Lesson"),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type ExamSchema = z.infer<typeof examSchema>;

export const assignmentSchema = z
  .object({
    id,
    title: z.string().trim().min(1, { message: "Title is required!" }),
    kind: z.enum(["cat", "assignment"]).default("cat"),
    startDate: z.coerce.date({ message: "Start date is required!" }),
    dueDate: z.coerce.date({ message: "Due date is required!" }),
    maxScore: z.coerce.number().int().min(1).max(1000).default(30),
    lessonId: requiredId("Lesson"),
  })
  .refine((d) => d.dueDate >= d.startDate, {
    message: "Due date must be on or after the start date",
    path: ["dueDate"],
  });

export type AssignmentSchema = z.infer<typeof assignmentSchema>;

export const resultSchema = z.object({
  id,
  assessment: requiredId("Assessment"), // "exam:<id>" or "assignment:<id>"
  studentId: requiredId("Student"),
  score: z.coerce.number().min(0, { message: "Score cannot be negative" }),
});

export type ResultSchema = z.infer<typeof resultSchema>;

export const eventSchema = z
  .object({
    id,
    title: z.string().trim().min(1, { message: "Title is required!" }),
    description: z.string().trim().min(1, { message: "Description is required!" }),
    startTime: z.coerce.date({ message: "Start time is required!" }),
    endTime: z.coerce.date({ message: "End time is required!" }),
    classId: optionalText,
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export type EventSchema = z.infer<typeof eventSchema>;

export const announcementSchema = z.object({
  id,
  title: z.string().trim().min(1, { message: "Title is required!" }),
  description: z.string().trim().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: optionalText,
});

export type AnnouncementSchema = z.infer<typeof announcementSchema>;

export const facultySchema = z.object({
  id,
  code: z.string().trim().min(1, { message: "Code is required!" }),
  name: z.string().trim().min(1, { message: "Name is required!" }),
});

export type FacultySchema = z.infer<typeof facultySchema>;

export const departmentSchema = facultySchema.extend({
  facultyId: requiredId("Faculty or school"),
});

export type DepartmentSchema = z.infer<typeof departmentSchema>;

export const programmeSchema = z.object({
  id,
  code: z.string().trim().min(1, { message: "Code is required!" }),
  name: z.string().trim().min(1, { message: "Name is required!" }),
  level: z.enum(["certificate", "diploma", "degree", "masters", "phd"]),
  departmentId: requiredId("Department"),
  durationYears: z.coerce.number().int().min(1).max(8),
  semestersPerYear: z.coerce.number().int().min(1).max(3).default(2),
  passMark: z.coerce.number().int().min(1).max(100).default(40),
});

export type ProgrammeSchema = z.infer<typeof programmeSchema>;

export const messageSchema = z.object({
  toId: requiredId("Recipient"),
  body: z.string().trim().min(1, { message: "Write a message" }).max(4000),
});

export type MessageSchema = z.infer<typeof messageSchema>;

export const institutionSchema = z.object({
  name: z.string().trim().min(2, { message: "Institution name is required!" }),
  shortName: z.string().trim().min(2).max(16),
  motto: optionalText,
  academicYear: z
    .string()
    .trim()
    .regex(/^\d{4}\/\d{4}$/, { message: "Use the form 2026/2027" }),
  semester: z.coerce.number().int().min(1).max(3),
  paybill: optionalText,
  bankDetails: optionalText,
  examCardThreshold: z.coerce.number().int().min(0).max(100),
  supplementaryCap: z.coerce.number().int().min(40).max(100).default(50),
});

export type InstitutionSchema = z.infer<typeof institutionSchema>;

// ---------- fees ----------

const money = z.coerce
  .number({ message: "Enter an amount" })
  .int({ message: "Whole shillings only" })
  .positive({ message: "Amount must be more than zero" })
  .max(10_000_000);

export const feeStructureSchema = z.object({
  id,
  programmeId: requiredId("Programme"),
  sponsorship: z.enum(["GSS", "SSP"]),
  gradeLevel: z.coerce.number().int().min(1).max(8),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/, { message: "Use the form 2026/2027" }),
  semester: z.coerce.number().int().min(1).max(3),
  items: z
    .array(z.object({ name: z.string().trim().min(1), amount: money }))
    .min(1, { message: "Add at least one fee item" }),
});

export type FeeStructureSchema = z.infer<typeof feeStructureSchema>;

export const paymentSubmissionSchema = z.object({
  studentId: requiredId("Student"),
  method: z.enum(["MPESA", "BANK"]),
  reference: z.string().trim().min(6, { message: "Enter the M-Pesa code or bank slip number" }).max(40),
  amount: money,
  paidOn: z.coerce.date({ message: "Date is required!" }),
});

export type PaymentSubmissionSchema = z.infer<typeof paymentSubmissionSchema>;

export const officePaymentSchema = paymentSubmissionSchema.extend({
  method: z.enum(["MPESA", "BANK", "CHEQUE", "EFT", "CASH"]),
  payer: requiredId("Payer"),
  note: optionalText,
});

export type OfficePaymentSchema = z.infer<typeof officePaymentSchema>;

export const remittanceSchema = z.object({
  payer: requiredId("Payer"),
  method: z.enum(["BANK", "CHEQUE", "EFT"]),
  reference: z.string().trim().min(3).max(60),
  receivedOn: z.coerce.date(),
  total: money,
  // One line per student: "ADMISSION_NO, AMOUNT"
  allocations: z.string().trim().min(1, { message: "Paste the beneficiary list" }),
});

export type RemittanceSchema = z.infer<typeof remittanceSchema>;
