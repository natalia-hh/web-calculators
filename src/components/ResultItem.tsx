export type ResultItemProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "primary" | "accent";
};

export function ResultItem({ label, value, helper, tone = "default" }: ResultItemProps) {
  const styles = {
    default: "border-slate-200 bg-slate-50",
    primary: "border-teal-200 bg-teal-50",
    accent: "border-blue-200 bg-blue-50"
  };

  return (
    <div className={`rounded-lg border p-4 ${styles[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p
        className={`mt-2 break-words font-semibold tracking-normal ${
          tone === "primary" ? "text-3xl text-teal-900" : "text-2xl text-slate-950"
        }`}
      >
        {value}
      </p>
      {helper && <p className="mt-2 text-sm text-slate-600">{helper}</p>}
    </div>
  );
}
