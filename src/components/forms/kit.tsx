"use client";

import { Timestamp } from "firebase/firestore";
import Image from "next/image";
import { Dispatch, SetStateAction, useState } from "react";
import { FieldError } from "react-hook-form";
import { toast } from "react-toastify";

export type FormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const friendly = (e: unknown) => {
  const code = (e as { code?: string })?.code;
  if (code === "permission-denied") return "You are not allowed to make this change.";
  if (code === "auth/email-already-in-use") return "That username is already taken.";
  if (code === "unavailable") return "No connection. The change will be saved when you are back online.";
  const issues = (e as { issues?: { message: string }[] })?.issues;
  if (issues?.length) return issues[0].message;
  return (e as Error)?.message ?? "Something went wrong!";
};

// Runs a create or update action, shows the outcome, and closes the form.
export const useSubmit = <T,>(
  action: (data: T) => Promise<unknown>,
  { success, setOpen }: { success: string; setOpen?: Dispatch<SetStateAction<boolean>> }
) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (data: T) => {
    setBusy(true);
    setError(null);
    try {
      await action(data);
      toast(success);
      setOpen?.(false);
      return true;
    } catch (e) {
      setError(friendly(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
};

export const FormShell = ({
  title,
  onSubmit,
  busy,
  error,
  submitLabel,
  children,
}: {
  title: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  children: React.ReactNode;
}) => (
  <form className="flex flex-col gap-8" onSubmit={onSubmit} noValidate>
    <h1 className="text-xl font-semibold">{title}</h1>
    {children}
    {error && (
      <span className="text-red-500 text-sm whitespace-pre-line" role="alert">
        {error}
      </span>
    )}
    <button disabled={busy} className="bg-blue-400 text-white p-2 rounded-md disabled:opacity-60">
      {busy ? "Saving..." : submitLabel}
    </button>
  </form>
);

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <>
    <span className="text-xs text-gray-400 font-medium">{title}</span>
    <div className="flex justify-between flex-wrap gap-4">{children}</div>
  </>
);

type Option = { value: string | number; label: string };

export const SelectField = ({
  label,
  name,
  register,
  options,
  error,
  defaultValue,
  multiple,
  placeholder,
  wide,
}: {
  label: string;
  name: string;
  register: any;
  options: Option[];
  error?: FieldError | { message?: string };
  defaultValue?: string | number | string[];
  multiple?: boolean;
  placeholder?: string;
  wide?: boolean;
}) => (
  <div className={`flex flex-col gap-2 w-full ${wide ? "" : "md:w-[30%]"}`}>
    <label className="text-xs text-gray-500" htmlFor={`f-${name}`}>
      {label}
    </label>
    <select
      id={`f-${name}`}
      multiple={multiple}
      className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-surface"
      {...register(name)}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
    >
      {!multiple && <option value="">{placeholder ?? "Select..."}</option>}
      {options.map((o) => (
        <option value={o.value} key={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    {multiple && <p className="text-[11px] text-gray-400">Hold Ctrl (or Cmd) to choose several.</p>}
    {error?.message && <p className="text-xs text-red-400">{error.message.toString()}</p>}
  </div>
);

export const TextAreaField = ({
  label,
  name,
  register,
  error,
  defaultValue,
  rows = 4,
  hint,
}: {
  label: string;
  name: string;
  register: any;
  error?: FieldError;
  defaultValue?: string;
  rows?: number;
  hint?: string;
}) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-xs text-gray-500" htmlFor={`f-${name}`}>
      {label}
    </label>
    <textarea
      id={`f-${name}`}
      rows={rows}
      className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full font-mono"
      {...register(name)}
      defaultValue={defaultValue}
    />
    {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
    {error?.message && <p className="text-xs text-red-400">{error.message.toString()}</p>}
  </div>
);

// Photos are shrunk in the browser to a small WebP and kept in the record
// itself, because file storage is not available on Firebase's free plan.
const shrink = (file: File, size = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/webp", 0.8));
    };
    img.onerror = () => reject(new Error("That file is not an image."));
    img.src = url;
  });

export const PhotoField = ({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
}) => {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-4 w-full">
      <Image
        src={value || "/noAvatar.png"}
        alt=""
        width={48}
        height={48}
        className="w-12 h-12 rounded-full object-cover"
        unoptimized
      />
      <label className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer">
        <Image src="/upload.png" alt="" width={28} height={28} />
        <span>{value ? "Change photo" : "Upload a photo"}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setError(null);
              onChange(await shrink(file));
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        />
      </label>
      {value && (
        <button type="button" className="text-xs text-gray-400 underline" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

// Values for date and datetime-local inputs from Firestore timestamps.
export const dateInput = (t?: Timestamp | Date | null) => {
  if (!t) return undefined;
  const d = t instanceof Date ? t : t.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const dateTimeInput = (t?: Timestamp | Date | null) => {
  if (!t) return undefined;
  const d = t instanceof Date ? t : t.toDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
