import type { ExchangeId, ExchangeSymbolMap, SupportedAsset } from "./types";

export const SUPPORTED_ASSETS = ["BTC", "ETH", "SOL", "SUI", "XAU"] as const;

export const EXCHANGE_IDS = [
  "crypto-com",
  "nexo-pro",
  "bitunix",
  "hyperliquid"
] as const satisfies readonly ExchangeId[];

export const EXCHANGE_LABELS: Record<ExchangeId, string> = {
  "crypto-com": "Crypto.com",
  "nexo-pro": "Nexo Pro",
  bitunix: "Bitunix",
  hyperliquid: "Hyperliquid"
};

export const HIGHLIGHT_THRESHOLDS = [
  1_000,
  5_000,
  10_000,
  25_000,
  50_000,
  100_000,
  250_000,
  500_000,
  1_000_000
] as const;

export const DEFAULT_HIGHLIGHT_THRESHOLD = 10_000;

export const MAX_TRADES_PER_EXCHANGE = 200;

export const DEDUP_CACHE_LIMIT = 1_500;

export const TRADE_FLUSH_INTERVAL_MS = 75;

export const ASSET_CHANGE_DEBOUNCE_MS = 220;

export const INITIAL_SYMBOL_MAP: ExchangeSymbolMap = {
  "crypto-com": {
    BTC: "BTCUSD-PERP",
    ETH: "ETHUSD-PERP",
    SOL: "SOLUSD-PERP",
    SUI: "SUIUSD-PERP"
  },
  "nexo-pro": {},
  bitunix: {
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    SOL: "SOLUSDT",
    SUI: "SUIUSDT"
  },
  hyperliquid: {
    BTC: "BTC",
    ETH: "ETH",
    SOL: "SOL",
    SUI: "SUI"
  }
};

export const INITIAL_SYMBOL_CANDIDATES: Record<
  keyof ExchangeSymbolMap,
  Partial<Record<SupportedAsset, string[]>>
> = {
  "crypto-com": {
    BTC: ["BTCUSD-PERP", "BTCUSDT-PERP"],
    ETH: ["ETHUSD-PERP", "ETHUSDT-PERP"],
    SOL: ["SOLUSD-PERP", "SOLUSDT-PERP"],
    SUI: ["SUIUSD-PERP", "SUIUSDT-PERP"],
    XAU: ["XAUUSD-PERP", "XAUUSDT-PERP", "XAUTUSD-PERP"]
  },
  "nexo-pro": {
    BTC: ["BTC_USDT", "BTCUSDT"],
    ETH: ["ETH_USDT", "ETHUSDT"],
    SOL: ["SOL_USDT", "SOLUSDT"],
    SUI: ["SUI_USDT", "SUIUSDT"],
    XAU: ["XAU_USDT", "XAUUSDT", "XAUT_USDT"]
  },
  bitunix: {
    BTC: ["BTCUSDT"],
    ETH: ["ETHUSDT"],
    SOL: ["SOLUSDT"],
    SUI: ["SUIUSDT"],
    XAU: ["XAUUSDT", "XAUTUSDT"]
  },
  hyperliquid: {
    BTC: ["BTC"],
    ETH: ["ETH"],
    SOL: ["SOL"],
    SUI: ["SUI"],
    XAU: ["XAU", "GOLD"]
  }
};

export const SUPPORTED_ASSET_LABELS: Record<SupportedAsset, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
  SUI: "SUI",
  XAU: "XAU"
};
