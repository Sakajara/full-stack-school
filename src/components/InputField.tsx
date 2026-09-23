import { FieldError } from "react-hook-form";

type InputFieldProps = {
  label: string;
  type?: string;
  register: any;
  name: string;
  defaultValue?: string | number;
  error?: FieldError;
  hidden?: boolean;
  hint?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};

const InputField = ({
  label,
  type = "text",
  register,
  name,
  defaultValue,
  error,
  hidden,
  hint,
  inputProps,
}: InputFieldProps) => {
  return (
    <div className={hidden ? "hidden" : "flex flex-col gap-2 w-full md:w-[30%]"}>
      <label className="text-xs text-gray-500" htmlFor={`f-${name}`}>
        {label}
      </label>
      <input
        id={`f-${name}`}
        type={type}
        {...register(name)}
        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full disabled:bg-gray-50 disabled:text-gray-400"
        {...inputProps}
        defaultValue={defaultValue}
      />
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error?.message && <p className="text-xs text-red-400">{error.message.toString()}</p>}
    </div>
  );
};

export default InputField;
