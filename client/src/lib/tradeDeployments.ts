import type { TradeBot, TradeEnvironment } from "@/lib/tradeData";

type StrategyMarket = "CEX" | "DEX" | "Mixed";

const STORAGE_KEY = "otter_trade_strategy_deployments_v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parsePercent(raw: string) {
  const value = Number(raw.replace("%", "").trim());
  return Number.isFinite(value) ? value : 0;
}

function formatNow() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function inferSymbol(name: string) {
  const upper = name.toUpperCase();
  if (upper.includes("BTC")) return "BTCUSDT";
  if (upper.includes("ETH")) return "ETHUSDT";
  if (upper.includes("SOL")) return "SOLUSDT";
  if (upper.includes("AVAX")) return "AVAXUSDT";
  if (upper.includes("ARB")) return "ARBUSDT";
  return "TOP50-USDT";
}

function readDeployments(): TradeBot[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function writeDeployments(items: TradeBot[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getTradeBotsWithDeployments(baseBots: TradeBot[]) {
  const deployments = readDeployments();
  const baseIds = new Set(baseBots.map((item) => item.id));
  const extra = deployments.filter((item) => !baseIds.has(item.id));
  return [...baseBots, ...extra];
}

export function getStrategyDeployment(strategyId: string, environment: TradeEnvironment) {
  return readDeployments().find(
    (item) =>
      item.environment === environment &&
      item.strategyId === strategyId
  );
}

export function deployStrategyToTrade(params: {
  strategyId: string;
  strategyName: string;
  market: StrategyMarket;
  annualReturn: string;
  winRate: string;
  environment: TradeEnvironment;
}) {
  const current = readDeployments();
  const existing = current.find(
    (item) =>
      item.environment === params.environment &&
      item.strategyId === params.strategyId
  );

  const roi = parsePercent(params.annualReturn);
  const winRate = parsePercent(params.winRate);
  const baseEquity = params.environment === "live" ? 22000 : 12000;
  const nextEquity = baseEquity * (1 + roi / 100);
  const nextUnrealized = (params.environment === "live" ? 1 : 0.65) * (nextEquity * 0.012);

  const nextBot: TradeBot = {
    id: existing?.id ?? `TRD-${params.strategyId.replace("STR-", "")}-${params.environment === "paper" ? "P" : "L"}`,
    strategyId: params.strategyId,
    strategyOrigin: "strategy",
    environment: params.environment,
    name: params.strategyName,
    symbol: inferSymbol(params.strategyName),
    market: params.market === "DEX" ? "Spot" : "Perp",
    leverage: params.environment === "live" ? "2x" : "1x",
    equity: Number(nextEquity.toFixed(2)),
    unrealizedPnl: Number(nextUnrealized.toFixed(2)),
    winRate: Number(winRate.toFixed(1)),
    updatedAt: formatNow(),
  };

  const next = existing
    ? current.map((item) => (item.id === existing.id ? nextBot : item))
    : [...current, nextBot];
  writeDeployments(next);
  return nextBot;
}
