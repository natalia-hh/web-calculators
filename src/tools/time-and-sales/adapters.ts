import { INITIAL_SYMBOL_CANDIDATES, INITIAL_SYMBOL_MAP } from "./config";
import type {
  ConnectionStatus,
  ExchangeId,
  NormalizedTrade,
  SupportedAsset,
  TradeFeedAdapter,
  TradeSide
} from "./types";

type ConnectCallbacks = {
  asset: SupportedAsset;
  onTrade: (trade: NormalizedTrade) => void;
  onStatusChange: (status: ConnectionStatus, message?: string) => void;
  onError: (error: Error) => void;
};

const reconnectBaseMs = 1_000;
const reconnectMaxMs = 20_000;

function safeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === "string" && value.includes("T")) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = safeNumber(value);
  if (parsed === null) return null;
  return parsed < 10_000_000_000 ? parsed * 1_000 : parsed;
}

function buildTrade(
  exchange: ExchangeId,
  asset: SupportedAsset,
  symbol: string,
  raw: unknown,
  values: {
    id: string;
    timestamp: number;
    price: number;
    quantity: number;
    side: TradeSide;
  }
): NormalizedTrade {
  return {
    id: `${exchange}:${symbol}:${values.id}`,
    exchange,
    requestedAsset: asset,
    exchangeSymbol: symbol,
    timestamp: values.timestamp,
    price: values.price,
    quantity: values.quantity,
    notional: values.price * values.quantity,
    side: values.side,
    raw
  };
}

abstract class WebSocketTradeFeedAdapter implements TradeFeedAdapter {
  abstract exchange: ExchangeId;
  protected abstract endpoint: string;
  protected socket: WebSocket | null = null;
  protected callbacks: ConnectCallbacks | null = null;
  protected symbol: string | null = null;
  protected reconnectTimer: number | null = null;
  protected heartbeatTimer: number | null = null;
  protected manualStop = true;
  protected reconnectAttempt = 0;
  protected resolvedSymbols: Partial<Record<SupportedAsset, string | null>> = {};
  private connectionGeneration = 0;

  connect(params: ConnectCallbacks) {
    this.disconnect();
    this.manualStop = false;
    this.callbacks = params;
    this.connectionGeneration += 1;
    const generation = this.connectionGeneration;

    void this.resolveAndOpen(params.asset, generation);
  }

  private async resolveAndOpen(asset: SupportedAsset, generation: number) {
    if (!this.callbacks) return;

    this.callbacks.onStatusChange("connecting", "Checking public perpetual instrument metadata.");

    const symbol = await this.resolveSymbol(asset).catch((error: unknown) => {
      this.reportError(error);
      return this.getFallbackSymbol(asset);
    });

    if (generation !== this.connectionGeneration || this.manualStop) return;

    this.symbol = symbol;
    this.resolvedSymbols[asset] = symbol;

    if (!symbol) {
      this.callbacks.onStatusChange(
        "unavailable",
        `${asset} perpetual is not listed or not confirmed for this venue.`
      );
      return;
    }

    this.openSocket(generation, false);
  }

  disconnect() {
    this.manualStop = true;
    this.clearReconnectTimer();
    this.clearHeartbeat();

    const socket = this.socket;
    this.socket = null;

    if (socket) {
      try {
        this.sendUnsubscribe(socket);
      } catch {
        // Best-effort unsubscribe before closing the socket.
      }

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    }

    this.callbacks?.onStatusChange("stopped");
  }

  supports(asset: SupportedAsset): boolean {
    return this.getExchangeSymbol(asset) !== null;
  }

  getExchangeSymbol(asset: SupportedAsset): string | null {
    if (Object.prototype.hasOwnProperty.call(this.resolvedSymbols, asset)) {
      return this.resolvedSymbols[asset] ?? null;
    }

    return this.getFallbackSymbol(asset);
  }

  protected getFallbackSymbol(asset: SupportedAsset): string | null {
    return INITIAL_SYMBOL_MAP[this.exchange][asset] ?? null;
  }

  protected async resolveSymbol(asset: SupportedAsset): Promise<string | null> {
    return this.getFallbackSymbol(asset);
  }

