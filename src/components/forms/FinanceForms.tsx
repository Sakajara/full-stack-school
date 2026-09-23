"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { where } from "firebase/firestore";
import { useFieldArray, useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  feeStructureSchema,
  FeeStructureSchema,
  officePaymentSchema,
  OfficePaymentSchema,
  paymentSubmissionSchema,
  PaymentSubmissionSchema,
  remittanceSchema,
  RemittanceSchema,
} from "@/lib/formValidationSchemas";
import {
  parseAllocations,
  recordPayment,
  recordRemittance,
  saveFeeStructure,
  submitPayment,
} from "@/lib/finance-actions";
import { useAuth } from "@/lib/auth-context";
import { formatKES, sum } from "@/lib/money";
import { useOptions } from "@/lib/options";
import type { Payer } from "@/lib/types";
import { dateInput, FormProps, FormShell, Section, SelectField, TextAreaField, useSubmit } from "./kit";
import { toast } from "react-toastify";

const studentLabel = (s: { name?: string; surname?: string; admissionNo?: string }) =>
  `${s.name} ${s.surname} (${s.admissionNo})`;

export const FeeStructureForm = ({ type, data, setOpen }: FormProps) => {
  const { institution } = useAuth();
  const programmes = useOptions("programmes");
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FeeStructureSchema>({
    resolver: zodResolver(feeStructureSchema),
    defaultValues: {
      id: data?.id,
      programmeId: data?.programmeId ?? "",
      sponsorship: data?.sponsorship ?? "GSS",
      gradeLevel: data?.gradeLevel ?? 1,
      academicYear: data?.academicYear ?? institution?.academicYear ?? "",
      semester: data?.semester ?? institution?.semester ?? 1,
      items: data?.items ?? [
        { name: "Tuition", amount: 0 },
        { name: "Registration", amount: 0 },
        { name: "Activity fee", amount: 0 },
        { name: "Examination", amount: 0 },
        { name: "Library", amount: 0 },
        { name: "Medical", amount: 0 },
      ],
    },
  });
  const items = useFieldArray({ control, name: "items" });
  const total = sum((watch("items") ?? []).map((i) => Number(i.amount) || 0));

  const { busy, error, run } = useSubmit(saveFeeStructure, {
    success: `Fee structure has been ${type === "create" ? "created" : "updated"}!`,
    setOpen,
  });

  if (programmes.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  const locked = type === "update";

  return (
    <FormShell
      title={type === "create" ? "Create a fee structure" : "Update the fee structure"}
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel={type === "create" ? "Create" : "Update"}
    >
      <Section title="Applies to">
        <SelectField label="Programme" name="programmeId" register={register} options={programmes.options} error={errors.programmeId} />
        <SelectField
          label="Sponsorship"
          name="sponsorship"
          register={register}
          options={[
            { value: "GSS", label: "Government sponsored" },
            { value: "SSP", label: "Self-sponsored" },
          ]}
        />
        <InputField label="Year of study" name="gradeLevel" type="number" register={register} error={errors.gradeLevel} inputProps={{ readOnly: locked }} />
        <InputField label="Academic year" name="academicYear" register={register} error={errors.academicYear} inputProps={{ readOnly: locked }} />
        <InputField label="Semester" name="semester" type="number" register={register} error={errors.semester} inputProps={{ readOnly: locked }} />
      </Section>
      <Section title="Fee items (KES, whole shillings)">
        <div className="w-full flex flex-col gap-2">
          {items.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2 items-start">
              <input
                {...register(`items.${i}.name` as const)}
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm flex-1"
                placeholder="Item"
              />
              <input
                {...register(`items.${i}.amount` as const)}
                type="number"
                min={0}
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-32"
                placeholder="Amount"
              />
              <button type="button" className="text-xs text-gray-400 underline p-2" onClick={() => items.remove(i)}>
                Remove
              </button>
            </div>
          ))}
          {errors.items && <p className="text-xs text-red-400">{errors.items.message ?? "Check the amounts: each must be more than zero."}</p>}
          <div className="flex justify-between items-center">
            <button type="button" className="text-xs underline text-gray-500" onClick={() => items.append({ name: "", amount: 0 })}>
              Add item
            </button>
            <span className="text-sm font-semibold">Total: {formatKES(total)}</span>
          </div>
        </div>
      </Section>
    </FormShell>
  );
};

// The office records money it has confirmed: counter payments, cheques,
// EFTs, or an M-Pesa payment checked on the paybill statement.
export const PaymentForm = ({ setOpen }: FormProps) => {
  const { user } = useAuth();
  const payers = useOptions<Payer & { id: string }>("payers", { label: (p) => p.name });
  const students = useOptions("students", { order: "surname", label: studentLabel });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OfficePaymentSchema>({
    resolver: zodResolver(officePaymentSchema),
    defaultValues: { method: "MPESA", payer: "household", paidOn: dateInput(new Date()) as unknown as Date },
  });
  const { busy, error, run } = useSubmit((d: OfficePaymentSchema) => recordPayment(user!.uid, d), {
    success: "Payment has been recorded!",
    setOpen,
  });
  if (payers.loading || students.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell title="Record a payment" onSubmit={handleSubmit(run)} busy={busy} error={error} submitLabel="Record">
      <div className="flex justify-between flex-wrap gap-4">
        <SelectField label="Student" name="studentId" register={register} options={students.options} error={errors.studentId} wide />
        <SelectField label="Paid by" name="payer" register={register} options={payers.options} error={errors.payer} />
        <SelectField
          label="Method"
          name="method"
          register={register}
          options={["MPESA", "BANK", "CHEQUE", "EFT", "CASH"].map((m) => ({ value: m, label: m === "MPESA" ? "M-Pesa" : m[0] + m.slice(1).toLowerCase() }))}
        />
        <InputField label="Reference (M-Pesa code, slip or cheque no.)" name="reference" register={register} error={errors.reference} />
        <InputField label="Amount (KES)" name="amount" type="number" register={register} error={errors.amount} />
        <InputField label="Date paid" name="paidOn" type="date" register={register} error={errors.paidOn} />
        <InputField label="Note" name="note" register={register} />
      </div>
    </FormShell>
  );
};

