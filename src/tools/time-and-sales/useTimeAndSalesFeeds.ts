import React from "react";
import {
  ASSET_CHANGE_DEBOUNCE_MS,
  DEDUP_CACHE_LIMIT,
  EXCHANGE_IDS,
  MAX_TRADES_PER_EXCHANGE,
  TRADE_FLUSH_INTERVAL_MS
} from "./config";
import { createTradeFeedAdapters } from "./adapters";
import type {
  ConnectionStatus,
  ExchangeId,
  ExchangeState,
  NormalizedTrade,
  SupportedAsset,
  TradeFeedAdapter
} from "./types";

function createInitialExchangeState(adapters: TradeFeedAdapter[]): Record<ExchangeId, ExchangeState> {
  return EXCHANGE_IDS.reduce((states, exchange) => {
    const adapter = adapters.find((candidate) => candidate.exchange === exchange);

    states[exchange] = {
      lastMessageAt: null,
      message: "Ready.",
      status: "stopped" as ConnectionStatus,
      symbol: adapter?.getExchangeSymbol("BTC") ?? null,
      trades: []
    };

    return states;
  }, {} as Record<ExchangeId, ExchangeState>);
}

function appendDedupedTrades(
  current: NormalizedTrade[],
  incoming: NormalizedTrade[],
  seenIds: Set<string>,
  idQueue: string[]
) {
  const deduped: NormalizedTrade[] = [];

  incoming.forEach((trade) => {
    if (seenIds.has(trade.id)) return;
    seenIds.add(trade.id);
    idQueue.push(trade.id);
    deduped.push(trade);
  });

  while (idQueue.length > DEDUP_CACHE_LIMIT) {
    const oldest = idQueue.shift();
    if (oldest) seenIds.delete(oldest);
  }

  if (deduped.length === 0) return current;

  return [...deduped, ...current]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_TRADES_PER_EXCHANGE);
}

