/*
 * StrategyDetail — strategy backtest dashboard rebuilt into a
 * multi-panel quant research layout while preserving the top metrics block.
 */
import { useMemo, useState, type ComponentType } from "react";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { strategies } from "@/lib/mockData";
import { buildSeries, parsePercent } from "@/lib/strategyUtils";
import { deployStrategyToTrade, getStrategyDeployment } from "@/lib/tradeDeployments";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ClipboardList,
  Unplug,
  ExternalLink,
  PieChart,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";

const curveRanges = ["7D", "30D", "90D", "365D"] as const;
type CurveRange = (typeof curveRanges)[number];

const curveMeta: Record<
  CurveRange,
  {
    points: number;
    start: number;
    slope: number;
    volatility: number;
    benchmarkSlope: number;
    benchmarkVolatility: number;
    labels: string[];
  }
> = {
  "7D": {
    points: 18,
    start: 100200,
    slope: 28,
    volatility: 52,
    benchmarkSlope: 12,
    benchmarkVolatility: 18,
    labels: ["04-15", "04-17", "04-19", "04-21"],
  },
  "30D": {
    points: 30,
    start: 99500,
    slope: 44,
    volatility: 110,
    benchmarkSlope: 18,
    benchmarkVolatility: 34,
    labels: ["03-22", "03-29", "04-05", "04-12", "04-19"],
  },
  "90D": {
    points: 45,
    start: 99200,
    slope: 92,
    volatility: 185,
    benchmarkSlope: 34,
    benchmarkVolatility: 52,
    labels: ["01-22", "02-12", "03-04", "03-24", "04-14"],
  },
  "365D": {
    points: 64,
    start: 99100,
    slope: 138,
    volatility: 260,
    benchmarkSlope: 46,
    benchmarkVolatility: 70,
    labels: ["02-12", "04-14", "06-14", "08-14", "10-14", "12-14"],
  },
};

const returnMeta: Record<CurveRange, { bars: number; amplitude: number; labels: string[] }> = {
  "7D": { bars: 14, amplitude: 0.42, labels: ["04-15", "04-17", "04-19", "04-21"] },
  "30D": { bars: 30, amplitude: 0.74, labels: ["03-22", "03-29", "04-05", "04-12", "04-19"] },
  "90D": { bars: 56, amplitude: 1.18, labels: ["11-14", "11-28", "12-12", "12-26", "01-09", "01-23", "02-06"] },
  "365D": { bars: 72, amplitude: 1.34, labels: ["Apr", "Jun", "Aug", "Oct", "Dec", "Feb"] },
};

type SectionRow = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
};

type CurvePoint = {
  x: number;
  y: number;
  value: number;
};

type PreferenceSlice = {
  label: string;
  value: number;
  color: string;
};

type PositionRecord = {
  symbol: string;
  contract: "Perp";
  side: "Cross Long" | "Cross Short";
  status: "Closed";
  entryPrice: string;
  maxOpenInterest: string;
  openedAt: string;
  closedAt: string;
  pnl: string;
};

type ExchangeId = "binance" | "bybit" | "okx";
type LiveDeployView = "deploy" | "connect-list" | "connect-config";
type ConnectFlowTab = "quick" | "api";

const exchangeOptions: Array<{
  id: ExchangeId;
  label: string;
  iconText: string;
  iconClassName: string;
}> = [
  { id: "binance", label: "Binance", iconText: "BN", iconClassName: "bg-amber-400/20 text-amber-300 border-amber-400/30" },
  { id: "bybit", label: "Bybit", iconText: "BY", iconClassName: "bg-orange-400/20 text-orange-300 border-orange-400/30" },
  { id: "okx", label: "OKX", iconText: "OK", iconClassName: "bg-slate-200/20 text-slate-200 border-slate-200/30" },
];

const preferenceSlices: PreferenceSlice[] = [
  { label: "ETH", value: 14.3, color: "#7184F5" },
  { label: "BTC", value: 11.64, color: "#F0A13B" },
  { label: "WLD", value: 9.05, color: "#64D1B1" },
  { label: "CRV", value: 6.8, color: "#F5D04F" },
  { label: "WIF", value: 5.28, color: "#8A4CF1" },
  { label: "1000PEPE", value: 4.87, color: "#61C33A" },
  { label: "SUI", value: 3.91, color: "#6BA7FF" },
  { label: "BCH", value: 3.71, color: "#52C8A5" },
  { label: "BSV", value: 3.7, color: "#DAB03E" },
  { label: "APE", value: 3.57, color: "#3977F5" },
  { label: "Other", value: 33.17, color: "#667085" },
];

const positionHistory: PositionRecord[] = [
  {
    symbol: "FILUSDT",
    contract: "Perp",
    side: "Cross Short",
    status: "Closed",
    entryPrice: "0.885",
    maxOpenInterest: "451.4 FIL",
    openedAt: "2026-02-10 22:17:26",
    closedAt: "2026-02-10 23:08:11",
    pnl: "+1.35 USDT",
  },
  {
    symbol: "ICPUSDT",
    contract: "Perp",
    side: "Cross Long",
    status: "Closed",
    entryPrice: "2.375",
    maxOpenInterest: "168 ICP",
    openedAt: "2026-02-10 22:17:26",
    closedAt: "2026-02-10 23:08:08",
    pnl: "+2.52 USDT",
  },
  {
    symbol: "DOTUSDT",
    contract: "Perp",
    side: "Cross Short",
    status: "Closed",
    entryPrice: "1.278",
    maxOpenInterest: "312.8 DOT",
    openedAt: "2026-02-10 18:02:43",
    closedAt: "2026-02-10 21:44:43",
    pnl: "-2.50 USDT",
  },
  {
    symbol: "KSMUSDT",
    contract: "Perp",
    side: "Cross Long",
    status: "Closed",
    entryPrice: "4.153",
    maxOpenInterest: "96.3 KSM",
    openedAt: "2026-02-11 04:32:33",
    closedAt: "2026-02-11 11:54:24",
    pnl: "+2.82 USDT",
  },
];

