import React from "react";
import { InputCard } from "../../components/InputCard";
import { ModeButton } from "../../components/ModeButton";
import { NumberField } from "../../components/NumberField";
import { ResultItem } from "../../components/ResultItem";
import {
  calculatePositionRiskMargin,
  emptyState,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPrice,
  formatUnits,
  getCopySummary,
  getNextFormState,
  getValidation,
  getWarnings,
  initialState
} from "./logic";
import type { Direction, PositionRiskMarginField, PositionRiskMarginFormState, PriceInputMode } from "./types";

export function PositionRiskMarginCalculator() {
  const [form, setForm] = React.useState<PositionRiskMarginFormState>(initialState);
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "failed">("idle");
  const validation = React.useMemo(() => getValidation(form), [form]);
  const values = React.useMemo(() => calculatePositionRiskMargin(form), [form]);
  const warnings = React.useMemo(() => getWarnings(values), [values]);

  const updateField = (field: PositionRiskMarginField, value: string) => {
    setCopyStatus("idle");
    setForm((current) => getNextFormState(current, field, value));
  };

  const setDirection = (direction: Direction) => {
    updateField("direction", direction);
  };

  const setPriceMode = (field: "takeProfitMode" | "stopLossMode", mode: PriceInputMode) => {
    updateField(field, mode);
  };

  const copySummary = async () => {
    if (!values) return;

    try {
      await navigator.clipboard.writeText(getCopySummary(values));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  return (
    <>
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            Crypto futures tool
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Position Risk / Margin Calculator
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Size a futures position from account risk or enter position size directly. Fees,
            stop distance, margin, reward, break-even, and approximate liquidation are updated live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
            onClick={() => {
              setCopyStatus("idle");
              setForm(emptyState);
            }}
            type="button"
          >
            Clear
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
            onClick={() => {
              setCopyStatus("idle");
              setForm(initialState);
            }}
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section className="grid gap-6">
          <InputCard
            title="Account / Risk"
            description="Risk % and Position Size are both editable; the last edited one drives the other."
            className="w-full lg:max-w-[430px]"
          >
            <div className="grid gap-4">
              <NumberField
                label="Account Size"
                value={form.accountSize}
                onChange={(value) => updateField("accountSize", value)}
                helper="Wallet or account balance used for risk sizing."
                suffix="USDT"
                min={0.01}
                invalid={validation.invalidFields.accountSize}
              />
              <div className="grid gap-4 sm:grid-cols-[180px_180px]">
                <NumberField
                  label="Position Size"
                  value={form.positionSize}
                  onChange={(value) => updateField("positionSize", value)}
                  helper="When edited, Risk % is recalculated."
                  suffix="USDT"
                  min={0.01}
                  invalid={validation.invalidFields.positionSize}
                />
                <NumberField
                  label="Risk"
                  value={form.riskPercent}
                  onChange={(value) => updateField("riskPercent", value)}
                  helper="When edited, Position Size is recalculated."
                  suffix="%"
                  min={0.01}
                  invalid={validation.invalidFields.riskPercent}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[180px_180px]">
                <NumberField
                  label="Maintenance Margin Rate"
                  value={form.maintenanceMarginRate}
                  onChange={(value) => updateField("maintenanceMarginRate", value)}
                  helper="Simplified liquidation estimate input."
                  suffix="%"
                  min={0}
                  invalid={validation.invalidFields.maintenanceMarginRate}
                />
                <NumberField
                  label="Leverage"
                  value={form.leverage}
                  onChange={(value) => updateField("leverage", value)}
                  helper="Used for margin and liquidation estimate."
                  suffix="x"
                  min={0.01}
                  invalid={validation.invalidFields.leverage}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-[180px_180px]">
                <NumberField
                  label="Entry Fee"
                  value={form.entryFeeRate}
                  onChange={(value) => updateField("entryFeeRate", value)}
                  helper="Charged on entry notional."
                  suffix="%"
                  min={0}
                  invalid={validation.invalidFields.entryFeeRate}
                />
                <NumberField
                  label="Exit Fee"
                  value={form.exitFeeRate}
                  onChange={(value) => updateField("exitFeeRate", value)}
                  helper="Charged on TP and SL exit notional."
                  suffix="%"
                  min={0}
                  invalid={validation.invalidFields.exitFeeRate}
                />
              </div>
            </div>
          </InputCard>

          <InputCard
            title="Trade Setup"
            description="Choose direction, entry, and TP/SL as either prices or percentages from entry."
            className="w-full lg:max-w-[430px]"
          >
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[180px_180px]">
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Direction
                  </span>
                  <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                    <ModeButton active={form.direction === "long"} onClick={() => setDirection("long")}>
                      Long
                    </ModeButton>
                    <ModeButton active={form.direction === "short"} onClick={() => setDirection("short")}>
                      Short
                    </ModeButton>
                  </div>
                </div>
                <NumberField
                  label="Entry Price"
                  value={form.entryPrice}
                  onChange={(value) => updateField("entryPrice", value)}
                  helper="Entry price used for size, units, PnL, and liquidation."
                  suffix="USDT"
                  min={0.01}
                  invalid={validation.invalidFields.entryPrice}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[180px_180px]">
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Take Profit Mode
                  </span>
                  <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                    <ModeButton
                      active={form.takeProfitMode === "price"}
                      onClick={() => setPriceMode("takeProfitMode", "price")}
                    >
                      Price
                    </ModeButton>
                    <ModeButton
                      active={form.takeProfitMode === "percent"}
                      onClick={() => setPriceMode("takeProfitMode", "percent")}
                    >
                      %
                    </ModeButton>
                  </div>
                </div>
                <NumberField
                  label="Take Profit"
                  value={form.takeProfitValue}
                  onChange={(value) => updateField("takeProfitValue", value)}
                  helper={form.takeProfitMode === "price" ? "Direct TP price." : "Distance from entry."}
                  suffix={form.takeProfitMode === "price" ? "USDT" : "%"}
                  min={0.01}
                  invalid={validation.invalidFields.takeProfitValue}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[180px_180px]">
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Stop Loss Mode
                  </span>
                  <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                    <ModeButton
                      active={form.stopLossMode === "price"}
                      onClick={() => setPriceMode("stopLossMode", "price")}
                    >
                      Price
                    </ModeButton>
                    <ModeButton
                      active={form.stopLossMode === "percent"}
                      onClick={() => setPriceMode("stopLossMode", "percent")}
                    >
                      %
                    </ModeButton>
                  </div>
                </div>
                <NumberField
                  label="Stop Loss"
                  value={form.stopLossValue}
                  onChange={(value) => updateField("stopLossValue", value)}
                  helper={form.stopLossMode === "price" ? "Direct SL price." : "Distance from entry."}
                  suffix={form.stopLossMode === "price" ? "USDT" : "%"}
                  min={0.01}
                  invalid={validation.invalidFields.stopLossValue}
                />
              </div>
            </div>
          </InputCard>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
            Estimated liquidation price is approximate. Real exchange liquidation price may differ
            because of maintenance margin tiers, mark price, funding, fee-to-close, extra margin,
            cross/isolated margin settings, and exchange-specific rules.
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft lg:sticky lg:top-6 lg:self-start">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Results Summary</h2>
              <p className="mt-1 text-sm text-slate-500">Net values include entry and exit fees.</p>
            </div>
            <div className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white">
              {values ? `${formatNumber(values.leverage, 2)}x` : "--"}
            </div>
          </div>

          {validation.issues.length > 0 && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              {validation.issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          {!values ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Enter valid trade setup values to calculate position risk, margin, reward, and liquidation.
            </div>
          ) : (
            <div className="grid gap-3">
              <ResultItem
                label="R:R After Fees"
                value={`1 : ${formatNumber(values.rewardRiskRatio, 2, 2)}`}
                helper={`Profit in R: ${formatNumber(values.rewardRiskRatio, 2, 2)}R · Loss in R: -1R`}
                tone="accent"
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <ResultItem label="Net Profit at TP" value={formatMoney(values.netProfitAtTakeProfit)} tone="primary" />
                <ResultItem label="Net Loss at SL" value={formatMoney(values.netLossAtStopLoss)} tone="danger" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultItem label="Direction" value={values.direction === "long" ? "Long" : "Short"} />
                <ResultItem label="Account Size" value={formatMoney(values.accountSize)} />
                <ResultItem label="Risk" value={formatPercent(values.riskPercent)} />
                <ResultItem label="Risk Including Fees" value={formatMoney(values.riskAmount)} />
                <ResultItem label="Entry Price" value={formatPrice(values.entryPrice)} />
                <ResultItem label="Take Profit Price" value={formatPrice(values.takeProfitPrice)} />
                <ResultItem label="Stop Loss Price" value={formatPrice(values.stopLossPrice)} />
                <ResultItem label="Stop Loss Distance" value={formatPercent(values.stopLossDistancePercent)} />
                <ResultItem label="Position Size" value={formatMoney(values.positionSize)} />
                <ResultItem label="Position Units" value={formatUnits(values.positionUnits)} />
                <ResultItem label="Margin Size" value={formatMoney(values.marginSize)} />
                <ResultItem label="Entry Fee" value={formatMoney(values.entryFee)} />
                <ResultItem label="Exit Fee at TP" value={formatMoney(values.exitFeeAtTakeProfit)} />
                <ResultItem label="Exit Fee at SL" value={formatMoney(values.exitFeeAtStopLoss)} />
                <ResultItem label="Gross Profit at TP" value={formatMoney(values.grossProfitAtTakeProfit)} />
                <ResultItem label="Gross Loss at SL" value={formatMoney(values.grossLossAtStopLoss)} />
                <ResultItem
                  label="Break-Even Price after fees"
                  value={formatPrice(values.breakEvenPrice)}
                  helper="This is the exit price required to cover both entry and exit fees."
                />
                <ResultItem
                  label="Estimated Liquidation Price"
                  value={formatPrice(values.estimatedLiquidationPrice)}
                />
              </div>

              <button
                className="mt-2 inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!values}
                onClick={copySummary}
                type="button"
              >
                {copyStatus === "copied"
                  ? "Copied"
                  : copyStatus === "failed"
                    ? "Copy Failed"
                    : "Copy Summary"}
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
