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
import { StrategyReportDateControl } from "./StrategyReportDateControl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatSigned,
  tradeBots,
  tradePositionRows,
  type TradeEnvironment,
} from "@/lib/tradeData";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import "./TradeDetail.css";

function isTradeEnvironment(value: string | null): value is TradeEnvironment {
  return value === "paper" || value === "live";
}

type TradeViewMode = "trading" | "analysis";
type OverviewMetric = "return" | "pnl";
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
  const [analysisCurveRange, setAnalysisCurveRange] = useState<AnalysisRange>("90D");
  const [analysisReturnRange, setAnalysisReturnRange] = useState<AnalysisRange>("30D");
  const [analysisCurveHoverIndex, setAnalysisCurveHoverIndex] = useState<number | null>(null);
  const [analysisReturnHoverIndex, setAnalysisReturnHoverIndex] = useState<number | null>(null);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
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
  const runtimeStatus = statusFromQuery === "paused" ? "paused" : "running";

  const visiblePositions = tradePositionRows.filter(
    (row) => row.environment === runtimeEnvironment
  );
  const realizedPnl = Number((trade.unrealizedPnl * 2.65).toFixed(2));
  const totalPnl = realizedPnl + trade.unrealizedPnl;
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const estimatedSharpe = Number((0.45 + trade.winRate / 32).toFixed(2));
  const maxDrawdown = Number((3.5 + (100 - trade.winRate) * 0.23).toFixed(2));
  const profitablePositions = visiblePositions.filter((row) => row.pnl > 0).length;

  const overviewTrendData = useMemo(() => {
    const parsedDate = new Date(`${trade.updatedAt.slice(0, 10)}T00:00:00`);
    const endDate = Number.isNaN(parsedDate.getTime()) ? new Date("2026-04-18T00:00:00") : parsedDate;

    return Array.from({ length: 30 }, (_, index) => {
      const progress = index / 29;
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (29 - index));
      const wave = Math.sin(index * 0.58) * Math.sin(progress * Math.PI);
      const returnValue = roi * progress + wave * Math.max(Math.abs(roi) * 0.28, 0.04);
      const pnlValue = totalPnl * progress + wave * Math.max(Math.abs(totalPnl) * 0.08, 8);

      return {
        date: `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
        returnValue: Number(returnValue.toFixed(3)),
        pnlValue: Number(pnlValue.toFixed(2)),
      };
    });
  }, [roi, totalPnl, trade.updatedAt]);

  const overviewAllocationData = useMemo(() => {
    const palette = ["#3478f6", "#f59e0b", "#2a9d8f", "#8b6fd8"];
    const totals = new Map<string, number>();

    visiblePositions.forEach((row) => {
      const asset = row.symbol.replace("USDT", "");
      totals.set(asset, (totals.get(asset) ?? 0) + parseNumeric(row.margin));
    });

    if (totals.size === 0) {
      totals.set(trade.symbol.replace("USDT", ""), 1);
    }

    const total = Array.from(totals.values()).reduce((sum, value) => sum + value, 0) || 1;
    return Array.from(totals.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([asset, value], index) => ({
        asset,
        value,
        percent: Number(((value / total) * 100).toFixed(2)),
        color: palette[index % palette.length],
      }));
  }, [trade.symbol, visiblePositions]);

  const overviewMetricKey = overviewMetric === "return" ? "returnValue" : "pnlValue";
  const overviewTrendValues = overviewTrendData.map((row) => row[overviewMetricKey]);
  const overviewTrendMin = Math.min(0, ...overviewTrendValues);
  const overviewTrendMax = Math.max(0, ...overviewTrendValues);
  const overviewTrendPadding = Math.max((overviewTrendMax - overviewTrendMin) * 0.14, overviewMetric === "return" ? 0.03 : 5);
  const overviewTrendDomain: [number, number] = [
    overviewTrendMin - overviewTrendPadding,
    overviewTrendMax + overviewTrendPadding,
  ];
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
              <h1>{trade.name}</h1>
              <span className={`oq-trade-detail-status ${runtimeStatus === "running" ? "is-running" : "is-paused"}`}>
                <span aria-hidden="true" />
                {runtimeStatus === "running" ? tr("Running", "运行中") : tr("Paused", "已暂停")}
              </span>
            </div>
            <div className="oq-trade-detail-meta">
              <span className="oq-trade-detail-id">{trade.id}</span>
              <span>{tr("Updated", "更新于")} {trade.updatedAt}</span>
              <span>
                {trade.symbol} · {trade.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")} · {trade.leverage}
              </span>
            </div>
          </div>

          <div className="oq-trade-detail-statuses" aria-label={tr("Execution environment", "执行环境")}>
            <span className={`oq-trade-detail-environment ${runtimeEnvironment === "paper" ? "is-paper" : "is-live"}`}>
              {runtimeEnvironment === "paper" ? tr("Paper Execution", "模拟执行") : tr("Live Execution", "实盘执行")}
            </span>
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
              labels={{
                selectPeriod: tr("Select performance period", "选择表现周期"),
                customRange: tr("Custom date range", "自定义时间范围"),
                startDate: tr("Start date", "开始日期"),
                endDate: tr("End date", "结束日期"),
              }}
            />

            <dl className="oq-trade-performance-metrics">
              <div>
                <dt>{tr("Return", "收益率")}</dt>
                <dd className={roi >= 0 ? "is-positive" : "is-negative"}>{formatSigned(roi)}%</dd>
              </div>
              <div>
                <dt>{tr("PnL (USDT)", "盈亏（USDT）")}</dt>
                <dd className={totalPnl >= 0 ? "is-positive" : "is-negative"}>{formatSigned(totalPnl)}</dd>
              </div>
              <div>
                <dt>{tr("Sharpe Ratio", "夏普比率")}</dt>
                <dd>{estimatedSharpe.toFixed(2)}</dd>
              </div>
              <div>
                <dt>{tr("Max Drawdown", "最大回撤")}</dt>
                <dd>{maxDrawdown.toFixed(2)}%</dd>
              </div>
              <div>
                <dt>{tr("Win Rate", "胜率")}</dt>
                <dd>{trade.winRate.toFixed(2)}%</dd>
              </div>
              <div>
                <dt>{tr("Profitable Positions", "盈利仓位")}</dt>
                <dd>{profitablePositions}</dd>
              </div>
              <div>
                <dt>{tr("Total Positions", "总仓位数量")}</dt>
                <dd>{visiblePositions.length}</dd>
              </div>
            </dl>
          </article>

          <article className="oq-trade-overview-card oq-trade-trend-card" aria-labelledby="trade-trend-title">
            <header className="oq-trade-overview-card-header oq-trade-trend-header">
              <h2 id="trade-trend-title">{tr("Performance Trend", "收益走势")}</h2>
              <div className="oq-trade-trend-segmented" role="group" aria-label={tr("Trend metric", "走势指标")}>
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

            <ChartContainer
              className="oq-trade-trend-chart"
              config={{
                [overviewMetricKey]: {
                  label: overviewMetric === "return" ? tr("Return", "收益率") : tr("PnL", "盈亏"),
                  color: "var(--semantic-up)",
                },
              }}
              role="img"
              aria-label={
                overviewMetric === "return"
                  ? tr(`30-day return trend ending at ${formatSigned(roi)}%.`, `近 30 天收益率走势，期末为 ${formatSigned(roi)}%。`)
                  : tr(`30-day PnL trend ending at ${formatSigned(totalPnl)} USDT.`, `近 30 天盈亏走势，期末为 ${formatSigned(totalPnl)} USDT。`)
              }
            >
              <AreaChart data={overviewTrendData} accessibilityLayer margin={{ top: 12, right: 12, bottom: 0, left: 2 }}>
                <CartesianGrid vertical={false} stroke="var(--td-border)" strokeOpacity={0.72} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  interval={5}
                  minTickGap={24}
                  tick={{ fill: "var(--td-muted)", fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={58}
                  domain={overviewTrendDomain}
                  tick={{ fill: "var(--td-muted)", fontSize: 10 }}
                  tickFormatter={(value) =>
                    overviewMetric === "return"
                      ? `${Number(value).toFixed(1)}%`
                      : Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
                  }
                />
                <RechartsTooltip
                  cursor={{ stroke: "var(--td-muted)", strokeDasharray: "3 4", strokeOpacity: 0.55 }}
                  contentStyle={{
                    border: "0.75px solid var(--td-border)",
                    borderRadius: 8,
                    background: "var(--td-bg)",
                    boxShadow: "0 8px 20px rgba(60, 40, 20, 0.09)",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "var(--td-muted)", marginBottom: 4 }}
                  labelFormatter={(label) => `${tr("Date", "日期")} ${label}`}
                  formatter={(value) => [
                    overviewMetric === "return"
                      ? `${Number(value).toFixed(2)}%`
                      : `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`,
                    overviewMetric === "return" ? tr("Return", "收益率") : tr("PnL", "盈亏"),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={overviewMetricKey}
                  stroke="var(--semantic-up)"
                  strokeWidth={2}
                  fill="var(--semantic-up)"
                  fillOpacity={0.08}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--td-bg)", stroke: "var(--semantic-up)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          </article>

          <article className="oq-trade-overview-card oq-trade-allocation-card" aria-labelledby="trade-allocation-title">
          <header className="oq-trade-overview-card-header">
            <div>
              <h2 id="trade-allocation-title">{tr("Asset Preference", "资产偏好")}</h2>
              <p>{tr("Current visible positions by margin", "按当前可见持仓保证金计算")}</p>
            </div>
            <span>{tr("Current", "当前")}</span>
          </header>

          <div className="oq-trade-allocation-body">
            <div className="oq-trade-allocation-visual">
              <ChartContainer
                className="oq-trade-allocation-chart"
                config={{ allocation: { label: tr("Allocation", "资产占比") } }}
                role="img"
                aria-label={tr(
                  `Asset allocation across ${overviewAllocationData.length} assets.`,
                  `当前持仓分布于 ${overviewAllocationData.length} 个资产。`
                )}
              >
                <RechartsPieChart accessibilityLayer>
                  <RechartsTooltip
                    contentStyle={{
                      border: "0.75px solid var(--td-border)",
                      borderRadius: 8,
                      background: "var(--td-bg)",
                      boxShadow: "0 8px 20px rgba(60, 40, 20, 0.09)",
                      fontSize: 11,
                    }}
                    formatter={(value, name) => [`${Number(value).toFixed(2)}%`, String(name)]}
                  />
                  <Pie
                    data={overviewAllocationData}
                    dataKey="percent"
                    nameKey="asset"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="var(--td-bg)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {overviewAllocationData.map((item) => (
                      <Cell key={item.asset} fill={item.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ChartContainer>
              <div className="oq-trade-allocation-center" aria-hidden="true">
                <strong>{overviewAllocationData.length}</strong>
                <span>{tr("Assets", "资产")}</span>
              </div>
            </div>

            <ul className="oq-trade-allocation-legend" aria-label={tr("Asset allocation details", "资产占比明细")}>
              {overviewAllocationData.map((item) => (
                <li key={item.asset}>
                  <span className="oq-trade-allocation-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <span>{item.asset}</span>
                  <strong>{item.percent.toFixed(2)}%</strong>
                </li>
              ))}
            </ul>
          </div>
          </article>
        </div>
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
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-5">
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
