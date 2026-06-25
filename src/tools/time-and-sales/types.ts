export type ExchangeId = "crypto-com" | "nexo-pro" | "bitunix" | "hyperliquid";

export type TradeSide = "buy" | "sell";

export type SupportedAsset = "BTC" | "ETH" | "SOL" | "SUI" | "XAU";

export type ConnectionStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "stopped"
  | "unavailable"
  | "error";

export interface NormalizedTrade {
  id: string;
  exchange: ExchangeId;
  requestedAsset: SupportedAsset;
  exchangeSymbol: string;
  timestamp: number;
  price: number;
  quantity: number;
  notional: number;
  side: TradeSide;
  raw?: unknown;
}

export interface TradeFeedAdapter {
  exchange: ExchangeId;
  connect(params: {
    asset: SupportedAsset;
    onTrade: (trade: NormalizedTrade) => void;
    onStatusChange: (status: ConnectionStatus, message?: string) => void;
    onError: (error: Error) => void;
  }): Promise<void> | void;
  disconnect(): Promise<void> | void;
  supports(asset: SupportedAsset): boolean;
  getExchangeSymbol(asset: SupportedAsset): string | null;
}

export type ExchangeSymbolMap = Record<
  ExchangeId,
  Partial<Record<SupportedAsset, string>>
>;

export type ExchangeState = {
  status: ConnectionStatus;
  message: string;
  symbol: string | null;
  lastMessageAt: number | null;
  trades: NormalizedTrade[];
};