function fmtSigned(value: number, fractionDigits = 2) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

function buildSeriesPoints(
  values: number[],
  width: number,
  height: number,
  padding: number,
  min: number,
  max: number
): CurvePoint[] {
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values.map((value, index) => ({
    x: padding + (index * innerWidth) / Math.max(1, values.length - 1),
    y: height - padding - ((value - min) / range) * innerHeight,
    value,
  }));
}

function pointsToPath(points: CurvePoint[]) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function pointsToArea(points: CurvePoint[], height: number, padding: number) {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${pointsToPath(points)} L ${last.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${first.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;
}

function buildReturnBars(count: number, amplitude: number) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.37) * amplitude * 0.58;
    const wobble = Math.cos(index * 0.83) * amplitude * 0.34;
    const drift = (index % 9 === 0 ? -1 : 1) * amplitude * 0.08;
    return Number((wave + wobble + drift).toFixed(3));
  });
}

function classForTone(tone?: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-emerald-400";
  if (tone === "negative") return "text-rose-400";
  return "text-foreground";
}

function positionTone(value: string) {
  return value.startsWith("-") ? "text-rose-400" : "text-emerald-400";
}

function sideClass(side: PositionRecord["side"]) {
  return side === "Cross Long"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
    : "border-rose-500/25 bg-rose-500/10 text-rose-400";
}

function TopMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="h-full w-full rounded-xl px-2 py-1.5 text-left">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-[20px] font-semibold leading-none ${classForTone(tone)}`}>{value}</div>
    </div>
  );
}

function DetailListCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  rows: SectionRow[];
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className={`text-xs font-semibold ${classForTone(row.tone)}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card h-full overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </h2>
        </div>
        {actions}
      </div>
      <div className="h-full p-4">{children}</div>
    </section>
  );
}

