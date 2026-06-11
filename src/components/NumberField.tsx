type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  suffix?: string;
  readOnly?: boolean;
  min?: number;
};

export function NumberField({
  label,
  value,
  onChange,
  helper,
  suffix,
  readOnly,
  min
}: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        <input
          className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 pr-16 text-base font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 read-only:border-slate-200 read-only:bg-slate-100 read-only:text-slate-600"
          inputMode="decimal"
          min={min}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          readOnly={readOnly}
          step="any"
          type="number"
          value={value}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-slate-400">
            {suffix}
          </span>
        )}
      </span>
      {helper && <span className="mt-2 block text-xs leading-5 text-slate-500">{helper}</span>}
    </label>
  );
}