  protected openSocket(generation: number, isReconnect: boolean) {
    if (!this.callbacks || !this.symbol) return;

    this.clearReconnectTimer();
    this.clearHeartbeat();
    this.callbacks.onStatusChange(isReconnect ? "reconnecting" : "connecting");

    try {
      this.socket = new WebSocket(this.endpoint);
    } catch (error) {
      this.reportError(error);
      this.scheduleReconnect(generation);
      return;
    }

    const socket = this.socket;

    socket.onopen = () => {
      if (!this.isCurrent(generation, socket)) return;
      this.reconnectAttempt = 0;
      this.callbacks?.onStatusChange("live");
      this.sendSubscribe(socket);
      this.startHeartbeat(socket);
    };

    socket.onmessage = (event) => {
      if (!this.isCurrent(generation, socket)) return;
      this.handleMessage(event.data);
    };

    socket.onerror = () => {
      if (!this.isCurrent(generation, socket)) return;
      this.reportError(new Error(`${this.exchange} WebSocket error`));
    };

    socket.onclose = () => {
      if (!this.isCurrent(generation, socket)) return;
      this.clearHeartbeat();
      this.socket = null;

      if (this.manualStop) {
        this.callbacks?.onStatusChange("stopped");
        return;
      }

      this.scheduleReconnect(generation);
    };
  }

  protected isCurrent(generation: number, socket: WebSocket): boolean {
    return generation === this.connectionGeneration && socket === this.socket && !this.manualStop;
  }

  protected scheduleReconnect(generation: number) {
    if (this.manualStop || this.reconnectTimer !== null) return;

    this.callbacks?.onStatusChange("reconnecting");
    const delay = Math.min(reconnectBaseMs * 2 ** this.reconnectAttempt, reconnectMaxMs);
    const jitter = Math.round(Math.random() * 400);
    this.reconnectAttempt += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualStop && generation === this.connectionGeneration) {
        this.openSocket(generation, true);
      }
    }, delay + jitter);
  }

  protected clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  protected clearHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  protected emitTrade(trade: NormalizedTrade | null) {
    if (trade) this.callbacks?.onTrade(trade);
  }

  protected reportError(error: unknown) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    this.callbacks?.onError(normalizedError);
  }

  protected sendJson(socket: WebSocket, payload: unknown) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  }

  protected abstract sendSubscribe(socket: WebSocket): void;
  protected abstract sendUnsubscribe(socket: WebSocket): void;
  protected abstract startHeartbeat(socket: WebSocket): void;
  protected abstract handleMessage(data: string): void;
}

export class CryptoComTradeFeedAdapter extends WebSocketTradeFeedAdapter {
  exchange = "crypto-com" as const;
  protected endpoint = "wss://stream.crypto.com/exchange/v1/market";

  protected async resolveSymbol(asset: SupportedAsset): Promise<string | null> {
    const candidates = INITIAL_SYMBOL_CANDIDATES[this.exchange][asset] ?? [];
    const response = await fetch("https://api.crypto.com/exchange/v1/public/get-instruments");
    const payload = (await response.json()) as { result?: { data?: Array<Record<string, unknown>> } };
    const instruments = payload.result?.data ?? [];
    const match = instruments.find((instrument) => {
      const symbol = String(instrument.symbol ?? "");
      const quote = String(instrument.quote_ccy ?? "");
      const base = String(instrument.base_ccy ?? "");
      const type = String(instrument.inst_type ?? "");
      const tradable = instrument.tradable;

      return (
        candidates.includes(symbol) &&
        base === asset &&
        (quote === "USD" || quote === "USDT") &&
        type === "PERPETUAL_SWAP" &&
        tradable !== false
      );
    });

    return match ? String(match.symbol) : null;
  }

  protected sendSubscribe(socket: WebSocket) {
    this.sendJson(socket, {
      id: Date.now(),
      method: "subscribe",
      params: { channels: [`trade.${this.symbol}`] }
    });
  }

