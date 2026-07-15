import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Link, useParams, useSearch } from "wouter";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyReportDateControl } from "./StrategyReportDateControl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatSigned,
  tradeBots,
  tradeFillRows,
  tradeHistoryRows,
  tradePositionRows,
  type TradeEnvironment,
} from "@/lib/tradeData";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  PieChart,
  RefreshCw,
  Square,
} from "lucide-react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import "./TradeDetail.css";

const MAX_VISIBLE_ALLOCATION_ASSETS = 10;

const ALLOCATION_PALETTE = [
  "var(--td-allocation-1)",
  "var(--td-allocation-2)",
  "var(--td-allocation-3)",
  "var(--td-allocation-4)",
  "var(--td-allocation-5)",
  "var(--td-allocation-6)",
  "var(--td-allocation-7)",
  "var(--td-allocation-8)",
  "var(--td-allocation-9)",
  "var(--td-allocation-10)",
];

const PREFERRED_ALLOCATION_COLOR_INDEX: Record<string, number> = {
  ETH: 0,
  BTC: 1,
  SKL: 2,
  FIL: 3,
  SOL: 4,
  DOGE: 5,
  XRP: 6,
  BNB: 7,
  ETC: 8,
  PAXG: 9,
};

type TradeAllocationDatum = {
  asset: string;
  value: number;
  percent: number;
  color: string;
  isOther: boolean;
  memberCount: number;
};

function getAllocationColor(asset: string) {
  const preferredIndex = PREFERRED_ALLOCATION_COLOR_INDEX[asset];

  if (preferredIndex !== undefined) return ALLOCATION_PALETTE[preferredIndex];

  const hash = Array.from(asset).reduce((value, character) => (
    ((value << 5) - value + character.charCodeAt(0)) | 0
  ), 0);
  return ALLOCATION_PALETTE[Math.abs(hash) % ALLOCATION_PALETTE.length];
}

function formatRefreshTimestamp(date: Date) {
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  const timePart = [date.getHours(), date.getMinutes()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return `${datePart} ${timePart}`;
}

function isTradeEnvironment(value: string | null): value is TradeEnvironment {
  return value === "paper" || value === "live";
}

type TradeViewMode = "trading" | "analysis";
type OverviewMetric = "return" | "pnl";
type OverviewTrendMetricKey = "returnValue" | "pnlValue";
type AnalysisRange = "7D" | "30D" | "90D" | "365D";
type CurvePoint = { x: number; y: number; value: number };
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";

const analysisRanges: AnalysisRange[] = ["7D", "30D", "90D", "365D"];
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
const analysisCurveConfig: Record<AnalysisRange, { points: number; slope: number; volatility: number; labels: string[] }> = {
  "7D": { points: 18, slope: 46, volatility: 22, labels: ["04-12", "04-14", "04-16", "04-18"] },
  "30D": { points: 30, slope: 84, volatility: 38, labels: ["03-20", "03-27", "04-03", "04-10", "04-17"] },
  "90D": { points: 44, slope: 132, volatility: 65, labels: ["01-20", "02-10", "03-03", "03-24", "04-14"] },
  "365D": { points: 62, slope: 182, volatility: 104, labels: ["May", "Jul", "Sep", "Nov", "Jan", "Mar"] },
};
const analysisReturnConfig: Record<AnalysisRange, { points: number; labels: string[]; amplitude: number }> = {
  "7D": { points: 14, labels: ["04-12", "04-14", "04-16", "04-18"], amplitude: 0.48 },
  "30D": { points: 30, labels: ["03-20", "03-27", "04-03", "04-10", "04-17"], amplitude: 0.78 },
  "90D": { points: 52, labels: ["01-20", "02-03", "02-17", "03-02", "03-16", "03-30", "04-13"], amplitude: 1.14 },
  "365D": { points: 72, labels: ["May", "Jul", "Sep", "Nov", "Jan", "Mar"], amplitude: 1.36 },
};

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown" ? stored : "greenUpRedDown";
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return true;
}

function getChartColorTokens(mode: ChartColorMode) {
  return mode === "redUpGreenDown"
    ? {
        upHex: "#F43F5E",
        downHex: "#10B981",
      }
    : {
        upHex: "#10B981",
        downHex: "#F43F5E",
      };
}

function OverviewTrendActiveDot({
  cx,
  cy,
  payload,
  metricKey,
}: {
  cx?: number;
  cy?: number;
  payload?: Partial<Record<OverviewTrendMetricKey, number>>;
  metricKey: OverviewTrendMetricKey;
}) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;

  const value = payload?.[metricKey] ?? 0;
  const stroke = value >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";

  return <circle cx={cx} cy={cy} r={4} fill="var(--td-bg)" stroke={stroke} strokeWidth={2.4} />;
}