export function useTimeAndSalesFeeds() {
  const adaptersRef = React.useRef(createTradeFeedAdapters());
  const [asset, setAssetState] = React.useState<SupportedAsset>("BTC");
  const [isRunning, setIsRunning] = React.useState(true);
  const [exchangeStates, setExchangeStates] = React.useState(() =>
    createInitialExchangeState(adaptersRef.current)
  );

  const isMountedRef = React.useRef(false);
  const runningRef = React.useRef(true);
  const assetRef = React.useRef<SupportedAsset>("BTC");
  const generationRef = React.useRef(0);
  const pendingTradesRef = React.useRef<Record<ExchangeId, NormalizedTrade[]>>({
    bitunix: [],
    "crypto-com": [],
    hyperliquid: [],
    "nexo-pro": []
  });
  const dedupIdsRef = React.useRef<Record<ExchangeId, Set<string>>>({
    bitunix: new Set(),
    "crypto-com": new Set(),
    hyperliquid: new Set(),
    "nexo-pro": new Set()
  });
  const dedupQueuesRef = React.useRef<Record<ExchangeId, string[]>>({
    bitunix: [],
    "crypto-com": [],
    hyperliquid: [],
    "nexo-pro": []
  });
  const flushTimerRef = React.useRef<number | null>(null);
  const assetDebounceRef = React.useRef<number | null>(null);

  const updateExchangeState = React.useCallback(
    (exchange: ExchangeId, updater: (current: ExchangeState) => ExchangeState) => {
      if (!isMountedRef.current) return;
      setExchangeStates((current) => ({
        ...current,
        [exchange]: updater(current[exchange])
      }));
    },
    []
  );

  const flushTrades = React.useCallback(() => {
    flushTimerRef.current = null;
    if (!isMountedRef.current) return;

    setExchangeStates((current) => {
      let changed = false;
      const next = { ...current };

      EXCHANGE_IDS.forEach((exchange) => {
        const incoming = pendingTradesRef.current[exchange];
        if (incoming.length === 0) return;

        pendingTradesRef.current[exchange] = [];
        const trades = appendDedupedTrades(
          current[exchange].trades,
          incoming,
          dedupIdsRef.current[exchange],
          dedupQueuesRef.current[exchange]
        );

        if (trades !== current[exchange].trades) {
          changed = true;
          next[exchange] = {
            ...current[exchange],
            lastMessageAt: incoming[0]?.timestamp ?? Date.now(),
            trades
          };
        }
      });

      return changed ? next : current;
    });
  }, []);

  const scheduleFlush = React.useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setTimeout(flushTrades, TRADE_FLUSH_INTERVAL_MS);
  }, [flushTrades]);

  const clearTradesAndDedup = React.useCallback(() => {
    EXCHANGE_IDS.forEach((exchange) => {
      pendingTradesRef.current[exchange] = [];
      dedupIdsRef.current[exchange].clear();
      dedupQueuesRef.current[exchange] = [];
    });

    setExchangeStates((current) => {
      const next = { ...current };
      EXCHANGE_IDS.forEach((exchange) => {
        next[exchange] = {
          ...current[exchange],
          lastMessageAt: null,
          trades: []
        };
      });
      return next;
    });
  }, []);

  const disconnectAll = React.useCallback((markStopped = true) => {
    adaptersRef.current.forEach((adapter) => {
      adapter.disconnect();
    });

    if (markStopped && isMountedRef.current) {
      setExchangeStates((current) => {
        const next = { ...current };
        EXCHANGE_IDS.forEach((exchange) => {
          next[exchange] = {
            ...current[exchange],
            message: "Stopped.",
            status: "stopped"
          };
        });
        return next;
      });
    }
  }, []);

  const connectAll = React.useCallback(
    (nextAsset: SupportedAsset) => {
      const generation = ++generationRef.current;
      assetRef.current = nextAsset;

      setExchangeStates((current) => {
        const next = { ...current };
        adaptersRef.current.forEach((adapter) => {
          const symbol = adapter.getExchangeSymbol(nextAsset);
          next[adapter.exchange] = {
            ...current[adapter.exchange],
            message: symbol ? "Opening public trades stream." : `${nextAsset} perpetual is not available.`,
            status: symbol ? "connecting" : "unavailable",
            symbol
          };
        });
        return next;
      });

      adaptersRef.current.forEach((adapter) => {
        adapter.connect({
          asset: nextAsset,
          onError: (error) => {
            if (generation !== generationRef.current) return;
            updateExchangeState(adapter.exchange, (current) => ({
              ...current,
              message: error.message,
              status: "error"
            }));
          },
          onStatusChange: (status, message) => {
            if (generation !== generationRef.current) return;
            updateExchangeState(adapter.exchange, (current) => ({
              ...current,
              message: message ?? current.message,
              status,
              symbol: adapter.getExchangeSymbol(nextAsset)
            }));
          },
          onTrade: (trade) => {
            if (generation !== generationRef.current || !runningRef.current) return;
            pendingTradesRef.current[adapter.exchange].push(trade);
            scheduleFlush();
          }
        });
      });
    },
    [scheduleFlush, updateExchangeState]
  );

  const start = React.useCallback(() => {
    if (assetDebounceRef.current !== null) {
      window.clearTimeout(assetDebounceRef.current);
      assetDebounceRef.current = null;
    }

    runningRef.current = true;
    setIsRunning(true);
    connectAll(assetRef.current);
  }, [connectAll]);

  const stop = React.useCallback(() => {
    if (assetDebounceRef.current !== null) {
      window.clearTimeout(assetDebounceRef.current);
      assetDebounceRef.current = null;
    }

    generationRef.current += 1;
    runningRef.current = false;
    setIsRunning(false);
    disconnectAll(true);
  }, [disconnectAll]);

  const setAsset = React.useCallback(
    (nextAsset: SupportedAsset) => {
      setAssetState(nextAsset);
      assetRef.current = nextAsset;

      generationRef.current += 1;
      disconnectAll(false);
      clearTradesAndDedup();

      if (!runningRef.current) {
        setExchangeStates((current) => {
          const next = { ...current };
          adaptersRef.current.forEach((adapter) => {
            next[adapter.exchange] = {
              ...current[adapter.exchange],
              message: "Stopped.",
              status: "stopped",
              symbol: adapter.getExchangeSymbol(nextAsset)
            };
          });
          return next;
        });
        return;
      }

      if (assetDebounceRef.current !== null) {
        window.clearTimeout(assetDebounceRef.current);
      }

      assetDebounceRef.current = window.setTimeout(() => {
        assetDebounceRef.current = null;
        connectAll(nextAsset);
      }, ASSET_CHANGE_DEBOUNCE_MS);
    },
    [clearTradesAndDedup, connectAll, disconnectAll]
  );

  React.useEffect(() => {
    isMountedRef.current = true;
    runningRef.current = true;
    connectAll(assetRef.current);

    return () => {
      isMountedRef.current = false;
      generationRef.current += 1;
      runningRef.current = false;

      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      if (assetDebounceRef.current !== null) {
        window.clearTimeout(assetDebounceRef.current);
        assetDebounceRef.current = null;
      }

      adaptersRef.current.forEach((adapter) => adapter.disconnect());
    };
  }, [connectAll]);

  return {
    asset,
    clear: clearTradesAndDedup,
    exchangeStates,
    isRunning,
    setAsset,
    start,
    stop
  };
}
