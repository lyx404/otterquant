/*
 * StrategyDetail — rebuilt with Figma information architecture
 * and aligned to the AlphaDetail visual system.
 */
import { useMemo, useState, type ComponentType } from "react";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { strategies } from "@/lib/mockData";
import { buildCalendarValues, buildPath, buildSeries, parsePercent } from "@/lib/strategyUtils";
import { deployStrategyToTrade, getStrategyDeployment } from "@/lib/tradeDeployments";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";

const rangeOptions = ["YTD", "1Y", "3Y", "Since Launch", "Since Inception"] as const;
type RangeKey = (typeof rangeOptions)[number];

const rangeMeta: Record<RangeKey, { points: number; slope: number; benchmarkSlope: number }> = {
  YTD: { points: 24, slope: 0.62, benchmarkSlope: 0.16 },
  "1Y": { points: 36, slope: 0.54, benchmarkSlope: 0.14 },
  "3Y": { points: 48, slope: 0.47, benchmarkSlope: 0.12 },
  "Since Launch": { points: 58, slope: 0.42, benchmarkSlope: 0.1 },
  "Since Inception": { points: 64, slope: 0.39, benchmarkSlope: 0.09 },
};

type SectionRow = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
};

type OrderSide = "Open Long" | "Close Long" | "Open Short" | "Close Short";

type OrderRow = {
  time: string;
  pair: string;
  side: OrderSide;
  type: "Market";
  price: string;
  size: string;
  avgEntry: string;
  pnl: string;
  pnlPct: string;
  fee: string;
  status: "Filled";
};

const orderRows: OrderRow[] = [
  {
    time: "2022-09-15 20:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,590.34",
    size: "73.164000",
    avgEntry: "1,641.33",
    pnl: "-3,730.36",
    pnlPct: "-3.11%",
    fee: "46.5423 USDT",
    status: "Filled",
  },
  {
    time: "2022-12-12 12:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,242.85",
    size: "101.517000",
    avgEntry: "1,206.90",
    pnl: "+3,649.54",
    pnlPct: "+2.98%",
    fee: "50.4682 USDT",
    status: "Filled",
  },
  {
    time: "2022-10-04 16:00:00",
    pair: "ETH_USDT",
    side: "Open Long",
    type: "Market",
    price: "1,349.86",
    size: "86.142000",
    avgEntry: "1,349.86",
    pnl: "-",
    pnlPct: "-",
    fee: "46.5119 USDT",
    status: "Filled",
  },
  {
    time: "2022-10-15 00:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,309.51",
    size: "85.690000",
    avgEntry: "1,329.55",
    pnl: "-1,717.04",
    pnlPct: "-1.51%",
    fee: "44.8847 USDT",
    status: "Filled",
  },
  {
    time: "2022-12-16 08:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,266.01",
    size: "99.976000",
    avgEntry: "1,254.12",
    pnl: "+1,188.31",
    pnlPct: "+0.95%",
    fee: "50.6281 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-01 00:00:00",
    pair: "ETH_USDT",
    side: "Open Long",
    type: "Market",
    price: "1,588.81",
    size: "103.958000",
    avgEntry: "1,588.81",
    pnl: "-",
    pnlPct: "-",
    fee: "66.0677 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-07 08:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,613.57",
    size: "101.743000",
    avgEntry: "1,617.93",
    pnl: "-444.24",
    pnlPct: "-0.27%",
    fee: "65.6677 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-09 16:00:00",
    pair: "ETH_USDT",
    side: "Open Long",
    type: "Market",
    price: "1,630.32",
    size: "99.648000",
    avgEntry: "1,630.32",
    pnl: "-",
    pnlPct: "-",
    fee: "64.9831 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-10 04:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,578.76",
    size: "99.648000",
    avgEntry: "1,630.32",
    pnl: "-5,137.04",
    pnlPct: "-3.16%",
    fee: "62.9283 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-23 00:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,612.37",
    size: "96.534000",
    avgEntry: "1,628.62",
    pnl: "-1,568.50",
    pnlPct: "-1.00%",
    fee: "62.2593 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-27 04:00:00",
    pair: "ETH_USDT",
    side: "Open Long",
    type: "Market",
    price: "1,633.02",
    size: "92.831000",
    avgEntry: "1,633.02",
    pnl: "-",
    pnlPct: "-",
    fee: "60.6378 USDT",
    status: "Filled",
  },
  {
    time: "2023-02-28 04:00:00",
    pair: "ETH_USDT",
    side: "Close Long",
    type: "Market",
    price: "1,620.90",
    size: "92.831000",
    avgEntry: "1,633.02",
    pnl: "-1,125.18",
    pnlPct: "-0.74%",
    fee: "60.1877 USDT",
    status: "Filled",
  },
];