  protected sendUnsubscribe(socket: WebSocket) {
    this.sendJson(socket, {
      id: Date.now(),
      method: "unsubscribe",
      params: { channels: [`trade.${this.symbol}`] }
    });
  }

  protected startHeartbeat() {
    // Crypto.com sends heartbeat messages that are answered in handleMessage.
  }

  protected handleMessage(data: string) {
    let payload: unknown;

    try {
      payload = JSON.parse(data);
    } catch {
      this.reportError(new Error("Crypto.com sent malformed JSON"));
      return;
    }

    if (!payload || typeof payload !== "object") return;
    const message = payload as Record<string, unknown>;

    if (message.method === "public/heartbeat") {
      this.sendJson(this.socket as WebSocket, {
        id: message.id,
        method: "public/respond-heartbeat"
      });
      return;
    }

    const result = message.result as Record<string, unknown> | undefined;
    const rows = result?.data;
    if (!Array.isArray(rows) || !this.callbacks || !this.symbol) return;
    const callbacks = this.callbacks;
    const symbol = this.symbol;

    rows.forEach((row, index) => {
      if (!row || typeof row !== "object") return;
      const trade = row as Record<string, unknown>;
      const price = safeNumber(trade.p);
      const quantity = safeNumber(trade.q);
      const timestamp = normalizeTimestamp(trade.t);
      const side = trade.s === "BUY" ? "buy" : trade.s === "SELL" ? "sell" : null;

      if (price === null || quantity === null || timestamp === null || side === null) return;

      this.emitTrade(
        buildTrade(this.exchange, callbacks.asset, symbol, row, {
          id: `${trade.d ?? timestamp}:${index}`,
          timestamp,
          price,
          quantity,
          side
        })
      );
    });
  }
}

export class BitunixTradeFeedAdapter extends WebSocketTradeFeedAdapter {
  exchange = "bitunix" as const;
  protected endpoint = "wss://fapi.bitunix.com/public/";

  protected async resolveSymbol(asset: SupportedAsset): Promise<string | null> {
    const candidates = INITIAL_SYMBOL_CANDIDATES[this.exchange][asset] ?? [];
    if (candidates.length === 0) return null;

    const url = new URL("https://fapi.bitunix.com/api/v1/futures/market/trading_pairs");
    url.searchParams.set("symbols", candidates.join(","));

    const response = await fetch(url);
    const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const instruments = payload.data ?? [];
    const match = instruments.find((instrument) => {
      const symbol = String(instrument.symbol ?? "");
      const base = String(instrument.base ?? "");
      const quote = String(instrument.quote ?? "");
      const status = String(instrument.symbolStatus ?? "");

      return (
        candidates.includes(symbol) &&
        base === asset &&
        quote === "USDT" &&
        status === "OPEN" &&
        instrument.isApiSupported !== false
      );
    });

    return match ? String(match.symbol) : null;
  }

  protected sendSubscribe(socket: WebSocket) {
    this.sendJson(socket, {
      op: "subscribe",
      args: [{ symbol: this.symbol, ch: "trade" }]
    });
  }

  protected sendUnsubscribe(socket: WebSocket) {
    this.sendJson(socket, {
      op: "unsubscribe",
      args: [{ symbol: this.symbol, ch: "trade" }]
    });
  }

  protected startHeartbeat(socket: WebSocket) {
    this.heartbeatTimer = window.setInterval(() => {
      this.sendJson(socket, {
        op: "ping",
        ping: Math.floor(Date.now() / 1_000)
      });
    }, 25_000);
  }

