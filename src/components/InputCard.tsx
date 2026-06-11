import type { ReactNode } from "react";

type InputCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function InputCard({ title, description, children }: InputCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}
