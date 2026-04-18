export type TradeEnvironment = "paper" | "live";
export type BotStatus = "running" | "paused";
export type TradeSide = "long" | "short";

export type TradeBot = {
  id: string;
  strategyId?: string;
  strategyOrigin?: "strategy";
  environment: TradeEnvironment;
  name: string;
  symbol: string;
  market: "Perp" | "Spot";
  leverage: string;
  equity: number;
  unrealizedPnl: number;
  winRate: number;
  updatedAt: string;
};

export type PositionRow = {
  id: string;
  environment: TradeEnvironment;
  symbol: string;
  side: TradeSide;
  size: string;
  entry: string;
  mark: string;
  pnl: number;
  margin: string;
};

export type FillRow = {
  id: string;
  environment: TradeEnvironment;
  time: string;
  symbol: string;
  action: "Open Long" | "Close Long" | "Open Short" | "Close Short";
  price: string;
  qty: string;
  value: string;
};

export const tradeBots: TradeBot[] = [
  {
    id: "TRD-101",
    environment: "paper",
    name: "Momentum Basket v2",
    symbol: "BTCUSDT",
    market: "Perp",
    leverage: "3x",
    equity: 10245.3,
    unrealizedPnl: 142.25,
    winRate: 62.4,
    updatedAt: "2026-04-18 13:22",
  },
  {
    id: "TRD-102",
    environment: "paper",
    name: "Funding Mean Reversion",
    symbol: "ETHUSDT",
    market: "Perp",
    leverage: "2x",
    equity: 8840.6,
    unrealizedPnl: -28.7,
    winRate: 57.8,
    updatedAt: "2026-04-18 13:20",
  },
  {
    id: "TRD-103",
    environment: "paper",
    name: "Cross Section TopTail",
    symbol: "Top50 Universe",
    market: "Spot",
    leverage: "1x",
    equity: 12631.5,
    unrealizedPnl: 91.33,
    winRate: 60.1,
    updatedAt: "2026-04-18 13:18",
  },
  {
    id: "TRD-201",
    environment: "live",
    name: "BTC Basis Neutral",
    symbol: "BTCUSDT",
    market: "Perp",
    leverage: "2x",
    equity: 30542.2,
    unrealizedPnl: 214.98,
    winRate: 64.2,
    updatedAt: "2026-04-18 13:21",
  },
  {
    id: "TRD-202",
    environment: "live",
    name: "ETH Volatility Capture",
    symbol: "ETHUSDT",
    market: "Perp",
    leverage: "2x",
    equity: 24891.8,
    unrealizedPnl: -122.63,
    winRate: 55.4,
    updatedAt: "2026-04-18 13:19",
  },
];

export const tradePositionRows: PositionRow[] = [
  {
    id: "POS-1",
    environment: "paper",
    symbol: "BTCUSDT",
    side: "long",
    size: "0.43 BTC",
    entry: "62,420",
    mark: "62,910",
    pnl: 210.7,
    margin: "1,821 USDT",
  },
  {
    id: "POS-2",
    environment: "paper",
    symbol: "ETHUSDT",
    side: "short",
    size: "5.20 ETH",
    entry: "3,180",
    mark: "3,210",
    pnl: -156.0,
    margin: "2,064 USDT",
  },
  {
    id: "POS-3",
    environment: "live",
    symbol: "BTCUSDT",
    side: "long",
    size: "0.95 BTC",
    entry: "61,880",
    mark: "62,910",
    pnl: 978.5,
    margin: "5,180 USDT",
  },
  {
    id: "POS-4",
    environment: "live",
    symbol: "ETHUSDT",
    side: "long",
    size: "8.60 ETH",
    entry: "3,090",
    mark: "3,210",
    pnl: 1032.0,
    margin: "4,427 USDT",
  },
];

export const tradeFillRows: FillRow[] = [
  {
    id: "F-1",
    environment: "paper",
    time: "04-18 13:18:42",
    symbol: "BTCUSDT",
    action: "Open Long",
    price: "62,845",
    qty: "0.20 BTC",
    value: "12,569 USDT",
  },
  {
    id: "F-2",
    environment: "paper",
    time: "04-18 13:16:07",
    symbol: "ETHUSDT",
    action: "Close Short",
    price: "3,205",
    qty: "1.60 ETH",
    value: "5,128 USDT",
  },
  {
    id: "F-3",
    environment: "live",
    time: "04-18 13:20:31",
    symbol: "BTCUSDT",
    action: "Open Long",
    price: "62,910",
    qty: "0.35 BTC",
    value: "22,018 USDT",
  },
  {
    id: "F-4",
    environment: "live",
    time: "04-18 13:14:25",
    symbol: "ETHUSDT",
    action: "Open Short",
    price: "3,208",
    qty: "2.40 ETH",
    value: "7,699 USDT",
  },
];

export function formatSigned(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}