  protected handleMessage(data: string) {
    let payload: unknown;

    try {
      payload = JSON.parse(data);
    } catch {
      this.reportError(new Error("Bitunix sent malformed JSON"));
      return;
    }

    if (!payload || typeof payload !== "object") return;
    const message = payload as Record<string, unknown>;
    if (message.op === "ping" || message.op === "pong") return;

    const rows = message.data;
    if (!Array.isArray(rows) || !this.callbacks || !this.symbol) return;
    const callbacks = this.callbacks;
    const symbol = this.symbol;

    rows.forEach((row, index) => {
      if (!row || typeof row !== "object") return;
      const trade = row as Record<string, unknown>;
      const price = safeNumber(trade.p);
      const quantity = safeNumber(trade.v);
      const timestamp = normalizeTimestamp(trade.t ?? message.ts);
      const side = trade.s === "buy" ? "buy" : trade.s === "sell" ? "sell" : null;

      if (price === null || quantity === null || timestamp === null || side === null) return;

      this.emitTrade(
        buildTrade(this.exchange, callbacks.asset, symbol, row, {
          id: `${timestamp}:${price}:${quantity}:${side}:${index}`,
          timestamp,
          price,
          quantity,
          side
        })
      );
    });
  }
}

export class HyperliquidTradeFeedAdapter extends WebSocketTradeFeedAdapter {
  exchange = "hyperliquid" as const;
  protected endpoint = "wss://api.hyperliquid.xyz/ws";

  protected async resolveSymbol(asset: SupportedAsset): Promise<string | null> {
    const candidates = INITIAL_SYMBOL_CANDIDATES[this.exchange][asset] ?? [];
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      body: JSON.stringify({ type: "meta" }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = (await response.json()) as { universe?: Array<Record<string, unknown>> };
    const instruments = payload.universe ?? [];
    const match = instruments.find((instrument) => {
      const name = String(instrument.name ?? "");
      const isDelisted = instrument.isDelisted === true;
      return candidates.includes(name) && !isDelisted;
    });

    return match ? String(match.name) : null;
  }

  protected sendSubscribe(socket: WebSocket) {
    this.sendJson(socket, {
      method: "subscribe",
      subscription: { type: "trades", coin: this.symbol }
    });
  }

  protected sendUnsubscribe(socket: WebSocket) {
    this.sendJson(socket, {
      method: "unsubscribe",
      subscription: { type: "trades", coin: this.symbol }
    });
  }

  protected startHeartbeat(socket: WebSocket) {
    this.heartbeatTimer = window.setInterval(() => {
      this.sendJson(socket, { method: "ping" });
    }, 50_000);
  }

  protected handleMessage(data: string) {
    let payload: unknown;

    try {
      payload = JSON.parse(data);
    } catch {
      this.reportError(new Error("Hyperliquid sent malformed JSON"));
      return;
    }

    if (!payload || typeof payload !== "object") return;
    const message = payload as Record<string, unknown>;
    if (message.channel === "pong" || message.channel === "subscriptionResponse") return;
    if (message.channel !== "trades") return;

    const rows = message.data;
    if (!Array.isArray(rows) || !this.callbacks || !this.symbol) return;
    const callbacks = this.callbacks;
    const symbol = this.symbol;

    rows.forEach((row, index) => {
      if (!row || typeof row !== "object") return;
      const trade = row as Record<string, unknown>;
      const price = safeNumber(trade.px);
      const quantity = safeNumber(trade.sz);
      const timestamp = normalizeTimestamp(trade.time);
      const side = trade.side === "B" ? "buy" : trade.side === "A" ? "sell" : null;

      if (price === null || quantity === null || timestamp === null || side === null) return;

      this.emitTrade(
        buildTrade(this.exchange, callbacks.asset, symbol, row, {
          id: `${timestamp}:${trade.coin ?? symbol}:${trade.tid ?? index}`,
          timestamp,
          price,
          quantity,
          side
        })
      );
    });
  }
}

export class NexoProTradeFeedAdapter implements TradeFeedAdapter {
  exchange = "nexo-pro" as const;

  connect(params: ConnectCallbacks) {
    params.onStatusChange(
      "unavailable",
      "Public browser-accessible perpetual Time & Sales feed is not confirmed for Nexo Pro."
    );
  }

  disconnect() {
    return undefined;
  }

  supports() {
    return false;
  }

  getExchangeSymbol() {
    return null;
  }
}

export function createTradeFeedAdapters(): TradeFeedAdapter[] {
  return [
    new CryptoComTradeFeedAdapter(),
    new NexoProTradeFeedAdapter(),
    new BitunixTradeFeedAdapter(),
    new HyperliquidTradeFeedAdapter()
  ];
}
