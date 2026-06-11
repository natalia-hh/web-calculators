import React from "react";
import { PositionAverageCalculator } from "./calculators/position-average/PositionAverageCalculator";
import { PositionRiskMarginCalculator } from "./calculators/position-risk-margin/PositionRiskMarginCalculator";

type CalculatorId = "position-average" | "position-risk-margin";

const calculators = [
  {
    id: "position-average",
    label: "Position Average",
    component: PositionAverageCalculator
  },
  {
    id: "position-risk-margin",
    label: "Risk / Margin",
    component: PositionRiskMarginCalculator
  }
] satisfies Array<{
  id: CalculatorId;
  label: string;
  component: React.ComponentType;
}>;

export default function App() {
  const [activeCalculator, setActiveCalculator] = React.useState<CalculatorId>("position-average");
  const ActiveCalculator = calculators.find((calculator) => calculator.id === activeCalculator)?.component ?? PositionAverageCalculator;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <nav className="flex flex-wrap gap-2" aria-label="Calculator navigation">
          {calculators.map((calculator) => (
            <button
              className={`h-10 rounded-md px-4 text-sm font-semibold transition ${
                activeCalculator === calculator.id
                  ? "bg-slate-950 text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100"
              }`}
              key={calculator.id}
              onClick={() => setActiveCalculator(calculator.id)}
              type="button"
            >
              {calculator.label}
            </button>
          ))}
        </nav>
        <ActiveCalculator />
      </section>
    </main>
  );
}
