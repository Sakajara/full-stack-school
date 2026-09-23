"use client";

import FormModal from "./FormModal";

export type FormTable =
  | "teacher"
  | "student"
  | "parent"
  | "subject"
  | "class"
  | "lesson"
  | "exam"
  | "assignment"
  | "result"
  | "attendance"
  | "event"
  | "announcement"
  | "faculty"
  | "department"
  | "programme"
  | "staff"
  | "feeStructure"
  | "payment"
  | "reportPayment"
  | "remittance";

export type FormContainerProps = {
  table: FormTable;
  // "delete" archives the record; nothing is ever hard-deleted.
  type: "create" | "update" | "delete" | "restore";
  data?: any;
  id?: number | string;
};

// Forms now load their own choices (lecturers, classes, units) live from
// Firestore, so the container simply hands over to the modal.
const FormContainer = (props: FormContainerProps) => (
  <div className="">
    <FormModal {...props} />
  </div>
);

export default FormContainer;
