import React from "react";
import { InputCard } from "../../components/InputCard";
import { ModeButton } from "../../components/ModeButton";
import { NumberField } from "../../components/NumberField";
import { ResultItem } from "../../components/ResultItem";
import {
  calculatePositionAverage,
  emptyState,
  formatMoney,
  formatNumber,
  formatPrice,
  formatQuantity,
  getNextFormState,
  getNextModeState,
  getValidationIssues,
  initialState,
  numberInputValue
} from "./logic";
import type { AddMode, PositionAverageFormState } from "./types";

export function PositionAverageCalculator() {
  const [form, setForm] = React.useState<PositionAverageFormState>(initialState);
  const values = React.useMemo(() => calculatePositionAverage(form), [form]);
  const issues = React.useMemo(() => getValidationIssues(form), [form]);

  const updateField = (field: keyof PositionAverageFormState, value: string) => {
    setForm((current) => getNextFormState(current, field, value));
  };

  const setMode = (mode: AddMode) => {
    setForm((current) => getNextModeState(current, mode));
  };

  return (
    <>
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Trading position tool
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Position Average Calculator
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Estimate the impact of adding to an existing same-direction position, including
            notional, average entry, total size, and leverage-based margin.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
          onClick={() => setForm(emptyState)}
          type="button"
        >
          Reset
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[430px_minmax(360px,0.9fr)]">
        <section className="grid gap-6">
          <InputCard
            title="Current Position"
            description="Enter your existing size, average entry, and the price where the add-on is planned."
            className="w-full lg:max-w-[430px]"
          >
            <div className="grid gap-4 sm:grid-cols-[180px_180px]">
              <NumberField
                label="Current quantity"
                value={form.currentQuantity}
                onChange={(value) => updateField("currentQuantity", value)}
                helper="Amount already held."
                min={0}
              />
              <NumberField
                label="Average entry price"
                value={form.currentAveragePrice}
                onChange={(value) => updateField("currentAveragePrice", value)}
                helper="Current average before adding."
                suffix="USDT"
                min={0.01}
              />
              <NumberField
                label="Market or averaging price"
                value={form.averagingPrice}
                onChange={(value) => updateField("averagingPrice", value)}
                helper="Used as the add-on execution price."
                suffix="USDT"
                min={0.01}
              />
              <NumberField
                label="Leverage"
                value={form.leverage}
                onChange={(value) => updateField("leverage", value)}
                helper="Used for margin estimates."
                suffix="x"
                min={0.01}
              />
            </div>
          </InputCard>

          <InputCard
            title="Add To Position"
            description="Choose whether quantity or notional drives the add-on calculation."
            className="w-full lg:max-w-[430px]"
          >
            <div className="mb-5 grid w-full max-w-[376px] grid-cols-2 rounded-lg bg-slate-100 p-1">
              <ModeButton active={form.addMode === "quantity"} onClick={() => setMode("quantity")}>
                Add by quantity
              </ModeButton>
              <ModeButton active={form.addMode === "notional"} onClick={() => setMode("notional")}>
                Add by notional
              </ModeButton>
            </div>
            <div className="grid gap-4 sm:grid-cols-[180px_180px]">
              <NumberField
                label="Additional quantity"
                value={
                  form.addMode === "quantity"
                    ? form.additionalQuantity
                    : values.additionalQuantity
                      ? numberInputValue(values.additionalQuantity, 2)
                      : ""
                }
                onChange={(value) => updateField("additionalQuantity", value)}
                helper={form.addMode === "quantity" ? "This field is the source." : "Calculated from notional."}
                readOnly={form.addMode === "notional"}
                min={0}
              />
              <NumberField
                label="Additional notional"
                value={
                  form.addMode === "notional"
                    ? form.additionalNotional
                    : values.additionalNotional
                      ? numberInputValue(values.additionalNotional, 0)
                      : ""
                }
                onChange={(value) => updateField("additionalNotional", value)}
                helper={form.addMode === "notional" ? "This field is the source." : "Calculated from quantity."}
                readOnly={form.addMode === "quantity"}
                suffix="USDT"
                min={0}
              />
            </div>
          </InputCard>

          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 lg:max-w-[430px]">
            This assumes adding to the same direction position. It does not handle reducing,
            closing, flipping direction, liquidation price, fees, funding, maintenance margin,
            or exchange-specific margin rules.
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft lg:sticky lg:top-6 lg:self-start">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Results Summary</h2>
              <p className="mt-1 text-sm text-slate-500">Live calculations from the inputs.</p>
            </div>
            <div className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white">
              {formatNumber(values.leverage, 2)}x
            </div>
          </div>

          {issues.length > 0 && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              {issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}

          <div className="grid gap-3">
            <ResultItem
              label="New Average Entry Price"
              value={formatPrice(values.newAveragePrice, 4)}
              helper={`${formatNumber(values.averageDifference, 4)} USDT change, ${formatNumber(
                values.averageChangePercent,
                2
              )}%`}
              tone="primary"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <ResultItem
                label="Required Margin to Add"
                value={formatMoney(values.marginToAdd)}
                tone="accent"
              />
              <ResultItem
                label="Final Required Margin"
                value={formatMoney(values.finalMargin)}
                tone="accent"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ResultItem label="Current Notional" value={formatMoney(values.currentNotional)} />
              <ResultItem label="Current Market Value" value={formatMoney(values.currentMarketValue)} />
              <ResultItem label="Additional Quantity" value={formatQuantity(values.additionalQuantity)} />
              <ResultItem label="Additional Notional" value={formatMoney(values.additionalNotional)} />
              <ResultItem label="New Total Quantity" value={formatQuantity(values.newTotalQuantity)} />
              <ResultItem label="New Total Notional" value={formatMoney(values.newTotalNotional)} />
              <ResultItem
                label="Average Price Difference"
                value={`${formatNumber(values.averageDifference, 2)} USDT`}
              />
              <ResultItem
                label="Average Entry Change"
                value={`${formatNumber(values.averageChangePercent, 2)}%`}
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
