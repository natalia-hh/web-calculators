import React from "react";
import { PositionAverageCalculator } from "./calculators/position-average/PositionAverageCalculator";
import { PositionRiskMarginCalculator } from "./calculators/position-risk-margin/PositionRiskMarginCalculator";
import { MultiExchangeTimeSales } from "./tools/time-and-sales/MultiExchangeTimeSales";

type PageId = "position-average" | "position-risk-margin" | "time-and-sales";

const pages = [
  {
    id: "position-average",
    label: "Position Average",
    component: PositionAverageCalculator
  },
  {
    id: "position-risk-margin",
    label: "Risk / Margin",
    component: PositionRiskMarginCalculator
  },
  {
    id: "time-and-sales",
    label: "Time & Sales",
    component: MultiExchangeTimeSales
  }
] satisfies Array<{
  id: PageId;
  label: string;
  component: React.ComponentType;
}>;

export default function App() {
  const [activePage, setActivePage] = React.useState<PageId>("position-average");
  const ActivePage = pages.find((page) => page.id === activePage)?.component ?? PositionAverageCalculator;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex flex-wrap gap-2" aria-label="Tool navigation">
          {pages.map((page) => (
            <button
              className={`h-10 rounded-md px-4 text-sm font-semibold transition ${
                activePage === page.id
                  ? "bg-slate-950 text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100"
              }`}
              key={page.id}
              onClick={() => setActivePage(page.id)}
              type="button"
            >
              {page.label}
            </button>
          ))}
        </nav>
        <ActivePage />
      </section>
    </main>
  );
}
