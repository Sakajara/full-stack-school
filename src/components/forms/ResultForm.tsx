"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { where } from "firebase/firestore";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { resultSchema, ResultSchema } from "@/lib/formValidationSchemas";
import { saveResult } from "@/lib/actions";
import { useAuth } from "@/lib/auth-context";
import { useOptions } from "@/lib/options";
import type { Assignment, Exam } from "@/lib/types";
import { FormProps, FormShell, SelectField, useSubmit } from "./kit";

// Exams and CATs the current user may mark.
export const useMyAssessments = () => {
  const { role, user } = useAuth();
  const mine = role === "teacher" && user;
  const filters = mine ? [where("teacherId", "==", user.uid)] : [];
  const key = mine ? user.uid : "all";
  const exams = useOptions<Exam & { id: string }>("exams", { filters, filterKey: key, order: "title" });
  const assignments = useOptions<Assignment & { id: string }>("assignments", { filters, filterKey: key, order: "title" });
  const all = [
    ...exams.items.map((e) => ({ key: `exam:${e.id}`, item: e as Exam | Assignment, kind: e.kind })),
    ...assignments.items.map((a) => ({ key: `assignment:${a.id}`, item: a as Exam | Assignment, kind: a.kind })),
  ];
  return {
    loading: exams.loading || assignments.loading,
    all,
    options: all.map((a) => ({
      value: a.key,
      label: `${a.item.subjectCode ? a.item.subjectCode + " " : ""}${a.item.title} (${a.kind.toUpperCase()}) - ${a.item.className}`,
    })),
  };
};

const ResultForm = ({ type, data, setOpen }: FormProps) => {
  const assessments = useMyAssessments();
  const existing = data ? (data.examId ? `exam:${data.examId}` : `assignment:${data.assignmentId}`) : "";
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
    defaultValues: { assessment: existing, studentId: data?.studentId ?? "", score: data?.score },
  });
  const chosen = assessments.all.find((a) => a.key === watch("assessment"));
  const students = useOptions("students", {
    filters: chosen ? [where("classId", "==", chosen.item.classId)] : [],
    filterKey: chosen?.item.classId ?? "none",
    order: "surname",
    enabled: !!chosen,
    label: (s: { name?: string; surname?: string; admissionNo?: string; id: string }) =>
      `${s.name} ${s.surname} (${s.admissionNo})`,
  });

  const { busy, error, run } = useSubmit(saveResult, {
    success: `Mark has been ${type === "create" ? "recorded" : "updated"}!`,
    setOpen,
  });

  if (assessments.loading) return <p className="text-sm text-gray-400">Loading...</p>;

  return (
    <FormShell
      title={type === "create" ? "Record a mark" : "Correct a mark"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel="Save"
    >
      <p className="text-xs text-gray-400">
        To enter a whole class at once, open the assessment from Exams or CATs and use its mark sheet.
      </p>
      <div className="flex justify-between flex-wrap gap-4">
        <SelectField label="Assessment" name="assessment" register={register} options={assessments.options} error={errors.assessment} wide />
        <SelectField
          label="Student"
          name="studentId"
          register={register}
          options={students.options}
          error={errors.studentId}
          placeholder={chosen ? "Select..." : "Choose the assessment first"}
        />
        <InputField
          label={`Score${chosen ? ` (out of ${chosen.item.maxScore})` : ""}`}
          name="score"
          type="number"
          register={register}
          error={errors.score}
          inputProps={{ step: "0.5", min: 0 }}
        />
      </div>
    </FormShell>
  );
};

export default ResultForm;