function fmtSigned(value: number, fractionDigits = 2) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
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
      <div className="mt-2">
        <div
          className={`stat-value text-[20px] font-semibold leading-none ${
            tone === "positive"
              ? "text-emerald-400"
              : tone === "negative"
                ? "text-rose-400"
                : "text-foreground"
          }`}
        >
          {value}
        </div>
      </div>
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
            <span
              className={`data-value text-xs font-semibold ${
                row.tone === "positive"
                  ? "text-emerald-400"
                  : row.tone === "negative"
                    ? "text-rose-400"
                    : "text-foreground"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function sideClass(side: OrderSide) {
  if (side.includes("Open") && side.includes("Long")) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }
  if (side.includes("Close") && side.includes("Long")) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }
  if (side.includes("Open") && side.includes("Short")) {
    return "border-rose-500/30 bg-rose-500/10 text-rose-400";
  }
  return "border-orange-500/30 bg-orange-500/10 text-orange-400";
}

function pnlClass(value: string) {
  if (value.startsWith("+")) return "text-emerald-400";
  if (value.startsWith("-")) return "text-rose-400";
  return "text-muted-foreground";
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
  const isDraftView = searchParams.get("draft") === "true" || !strategyFromStore;
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

  const [range, setRange] = useState<RangeKey>("Since Inception");
  const [starred, setStarred] = useState(false);
  const [deploymentVersion, setDeploymentVersion] = useState(0);

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
    { label: "Peak Equity", value: `${peakEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` },
    { label: "Min Equity", value: `${minEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` },
    { label: "Realized PnL", value: `${fmtSigned(realizedPnl)} USDT`, tone: realizedPnl >= 0 ? "positive" : "negative" },
    { label: "Unrealized PnL", value: `${fmtSigned(unrealizedPnl)} USDT`, tone: unrealizedPnl >= 0 ? "positive" : "negative" },
  ];

  const perfRows: SectionRow[] = [
    { label: "Sharpe Ratio", value: strategy.sharpe.toFixed(2), tone: strategy.sharpe >= 1 ? "positive" : "neutral" },
    { label: "Calmar Ratio", value: calmar.toFixed(2), tone: calmar >= 1 ? "positive" : "neutral" },
    { label: "Win Rate", value: `${winRate.toFixed(2)}%`, tone: winRate >= 50 ? "positive" : "negative" },
    { label: "Profit/Loss Ratio", value: profitLossRatio.toFixed(2), tone: profitLossRatio >= 1 ? "positive" : "neutral" },
  ];

  const tradeRows: SectionRow[] = [
    { label: "Trading Days", value: `${tradingDays}` },
    { label: "Total Trades", value: `${totalTrades}` },
    { label: "Max Exposure", value: `${maxExposure.toFixed(2)}%` },
    { label: "Total Fees", value: `${totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` },
  ];

  const chartSeries = useMemo(() => {
    const meta = rangeMeta[range];
    const strategyValues = buildSeries(meta.points, 100, meta.slope, 1.05);
    const benchmarkValues = buildSeries(meta.points, 100, meta.benchmarkSlope, 0.5).map((value, index) =>
      Number((value - index * 0.03).toFixed(2))
    );
    return { strategyValues, benchmarkValues };
  }, [range]);

  const strategyPath = useMemo(
    () => buildPath(chartSeries.strategyValues, 700, 320, 24),
    [chartSeries.strategyValues]
  );
  const benchmarkPath = useMemo(
    () => buildPath(chartSeries.benchmarkValues, 700, 320, 24),
    [chartSeries.benchmarkValues]
  );

  const totalReturnPct = useMemo(() => {
    const values = chartSeries.strategyValues;
    return ((values[values.length - 1] - values[0]) / values[0]) * 100;
  }, [chartSeries.strategyValues]);

  const benchmarkReturnPct = useMemo(() => {
    const values = chartSeries.benchmarkValues;
    return ((values[values.length - 1] - values[0]) / values[0]) * 100;
  }, [chartSeries.benchmarkValues]);

  const calendar = useMemo(() => {
    const year = 2026;
    const monthIndex = 3;
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const monthValues = buildCalendarValues(totalDays, 1.8);
    const cells: Array<{ day: number | null; value: number | null }> = [];

    for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null, value: null });
    for (let day = 1; day <= totalDays; day += 1) {
      cells.push({ day, value: monthValues[day - 1] });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, value: null });

    const totalMonthReturn = monthValues.reduce((sum, value) => sum + value, 0);
    return { cells, totalMonthReturn };
  }, []);

  const openTradePage = (environment: "paper" | "live", focusTradeId?: string) => {
    const query = new URLSearchParams({
      env: environment,
      focusStrategy: strategyId,
    });
    if (focusTradeId) query.set("focusTradeId", focusTradeId);
    window.location.assign(`/trade?${query.toString()}`);
  };

  const deployStrategy = (environment: "paper" | "live") => {
    const bot = deployStrategyToTrade({
      strategyId,
      strategyName,
      market: strategy.market,
      annualReturn: strategy.annualReturn,
      winRate: strategy.winRate,
      environment,
    });
    setDeploymentVersion((prev) => prev + 1);
    toast.success(
      environment === "paper"
        ? "Deployed to paper trading."
        : "Deployed to live trading."
    );
    return bot;
  };

  const tierBadgeClass =
    strategyTier === "official"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-sky-500/30 bg-sky-500/10 text-sky-400";
  const tierBadgeLabel = strategyTier === "official" ? "Official" : "Graduated";

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
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            Strategy ID: {strategyId} &middot; Created: {createdAt}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {isOfficialLibraryView ? (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${tierBadgeClass}`}
              >
                {tierBadgeLabel}
              </span>
            ) : (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${
                  isDraftView
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : strategy.status === "live"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : strategy.status === "backtested"
                        ? "border-sky-500/30 bg-sky-500/10 text-sky-400"
                        : "border-primary/30 bg-primary/10 text-primary"
                }`}
              >
                {isDraftView ? "Draft" : strategy.status}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {strategy.market}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {strategy.factorCount} factors
            </span>
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
                  deployStrategy("live");
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
            value={currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.42fr_0.78fr]">
        <section className="surface-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Performance Curve</h2>
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
              {rangeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.04em] transition-colors ${
                    option === range
                      ? "border border-primary/45 bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="text-muted-foreground">
              Total Return: <span className={`font-semibold ${totalReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSigned(totalReturnPct)}%</span>
            </span>
            <span className="text-muted-foreground">
              Excess Return: <span className={`font-semibold ${totalReturnPct - benchmarkReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSigned(totalReturnPct - benchmarkReturnPct)}%</span>
            </span>
            <span className="text-muted-foreground">
              Sharpe: <span className="font-semibold text-foreground">{strategy.sharpe.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              Calmar: <span className="font-semibold text-foreground">{calmar.toFixed(2)}</span>
            </span>
          </div>

          <div className="mt-4">
            <svg viewBox="0 0 700 320" className="h-[320px] w-full">
              <defs>
                <linearGradient id="detailStrategyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.04" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="700" height="320" rx="14" fill="rgba(15,23,42,0.22)" />
              {Array.from({ length: 7 }, (_, index) => (
                <line
                  key={index}
                  x1="24"
                  y1={36 + index * 40}
                  x2="676"
                  y2={36 + index * 40}
                  stroke="rgba(148,163,184,0.15)"
                  strokeDasharray="3 8"
                />
              ))}

              <path d={`${strategyPath} L 676 296 L 24 296 Z`} fill="url(#detailStrategyFill)" />
              <path d={strategyPath} fill="none" stroke="#818CF8" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
              <path d={benchmarkPath} fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" opacity="0.95" />
            </svg>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-5 rounded bg-[#818CF8]" />
              Strategy Equity
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-5 rounded bg-[#F59E0B]" />
              ETH Spot Benchmark
            </span>
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Return Calendar</h2>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Apr 2026
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {calendar.cells.map((cell, index) => {
              const value = cell.value;
              const isPositive = value !== null && value >= 0;
              const isNegative = value !== null && value < 0;
              return (
                <div
                  key={`${cell.day ?? "empty"}-${index}`}
                  className={`h-14 rounded-lg border px-1 py-1 text-center ${
                    cell.day === null
                      ? "border-border/35 bg-transparent"
                      : isPositive
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : isNegative
                          ? "border-rose-500/30 bg-rose-500/10"
                          : "border-border/70 bg-accent/30"
                  }`}
                >
                  {cell.day !== null ? (
                    <>
                      <div className="text-[11px] font-medium text-foreground">{cell.day}</div>
                      <div className={`mt-1 text-[10px] data-value ${isPositive ? "text-emerald-400" : isNegative ? "text-rose-400" : "text-muted-foreground"}`}>
                        {value !== null ? `${fmtSigned(value, 2)}%` : "--"}
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-right text-xs text-muted-foreground">
            Monthly Return:{" "}
            <span className={`font-semibold ${calendar.totalMonthReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {fmtSigned(calendar.totalMonthReturn)}%
            </span>
          </div>
        </section>
      </div>

      {isOfficialLibraryView ? (
        <section className="surface-card p-5">
          <h2 className="text-base font-semibold text-foreground">Template Metadata</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Source</div>
              <div className="mt-2 text-sm font-semibold text-foreground">Official Strategy Library</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Tier</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{tierBadgeLabel}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Author</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{strategy.author}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Tags</div>
              <div className="mt-2 text-sm font-semibold text-foreground">{strategy.tags.join(" · ")}</div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="surface-card p-5">
            <h2 className="text-base font-semibold text-foreground">Assets</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70">
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Exchange</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Asset</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Total</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Available</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Frozen</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Updated At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-border/70">
                    <TableCell className="font-mono text-xs text-muted-foreground">binance</TableCell>
                    <TableCell className="font-semibold text-foreground">USDT</TableCell>
                    <TableCell className="data-value text-foreground">228,069.571705</TableCell>
                    <TableCell className="data-value text-emerald-400">228,069.571705</TableCell>
                    <TableCell className="data-value text-muted-foreground">0.000000</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">2026-03-29 15:22:46</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-base font-semibold text-foreground">Orders</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/70">
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Time</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Pair</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Side</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Type</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Price</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Size</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Avg Entry</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">PnL</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">PnL %</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Fee</TableHead>
                    <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderRows.map((row) => (
                    <TableRow key={`${row.time}-${row.pair}-${row.side}`} className="border-border/70">
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.time}</TableCell>
                      <TableCell className="font-semibold text-foreground">{row.pair}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${sideClass(row.side)}`}>
                          {row.side}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.type}</TableCell>
                      <TableCell className="data-value text-foreground">{row.price}</TableCell>
                      <TableCell className="data-value text-foreground">{row.size}</TableCell>
                      <TableCell className="data-value text-foreground">{row.avgEntry}</TableCell>
                      <TableCell className={`data-value ${pnlClass(row.pnl)}`}>{row.pnl}</TableCell>
                      <TableCell className={`data-value ${pnlClass(row.pnlPct)}`}>{row.pnlPct}</TableCell>
                      <TableCell className="data-value text-muted-foreground">{row.fee}</TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>286 records total, page 1 / 3</span>
              <div className="inline-flex items-center gap-2">
                <button className="rounded-md border border-border/70 bg-accent/35 px-2 py-1 hover:text-foreground">First</button>
                <button className="rounded-md border border-border/70 bg-accent/35 px-2 py-1 hover:text-foreground">Prev</button>
                <span className="rounded-md border border-primary/35 bg-primary/12 px-2 py-1 text-primary">1</span>
                <button className="rounded-md border border-border/70 bg-accent/35 px-2 py-1 hover:text-foreground">Next</button>
                <button className="rounded-md border border-border/70 bg-accent/35 px-2 py-1 hover:text-foreground">Last</button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
