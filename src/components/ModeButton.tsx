import type { ReactNode } from "react";

type ModeButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

export function ModeButton({ active, onClick, children }: ModeButtonProps) {
  return (
    <button
      className={`h-10 rounded-md text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