export default function StrategyDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const source = searchParams.get("source");
  const isOfficialLibraryView = source === "official";
  const tierParam = searchParams.get("tier");
  const strategyTier: "official" | "graduated" =
    tierParam === "graduated" ? "graduated" : "official";
  const customName = searchParams.get("name");
  const strategyFromStore = strategies.find((item) => item.id === params.id);
  const strategy = strategyFromStore ?? {
    id: params.id,
    name: customName || "Strategy Backtest",
    description: "Draft strategy generated from the guided creation flow.",
    factorCount: Number(searchParams.get("signals") || "5"),
    market: "Mixed" as const,
    annualReturn: "29.22%",
    sharpe: 1.92,
    maxDrawdown: "12.8%",
    winRate: "64.5%",
    status: "new" as const,
    subscribers: 0,
    author: "You",
    updatedAt: "2026-04-17",
    tags: ["Draft"],
  };

  const [starred, setStarred] = useState(false);
  const [deploymentVersion, setDeploymentVersion] = useState(0);
  const [curveRange, setCurveRange] = useState<CurveRange>("365D");
  const [returnsRange, setReturnsRange] = useState<CurveRange>("90D");
  const [curveHoverIndex, setCurveHoverIndex] = useState<number | null>(null);
  const [returnsHoverIndex, setReturnsHoverIndex] = useState<number | null>(null);
  const [activePreference, setActivePreference] = useState(0);
  const [isStrategyConfigOpen, setIsStrategyConfigOpen] = useState(false);
  const [isLiveDeployOpen, setIsLiveDeployOpen] = useState(false);
  const [liveDeployView, setLiveDeployView] = useState<LiveDeployView>("deploy");
  const [connectedExchangeIds, setConnectedExchangeIds] = useState<ExchangeId[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<ExchangeId | null>(null);
  const [connectExchangeId, setConnectExchangeId] = useState<ExchangeId | null>(null);
  const [connectTab, setConnectTab] = useState<ConnectFlowTab>("quick");
  const [liveCapitalInput, setLiveCapitalInput] = useState("1000");

  const strategyName = customName || strategy.name;
  const strategyId = strategy.id;
  const createdAt = searchParams.get("createdAt") || strategy.updatedAt;
  const paperDeployment = useMemo(
    () => getStrategyDeployment(strategyId, "paper"),
    [deploymentVersion, strategyId]
  );
  const liveDeployment = useMemo(
    () => getStrategyDeployment(strategyId, "live"),
    [deploymentVersion, strategyId]
  );
  const connectedExchanges = useMemo(
    () => exchangeOptions.filter((item) => connectedExchangeIds.includes(item.id)),
    [connectedExchangeIds]
  );
  const selectedExchange = useMemo(
    () => exchangeOptions.find((item) => item.id === selectedExchangeId) ?? null,
    [selectedExchangeId]
  );
  const connectingExchange = useMemo(
    () => exchangeOptions.find((item) => item.id === connectExchangeId) ?? null,
    [connectExchangeId]
  );
  const minLiveCapital = 100;
  const parsedLiveCapital = Number(liveCapitalInput);
  const isLiveCapitalNumeric = Number.isFinite(parsedLiveCapital);
  const isCapitalBelowMinimum =
    isLiveCapitalNumeric &&
    parsedLiveCapital > 0 &&
    parsedLiveCapital < minLiveCapital;
  const canSubmitLiveDeploy =
    selectedExchange !== null &&
    isLiveCapitalNumeric &&
    parsedLiveCapital >= minLiveCapital;
  const normalizeConfigValue = (value: string | null | undefined) => {
    if (!value) return null;
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return null;
    const lowered = cleaned.toLowerCase();
    if (
      lowered === "n/a" ||
      lowered === "na" ||
      lowered === "none" ||
      lowered === "not specified" ||
      lowered === "null" ||
      lowered === "undefined"
    ) {
      return null;
    }
    return cleaned;
  };
  const toReadableList = (value: string | null | undefined, splitter: RegExp) => {
    const normalized = normalizeConfigValue(value);
    if (!normalized) return null;
    const items = normalized
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
  };

  const strategyTypeRaw = normalizeConfigValue(
    searchParams.get("strategyType") ?? searchParams.get("type")
  );
  const weightingModeRaw = normalizeConfigValue(
    searchParams.get("weightMode") ?? searchParams.get("weights")
  );
  const executionSideRaw = normalizeConfigValue(
    searchParams.get("crossDirection") ?? searchParams.get("direction")
  );
  const rankValueRaw = normalizeConfigValue(searchParams.get("rankValue"));
  const rankModeRaw = normalizeConfigValue(searchParams.get("rankMode"));
  const stopLossRaw = normalizeConfigValue(
    searchParams.get("stopLoss") ?? searchParams.get("risk")
  );
  const cooldownRaw = normalizeConfigValue(searchParams.get("cooldown"));
  const symbolScopeRaw = toReadableList(
    searchParams.get("symbols") ??
      searchParams.get("symbolGroup") ??
      searchParams.get("symbol"),
    /,/
  );
  const signalSelectionRaw = toReadableList(searchParams.get("factors"), /\|/);
  const strategyConfigRows: Array<{ label: string; value: string }> = [];
  const strategyTypeKey = strategyTypeRaw?.toLowerCase().replace(/\s+/g, "-");
  const strategyTypeLabel =
    strategyTypeKey === "time-series"
      ? "Time Series"
      : strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section"
        ? "Cross Section"
        : strategyTypeRaw;
  if (strategyTypeLabel) {
    strategyConfigRows.push({ label: "Strategy Type", value: strategyTypeLabel });
  }

  if (symbolScopeRaw) {
    strategyConfigRows.push({ label: "Symbol", value: symbolScopeRaw });
  }

  if (signalSelectionRaw) {
    strategyConfigRows.push({ label: "Signal Selection", value: signalSelectionRaw });
  }

  const signalUniverseRaw = normalizeConfigValue(searchParams.get("market"));
  if (signalUniverseRaw) {
    strategyConfigRows.push({ label: "Signal Universe", value: signalUniverseRaw });
  } else if (strategyFromStore) {
    strategyConfigRows.push({ label: "Signal Universe", value: strategy.market });
  }

  const factorCountRaw = normalizeConfigValue(searchParams.get("signals"));
  if (factorCountRaw) {
    strategyConfigRows.push({ label: "Factor Count", value: factorCountRaw });
  } else if (signalSelectionRaw) {
    strategyConfigRows.push({
      label: "Factor Count",
      value: String(signalSelectionRaw.split(", ").length),
    });
  } else if (strategyFromStore) {
    strategyConfigRows.push({ label: "Factor Count", value: String(strategy.factorCount) });
  }

  if (weightingModeRaw) {
    const weightingKey = weightingModeRaw.toLowerCase();
    const weightingLabel =
      weightingKey === "equal"
        ? "Equal Weight"
        : weightingKey === "custom"
          ? "Custom Weight"
          : weightingModeRaw;
    strategyConfigRows.push({ label: "Factor Weights", value: weightingLabel });
  }

  if (executionSideRaw === "long") {
    strategyConfigRows.push({ label: "Execution Side", value: "Long-Only" });
  } else if (executionSideRaw === "short") {
    strategyConfigRows.push({ label: "Execution Side", value: "Short-Only" });
  } else if (executionSideRaw === "neutral") {
    strategyConfigRows.push({ label: "Execution Side", value: "Market-Neutral" });
  }

  if (strategyTypeKey === "cross-sectional" && rankValueRaw) {
    strategyConfigRows.push({
      label: "Top/Tail Rule",
      value: `Top/Bottom ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " instruments"}`,
    });
  }

  if (stopLossRaw) {
    strategyConfigRows.push({
      label: "Stop Loss",
      value: stopLossRaw.includes("%") ? stopLossRaw : `${stopLossRaw}%`,
    });
  }

  if (cooldownRaw) {
    const cooldownHours = cooldownRaw.match(/[\d.]+/)?.[0];
    strategyConfigRows.push({
      label: "Cooldown (hours)",
      value: cooldownHours ? `${cooldownHours} h` : cooldownRaw,
    });
  }

  const initialEquity = 438000;
  const returnRate = parsePercent(strategy.annualReturn);
  const totalReturn = (initialEquity * returnRate) / 100;
  const currentEquity = initialEquity + totalReturn;
  const drawdownPct = parsePercent(strategy.maxDrawdown);
  const peakEquity = currentEquity * 1.11;
  const minEquity = Math.max(initialEquity * (1 - Math.max(drawdownPct, 0) / 100), initialEquity * 0.5);
  const realizedPnl = totalReturn * 0.995;
  const unrealizedPnl = totalReturn - realizedPnl;
  const calmar = strategy.sharpe > 0 ? strategy.sharpe * 1.89 : 0;
  const winRate = parsePercent(strategy.winRate);
  const profitLossRatio = winRate > 0 ? (winRate / Math.max(100 - winRate, 1)) * 2.1 : 0;
  const tradingDays = 1097;
  const totalTrades = 286;
  const maxExposure = 99.73;
  const totalFees = Math.abs(totalReturn) * 0.1268;

  const fundRows: SectionRow[] = [
    {
      label: "Peak Equity",
      value: `${peakEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
    },
    {
      label: "Min Equity",
      value: `${minEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
    },
    {
      label: "Realized PnL",
      value: `${fmtSigned(realizedPnl)} USDT`,
      tone: realizedPnl >= 0 ? "positive" : "negative",
    },
    {
      label: "Unrealized PnL",
      value: `${fmtSigned(unrealizedPnl)} USDT`,
      tone: unrealizedPnl >= 0 ? "positive" : "negative",
    },
  ];

  const perfRows: SectionRow[] = [
    {
      label: "Sharpe Ratio",
      value: strategy.sharpe.toFixed(2),
      tone: strategy.sharpe >= 1 ? "positive" : "neutral",
    },
    {
      label: "Calmar Ratio",
      value: calmar.toFixed(2),
      tone: calmar >= 1 ? "positive" : "neutral",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(2)}%`,
      tone: winRate >= 50 ? "positive" : "negative",
    },
    {
      label: "Profit/Loss Ratio",
      value: profitLossRatio.toFixed(2),
      tone: profitLossRatio >= 1 ? "positive" : "neutral",
    },
  ];

  const tradeRows: SectionRow[] = [
    { label: "Trading Days", value: `${tradingDays}` },
    { label: "Total Trades", value: `${totalTrades}` },
    { label: "Max Exposure", value: `${maxExposure.toFixed(2)}%` },
    {
      label: "Total Fees",
      value: `${totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
    },
  ];

  const curveChart = useMemo(() => {
    const meta = curveMeta[curveRange];
    const width = 720;
    const height = 320;
    const padding = 22;
    const equityValues = buildSeries(meta.points, meta.start, meta.slope, meta.volatility);
    const benchmarkValues = buildSeries(
      meta.points,
      meta.start - 120,
      meta.benchmarkSlope,
      meta.benchmarkVolatility
    ).map((value, index) => Number((value - index * 4.8).toFixed(2)));
    const min = Math.min(...equityValues, ...benchmarkValues) - 80;
    const max = Math.max(...equityValues, ...benchmarkValues) + 80;
    const equityPoints = buildSeriesPoints(equityValues, width, height, padding, min, max);
    const benchmarkPoints = buildSeriesPoints(benchmarkValues, width, height, padding, min, max);
    return {
      width,
      height,
      padding,
      min,
      max,
      equityValues,
      benchmarkValues,
      equityPoints,
      benchmarkPoints,
      equityPath: pointsToPath(equityPoints),
      equityArea: pointsToArea(equityPoints, height, padding),
      benchmarkPath: pointsToPath(benchmarkPoints),
      labels: meta.labels,
    };
  }, [curveRange]);

  const curveStats = useMemo(() => {
    const equityStart = curveChart.equityValues[0];
    const equityEnd = curveChart.equityValues[curveChart.equityValues.length - 1];
    const benchmarkStart = curveChart.benchmarkValues[0];
    const benchmarkEnd = curveChart.benchmarkValues[curveChart.benchmarkValues.length - 1];
    const total = ((equityEnd - equityStart) / equityStart) * 100;
    const benchmark = ((benchmarkEnd - benchmarkStart) / benchmarkStart) * 100;
    const excess = total - benchmark;
    return { total, benchmark, excess };
  }, [curveChart]);

  const dailyReturns = useMemo(() => {
    const meta = returnMeta[returnsRange];
    return buildReturnBars(meta.bars, meta.amplitude);
  }, [returnsRange]);

  const returnSummary = useMemo(() => {
    const avg = dailyReturns.reduce((sum, value) => sum + value, 0) / Math.max(1, dailyReturns.length);
    const wins = dailyReturns.filter((value) => value > 0).length;
    const losses = dailyReturns.filter((value) => value < 0).length;
    return { avg, wins, losses };
  }, [dailyReturns]);

  const openTradePage = (environment: "paper" | "live", focusTradeId?: string) => {
    const query = new URLSearchParams({
      env: environment,
      focusStrategy: strategyId,
    });
    if (focusTradeId) query.set("focusTradeId", focusTradeId);
    window.location.assign(`/trade?${query.toString()}`);
  };

  const deployStrategy = (
    environment: "paper" | "live",
    options?: { exchangeLabel?: string; capitalUsdt?: number }
  ) => {
    deployStrategyToTrade({
      strategyId,
      strategyName,
      market: strategy.market,
      annualReturn: strategy.annualReturn,
      winRate: strategy.winRate,
      environment,
    });
    setDeploymentVersion((prev) => prev + 1);
    if (environment === "paper") {
      toast.success("Deployed to paper trading.");
      return;
    }
    if (options?.exchangeLabel && options.capitalUsdt) {
      toast.success(
        `Live deployment submitted to ${options.exchangeLabel} with ${options.capitalUsdt.toLocaleString()} USDT base capital.`
      );
      return;
    }
    toast.success("Deployed to live trading.");
  };

  const openLiveDeployModal = () => {
    if (connectedExchangeIds.length > 0 && !selectedExchangeId) {
      setSelectedExchangeId(connectedExchangeIds[0]);
    }
    setLiveDeployView("deploy");
    setConnectTab("quick");
    setIsLiveDeployOpen(true);
  };

  const goToExchangeApi = () => {
    setIsLiveDeployOpen(false);
    window.location.assign("/account?tab=exchangeApi");
  };

  const connectSelectedExchange = () => {
    if (!connectExchangeId) return;
    setConnectedExchangeIds((prev) =>
      prev.includes(connectExchangeId) ? prev : [...prev, connectExchangeId]
    );
    setSelectedExchangeId(connectExchangeId);
    setLiveDeployView("deploy");
    const exchangeLabel =
      exchangeOptions.find((item) => item.id === connectExchangeId)?.label ?? "Exchange";
    toast.success(`${exchangeLabel} connected successfully.`);
  };

  const submitLiveDeployment = () => {
    if (!selectedExchange) {
      toast.error("Select an exchange account before submitting live deployment.");
      return;
    }
    if (!isLiveCapitalNumeric || parsedLiveCapital <= 0) {
      toast.error("Enter a valid base capital amount in USDT.");
      return;
    }
    if (parsedLiveCapital < minLiveCapital) {
      toast.error(
        `Minimum activation capital is ${minLiveCapital} USDT. Deployment cannot be initiated below this threshold.`
      );
      return;
    }
    deployStrategy("live", {
      exchangeLabel: selectedExchange.label,
      capitalUsdt: parsedLiveCapital,
    });
    setIsLiveDeployOpen(false);
  };

  const tierBadgeClass =
    strategyTier === "official"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-sky-500/30 bg-sky-500/10 text-sky-400";
  const tierBadgeLabel = strategyTier === "official" ? "Official" : "Graduated";
  const activeSlice = preferenceSlices[activePreference];

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() =>
              window.location.assign(isOfficialLibraryView ? "/strategies/official" : "/strategies")
            }
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <h1 className="mt-3 text-foreground">
            {isOfficialLibraryView ? strategyName : `${strategyName} Backtest`}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isOfficialLibraryView ? (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${tierBadgeClass}`}
              >
                {tierBadgeLabel}
              </span>
            ) : null}
            <Button
              variant="outline"
              className="h-7 rounded-full border-border/70 bg-card px-3 text-[11px] font-medium text-foreground hover:bg-accent"
              onClick={() => setIsStrategyConfigOpen(true)}
            >
              View Strategy Configuration
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOfficialLibraryView ? (
            <Button
              className="h-10 rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90"
              onClick={() =>
                window.location.assign(
                  `/strategies/new?template=${encodeURIComponent(strategyId)}&creationMode=platform&scale=single`
                )
              }
            >
              Use Template
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-10 w-10 rounded-full border-border/80 bg-card p-0 text-foreground hover:bg-accent"
                onClick={() => {
                  setStarred((prev) => !prev);
                  toast.success(starred ? "Removed from favorites" : "Added to favorites");
                }}
                aria-label={starred ? "Unfavorite strategy" : "Favorite strategy"}
              >
                <Star className={`h-4 w-4 ${starred ? "fill-current text-amber-400" : ""}`} />
              </Button>
              <Button
                className="h-10 rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (paperDeployment) {
                    openTradePage("paper", paperDeployment.id);
                    return;
                  }
                  deployStrategy("paper");
                }}
              >
                {paperDeployment ? "View Paper Trade" : "Deploy to Paper Trading"}
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-lg border-border/80 bg-card px-3 text-foreground hover:bg-accent"
                onClick={() => {
                  if (liveDeployment) {
                    openTradePage("live", liveDeployment.id);
                    return;
                  }
                  openLiveDeployModal();
                }}
              >
                {liveDeployment ? "View Live Trade" : "Deploy to Live Trading"}
              </Button>
            </>
          )}
        </div>
      </div>

      <section className="surface-card space-y-6 p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <TopMetric
            label="Total Equity (USDT)"
            value={currentEquity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          />
          <TopMetric
            label="PnL (USDT)"
            value={fmtSigned(totalReturn)}
            tone={totalReturn >= 0 ? "positive" : "negative"}
          />
          <TopMetric
            label="ROI"
            value={`${fmtSigned(returnRate)}%`}
            tone={returnRate >= 0 ? "positive" : "negative"}
          />
          <TopMetric
            label="Win Rate"
            value={`${winRate.toFixed(2)}%`}
            tone={winRate >= 50 ? "positive" : "neutral"}
          />
          <TopMetric
            label="Sharpe"
            value={strategy.sharpe.toFixed(2)}
            tone={strategy.sharpe >= 1 ? "positive" : "neutral"}
          />
          <TopMetric
            label="Max Drawdown"
            value={`${Math.abs(drawdownPct).toFixed(2)}%`}
            tone="negative"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <DetailListCard title="Fund Snapshot" icon={Wallet} rows={fundRows} />
          <DetailListCard title="Performance Metrics" icon={TrendingUp} rows={perfRows} />
          <DetailListCard title="Trade Statistics" icon={ClipboardList} rows={tradeRows} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5">
        <DashboardPanel
          title="Asset Curve"
          icon={BarChart3}
          actions={
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
              {curveRanges.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setCurveRange(option);
                    setCurveHoverIndex(null);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors ${
                    option === curveRange
                      ? "border border-primary/45 bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex h-full min-h-[440px] flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <span className="text-muted-foreground">
                Total Return{" "}
                <span className={curveStats.total >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                  {fmtSigned(curveStats.total)}%
                </span>
              </span>
              <span className="text-muted-foreground">
                Excess Return{" "}
                <span className={curveStats.excess >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                  {fmtSigned(curveStats.excess)}%
                </span>
              </span>
              <span className="text-muted-foreground">
                Sharpe <span className="font-semibold text-foreground">{strategy.sharpe.toFixed(2)}</span>
              </span>
              <span className="text-muted-foreground">
                Calmar <span className="font-semibold text-foreground">{calmar.toFixed(2)}</span>
              </span>
            </div>

            <div className="relative flex-1 min-h-[300px]">
              <svg
                viewBox={`0 0 ${curveChart.width} ${curveChart.height}`}
                preserveAspectRatio="xMidYMid meet"
                className="h-full w-full"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = (event.clientX - rect.left) / rect.width;
                  const index = Math.round(
                    Math.max(0, Math.min(1, ratio)) * (curveChart.equityValues.length - 1)
                  );
                  setCurveHoverIndex(index);
                }}
                onMouseLeave={() => setCurveHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="asset-curve-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0A13B" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#F0A13B" stopOpacity="0.04" />
                  </linearGradient>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width={curveChart.width}
                  height={curveChart.height}
                  rx="16"
                  fill="rgba(11,18,32,0.55)"
                />
                {Array.from({ length: 6 }, (_, index) => (
                  <line
                    key={index}
                    x1={curveChart.padding}
                    y1={curveChart.padding + index * ((curveChart.height - curveChart.padding * 2) / 5)}
                    x2={curveChart.width - curveChart.padding}
                    y2={curveChart.padding + index * ((curveChart.height - curveChart.padding * 2) / 5)}
                    stroke="rgba(148,163,184,0.12)"
                    strokeDasharray="3 8"
                  />
                ))}
                <path d={curveChart.equityArea} fill="url(#asset-curve-fill)" />
                <path
                  d={curveChart.equityPath}
                  fill="none"
                  stroke="#F0C13B"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d={curveChart.benchmarkPath}
                  fill="none"
                  stroke="#6E82F6"
                  strokeWidth="2.3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.85"
                />
                {curveHoverIndex !== null ? (
                  <>
                    <line
                      x1={curveChart.equityPoints[curveHoverIndex].x}
                      y1={curveChart.padding}
                      x2={curveChart.equityPoints[curveHoverIndex].x}
                      y2={curveChart.height - curveChart.padding}
                      stroke="rgba(255,255,255,0.18)"
                      strokeDasharray="4 6"
                    />
                    <circle
                      cx={curveChart.equityPoints[curveHoverIndex].x}
                      cy={curveChart.equityPoints[curveHoverIndex].y}
                      r="4.5"
                      fill="#F0C13B"
                      stroke="#0B1220"
                      strokeWidth="2"
                    />
                    <circle
                      cx={curveChart.benchmarkPoints[curveHoverIndex].x}
                      cy={curveChart.benchmarkPoints[curveHoverIndex].y}
                      r="4"
                      fill="#6E82F6"
                      stroke="#0B1220"
                      strokeWidth="2"
                    />
                  </>
                ) : null}
              </svg>

              {curveHoverIndex !== null ? (
                <div
                  className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                  style={{
                    left: Math.min(
                      curveChart.equityPoints[curveHoverIndex].x / curveChart.width * 100 + 2,
                      76
                    ) + "%",
                    top: 18,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {curveMeta[curveRange].labels[Math.min(curveMeta[curveRange].labels.length - 1, Math.floor((curveHoverIndex / Math.max(1, curveChart.equityValues.length - 1)) * curveMeta[curveRange].labels.length))]}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F0C13B]" />
                    <span className="text-muted-foreground">Equity</span>
                    <span className="font-semibold text-foreground">
                      {curveChart.equityValues[curveHoverIndex].toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#6E82F6]" />
                    <span className="text-muted-foreground">Benchmark</span>
                    <span className="font-semibold text-foreground">
                      {curveChart.benchmarkValues[curveHoverIndex].toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center justify-between text-[11px] text-muted-foreground">
              {curveChart.labels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Asset Preferences" icon={PieChart}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex items-center justify-center">
              <div className="relative h-[260px] w-[260px]">
                <svg viewBox="0 0 260 260" className="h-full w-full">
                  <circle cx="130" cy="130" r="76" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="30" />
                  {(() => {
                    const circumference = 2 * Math.PI * 76;
                    let offset = 0;
                    return preferenceSlices.map((slice, index) => {
                      const length = (slice.value / 100) * circumference;
                      const node = (
                        <circle
                          key={slice.label}
                          cx="130"
                          cy="130"
                          r="76"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={activePreference === index ? 34 : 30}
                          strokeLinecap="butt"
                          strokeDasharray={`${length} ${circumference - length}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 130 130)"
                          opacity={activePreference === index ? 1 : 0.9}
                          style={{ cursor: "pointer", transition: "all 180ms ease" }}
                          onMouseEnter={() => setActivePreference(index)}
                        />
                      );
                      offset += length;
                      return node;
                    });
                  })()}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Top Asset</div>
                  <div className="mt-1 text-2xl font-semibold text-foreground">{activeSlice.label}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{activeSlice.value.toFixed(2)}% allocation</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
              {preferenceSlices.map((slice, index) => (
                <button
                  key={slice.label}
                  type="button"
                  onMouseEnter={() => setActivePreference(index)}
                  className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
                    activePreference === index ? "bg-accent/45" : "hover:bg-accent/25"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-muted-foreground">{slice.label}</span>
                  </span>
                  <span className="font-medium text-foreground">{slice.value.toFixed(2)}%</span>
                </button>
              ))}
            </div>
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Daily Returns"
        icon={Activity}
        actions={
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Avg{" "}
              <span className={returnSummary.avg >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                {fmtSigned(returnSummary.avg, 3)}%
              </span>
            </span>
            <span className="font-medium text-emerald-400">W{returnSummary.wins}</span>
            <span className="font-medium text-rose-400">L{returnSummary.losses}</span>
            <div className="ml-1 flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
              {curveRanges.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setReturnsRange(option);
                    setReturnsHoverIndex(null);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors ${
                    option === returnsRange
                      ? "border border-primary/45 bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        }
      >
        <div className="relative">
          <svg
            viewBox="0 0 1120 280"
            className="h-[320px] w-full"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left) / rect.width;
              const index = Math.round(Math.max(0, Math.min(1, ratio)) * (dailyReturns.length - 1));
              setReturnsHoverIndex(index);
            }}
            onMouseLeave={() => setReturnsHoverIndex(null)}
          >
            <rect x="0" y="0" width="1120" height="280" rx="16" fill="rgba(11,18,32,0.55)" />
            {Array.from({ length: 5 }, (_, index) => (
              <line
                key={index}
                x1="28"
                y1={32 + index * 54}
                x2="1092"
                y2={32 + index * 54}
                stroke="rgba(148,163,184,0.10)"
                strokeDasharray="3 8"
              />
            ))}
            <line x1="28" y1="140" x2="1092" y2="140" stroke="rgba(148,163,184,0.18)" />
            {dailyReturns.map((value, index) => {
              const slot = 1064 / dailyReturns.length;
              const barWidth = Math.max(8, slot - 6);
              const x = 28 + index * slot + (slot - barWidth) / 2;
              const magnitude = Math.min(105, (Math.abs(value) / 1.4) * 105);
              const y = value >= 0 ? 140 - magnitude : 140;
              return (
                <rect
                  key={`${returnsRange}-${index}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(3, magnitude)}
                  rx="2"
                  fill={value >= 0 ? "#66D39A" : "#E16373"}
                  opacity={returnsHoverIndex === index ? 1 : 0.92}
                />
              );
            })}
            {returnsHoverIndex !== null ? (
              (() => {
                const slot = 1064 / dailyReturns.length;
                const x = 28 + returnsHoverIndex * slot + slot / 2;
                return (
                  <line
                    x1={x}
                    y1="24"
                    x2={x}
                    y2="252"
                    stroke="rgba(255,255,255,0.18)"
                    strokeDasharray="4 6"
                  />
                );
              })()
            ) : null}
          </svg>

          {returnsHoverIndex !== null ? (
            <div
              className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
              style={{
                left: `${Math.min(82, Math.max(8, (returnsHoverIndex / Math.max(1, dailyReturns.length - 1)) * 100))}%`,
                top: 12,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {returnMeta[returnsRange].labels[
                  Math.min(
                    returnMeta[returnsRange].labels.length - 1,
                    Math.floor(
                      (returnsHoverIndex / Math.max(1, dailyReturns.length - 1)) *
                        returnMeta[returnsRange].labels.length
                    )
                  )
                ]}
              </div>
              <div className={`mt-1 font-semibold ${dailyReturns[returnsHoverIndex] >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtSigned(dailyReturns[returnsHoverIndex], 3)}%
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          {returnMeta[returnsRange].labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel title="Position History" icon={BriefcaseBusiness}>
        <div className="space-y-3">
          {positionHistory.map((position) => (
            <article
              key={`${position.symbol}-${position.openedAt}`}
              className="rounded-xl border border-border/60 bg-background/35 p-4 transition-colors hover:bg-accent/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 pb-0">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[16px] font-semibold text-foreground">{position.symbol}</h3>
                    <span className="inline-flex items-center justify-start rounded-md border border-border/70 bg-accent/45 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {position.contract}
                    </span>
                    <span className={`inline-flex items-center justify-start rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${sideClass(position.side)}`}>
                      {position.side}
                    </span>
                    <span className="inline-flex items-center justify-start rounded-md border border-border/70 bg-accent/45 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {position.status}
                    </span>
                  </div>
                </div>
                <div className={`text-right text-[16px] font-semibold leading-none ${positionTone(position.pnl)}`}>
                  {position.pnl}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Entry Price</div>
                  <div className="mt-1 font-mono text-[14px] text-foreground">{position.entryPrice}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Max Open Interest</div>
                  <div className="mt-1 font-mono text-[14px] text-foreground">{position.maxOpenInterest}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Opened</div>
                  <div className="mt-1 font-mono text-sm text-foreground">{position.openedAt}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Closed</div>
                  <div className="mt-1 font-mono text-sm text-foreground">{position.closedAt}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </DashboardPanel>

      <Dialog
        open={isLiveDeployOpen}
        onOpenChange={(open) => {
          setIsLiveDeployOpen(open);
          if (!open) {
            setLiveDeployView("deploy");
            setConnectExchangeId(null);
            setConnectTab("quick");
          }
        }}
      >
        <DialogContent className="max-w-2xl border-border bg-card p-0 text-foreground">
          {liveDeployView === "deploy" ? (
            <>
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle>Deploy Strategy to Live Trading</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 px-6 py-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Exchange
                    </p>
                    <button
                      type="button"
                      className="text-xs text-primary hover:text-primary/80"
                      onClick={goToExchangeApi}
                    >
                      Manage Connections
                    </button>
                  </div>

                  {connectedExchanges.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-accent/25 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/40 text-muted-foreground">
                            <Unplug className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">No Exchange API Connected</p>
                            <p className="text-xs text-muted-foreground">
                              Connect an exchange API account to enable live deployment.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 shrink-0 rounded-full border-border bg-card px-3 text-xs"
                          onClick={goToExchangeApi}
                        >
                          Connect Exchange
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connectedExchanges.map((exchange) => (
                        <button
                          key={exchange.id}
                          type="button"
                          onClick={() => setSelectedExchangeId(exchange.id)}
                          aria-pressed={selectedExchangeId === exchange.id}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                            selectedExchangeId === exchange.id
                              ? "border-primary/50 bg-primary/10 text-primary"
                              : "border-border/70 bg-background/35 text-foreground hover:bg-accent/35"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-semibold uppercase tracking-[0.1em] ${exchange.iconClassName}`}
                            >
                              {exchange.iconText}
                            </span>
                            <span className="truncate text-sm font-medium">{exchange.label}</span>
                          </div>
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                              selectedExchangeId === exchange.id
                                ? "border-primary/60 bg-primary/20"
                                : "border-border/70 bg-background/35"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                selectedExchangeId === exchange.id ? "bg-primary" : "bg-transparent"
                              }`}
                            />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Base Capital
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={liveCapitalInput}
                      onChange={(event) =>
                        setLiveCapitalInput(event.target.value.replace(/[^0-9.]/g, ""))
                      }
                      placeholder="1000"
                      className="h-10"
                      aria-invalid={isCapitalBelowMinimum}
                    />
                    <div className="inline-flex h-10 items-center rounded-md border border-border bg-accent/35 px-3 text-sm font-medium text-foreground">
                      USDT
                    </div>
                  </div>
                  {isCapitalBelowMinimum ? (
                    <p className="text-xs text-rose-400">
                      Minimum activation capital is 100 USDT. Deployment cannot be initiated below this threshold.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Minimum activation capital: 100 USDT.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4">
                <Button
                  variant="outline"
                  className="h-9 rounded-full border-border bg-card px-4 text-xs"
                  onClick={() => setIsLiveDeployOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                  disabled={!canSubmitLiveDeploy}
                  onClick={submitLiveDeployment}
                >
                  Submit Live Deployment
                </Button>
              </div>
            </>
          ) : liveDeployView === "connect-list" ? (
            <>
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setLiveDeployView("deploy")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                </div>
                <DialogTitle>Connect Exchange</DialogTitle>
                <DialogDescription>
                  Your assets remain in your exchange account. We use encrypted API credentials for strategy execution only.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 px-6 py-5">
                <div className="rounded-xl border border-border/60 bg-accent/35 p-4 text-sm text-muted-foreground">
                  Choose a venue to connect. You can manage multiple exchanges and pick one at deployment time.
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {exchangeOptions.map((exchange) => {
                    const isConnected = connectedExchangeIds.includes(exchange.id);
                    return (
                      <button
                        key={exchange.id}
                        type="button"
                        onClick={() => {
                          setConnectExchangeId(exchange.id);
                          setConnectTab("quick");
                          setLiveDeployView("connect-config");
                        }}
                        className="rounded-xl border border-border/70 bg-background/35 px-4 py-4 text-left transition-colors hover:bg-accent/25"
                      >
                        <div className="text-sm font-semibold text-foreground">{exchange.label}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {isConnected ? "Connected" : "Not connected"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3" />
                  Request another exchange integration
                </button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setLiveDeployView("connect-list")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                </div>
                <DialogTitle>Connect {connectingExchange?.label ?? "Exchange"}</DialogTitle>
                <DialogDescription>
                  Configure API access for live strategy execution and risk synchronization.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 px-6 py-5">
                <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
                  <button
                    type="button"
                    onClick={() => setConnectTab("quick")}
                    className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                      connectTab === "quick"
                        ? "border border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Quick Connect
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectTab("api")}
                    className={`ml-1 rounded-md px-3 py-1.5 text-xs transition-colors ${
                      connectTab === "api"
                        ? "border border-primary/40 bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    API Keys
                  </button>
                </div>

                {connectTab === "quick" ? (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-background/30 p-4">
                    <div className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">
                        1
                      </span>
                      <p className="text-muted-foreground">
                        Sign in to your {connectingExchange?.label ?? "exchange"} account.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">
                        2
                      </span>
                      <p className="text-muted-foreground">
                        Authorize API access for order placement and position query.
                      </p>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-foreground">
                        3
                      </span>
                      <p className="text-muted-foreground">
                        Confirm risk permissions and activate strategy routing.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Import open positions on first sync
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-background/30 p-4">
                    <p className="text-xs text-muted-foreground">
                      Create API credentials with trade and position permissions enabled.
                    </p>
                    <Input value={`My ${connectingExchange?.label ?? "Exchange"} Account`} readOnly />
                    <Input placeholder="API Key" />
                    <Input placeholder="API Secret" />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Keep withdrawals disabled for security best practice.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4">
                <Button
                  variant="outline"
                  className="h-9 rounded-full border-border bg-card px-4 text-xs"
                  onClick={() => setLiveDeployView("connect-list")}
                >
                  Cancel
                </Button>
                <Button
                  className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                  onClick={connectSelectedExchange}
                  disabled={!connectExchangeId}
                >
                  Connect Exchange
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStrategyConfigOpen} onOpenChange={setIsStrategyConfigOpen}>
        <DialogContent className="max-w-2xl border-border bg-card p-0 text-foreground">
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <DialogTitle>Strategy Configuration</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 px-6 py-4">
            <section className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Meta
              </p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-background/20 px-4 py-3 text-xs sm:grid-cols-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Strategy ID</p>
                  <p className="font-semibold text-foreground">{strategyId}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Created At</p>
                  <p className="font-semibold text-foreground">{createdAt}</p>
                </div>
              </div>
            </section>

            {strategyConfigRows.length > 0 ? (
              <section className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Configured Parameters
                </p>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-background/20 px-4 py-3 sm:grid-cols-2">
                  {strategyConfigRows.map((row) => (
                    <div key={row.label} className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                        {row.label}
                      </p>
                      <p className="text-sm font-semibold text-foreground">{row.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="flex items-center justify-end border-t border-border/60 px-6 py-4">
            <Button
              variant="outline"
              className="h-9 rounded-full border-border bg-card px-4 text-xs"
              onClick={() => setIsStrategyConfigOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
