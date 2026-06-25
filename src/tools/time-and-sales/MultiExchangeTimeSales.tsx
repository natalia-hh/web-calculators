import React from "react";
import {
  DEFAULT_HIGHLIGHT_THRESHOLD,
  EXCHANGE_IDS,
  EXCHANGE_LABELS,
  HIGHLIGHT_THRESHOLDS,
  SUPPORTED_ASSETS
} from "./config";
import {
  formatCompactNotional,
  formatFullNotional,
  formatPrice,
  formatQuantity,
  formatThreshold,
  formatTradeTime,
  getStatusDotClass,
  getStatusLabel
} from "./format";
import { useTimeAndSalesFeeds } from "./useTimeAndSalesFeeds";
import type { ExchangeId, ExchangeState, NormalizedTrade, SupportedAsset } from "./types";

function SelectControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  formatOption
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  formatOption: (value: T) => string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        onChange={(event) => {
          const nextValue =
            typeof value === "number" ? Number(event.target.value) : event.target.value;
          onChange(nextValue as T);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={String(option)} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function TradeRow({
  trade,
  asset,
  isLarge
}: {
  trade: NormalizedTrade;
  asset: SupportedAsset;
  isLarge: boolean;
}) {
  const sideClass = trade.side === "buy" ? "text-emerald-700" : "text-red-700";
  const largeClass =
    trade.side === "buy" ? "bg-emerald-50 ring-1 ring-emerald-100" : "bg-red-50 ring-1 ring-red-100";

  return (
    <div
      className={`grid grid-cols-[86px_minmax(78px,1fr)_minmax(66px,0.75fr)_minmax(70px,0.75fr)_50px] items-center gap-2 rounded-md px-2 py-1.5 text-xs tabular-nums ${
        isLarge ? largeClass : "hover:bg-slate-50"
      }`}
      title={new Date(trade.timestamp).toISOString()}
    >
      <span className="font-mono text-slate-500">{formatTradeTime(trade.timestamp)}</span>
      <span className="truncate text-right font-mono font-semibold text-slate-950">
        {formatPrice(trade.price, asset)}
      </span>
      <span className="truncate text-right font-mono text-slate-700">
        {formatQuantity(trade.quantity, asset)}
      </span>
      <span
        className="truncate text-right font-mono text-slate-700"
        title={formatFullNotional(trade.notional)}
      >
        {formatCompactNotional(trade.notional)}
      </span>
      <span className={`text-right font-mono font-bold uppercase ${sideClass}`}>{trade.side}</span>
    </div>
  );
}

function ExchangePanel({
  asset,
  exchange,
  state,
  threshold
}: {
  asset: SupportedAsset;
  exchange: ExchangeId;
  state: ExchangeState;
  threshold: number;
}) {
  return (
    <section className="flex min-h-[520px] min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950">{EXCHANGE_LABELS[exchange]}</h2>
          <p className="mt-1 truncate font-mono text-xs font-semibold text-slate-500">
            {state.symbol ?? "Not available"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
          <span className={`h-2 w-2 rounded-full ${getStatusDotClass(state.status)}`} />
          {getStatusLabel(state.status)}
        </span>
      </div>

      <div className="mb-3 min-h-[38px] text-xs leading-5 text-slate-500">
        <p>{state.message}</p>
        <p className="font-mono tabular-nums">
          Last message: {state.lastMessageAt ? formatTradeTime(state.lastMessageAt) : "none"}
        </p>
      </div>

      <div className="grid grid-cols-[86px_minmax(78px,1fr)_minmax(66px,0.75fr)_minmax(70px,0.75fr)_50px] gap-2 border-y border-slate-200 px-2 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Notional</span>
        <span className="text-right">Side</span>
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
        {state.trades.length > 0 ? (
          <div className="grid gap-1">
            {state.trades.map((trade) => (
              <TradeRow
                asset={asset}
                isLarge={trade.notional >= threshold}
                key={trade.id}
                trade={trade}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm leading-6 text-slate-500">
            {state.status === "unavailable"
              ? state.message
              : "Waiting for public market trades."}
          </div>
        )}
      </div>
    </section>
  );
}

export function MultiExchangeTimeSales() {
  const { asset, clear, exchangeStates, isRunning, setAsset, start, stop } = useTimeAndSalesFeeds();
  const [threshold, setThreshold] = React.useState<number>(DEFAULT_HIGHLIGHT_THRESHOLD);

  return (
    <>
      <header className="flex w-full flex-col gap-5 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">
            Market tape
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            Multi-Exchange Time & Sales
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Live public market trades across four venues with one global ticker and notional
            highlight threshold.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-end gap-3">
          <SelectControl
            formatOption={(value) => value}
            label="Ticker"
            onChange={(value) => setAsset(value)}
            options={SUPPORTED_ASSETS}
            value={asset}
          />
          <SelectControl
            formatOption={(value) => formatThreshold(value)}
            label="Highlight notional"
            onChange={(value) => setThreshold(value)}
            options={HIGHLIGHT_THRESHOLDS}
            value={threshold}
          />
          <button
            className={`inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold shadow-sm transition ${
              isRunning
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100"
            }`}
            onClick={isRunning ? stop : start}
            type="button"
          >
            {isRunning ? "Stop" : "Start"}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-100"
            onClick={clear}
            type="button"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {EXCHANGE_IDS.map((exchange) => (
          <ExchangePanel
            asset={asset}
            exchange={exchange}
            key={exchange}
            state={exchangeStates[exchange]}
            threshold={threshold}
          />
        ))}
      </section>
    </>
  );
}
