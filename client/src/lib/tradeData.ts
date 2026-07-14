export type TradeEnvironment = "paper" | "live";
export type BotStatus = "running" | "paused";
export type TradeSide = "long" | "short";
export type TradeMarginMode = "cross" | "isolated";

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
  assetAllocation?: Array<{ asset: string; weight: number }>;
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
  leverage: string;
  marginMode: TradeMarginMode;
};

export type HistoryPositionRow = {
  id: string;
  environment: TradeEnvironment;
  symbol: string;
  market: "Perp" | "Spot";
  side: TradeSide;
  leverage: string;
  marginMode: TradeMarginMode;
  openedAt: string;
  closedAt: string;
  entryPrice: string;
  exitPrice: string;
  maxSize: string;
  closedSize: string;
  realizedPnl: number;
};

export type FillRow = {
  id: string;
  environment: TradeEnvironment;
  time: string;
  symbol: string;
  market: "Perp" | "Spot";
  action: "Open Long" | "Close Long" | "Open Short" | "Close Short";
  price: string;
  qty: string;
  value: string;
  realizedPnl?: number;
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
    assetAllocation: [
      { asset: "ETH", weight: 63.5 },
      { asset: "BTC", weight: 14 },
      { asset: "SKL", weight: 13.9 },
      { asset: "FIL", weight: 2.4 },
      { asset: "SOL", weight: 1.7 },
      { asset: "DOGE", weight: 1.2 },
      { asset: "XRP", weight: 1.05 },
      { asset: "BNB", weight: 1.05 },
      { asset: "ETC", weight: 0.82 },
      { asset: "PAXG", weight: 0.38 },
    ],
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
    leverage: "3x",
    marginMode: "cross",
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
    leverage: "3x",
    marginMode: "cross",
  },
  {
    id: "POS-5",
    environment: "paper",
    symbol: "SKLUSDT",
    side: "long",
    size: "4383507 SKL",
    entry: "0.0053686",
    mark: "0.0041180",
    pnl: -5482.05,
    margin: "1,805.13 USDT",
    leverage: "10x",
    marginMode: "cross",
  },
  {
    id: "POS-6",
    environment: "paper",
    symbol: "FILUSDT",
    side: "long",
    size: "1774.1 FIL",
    entry: "0.775602",
    mark: "0.752648",
    pnl: -40.72,
    margin: "133.53 USDT",
    leverage: "10x",
    marginMode: "cross",
  },
  {
    id: "POS-7",
    environment: "paper",
    symbol: "FILUSDT",
    side: "short",
    size: "2360.0 FIL",
    entry: "0.740996",
    mark: "0.752648",
    pnl: -27.49,
    margin: "177.62 USDT",
    leverage: "10x",
    marginMode: "cross",
  },
  {
    id: "POS-8",
    environment: "paper",
    symbol: "ETHUSDT",
    side: "long",
    size: "70.000 ETH",
    entry: "1,775.47",
    mark: "1,784.66",
    pnl: 643.35,
    margin: "6,246.30 USDT",
    leverage: "20x",
    marginMode: "cross",
  },
  {
    id: "POS-9",
    environment: "paper",
    symbol: "ETCUSDT",
    side: "long",
    size: "49.97 ETC",
    entry: "6.893",
    mark: "6.871",
    pnl: -1.11,
    margin: "34.33 USDT",
    leverage: "10x",
    marginMode: "cross",
  },
  {
    id: "POS-10",
    environment: "paper",
    symbol: "ETCUSDT",
    side: "short",
    size: "102.48 ETC",
    entry: "6.926",
    mark: "6.871",
    pnl: 5.61,
    margin: "70.41 USDT",
    leverage: "10x",
    marginMode: "cross",
  },
  {
    id: "POS-11",
    environment: "paper",
    symbol: "XRPUSDT",
    side: "long",
    size: "1260.8 XRP",
    entry: "1.0998",
    mark: "1.0681",
    pnl: -40.02,
    margin: "134.67 USDT",
    leverage: "10x",
    marginMode: "cross",
  },
  {
    id: "POS-12",
    environment: "paper",
    symbol: "PAXGUSDT",
    side: "long",
    size: "0.119 PAXG",
    entry: "4,167.4800",
    mark: "4,013.6620",
    pnl: -18.3,
    margin: "47.76 USDT",
    leverage: "10x",
    marginMode: "cross",
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
    leverage: "2x",
    marginMode: "cross",
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
    leverage: "2x",
    marginMode: "cross",
  },
];