function getNiceOverviewTrendStep(rawStep: number, minimumStep: number) {
  const safeStep = Math.max(Math.abs(rawStep), minimumStep);
  const magnitude = 10 ** Math.floor(Math.log10(safeStep));
  const normalized = safeStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function roundOverviewTrendAxisValue(value: number, step: number) {
  const precision = Math.min(8, Math.max(0, Math.ceil(-Math.log10(step)) + 2));
  return Number(value.toFixed(precision));
}

function getOverviewTrendAxis(values: number[], minimumStep: number) {
  const finiteValues = values.filter(Number.isFinite);
  const dataMin = Math.min(0, ...finiteValues);
  const dataMax = Math.max(0, ...finiteValues);
  const step = getNiceOverviewTrendStep((dataMax - dataMin) / 4, minimumStep);

  let domainMin = Math.floor(dataMin / step) * step;
  let domainMax = Math.ceil(dataMax / step) * step;
  if (domainMin === domainMax) {
    domainMin -= step * 2;
    domainMax += step * 2;
  }

  domainMin = roundOverviewTrendAxisValue(domainMin, step);
  domainMax = roundOverviewTrendAxisValue(domainMax, step);
  const intervalCount = Math.round((domainMax - domainMin) / step);
  const ticks = Array.from({ length: intervalCount + 1 }, (_, index) => (
    roundOverviewTrendAxisValue(domainMin + index * step, step)
  ));

  return {
    domain: [domainMin, domainMax] as [number, number],
    ticks,
  };
}

function parseNumeric(text: string) {
  const value = Number(text.replace(/,/g, "").replace(/[A-Z ]+/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function formatAnalysisRangeLabel(range: AnalysisRange, uiLang: string) {
  if (uiLang !== "zh") return range;
  switch (range) {
    case "7D":
      return "7日";
    case "30D":
      return "30日";
    case "90D":
      return "90日";
    case "365D":
      return "365日";
    default:
      return range;
  }
}

function buildSeries(points: number, start: number, slope: number, volatility: number) {
  return Array.from({ length: points }, (_, index) => {
    const trend = (index / Math.max(1, points - 1)) * slope;
    const wave = Math.sin(index * 0.29) * volatility * 0.68;
    const pulse = Math.cos(index * 0.63) * volatility * 0.41;
    return Number((start + trend + wave + pulse).toFixed(2));
  });
}

function buildCurvePoints(
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

function curvePath(points: CurvePoint[]) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function curveArea(points: CurvePoint[], height: number, padding: number) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${curvePath(points)} L ${last.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${first.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;
}

function classForTone(tone?: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-[var(--semantic-up)]";
  if (tone === "negative") return "text-[var(--semantic-down)]";
  return "text-foreground";
}

export default function TradeDetail() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [viewMode] = useState<TradeViewMode>("trading");
  const [overviewMetric, setOverviewMetric] = useState<OverviewMetric>("return");
  const [activeAllocationAsset, setActiveAllocationAsset] = useState<string | null>(null);
  const [analysisCurveRange, setAnalysisCurveRange] = useState<AnalysisRange>("90D");
  const [analysisReturnRange, setAnalysisReturnRange] = useState<AnalysisRange>("30D");
  const [analysisCurveHoverIndex, setAnalysisCurveHoverIndex] = useState<number | null>(null);
  const [analysisReturnHoverIndex, setAnalysisReturnHoverIndex] = useState<number | null>(null);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const [executionStatusOverride, setExecutionStatusOverride] = useState<{ tradeId: string; status: "paused" } | null>(null);
  const [refreshedAtByTrade, setRefreshedAtByTrade] = useState<Record<string, string>>({});
  const tradeId = params?.id ?? "";
  const trade = tradeBots.find((item) => item.id === tradeId);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncPlainExplanation = () => setPlainExplainEnabled(readPlainExplanationEnabled());
    window.addEventListener("storage", syncPlainExplanation);
    window.addEventListener("focus", syncPlainExplanation);
    return () => {
      window.removeEventListener("storage", syncPlainExplanation);
      window.removeEventListener("focus", syncPlainExplanation);
    };
  }, []);
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const semanticColorVars = useMemo(
    () =>
      ({
        "--semantic-up": chartColors.upHex,
        "--semantic-down": chartColors.downHex,
      }) as CSSProperties,
    [chartColors]
  );

  if (!trade) {
    return (
      <div className="space-y-6 min-w-0">
        <div className="surface-card border border-border/70 p-6">
          <p className="text-lg font-semibold text-foreground">{tr("Trade bot not found", "未找到交易机器人")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tr("The selected trade id does not exist in the current workspace.", "当前工作区中不存在所选交易 ID。")}
          </p>
          <Link href="/trade">
            <Button className="mt-4 h-8 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
              {tr("Back to Trade", "返回交易页")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const envFromQuery = searchParams.get("env");
  const runtimeEnvironment = isTradeEnvironment(envFromQuery) ? envFromQuery : trade.environment;
  const statusFromQuery = searchParams.get("status");
  const queriedStatus = statusFromQuery === "paused" ? "paused" : "running";
  const runtimeStatus = executionStatusOverride?.tradeId === tradeId
    ? executionStatusOverride.status
    : queriedStatus;
  const displayedUpdatedAt = refreshedAtByTrade[tradeId] ?? trade.updatedAt;

  const visiblePositions = tradePositionRows.filter(
    (row) => row.environment === runtimeEnvironment
  );
  const currentPositionRows = visiblePositions.map((row) => {
    const margin = parseNumeric(row.margin);

    return {
      ...row,
      roi: margin > 0 ? (row.pnl / margin) * 100 : 0,
      signedSize: row.side === "short" && !row.size.startsWith("-") ? `-${row.size}` : row.size,
    };
  });
  const visibleFills = tradeFillRows.filter((row) => row.environment === runtimeEnvironment);
  const historicalPositions = tradeHistoryRows.filter((row) => row.environment === runtimeEnvironment);
  const realizedPnl = Number((trade.unrealizedPnl * 2.65).toFixed(2));
  const totalPnl = realizedPnl + trade.unrealizedPnl;
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const estimatedSharpe = Number((0.45 + trade.winRate / 32).toFixed(2));
  const maxDrawdown = Number((3.5 + (100 - trade.winRate) * 0.23).toFixed(2));
  const profitablePositions = visiblePositions.filter((row) => row.pnl > 0).length;
  const performanceMetrics = [
    {
      label: tr("Assets", "资产"),
      value: trade.equity.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      explanation: tr(
        "Shows the current total assets in this strategy account.",
        "表示当前策略账户的资产总额。"
      ),
    },
    {
      label: tr("Return", "收益率"),
      value: `${formatSigned(roi)}%`,
      className: roi >= 0 ? "is-positive" : "is-negative",
      explanation: tr(
        "Shows cumulative return over the selected period.",
        "表示所选周期内的累计收益比例。"
      ),
    },
    {
      label: tr("PnL (USDT)", "盈亏（USDT）"),
      value: formatSigned(totalPnl),
      className: totalPnl >= 0 ? "is-positive" : "is-negative",
      explanation: tr(
        "Shows the total profit or loss over the selected period.",
        "表示所选周期内累计赚取或亏损的金额。"
      ),
    },
    {
      label: tr("Sharpe Ratio", "夏普比率"),
      value: estimatedSharpe.toFixed(2),
      explanation: tr(
        "Measures return stability. Higher values generally indicate steadier performance.",
        "衡量收益的稳定性，数值越高通常越稳健。"
      ),
    },
    {
      label: tr("Max Drawdown", "最大回撤"),
      value: `${maxDrawdown.toFixed(2)}%`,
      explanation: tr(
        "Shows the largest historical decline. Lower values indicate less downside risk.",
        "表示历史最大跌幅，数值越低风险越小。"
      ),
    },
    {
      label: tr("Win Rate", "胜率"),
      value: `${trade.winRate.toFixed(2)}%`,
      explanation: tr(
        "Shows the percentage of profitable positions.",
        "表示盈利仓位占全部仓位的比例。"
      ),
    },
    {
      label: tr("Profitable Positions", "盈利仓位"),
      value: String(profitablePositions),
      explanation: tr(
        "Shows the number of profitable positions in the selected range.",
        "表示统计范围内盈利仓位的数量。"
      ),
    },
    {
      label: tr("Total Positions", "总仓位数量"),
      value: String(visiblePositions.length),
      explanation: tr(
        "Shows the total number of positions in the selected range.",
        "表示统计范围内的仓位总数。"
      ),
    },
  ];

  const overviewTrendData = useMemo(() => {
    const parsedDate = new Date(`${trade.updatedAt.slice(0, 10)}T00:00:00`);
    const endDate = Number.isNaN(parsedDate.getTime()) ? new Date("2026-04-18T00:00:00") : parsedDate;

    return Array.from({ length: 30 }, (_, index) => {
      const progress = index / 29;
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (29 - index));
      const wave = Math.sin(index * 0.58) * Math.sin(progress * Math.PI);
      const drawdownEnvelope = Math.sin(progress * Math.PI) * ((1 - progress) ** 1.4);
      const returnValue = roi * progress
        + wave * Math.max(Math.abs(roi) * 0.28, 0.04)
        - drawdownEnvelope * Math.max(Math.abs(roi) * 0.75, 0.75);
      const pnlValue = totalPnl * progress
        + wave * Math.max(Math.abs(totalPnl) * 0.08, 8)
        - drawdownEnvelope * Math.max(Math.abs(totalPnl) * 0.75, 25);

      return {
        date: `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        returnValue: Number(returnValue.toFixed(3)),
        pnlValue: Number(pnlValue.toFixed(2)),
      };
    });
  }, [roi, totalPnl, trade.updatedAt]);

  const overviewAllocation = useMemo(() => {
    const totals = new Map<string, number>();
    const configuredAllocation = trade.assetAllocation?.filter((item) => item.weight > 0) ?? [];

    if (configuredAllocation.length > 0) {
      configuredAllocation.forEach(({ asset, weight }) => totals.set(asset, weight));
    } else {
      visiblePositions.forEach((row) => {
        const asset = row.symbol.replace(/USDT$/, "");
        const margin = parseNumeric(row.margin);

        if (margin > 0) {
          totals.set(asset, (totals.get(asset) ?? 0) + margin);
        }
      });
    }

    const sortedAssets = Array.from(totals.entries()).sort(([, a], [, b]) => b - a);
    const assetCount = sortedAssets.length;

    if (assetCount === 0) {
      return { assetCount, items: [] as TradeAllocationDatum[] };
    }

    const visibleAssets = sortedAssets.slice(0, MAX_VISIBLE_ALLOCATION_ASSETS);
    const otherAssets = sortedAssets.slice(MAX_VISIBLE_ALLOCATION_ASSETS);
    const otherValue = otherAssets.reduce((sum, [, value]) => sum + value, 0);
    const groupedAssets = visibleAssets.map(([asset, value]) => ({ asset, value, memberCount: 1 }));

    if (otherValue > 0) {
      groupedAssets.push({ asset: "Other", value: otherValue, memberCount: otherAssets.length });
    }

    const total = groupedAssets.reduce((sum, item) => sum + item.value, 0);
    const items = groupedAssets.map(({ asset, value, memberCount }) => ({
      asset,
      value,
      percent: Number(((value / total) * 100).toFixed(2)),
      color: asset === "Other"
        ? "var(--td-chart-other)"
        : getAllocationColor(asset),
      isOther: asset === "Other",
      memberCount,
    }));
    const roundingDelta = Number((100 - items.reduce((sum, item) => sum + item.percent, 0)).toFixed(2));

    if (roundingDelta !== 0) {
      items[0] = { ...items[0], percent: Number((items[0].percent + roundingDelta).toFixed(2)) };
    }

    return { assetCount, items, usesConfiguredWeights: configuredAllocation.length > 0 };
  }, [trade.assetAllocation, visiblePositions]);
  const overviewAllocationData = overviewAllocation.items;
  const overviewAllocationAriaLabel = overviewAllocationData.length === 0
    ? tr("No open positions to allocate.", "当前没有可用于计算资产占比的持仓。")
    : overviewAllocation.usesConfiguredWeights
      ? tr(
          `Asset preference spans ${overviewAllocation.assetCount} assets: ${overviewAllocationData
            .map((item) => `${item.asset} ${item.percent.toFixed(2)}%`)
            .join(", ")}.`,
          `资产偏好包含 ${overviewAllocation.assetCount} 个资产：${overviewAllocationData
            .map((item) => `${item.asset} ${item.percent.toFixed(2)}%`)
            .join("，")}。`
        )
    : tr(
        `Current margin is allocated across ${overviewAllocation.assetCount} assets: ${overviewAllocationData
          .map((item) => `${item.asset} ${item.value.toFixed(2)} USDT, ${item.percent.toFixed(2)}%`)
          .join(", ")}.`,
        `当前保证金分布于 ${overviewAllocation.assetCount} 个资产：${overviewAllocationData
          .map((item) => `${item.isOther ? "其他" : item.asset} ${item.value.toFixed(2)} USDT，占比 ${item.percent.toFixed(2)}%`)
          .join("，")}。`
      );

  const overviewMetricKey: OverviewTrendMetricKey = overviewMetric === "return" ? "returnValue" : "pnlValue";
  const overviewTrendValues = overviewTrendData.map((row) => row[overviewMetricKey]);
  const overviewTrendFinalValue = overviewTrendValues.at(-1) ?? 0;
  const overviewTrendEndColor = overviewTrendFinalValue >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";
  const overviewTrendAxis = getOverviewTrendAxis(
    overviewTrendValues,
    overviewMetric === "return" ? 0.1 : 10
  );
  const overviewTrendDomain = overviewTrendAxis.domain;
  const overviewTrendYAxisTicks = overviewTrendAxis.ticks;
  const [overviewTrendDomainMin, overviewTrendDomainMax] = overviewTrendDomain;
  const overviewTrendZeroOffset = overviewTrendDomainMax <= 0
    ? 0
    : overviewTrendDomainMin >= 0
      ? 1
      : overviewTrendDomainMax / (overviewTrendDomainMax - overviewTrendDomainMin);
  const overviewTrendGradientSuffix = `${tradeId}-${overviewMetric}`;
  const overviewTrendStrokeId = `trade-overview-stroke-${overviewTrendGradientSuffix}`;
  const overviewTrendFillId = `trade-overview-fill-${overviewTrendGradientSuffix}`;
  const analysisCurve = useMemo(() => {
    const cfg = analysisCurveConfig[analysisCurveRange];
    const width = 960;
    const height = 300;
    const padding = 24;
    const strategyValues = buildSeries(cfg.points, trade.equity * 0.84, cfg.slope, cfg.volatility);
    const benchmarkValues = buildSeries(cfg.points, trade.equity * 0.81, cfg.slope * 0.56, cfg.volatility * 0.45);
    const min = Math.min(...strategyValues, ...benchmarkValues) - 45;
    const max = Math.max(...strategyValues, ...benchmarkValues) + 45;
    const strategyPoints = buildCurvePoints(strategyValues, width, height, padding, min, max);
    const benchmarkPoints = buildCurvePoints(benchmarkValues, width, height, padding, min, max);
    const strategyReturn =
      ((strategyValues[strategyValues.length - 1] - strategyValues[0]) / Math.max(strategyValues[0], 1)) * 100;
    const benchmarkReturn =
      ((benchmarkValues[benchmarkValues.length - 1] - benchmarkValues[0]) / Math.max(benchmarkValues[0], 1)) * 100;
    return {
      width,
      height,
      padding,
      strategyValues,
      benchmarkValues,
      strategyPoints,
      benchmarkPoints,
      strategyPath: curvePath(strategyPoints),
      benchmarkPath: curvePath(benchmarkPoints),
      strategyArea: curveArea(strategyPoints, height, padding),
      labels: cfg.labels,
      strategyReturn,
      benchmarkReturn,
      excessReturn: strategyReturn - benchmarkReturn,
    };
  }, [analysisCurveRange, trade.equity]);
  const analysisCurveHoverPoint =
    analysisCurveHoverIndex !== null
      ? analysisCurve.strategyPoints[analysisCurveHoverIndex] ?? null
      : null;
  const analysisBenchmarkHoverPoint =
    analysisCurveHoverIndex !== null
      ? analysisCurve.benchmarkPoints[analysisCurveHoverIndex] ?? null
      : null;
  const equityCurveColor = analysisCurve.strategyReturn >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";
  const analysisReturns = useMemo(() => {
    const cfg = analysisReturnConfig[analysisReturnRange];
    return Array.from({ length: cfg.points }, (_, index) => {
      const wave = Math.sin(index * 0.35) * cfg.amplitude * 0.62;
      const wobble = Math.cos(index * 0.78) * cfg.amplitude * 0.38;
      const pulse = (index % 9 === 0 ? -1 : 1) * cfg.amplitude * 0.11;
      return Number((wave + wobble + pulse).toFixed(3));
    });
  }, [analysisReturnRange]);
  const analysisReturnSummary = useMemo(() => {
    const avg = analysisReturns.reduce((acc, value) => acc + value, 0) / Math.max(1, analysisReturns.length);
    const wins = analysisReturns.filter((value) => value > 0).length;
    const losses = analysisReturns.filter((value) => value < 0).length;
    return { avg, wins, losses };
  }, [analysisReturns]);
  const analysisReturnHoverSlot = analysisReturnHoverIndex !== null ? 1064 / analysisReturns.length : 0;
  const analysisReturnHoverGeometry =
    analysisReturnHoverIndex !== null
      ? (() => {
          const value = analysisReturns[analysisReturnHoverIndex];
          const x = 28 + analysisReturnHoverIndex * analysisReturnHoverSlot + analysisReturnHoverSlot / 2;
          const magnitude = Math.min(105, (Math.abs(value) / 1.4) * 105);
          const barTop = value >= 0 ? 140 - magnitude : 140;
          const barBottom = value >= 0 ? 140 : 140 + magnitude;
          const y = value >= 0 ? Math.max(24, barTop - 8) : Math.min(252, barBottom + 8);
          return { x, y, value };
        })()
      : null;
  const assetPreferences = useMemo(() => {
    const baseSymbol = trade.symbol.replace("USDT", "");
    return [
      { label: baseSymbol, value: 36.2, color: "#5A73FF" },
      { label: "ETH", value: 18.4, color: "#43C6A3" },
      { label: "SOL", value: 12.1, color: "#F3B35A" },
      { label: "DOGE", value: 8.7, color: "#E1667C" },
      { label: "Other", value: 24.6, color: "#7A89A6" },
    ];
  }, [trade.symbol]);
  const translateMonthLabel = (label: string) => {
    if (uiLang !== "zh") return label;
    switch (label) {
      case "May":
        return "5月";
      case "Jul":
        return "7月";
      case "Sep":
        return "9月";
      case "Nov":
        return "11月";
      case "Jan":
        return "1月";
      case "Mar":
        return "3月";
      default:
        return label;
    }
  };
  const translatePreferenceLabel = (label: string) => (label === "Other" ? tr("Other", "其他") : label);
  const translateFillAction = (action: string) => {
    switch (action) {
      case "Open Long":
        return tr("Open Long", "开多");
      case "Close Long":
        return tr("Close Long", "平多");
      case "Open Short":
        return tr("Open Short", "开空");
      case "Close Short":
        return tr("Close Short", "平空");
      default:
        return action;
    }
  };
  return (
    <div className="oq-trade-detail min-w-0" style={semanticColorVars}>
      <div className="oq-trade-detail-heading">
        <Link href="/trade" className="oq-trade-detail-back">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          <span>{tr("Back to Trade", "返回交易")}</span>
        </Link>

        <header className="oq-trade-detail-hero">
          <div className="oq-trade-detail-title-copy">
            <div className="oq-trade-detail-title-line">
              <span className="oq-trade-detail-id">{trade.id}</span>
              <h1>{trade.name}</h1>
            </div>
            <div className="oq-trade-detail-meta">
              <span aria-live="polite">{tr("Updated", "更新于")} {displayedUpdatedAt}</span>
              <span className="oq-trade-detail-market-meta">
                {trade.symbol} · {trade.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")} · {trade.leverage}
              </span>
              <div className="oq-trade-detail-title-tags">
                <span className={`oq-trade-detail-mode ${runtimeEnvironment === "paper" ? "is-paper" : "is-live"}`}>
                  {runtimeEnvironment === "paper" ? tr("Paper", "模拟") : tr("Live", "实盘")}
                </span>
                <span
                  className={`oq-trade-detail-status ${runtimeStatus === "running" ? "is-running" : "is-paused"}`}
                  aria-live="polite"
                >
                  <span aria-hidden="true" />
                  {runtimeStatus === "running" ? tr("Running", "运行中") : tr("Paused", "已暂停")}
                </span>
              </div>
            </div>
          </div>

          <div className="oq-trade-detail-statuses" aria-label={tr("Trade controls", "交易控制")}>
            <button
              type="button"
              className="oq-trade-detail-action"
              onClick={() => {
                setRefreshedAtByTrade((current) => ({
                  ...current,
                  [tradeId]: formatRefreshTimestamp(new Date()),
                }));
              }}
            >
              <RefreshCw aria-hidden="true" />
              <span>{tr("Refresh", "刷新")}</span>
            </button>
            <button
              type="button"
              className="oq-trade-detail-action is-stop"
              disabled={runtimeStatus === "paused"}
              onClick={() => {
                setExecutionStatusOverride({ tradeId, status: "paused" });

                if (typeof window !== "undefined") {
                  const nextSearchParams = new URLSearchParams(window.location.search);
                  nextSearchParams.set("status", "paused");
                  window.history.replaceState(
                    window.history.state,
                    "",
                    `${window.location.pathname}?${nextSearchParams.toString()}`
                  );
                }
              }}
            >
              <Square aria-hidden="true" />
              <span>{tr("Stop", "停止")}</span>
            </button>
          </div>
        </header>
      </div>

      <section className="oq-trade-overview" aria-label={tr("Strategy overview", "策略概览")}>
        <div className="oq-trade-overview-grid">
          <article className="oq-trade-overview-card oq-trade-performance-card" aria-label={tr("Strategy Performance", "项目表现")}>
            <StrategyReportDateControl
              dateLabel={tr("Past 30 days", "过去30天")}
              dateOptions={[
                tr("Past 30 days", "过去30天"),
                tr("Past 90 days", "过去90天"),
                tr("Past 180 days", "过去180天"),
                tr("Past year", "过去1年"),
                tr("Custom start date", "自定义起始时间"),
              ]}
              customDateOption={tr("Custom start date", "自定义起始时间")}
              uiLang={uiLang}
              variant="compact"
              labels={{
                selectPeriod: tr("Select performance period", "选择表现周期"),
                customRange: tr("Custom date range", "自定义时间范围"),
                startDate: tr("Start date", "开始日期"),
                endDate: tr("End date", "结束日期"),
              }}
            />

            <dl className="oq-trade-performance-metrics">
              {performanceMetrics.map((metric) => (
                <MaybeExplainTooltip
                  enabled={plainExplainEnabled}
                  explanation={metric.explanation}
                  key={metric.label}
                >
                  <div tabIndex={plainExplainEnabled ? 0 : undefined}>
                    <dt>{metric.label}</dt>
                    <dd className={metric.className}>{metric.value}</dd>
                  </div>
                </MaybeExplainTooltip>
              ))}
            </dl>
          </article>

          <article className="oq-trade-overview-card oq-trade-trend-card" aria-labelledby="trade-trend-title">
            <header className="oq-trade-overview-card-header oq-trade-trend-header">
              <h2 id="trade-trend-title">{tr("Performance Trend", "收益走势")}</h2>
              <div className="oq-trade-trend-selector" role="group" aria-label={tr("Trend metric", "走势指标")}>
                <button
                  type="button"
                  className={overviewMetric === "return" ? "is-active" : ""}
                  aria-pressed={overviewMetric === "return"}
                  onClick={() => setOverviewMetric("return")}
                >
                  {tr("Return", "收益率")}
                </button>
                <button
                  type="button"
                  className={overviewMetric === "pnl" ? "is-active" : ""}
                  aria-pressed={overviewMetric === "pnl"}
                  onClick={() => setOverviewMetric("pnl")}
                >
                  {tr("PnL", "盈亏")}
                </button>
              </div>
            </header>

            <div className="oq-trade-trend-body">
              <ChartContainer
                className="oq-trade-trend-chart"
                config={{
                  [overviewMetricKey]: {
                    label: overviewMetric === "return" ? tr("Return", "收益率") : tr("PnL", "盈亏"),
                    color: overviewTrendEndColor,
                  },
                }}
                role="img"
                aria-label={
                  overviewMetric === "return"
                    ? tr(`30-day return trend ending at ${formatSigned(roi)}%.`, `近 30 天收益率走势，期末为 ${formatSigned(roi)}%。`)
                    : tr(`30-day PnL trend ending at ${formatSigned(totalPnl)} USDT.`, `近 30 天盈亏走势，期末为 ${formatSigned(totalPnl)} USDT。`)
                }
              >
                <AreaChart data={overviewTrendData} accessibilityLayer margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id={overviewTrendStrokeId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset={`${overviewTrendZeroOffset * 100}%`} stopColor="var(--semantic-up)" />
                      <stop offset={`${overviewTrendZeroOffset * 100}%`} stopColor="var(--semantic-down)" />
                    </linearGradient>
                    <linearGradient id={overviewTrendFillId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--semantic-up)" stopOpacity={0.08} />
                      <stop offset={`${overviewTrendZeroOffset * 100}%`} stopColor="var(--semantic-up)" stopOpacity={0.08} />
                      <stop offset={`${overviewTrendZeroOffset * 100}%`} stopColor="var(--semantic-down)" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="var(--semantic-down)" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--td-chart-grid)" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    interval={5}
                    minTickGap={24}
                    tick={{ fill: "var(--td-muted)", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    width={48}
                    domain={overviewTrendDomain}
                    ticks={overviewTrendYAxisTicks}
                    tick={{ fill: "var(--td-muted)", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500 }}
                    tickFormatter={(value) => {
                      const numericValue = Number(value);
                      if (numericValue === 0) return overviewMetric === "return" ? "0%" : "0";

                      return overviewMetric === "return"
                        ? `${numericValue.toFixed(1)}%`
                        : numericValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: "var(--td-muted)", strokeDasharray: "4 6", strokeOpacity: 0.45 }}
                    wrapperStyle={{ zIndex: 8, pointerEvents: "none" }}
                    content={(
                      <TradeTrendTooltip
                        metric={overviewMetric}
                        metricLabel={overviewMetric === "return" ? tr("Return", "收益率") : tr("PnL", "盈亏")}
                        year={trade.updatedAt.slice(0, 4)}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey={overviewMetricKey}
                    stroke={`url(#${overviewTrendStrokeId})`}
                    strokeWidth={2.4}
                    fill={`url(#${overviewTrendFillId})`}
                    fillOpacity={1}
                    dot={false}
                    activeDot={<OverviewTrendActiveDot metricKey={overviewMetricKey} />}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </article>

          <article className="oq-trade-overview-card oq-trade-allocation-card" aria-labelledby="trade-allocation-title">
            <header className="oq-trade-overview-card-header">
              <h2 id="trade-allocation-title">{tr("Asset Preference", "资产偏好")}</h2>
            </header>

            {overviewAllocationData.length > 0 ? (
              <div
                className="oq-trade-allocation-body"
                onMouseLeave={() => setActiveAllocationAsset(null)}
                onPointerLeave={() => setActiveAllocationAsset(null)}
              >
                <div className="oq-trade-allocation-visual">
                  <ChartContainer
                    className="oq-trade-allocation-chart"
                    config={{ allocation: { label: tr("Allocation", "资产占比") } }}
                    role="img"
                    aria-label={overviewAllocationAriaLabel}
                  >
                    <RechartsPieChart accessibilityLayer>
                      <RechartsTooltip
                        cursor={false}
                        wrapperStyle={{ zIndex: 4, pointerEvents: "none" }}
                        content={(
                          <TradeAllocationTooltip
                            otherLabel={tr("Other", "其他")}
                            itemUnitLabel={tr("assets", "项")}
                          />
                        )}
                      />
                      <Pie
                        data={overviewAllocationData}
                        dataKey="percent"
                        nameKey="asset"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={overviewAllocationData.length > 6 ? 0.75 : 2}
                        stroke="var(--td-bg)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {overviewAllocationData.map((item) => (
                          <Cell
                            key={item.asset}
                            className="oq-trade-allocation-cell"
                            fill={item.color}
                            opacity={activeAllocationAsset === null || activeAllocationAsset === item.asset ? 1 : 0.18}
                            strokeWidth={activeAllocationAsset === item.asset ? 3 : 2}
                            onMouseEnter={() => setActiveAllocationAsset(item.asset)}
                          />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                </div>

                <div
                  className="oq-trade-allocation-legend"
                  role="group"
                  aria-label={tr("Asset allocation details", "资产占比明细")}
                >
                  {overviewAllocationData.map((item) => (
                    <button
                      type="button"
                      key={item.asset}
                      aria-pressed={activeAllocationAsset === item.asset}
                      aria-label={`${item.isOther ? tr("Other", "其他") : item.asset}: ${item.percent.toFixed(2)}%`}
                      onFocus={() => setActiveAllocationAsset(item.asset)}
                      onBlur={() => setActiveAllocationAsset(null)}
                      onMouseEnter={() => setActiveAllocationAsset(item.asset)}
                      onPointerEnter={() => setActiveAllocationAsset(item.asset)}
                    >
                      <span className="oq-trade-allocation-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                      <span title={item.isOther ? tr("Other", "其他") : item.asset}>
                        {item.isOther ? tr("Other", "其他") : item.asset}
                      </span>
                      <strong>{item.percent.toFixed(2)}%</strong>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="oq-trade-allocation-empty" role="status">
                <PieChart aria-hidden="true" />
                <strong>{tr("No open positions", "暂无当前仓位")}</strong>
                <span>{tr("Allocation will appear after a position is opened.", "开仓后将在这里显示资产占比。")}</span>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="oq-trade-workspace" aria-label={tr("Position workspace", "仓位工作台")}>
        <Tabs defaultValue="current" className="oq-trade-workspace-tabs">
          <div className="oq-trade-workspace-tabs-header">
            <TabsList className="oq-trade-workspace-tabs-list" aria-label={tr("Position views", "仓位视图")}>
              <TabsTrigger value="current">{tr("Current Positions", "当前仓位")}</TabsTrigger>
              <TabsTrigger value="history">{tr("Position History", "历史仓位")}</TabsTrigger>
              <TabsTrigger value="activity">{tr("Activity Log", "操作记录")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="current" className="oq-trade-workspace-tab-panel">
            <TradeWorkspaceTable
              label={tr("Current positions", "当前仓位")}
              className="is-current-positions"
              headers={[
                tr("Symbol", "交易对"),
                tr("Size", "数量"),
                tr("Entry", "开仓均价"),
                tr("Mark", "标记价格"),
                tr("Margin", "保证金"),
                tr("Unrealized PnL (ROI)", "未实现盈亏（ROI）"),
              ]}
              isEmpty={currentPositionRows.length === 0}
              emptyMessage={tr("No current positions", "暂无当前仓位")}
            >
              {currentPositionRows.map((row) => (
                <tr key={row.id}>
                  <td className="oq-trade-position-symbol">
                    <div className="oq-trade-position-symbol-line">
                      <strong>{row.symbol}</strong>
                    </div>
                    <div className="oq-trade-position-meta">
                      <span className={`oq-trade-position-direction is-${row.side}`}>
                        {row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}
                      </span>
                      <span>{tr("Perp", "永续")}</span>
                      <span>{row.leverage}</span>
                    </div>
                  </td>
                  <td className={`oq-trade-position-size is-${row.side}`}>
                    {row.signedSize}
                  </td>
                  <td className="oq-trade-position-number">{row.entry}</td>
                  <td className="oq-trade-position-number">{row.mark}</td>
                  <td className="oq-trade-position-stack">
                    <strong>{row.margin}</strong>
                    <span className="oq-trade-position-margin-mode">
                      {row.marginMode === "cross" ? tr("Cross", "全仓") : tr("Isolated", "逐仓")}
                    </span>
                  </td>
                  <td className={`oq-trade-workspace-value ${row.pnl >= 0 ? "is-positive" : "is-negative"}`}>
                    <strong>{formatSigned(row.pnl)} USDT</strong>
                    <span>({formatSigned(row.roi)}%)</span>
                  </td>
                </tr>
              ))}
            </TradeWorkspaceTable>
          </TabsContent>

          <TabsContent value="history" className="oq-trade-workspace-tab-panel">
            <TradeWorkspaceTable
              label={tr("Position history", "历史仓位")}
              className="is-history-positions"
              headers={[
                tr("Symbol", "交易对"),
                tr("Opened At", "开仓时间"),
                tr("Entry Price", "开仓价格"),
                tr("Closed At", "全部平仓"),
                tr("Maximum Position Size", "最大持仓量"),
                tr("Exit Average", "平仓均价"),
                tr("Realized PnL", "平仓盈亏"),
              ]}
              isEmpty={historicalPositions.length === 0}
              emptyMessage={tr("No position history", "暂无历史仓位")}
            >
              {historicalPositions.map((row) => {
                const [openedDate, openedTime] = row.openedAt.split(" ");
                const [closedDate, closedTime] = row.closedAt.split(" ");

                return (
                  <tr key={row.id}>
                    <td className="oq-trade-position-symbol">
                      <div className="oq-trade-position-symbol-line">
                        <strong>{row.symbol}</strong>
                      </div>
                      <div className="oq-trade-position-meta">
                        <span className={`oq-trade-position-direction is-${row.side}`}>
                          {row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}
                        </span>
                        <span>{row.marginMode === "cross" ? tr("Cross", "全仓") : tr("Isolated", "逐仓")}</span>
                        <span>{row.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")}</span>
                        <span>{row.leverage}</span>
                      </div>
                    </td>
                    <td className="oq-trade-history-time">
                      <strong>{openedDate}</strong>
                      <span>{openedTime}</span>
                    </td>
                    <td className="oq-trade-position-number">{row.entryPrice}</td>
                    <td className="oq-trade-history-time">
                      <strong>{closedDate}</strong>
                      <span>{closedTime}</span>
                    </td>
                    <td className="oq-trade-position-stack">
                      <strong>{row.maxSize}</strong>
                      <div className="oq-trade-history-closed-line">
                        <span>{tr("Closed", "已平仓")}</span>
                        <strong>{row.closedSize}</strong>
                      </div>
                    </td>
                    <td className="oq-trade-position-number">{row.exitPrice}</td>
                    <td className={`oq-trade-workspace-value ${row.realizedPnl >= 0 ? "is-positive" : "is-negative"}`}>
                      {formatSigned(row.realizedPnl)} USDT
                    </td>
                  </tr>
                );
              })}
            </TradeWorkspaceTable>
          </TabsContent>

          <TabsContent value="activity" className="oq-trade-workspace-tab-panel">
            {visibleFills.length > 0 ? (
              <ol className="oq-trade-activity-list" aria-label={tr("Activity log", "操作记录")}>
                {visibleFills.map((row) => {
                  const [date, clock] = row.time.split(" ");
                  const isOpen = row.action.startsWith("Open");
                  const directionClass = row.action.endsWith("Long") ? "is-long" : "is-short";

                  return (
                    <li key={row.id} className={`oq-trade-activity-item ${isOpen ? "is-open" : "is-close"}`}>
                      <time className="oq-trade-activity-time" dateTime={`2026-${row.time.replace(" ", "T")}`}>
                        <span>{date},</span>
                        <strong>{clock}</strong>
                      </time>

                      <div className="oq-trade-activity-marker" aria-hidden="true">
                        <span />
                      </div>

                      <div className="oq-trade-activity-content">
                        <header className="oq-trade-activity-header">
                          <div className="oq-trade-activity-identity">
                            <strong>{row.symbol}</strong>
                            <span className={`oq-trade-position-direction ${directionClass}`}>
                              {translateFillAction(row.action)}
                            </span>
                            <span className="oq-trade-activity-market">
                              {row.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")}
                            </span>
                          </div>
                        </header>

                        <p className="oq-trade-activity-summary">
                          <span className="oq-trade-activity-fill-detail">
                            {uiLang === "zh" ? (
                              <>
                                以均价 <strong>{row.price} USDT</strong> 成交，数量 <strong>{row.qty}</strong>，成交额 <strong>{row.value}</strong>
                              </>
                            ) : (
                              <>
                                Filled at an average price of <strong>{row.price} USDT</strong>, quantity <strong>{row.qty}</strong>, value <strong>{row.value}</strong>
                              </>
                            )}
                          </span>
                          {row.realizedPnl !== undefined ? (
                            <span className={`oq-trade-activity-pnl ${row.realizedPnl >= 0 ? "is-positive" : "is-negative"}`}>
                              <span>{tr("Realized PnL", "，已实现盈亏")}</span>
                              <strong>{formatSigned(row.realizedPnl)} USDT</strong>
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="oq-trade-workspace-empty">{tr("No activity records", "暂无操作记录")}</div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {viewMode === "analysis" ? (
        <>
          <div className="grid grid-cols-1 gap-5">
            <DashboardPanel
              title={tr("Asset Curve", "资产曲线")}
              icon={BarChart3}
              showHeaderDivider={false}
              flushHeaderBottom
              actions={
                <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
                  {analysisRanges.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setAnalysisCurveRange(item);
                        setAnalysisCurveHoverIndex(null);
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors ${
                        analysisCurveRange === item
                          ? "border border-primary/45 bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {formatAnalysisRangeLabel(item, uiLang)}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="flex min-h-[285px] flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <ChartLegendItem color={equityCurveColor} label={tr("Strategy", "策略")} />
                    <ChartLegendItem color="var(--chart-1)" label={tr("Benchmark", "基准")} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <ExplainStat
                      label={tr("Strategy", "策略")}
                      value={`${formatSigned(analysisCurve.strategyReturn)}%`}
                      tone={analysisCurve.strategyReturn >= 0 ? "positive" : "negative"}
                      explanation={tr("Strategy return over the selected period.", "所选周期内策略自身的收益率。")}
                      explainEnabled={plainExplainEnabled}
                    />
                    <ExplainStat
                      label={tr("Benchmark", "基准")}
                      value={`${formatSigned(analysisCurve.benchmarkReturn)}%`}
                      tone={analysisCurve.benchmarkReturn >= 0 ? "positive" : "negative"}
                      explanation={tr("Benchmark return over the selected period.", "所选周期内基准资产或参考组合的收益率。")}
                      explainEnabled={plainExplainEnabled}
                    />
                    <ExplainStat
                      label={tr("Excess", "超额")}
                      value={`${formatSigned(analysisCurve.excessReturn)}%`}
                      tone={analysisCurve.excessReturn >= 0 ? "positive" : "negative"}
                      explanation={tr("Return above the benchmark. Excess return = strategy return - benchmark return.", "相对基准多获得的收益，超额收益 = 策略收益 - 基准收益。")}
                      explainEnabled={plainExplainEnabled}
                    />
                  </div>
                </div>

                <div className="relative h-[205px] sm:h-[225px]">
                  <svg
                    viewBox={`0 0 ${analysisCurve.width} ${analysisCurve.height}`}
                    preserveAspectRatio="none"
                    className="block h-full w-full"
                    onMouseMove={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const ratio = (event.clientX - rect.left) / rect.width;
                      const index = Math.round(
                        Math.max(0, Math.min(1, ratio)) * (analysisCurve.strategyValues.length - 1)
                      );
                      setAnalysisCurveHoverIndex(index);
                    }}
                    onMouseLeave={() => setAnalysisCurveHoverIndex(null)}
                  >
                    <defs>
                      <linearGradient id="trade-curve-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={equityCurveColor} stopOpacity="0.24" />
                        <stop offset="100%" stopColor={equityCurveColor} stopOpacity="0.03" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width={analysisCurve.width}
                      height={analysisCurve.height}
                      rx="14"
                      fill="var(--muted)"
                      opacity="0.38"
                    />
                    {Array.from({ length: 6 }, (_, index) => (
                      <line
                        key={`curve-grid-${index}`}
                        x1={analysisCurve.padding}
                        y1={analysisCurve.padding + index * ((analysisCurve.height - analysisCurve.padding * 2) / 5)}
                        x2={analysisCurve.width - analysisCurve.padding}
                        y2={analysisCurve.padding + index * ((analysisCurve.height - analysisCurve.padding * 2) / 5)}
                        stroke="var(--border)"
                        opacity="0.72"
                        strokeDasharray="3 8"
                      />
                    ))}
                    <path d={analysisCurve.strategyArea} fill="url(#trade-curve-fill)" />
                    <path
                      d={analysisCurve.strategyPath}
                      fill="none"
                      stroke={equityCurveColor}
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <path
                      d={analysisCurve.benchmarkPath}
                      fill="none"
                      stroke="var(--chart-1)"
                      strokeWidth="2.3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    {analysisCurveHoverPoint ? (
                      <line
                        x1={analysisCurveHoverPoint.x}
                        y1={analysisCurve.padding}
                        x2={analysisCurveHoverPoint.x}
                        y2={analysisCurve.height - analysisCurve.padding}
                        stroke="var(--muted-foreground)"
                        opacity="0.35"
                        strokeDasharray="4 6"
                      />
                    ) : null}
                  </svg>

                  {analysisCurveHoverPoint ? (
                    <>
                      <span
                        className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm"
                        style={{
                          left: `${(analysisCurveHoverPoint.x / analysisCurve.width) * 100}%`,
                          top: `${(analysisCurveHoverPoint.y / analysisCurve.height) * 100}%`,
                          backgroundColor: equityCurveColor,
                        }}
                      />
                      {analysisBenchmarkHoverPoint ? (
                        <span
                          className="pointer-events-none absolute z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--chart-1)] shadow-sm"
                          style={{
                            left: `${(analysisBenchmarkHoverPoint.x / analysisCurve.width) * 100}%`,
                            top: `${(analysisBenchmarkHoverPoint.y / analysisCurve.height) * 100}%`,
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}

                  {analysisCurveHoverIndex !== null ? (
                    <div
                      className="pointer-events-none absolute z-30 w-max min-w-[148px] rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                      style={{
                        left: `${(analysisCurve.strategyPoints[analysisCurveHoverIndex].x / analysisCurve.width) * 100}%`,
                        transform:
                          analysisCurveHoverIndex === 0
                            ? "translateX(0)"
                            : analysisCurveHoverIndex === analysisCurve.strategyPoints.length - 1
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                        top: 18,
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {translateMonthLabel(analysisCurve.labels[
                          Math.min(
                            analysisCurve.labels.length - 1,
                            Math.floor((analysisCurveHoverIndex / Math.max(1, analysisCurve.strategyValues.length - 1)) * analysisCurve.labels.length)
                          )
                        ])}
                      </div>
                      <div className="mt-1 grid grid-cols-[auto_auto_1fr] items-center gap-2 whitespace-nowrap">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: equityCurveColor }} />
                        <span className="text-muted-foreground">{tr("Strategy", "策略")}</span>
                        <span className="text-right font-semibold text-foreground">
                          {analysisCurve.strategyValues[analysisCurveHoverIndex].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-[auto_auto_1fr] items-center gap-2 whitespace-nowrap">
                        <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
                        <span className="text-muted-foreground">{tr("Benchmark", "基准")}</span>
                        <span className="text-right font-semibold text-foreground">
                          {analysisCurve.benchmarkValues[analysisCurveHoverIndex].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-between text-[11px] text-muted-foreground">
                  {analysisCurve.labels.map((label) => (
                    <span key={label}>{translateMonthLabel(label)}</span>
                  ))}
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title={tr("Asset Preferences", "资产偏好")} icon={PieChart} showHeaderDivider={false} flushHeaderBottom>
              <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[0.75fr_1.25fr]">
                <div className="flex items-center justify-center">
                  <div className="relative h-[244px] w-[244px] sm:h-[272px] sm:w-[272px]">
                    <svg viewBox="0 0 260 260" className="h-full w-full">
                      <circle cx="130" cy="130" r="84" fill="none" stroke="var(--border)" strokeWidth="34" opacity="0.65" />
                      {(() => {
                        const circumference = 2 * Math.PI * 84;
                        let offset = 0;
                        return assetPreferences.map((slice) => {
                          const length = (slice.value / 100) * circumference;
                          const node = (
                            <circle
                              key={slice.label}
                              cx="130"
                              cy="130"
                              r="84"
                              fill="none"
                              stroke={slice.color}
                              strokeWidth="34"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              transform="rotate(-90 130 130)"
                              opacity="0.9"
                            />
                          );
                          offset += length;
                          return node;
                        });
                      })()}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{tr("Top Asset", "核心资产")}</div>
                      <div className="mt-1 max-w-[86px] truncate text-lg font-semibold leading-none text-foreground">
                        {translatePreferenceLabel(assetPreferences[0]?.label ?? "")}
                      </div>
                      <div className="mt-1 max-w-[96px] text-[11px] leading-4 text-muted-foreground">
                        {assetPreferences[0]?.value.toFixed(2)}% {tr("allocation", "仓位占比")}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                  {assetPreferences.map((slice) => (
                    <div key={slice.label} className="flex min-h-8 items-center justify-between rounded-lg px-2.5 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span className="font-medium text-muted-foreground">{translatePreferenceLabel(slice.label)}</span>
                      </span>
                      <span className="font-semibold text-foreground">{slice.value.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel
            title={tr("Daily Returns", "日收益")}
            icon={Activity}
            showHeaderDivider={false}
            flushHeaderBottom
            actions={
              <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
                <ExplainStat
                  label={tr("Avg", "均值")}
                  value={`${formatSigned(analysisReturnSummary.avg)}%`}
                  tone={analysisReturnSummary.avg >= 0 ? "positive" : "negative"}
                  explanation={tr("Average daily return in the selected period.", "所选周期内每日收益率的平均值。")}
                  explainEnabled={plainExplainEnabled}
                />
                <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={tr("Number of days with positive returns in the selected period.", "所选周期内收益为正的交易日数量。")}>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--semantic-up)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-up)]" />
                    {tr("W", "胜")}{analysisReturnSummary.wins}
                  </span>
                </MaybeExplainTooltip>
                <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={tr("Number of days with negative returns in the selected period.", "所选周期内收益为负的交易日数量。")}>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--semantic-down)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-down)]" />
                    {tr("L", "负")}{analysisReturnSummary.losses}
                  </span>
                </MaybeExplainTooltip>
                <div className="ml-1 flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
                  {analysisRanges.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setAnalysisReturnRange(item);
                        setAnalysisReturnHoverIndex(null);
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors ${
                        analysisReturnRange === item
                          ? "border border-primary/45 bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {formatAnalysisRangeLabel(item, uiLang)}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="relative">
              <svg
                viewBox="0 0 1120 280"
                preserveAspectRatio="none"
                className="block h-[220px] w-full sm:h-[240px]"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const svgX = ((event.clientX - rect.left) / rect.width) * 1120;
                  const plotX = Math.max(28, Math.min(1092, svgX));
                  const slot = 1064 / analysisReturns.length;
                  const index = Math.max(0, Math.min(analysisReturns.length - 1, Math.floor((plotX - 28) / slot)));
                  setAnalysisReturnHoverIndex(index);
                }}
                onMouseLeave={() => setAnalysisReturnHoverIndex(null)}
              >
                <rect x="0" y="0" width="1120" height="280" rx="14" fill="var(--muted)" opacity="0.38" />
                {Array.from({ length: 5 }, (_, index) => (
                  <line
                    key={`ret-grid-${index}`}
                    x1="28"
                    y1={32 + index * 54}
                    x2="1092"
                    y2={32 + index * 54}
                    stroke="var(--border)"
                    opacity="0.72"
                    strokeDasharray="3 8"
                  />
                ))}
                <line x1="28" y1="140" x2="1092" y2="140" stroke="var(--muted-foreground)" opacity="0.28" />
                {analysisReturns.map((value, index) => {
                  const slot = 1064 / analysisReturns.length;
                  const barWidth = Math.max(8, slot - 6);
                  const x = 28 + index * slot + (slot - barWidth) / 2;
                  const magnitude = Math.min(105, (Math.abs(value) / 1.4) * 105);
                  const y = value >= 0 ? 140 - magnitude : 140;
                  return (
                    <rect
                      key={`ret-bar-${index}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(3, magnitude)}
                      rx="2"
                      fill={value >= 0 ? "var(--semantic-up)" : "var(--semantic-down)"}
                      opacity={analysisReturnHoverIndex === index ? 1 : 0.92}
                    />
                  );
                })}
                {analysisReturnHoverIndex !== null ? (
                  (() => {
                    const slot = 1064 / analysisReturns.length;
                    const x = 28 + analysisReturnHoverIndex * slot + slot / 2;
                    return (
                      <line
                        x1={x}
                        y1="24"
                        x2={x}
                        y2="252"
                        stroke="var(--muted-foreground)"
                        opacity="0.35"
                        strokeDasharray="4 6"
                      />
                    );
                  })()
                ) : null}
              </svg>

              {analysisReturnHoverIndex !== null ? (
                <div
                  className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                  style={{
                    left: `${(((analysisReturnHoverGeometry?.x ?? 28) / 1120) * 100)}%`,
                    transform:
                      analysisReturnHoverIndex === 0
                        ? `translate(0, ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`
                        : analysisReturnHoverIndex === analysisReturns.length - 1
                          ? `translate(-100%, ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`
                          : `translate(-50%, ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`,
                    top: `${(((analysisReturnHoverGeometry?.y ?? 24) / 280) * 100)}%`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {translateMonthLabel(analysisReturnConfig[analysisReturnRange].labels[
                      Math.min(
                        analysisReturnConfig[analysisReturnRange].labels.length - 1,
                        Math.floor(
                          (analysisReturnHoverIndex / Math.max(1, analysisReturns.length - 1)) *
                            analysisReturnConfig[analysisReturnRange].labels.length
                        )
                      )
                    ])}
                  </div>
                  <div className={`mt-1 font-semibold ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"}`}>
                    {formatSigned(analysisReturns[analysisReturnHoverIndex])}%
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              {analysisReturnConfig[analysisReturnRange].labels.map((label) => (
                <span key={label}>{translateMonthLabel(label)}</span>
              ))}
            </div>
          </DashboardPanel>

        </>
      ) : null}
    </div>
  );
}

function TradeWorkspaceTable({
  label,
  className,
  headers,
  isEmpty,
  emptyMessage,
  children,
}: {
  label: string;
  className?: string;
  headers: string[];
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (isEmpty) {
    return <div className="oq-trade-workspace-empty">{emptyMessage}</div>;
  }

  return (
    <div className="oq-trade-workspace-table-scroll">
      <table className={`oq-trade-workspace-table${className ? ` ${className}` : ""}`} aria-label={label}>
        <thead>
          <tr>
            {headers.map(header => <th key={header} scope="col">{header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TradeTrendTooltip({
  active,
  label,
  payload,
  metric,
  metricLabel,
  year,
}: {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: string | number }[];
  metric: OverviewMetric;
  metricLabel: string;
  year: string;
}) {
  const numericValue = Number(payload?.[0]?.value);

  if (!active || !Number.isFinite(numericValue)) return null;

  const formattedValue = `${numericValue > 0 ? "+" : ""}${numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${metric === "return" ? "%" : " USDT"}`;

  return (
    <div className="oq-trade-trend-tooltip" role="status">
      <div className="oq-trade-trend-tooltip-date">{year}-{String(label ?? "--")}</div>
      <div className="oq-trade-trend-tooltip-row">
        <i
          style={{ backgroundColor: numericValue >= 0 ? "var(--semantic-up)" : "var(--semantic-down)" }}
          aria-hidden="true"
        />
        <span>{metricLabel}</span>
        <strong>{formattedValue}</strong>
      </div>
    </div>
  );
}

function TradeAllocationTooltip({
  active,
  payload,
  otherLabel,
  itemUnitLabel,
}: {
  active?: boolean;
  payload?: readonly { payload?: TradeAllocationDatum }[];
  otherLabel: string;
  itemUnitLabel: string;
}) {
  const item = payload?.[0]?.payload;

  if (!active || !item) return null;

  return (
    <div className="oq-trade-allocation-tooltip">
      <div className="oq-trade-allocation-tooltip-head">
        <span>
          <i style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.isOther ? `${otherLabel} · ${item.memberCount} ${itemUnitLabel}` : item.asset}
        </span>
        <strong>{item.percent.toFixed(2)}%</strong>
      </div>
    </div>
  );
}

function ExplainStat({
  label,
  value,
  tone = "neutral",
  explanation,
  explainEnabled = false,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  explanation?: string;
  explainEnabled?: boolean;
}) {
  return (
    <MaybeExplainTooltip enabled={explainEnabled && Boolean(explanation)} explanation={explanation ?? ""}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        {label}
        <span className={`font-semibold ${classForTone(tone)}`}>{value}</span>
      </span>
    </MaybeExplainTooltip>
  );
}

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled: boolean;
  explanation: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="oq-plain-explanation-tooltip">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  actions,
  contentClassName = "h-full p-4",
  showHeaderDivider = true,
  flushHeaderBottom = false,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  contentClassName?: string;
  showHeaderDivider?: boolean;
  flushHeaderBottom?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="surface-card h-full overflow-hidden p-0">
      <div className={`flex items-center justify-between px-4 pt-3 ${flushHeaderBottom ? "pb-0" : "pb-3"} ${showHeaderDivider ? "border-b border-border/60" : ""}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </h2>
        </div>
        {actions}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