// A student or guardian reports a payment they made. The office verifies it.
export const ReportPaymentForm = ({ setOpen }: FormProps) => {
  const { user, role, institution } = useAuth();
  const children = useOptions("students", {
    filters: role === "parent" && user ? [where("parentId", "==", user.uid)] : [],
    filterKey: `parent|${user?.uid}`,
    order: "surname",
    label: studentLabel,
    enabled: role === "parent",
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentSubmissionSchema>({
    resolver: zodResolver(paymentSubmissionSchema),
    defaultValues: {
      method: "MPESA",
      studentId: role === "student" ? user?.uid : "",
      paidOn: dateInput(new Date()) as unknown as Date,
    },
  });
  const { busy, error, run } = useSubmit(
    (d: PaymentSubmissionSchema) => submitPayment(user!.uid, d),
    { success: "Payment reported. The finance office will confirm it.", setOpen }
  );
  if (role === "parent" && children.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell title="Report a fee payment" onSubmit={handleSubmit(run)} busy={busy} error={error} submitLabel="Submit">
      {institution?.paybill && (
        <p className="text-sm bg-lamaSkyLight rounded-md p-3">
          Pay by M-Pesa: Paybill <strong>{institution.paybill}</strong>, account number: the admission number.
          Then enter the confirmation code from the M-Pesa message below.
        </p>
      )}
      <div className="flex justify-between flex-wrap gap-4">
        {role === "parent" ? (
          <SelectField label="For" name="studentId" register={register} options={children.options} error={errors.studentId} wide />
        ) : (
          <input type="hidden" {...register("studentId")} />
        )}
        <SelectField
          label="Method"
          name="method"
          register={register}
          options={[
            { value: "MPESA", label: "M-Pesa" },
            { value: "BANK", label: "Bank deposit" },
          ]}
        />
        <InputField label="M-Pesa code or bank slip number" name="reference" register={register} error={errors.reference} hint="e.g. SJK4H7X2PQ" />
        <InputField label="Amount (KES)" name="amount" type="number" register={register} error={errors.amount} />
        <InputField label="Date paid" name="paidOn" type="date" register={register} error={errors.paidOn} />
      </div>
    </FormShell>
  );
};

export const RemittanceForm = ({ setOpen }: FormProps) => {
  const { user } = useAuth();
  const payers = useOptions<Payer & { id: string }>("payers", {
    filters: [where("kind", "in", ["government_scholarship", "government_loan", "bursary", "sponsor"])],
    filterKey: "institutional",
    label: (p) => p.name,
  });
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RemittanceSchema>({
    resolver: zodResolver(remittanceSchema),
    defaultValues: { method: "EFT", receivedOn: dateInput(new Date()) as unknown as Date },
  });
  const preview = parseAllocations(watch("allocations") ?? "");
  const { busy, error, run } = useSubmit(
    async (d: RemittanceSchema) => {
      const r = await recordRemittance(user!.uid, d);
      if (r.unallocated > 0) toast(`${formatKES(r.unallocated)} of the transfer is not yet allocated.`);
    },
    { success: "Transfer recorded and students credited!", setOpen }
  );
  if (payers.loading) return <p className="text-sm text-gray-400">Loading...</p>;
  return (
    <FormShell
      title="Record a HELB, Universities Fund or bursary transfer"
      onSubmit={handleSubmit(run)}
      busy={busy}
      error={error}
      submitLabel="Record and credit students"
    >
      <div className="flex justify-between flex-wrap gap-4">
        <SelectField label="From" name="payer" register={register} options={payers.options} error={errors.payer} />
        <SelectField
          label="Method"
          name="method"
          register={register}
          options={[
            { value: "EFT", label: "EFT / RTGS" },
            { value: "BANK", label: "Bank deposit" },
            { value: "CHEQUE", label: "Cheque" },
          ]}
        />
        <InputField label="Reference" name="reference" register={register} error={errors.reference} />
        <InputField label="Amount received (KES)" name="total" type="number" register={register} error={errors.total} />
        <InputField label="Date received" name="receivedOn" type="date" register={register} error={errors.receivedOn} />
        <TextAreaField
          label="Beneficiaries: one per line, admission number then amount"
          name="allocations"
          register={register}
          error={errors.allocations}
          rows={8}
          hint="Paste straight from the HELB or bursary schedule, e.g. SCT221-0001/2025, 18000"
        />
        <p className="text-xs text-gray-500 w-full">
          {preview.rows.length} students, {formatKES(sum(preview.rows.map((r) => r.amount)))} allocated
          {preview.errors.length ? `; ${preview.errors.length} line(s) need fixing: ${preview.errors.slice(0, 3).join("; ")}` : ""}
        </p>
      </div>
    </FormShell>
  );
};