export const tradeHistoryRows: HistoryPositionRow[] = [
  {
    id: "HIS-1",
    environment: "paper",
    symbol: "MRVLUSDT",
    market: "Perp",
    side: "long",
    leverage: "10x",
    marginMode: "cross",
    openedAt: "2026-07-14 10:15:09",
    closedAt: "2026-07-14 13:52:34",
    entryPrice: "214.78761 USDT",
    exitPrice: "220.12223 USDT",
    maxSize: "474.77 MRVL",
    closedSize: "474.77 MRVL",
    realizedPnl: 2532.72,
  },
  {
    id: "HIS-2",
    environment: "paper",
    symbol: "SKHYNIXUSDT",
    market: "Perp",
    side: "long",
    leverage: "10x",
    marginMode: "cross",
    openedAt: "2026-07-14 10:12:43",
    closedAt: "2026-07-14 12:38:38",
    entryPrice: "1,208.74322 USDT",
    exitPrice: "1,231.77727 USDT",
    maxSize: "115.00 SKHYNIX",
    closedSize: "115.00 SKHYNIX",
    realizedPnl: 2648.92,
  },
  {
    id: "HIS-3",
    environment: "paper",
    symbol: "CLUSDT",
    market: "Perp",
    side: "short",
    leverage: "10x",
    marginMode: "cross",
    openedAt: "2026-07-14 02:26:51",
    closedAt: "2026-07-14 02:26:58",
    entryPrice: "77.87000 USDT",
    exitPrice: "77.88000 USDT",
    maxSize: "642.09 CL",
    closedSize: "642.09 CL",
    realizedPnl: -6.42,
  },
  {
    id: "HIS-4",
    environment: "paper",
    symbol: "SAMSUNGUSDT",
    market: "Perp",
    side: "long",
    leverage: "10x",
    marginMode: "cross",
    openedAt: "2026-07-14 02:09:50",
    closedAt: "2026-07-14 09:33:00",
    entryPrice: "169.85482 USDT",
    exitPrice: "178.20792 USDT",
    maxSize: "676.89 SAMSUNG",
    closedSize: "676.89 SAMSUNG",
    realizedPnl: 5654.13,
  },
];

export const tradeFillRows: FillRow[] = [
  {
    id: "F-1",
    environment: "paper",
    time: "07-14 13:42:18",
    symbol: "BTCUSDT",
    market: "Perp",
    action: "Close Long",
    price: "63,420.00",
    qty: "0.12 BTC",
    value: "7,610.40 USDT",
    realizedPnl: 69,
  },
  {
    id: "F-2",
    environment: "paper",
    time: "07-14 13:18:42",
    symbol: "BTCUSDT",
    market: "Perp",
    action: "Open Long",
    price: "62,845.00",
    qty: "0.20 BTC",
    value: "12,569.00 USDT",
  },
  {
    id: "F-3",
    environment: "paper",
    time: "07-14 12:56:07",
    symbol: "ETHUSDT",
    market: "Perp",
    action: "Close Short",
    price: "3,205.00",
    qty: "1.60 ETH",
    value: "5,128.00 USDT",
    realizedPnl: -44.8,
  },
  {
    id: "F-4",
    environment: "paper",
    time: "07-14 12:31:26",
    symbol: "ETHUSDT",
    market: "Perp",
    action: "Open Short",
    price: "3,177.00",
    qty: "2.40 ETH",
    value: "7,624.80 USDT",
  },
  {
    id: "F-5",
    environment: "paper",
    time: "07-14 11:48:03",
    symbol: "SOLUSDT",
    market: "Perp",
    action: "Close Long",
    price: "147.36",
    qty: "18.50 SOL",
    value: "2,726.16 USDT",
    realizedPnl: 101.75,
  },
  {
    id: "F-6",
    environment: "paper",
    time: "07-14 10:52:41",
    symbol: "SOLUSDT",
    market: "Perp",
    action: "Open Long",
    price: "141.86",
    qty: "24.00 SOL",
    value: "3,404.64 USDT",
  },
  {
    id: "F-7",
    environment: "paper",
    time: "07-14 10:16:22",
    symbol: "DOGEUSDT",
    market: "Perp",
    action: "Close Short",
    price: "0.16620",
    qty: "32,000 DOGE",
    value: "5,318.40 USDT",
    realizedPnl: 92.8,
  },
  {
    id: "F-8",
    environment: "paper",
    time: "07-14 09:44:09",
    symbol: "DOGEUSDT",
    market: "Perp",
    action: "Open Short",
    price: "0.16910",
    qty: "32,000 DOGE",
    value: "5,411.20 USDT",
  },
  {
    id: "F-9",
    environment: "paper",
    time: "07-14 09:08:54",
    symbol: "BNBUSDT",
    market: "Perp",
    action: "Close Long",
    price: "586.70",
    qty: "6.00 BNB",
    value: "3,520.20 USDT",
    realizedPnl: -51.6,
  },
  {
    id: "F-10",
    environment: "paper",
    time: "07-14 08:36:17",
    symbol: "BNBUSDT",
    market: "Perp",
    action: "Open Long",
    price: "595.30",
    qty: "6.00 BNB",
    value: "3,571.80 USDT",
  },
  {
    id: "F-11",
    environment: "live",
    time: "04-18 13:20:31",
    symbol: "BTCUSDT",
    market: "Perp",
    action: "Open Long",
    price: "62,910",
    qty: "0.35 BTC",
    value: "22,018 USDT",
  },
  {
    id: "F-12",
    environment: "live",
    time: "04-18 13:14:25",
    symbol: "ETHUSDT",
    market: "Perp",
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
