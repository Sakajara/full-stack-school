"use client";

import { setArchived } from "@/lib/actions";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { FormContainerProps, FormTable } from "./FormContainer";

// USE LAZY LOADING

const loading = () => <h1>Loading...</h1>;
const TeacherForm = dynamic(() => import("./forms/TeacherForm"), { loading });
const StudentForm = dynamic(() => import("./forms/StudentForm"), { loading });
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), { loading });
const ClassForm = dynamic(() => import("./forms/ClassForm"), { loading });
const ExamForm = dynamic(() => import("./forms/ExamForm"), { loading });
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), { loading });
const LessonForm = dynamic(() => import("./forms/LessonForm"), { loading });
const ParentForm = dynamic(() => import("./forms/ParentForm"), { loading });
const ResultForm = dynamic(() => import("./forms/ResultForm"), { loading });
const EventForm = dynamic(() => import("./forms/EventForm"), { loading });
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), { loading });
const AttendanceForm = dynamic(() => import("./forms/AttendanceForm"), { loading });
const FacultyForm = dynamic(() => import("./forms/StructureForms").then((m) => m.FacultyForm), { loading });
const DepartmentForm = dynamic(() => import("./forms/StructureForms").then((m) => m.DepartmentForm), { loading });
const ProgrammeForm = dynamic(() => import("./forms/StructureForms").then((m) => m.ProgrammeForm), { loading });
const StaffForm = dynamic(() => import("./forms/StructureForms").then((m) => m.StaffForm), { loading });
const FeeStructureForm = dynamic(() => import("./forms/FinanceForms").then((m) => m.FeeStructureForm), { loading });
const PaymentForm = dynamic(() => import("./forms/FinanceForms").then((m) => m.PaymentForm), { loading });
const ReportPaymentForm = dynamic(() => import("./forms/FinanceForms").then((m) => m.ReportPaymentForm), { loading });
const RemittanceForm = dynamic(() => import("./forms/FinanceForms").then((m) => m.RemittanceForm), { loading });

type FormRenderer = (
  setOpen: Dispatch<SetStateAction<boolean>>,
  type: "create" | "update",
  data?: any
) => React.JSX.Element;

const forms: Record<FormTable, FormRenderer> = {
  subject: (setOpen, type, data) => <SubjectForm type={type} data={data} setOpen={setOpen} />,
  class: (setOpen, type, data) => <ClassForm type={type} data={data} setOpen={setOpen} />,
  teacher: (setOpen, type, data) => <TeacherForm type={type} data={data} setOpen={setOpen} />,
  student: (setOpen, type, data) => <StudentForm type={type} data={data} setOpen={setOpen} />,
  exam: (setOpen, type, data) => <ExamForm type={type} data={data} setOpen={setOpen} />,
  assignment: (setOpen, type, data) => <AssignmentForm type={type} data={data} setOpen={setOpen} />,
  lesson: (setOpen, type, data) => <LessonForm type={type} data={data} setOpen={setOpen} />,
  parent: (setOpen, type, data) => <ParentForm type={type} data={data} setOpen={setOpen} />,
  result: (setOpen, type, data) => <ResultForm type={type} data={data} setOpen={setOpen} />,
  attendance: (setOpen, type, data) => <AttendanceForm type={type} data={data} setOpen={setOpen} />,
  event: (setOpen, type, data) => <EventForm type={type} data={data} setOpen={setOpen} />,
  announcement: (setOpen, type, data) => <AnnouncementForm type={type} data={data} setOpen={setOpen} />,
  faculty: (setOpen, type, data) => <FacultyForm type={type} data={data} setOpen={setOpen} />,
  department: (setOpen, type, data) => <DepartmentForm type={type} data={data} setOpen={setOpen} />,
  programme: (setOpen, type, data) => <ProgrammeForm type={type} data={data} setOpen={setOpen} />,
  staff: (setOpen, type, data) => <StaffForm type={type} data={data} setOpen={setOpen} />,
  feeStructure: (setOpen, type, data) => <FeeStructureForm type={type} data={data} setOpen={setOpen} />,
  payment: (setOpen, type, data) => <PaymentForm type={type} data={data} setOpen={setOpen} />,
  reportPayment: (setOpen, type, data) => <ReportPaymentForm type={type} data={data} setOpen={setOpen} />,
  remittance: (setOpen, type, data) => <RemittanceForm type={type} data={data} setOpen={setOpen} />,
};

// Firestore collection behind each archivable table.
const collectionOf: Partial<Record<FormTable, string>> = {
  teacher: "teachers",
  student: "students",
  parent: "parents",
  subject: "subjects",
  class: "classes",
  lesson: "lessons",
  exam: "exams",
  assignment: "assignments",
  event: "events",
  announcement: "announcements",
  faculty: "faculties",
  department: "departments",
  programme: "programmes",
  staff: "admins",
  feeStructure: "feeStructures",
};

const LABEL: Partial<Record<FormTable, string>> = {
  teacher: "lecturer",
  parent: "guardian",
  subject: "unit",
  lesson: "lesson",
  feeStructure: "fee structure",
  staff: "staff account",
};

const ArchiveForm = ({
  table,
  id,
  restore,
  setOpen,
}: {
  table: FormTable;
  id: string;
  restore: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = LABEL[table] ?? table;
  const collection = collectionOf[table];
  if (!collection) return <p>This record cannot be archived.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await setArchived(collection, id, !restore);
      toast(`The ${name} has been ${restore ? "restored" : "archived"}!`);
      setOpen(false);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "permission-denied" ? "You are not allowed to do this." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="p-4 flex flex-col gap-4">
      <span className="text-center font-medium">
        {restore
          ? `Restore this ${name}?`
          : `Archive this ${name}? It will be hidden from lists${
              ["teacher", "student", "parent", "staff"].includes(table) ? " and the person will not be able to sign in" : ""
            }. Its history is kept and it can be restored later.`}
      </span>
      {error && <span className="text-red-500 text-sm text-center">{error}</span>}
      <button
        disabled={busy}
        className={`${restore ? "bg-blue-500" : "bg-red-700"} text-white py-2 px-4 rounded-md border-none w-max self-center disabled:opacity-60`}
      >
        {busy ? "Working..." : restore ? "Restore" : "Archive"}
      </button>
    </form>
  );
};

const FormModal = ({ table, type, data, id }: FormContainerProps) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : type === "restore"
      ? "bg-lamaSkyLight"
      : "bg-lamaPurple";
  const icon = type === "restore" ? "update" : type;
  const title = { create: "Create", update: "Edit", delete: "Archive", restore: "Restore" }[type];

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const body =
    (type === "delete" || type === "restore") && id ? (
      <ArchiveForm table={table} id={String(id)} restore={type === "restore"} setOpen={setOpen} />
    ) : type === "create" || type === "update" ? (
      forms[table](setOpen, type, data)
    ) : (
      "Form not found!"
    );

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
        title={title}
        aria-label={title}
      >
        <Image src={`/${icon}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start md:items-center justify-center overflow-y-auto p-2"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface p-4 rounded-md relative w-full md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] my-4">
            {body}
            <button
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
