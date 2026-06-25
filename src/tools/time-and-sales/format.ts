import type { ConnectionStatus, SupportedAsset } from "./types";

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
  currency: "USD",
  maximumFractionDigits: 1,
  notation: "compact",
  style: "currency"
});

const fullCurrencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  style: "currency"
});

export function formatTradeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const millis = date.getMilliseconds().toString().padStart(3, "0");

  return `${hours}:${minutes}:${seconds}.${millis}`;
}

export function formatPrice(value: number, asset: SupportedAsset): string {
  const decimals = asset === "SOL" || asset === "SUI" ? 4 : 2;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: Math.min(2, decimals)
  }).format(value);
}

export function formatQuantity(value: number, asset: SupportedAsset): string {
  const maximumFractionDigits = asset === "BTC" || asset === "ETH" ? 8 : 5;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

export function formatCompactNotional(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatFullNotional(value: number): string {
  return fullCurrencyFormatter.format(value);
}

export function formatThreshold(value: number): string {
  return `${compactCurrencyFormatter.format(value)} USDT`;
}

export function getStatusLabel(status: ConnectionStatus): string {
  const labels: Record<ConnectionStatus, string> = {
    connecting: "Connecting",
    error: "Error",
    live: "Live",
    reconnecting: "Reconnecting",
    stopped: "Stopped",
    unavailable: "Unavailable"
  };

  return labels[status];
}

export function getStatusDotClass(status: ConnectionStatus): string {
  if (status === "live") return "bg-emerald-500";
  if (status === "connecting" || status === "reconnecting") return "bg-amber-400";
  if (status === "error") return "bg-red-500";
  return "bg-slate-400";
}
