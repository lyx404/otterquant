import { useMemo, useState, type ComponentType } from "react";
import { Link, useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatSigned,
  tradeBots,
  tradeFillRows,
  tradePositionRows,
  type FillRow,
  type TradeEnvironment,
} from "@/lib/tradeData";
import {
  ArrowLeft,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";

function isTradeEnvironment(value: string | null): value is TradeEnvironment {
  return value === "paper" || value === "live";
}

type ChartRange = "1m" | "5m" | "15m" | "1H" | "4H" | "1D" | "1W";
type KlineCandle = {
  timeLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
type TradeViewMode = "trading" | "analysis";
type AnalysisRange = "7D" | "30D" | "90D" | "365D";
type CurvePoint = { x: number; y: number; value: number };

const chartRanges: ChartRange[] = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
const analysisRanges: AnalysisRange[] = ["7D", "30D", "90D", "365D"];
const chartRangeConfig: Record<ChartRange, { count: number; drift: number; volatility: number }> = {
  "1m": { count: 36, drift: 0.00008, volatility: 0.0028 },
  "5m": { count: 40, drift: 0.00012, volatility: 0.0032 },
  "15m": { count: 44, drift: 0.00016, volatility: 0.0038 },
  "1H": { count: 38, drift: 0.0002, volatility: 0.0042 },
  "4H": { count: 32, drift: 0.00028, volatility: 0.0048 },
  "1D": { count: 28, drift: 0.00035, volatility: 0.0054 },
  "1W": { count: 24, drift: 0.00042, volatility: 0.0062 },
};
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

function parseNumeric(text: string) {
  const value = Number(text.replace(/,/g, "").replace(/[A-Z ]+/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function buildKlineCandles(basePrice: number, count: number, drift: number, volatility: number): KlineCandle[] {
  let lastClose = basePrice;
  const startHour = 13;
  const startMinute = 0;

  return Array.from({ length: count }, (_, index) => {
    const trend = Math.sin(index * 0.24) * volatility * 0.55;
    const wave = Math.cos(index * 0.49) * volatility * 0.35;
    const move = drift + trend + wave;
    const open = lastClose;
    const close = open * (1 + move);
    const wickUp = Math.abs(Math.sin(index * 0.37)) * volatility * 0.9;
    const wickDown = Math.abs(Math.cos(index * 0.29)) * volatility * 0.9;
    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);
    const volume = Math.max(420, Math.round(780 + Math.abs(move) * 180000 + (index % 7) * 95));

    const totalMinutes = startHour * 60 + startMinute + index * 15;
    const hh = Math.floor((totalMinutes % (24 * 60)) / 60)
      .toString()
      .padStart(2, "0");
    const mm = (totalMinutes % 60).toString().padStart(2, "0");

    lastClose = close;
    return {
      timeLabel: `${hh}:${mm}`,
      open,
      high,
      low,
      close,
      volume,
    };
  });
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

export default function TradeDetail() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [viewMode, setViewMode] = useState<TradeViewMode>("trading");
  const [chartRange, setChartRange] = useState<ChartRange>("15m");
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
  const [analysisCurveRange, setAnalysisCurveRange] = useState<AnalysisRange>("90D");
  const [analysisReturnRange, setAnalysisReturnRange] = useState<AnalysisRange>("30D");
  const [analysisCurveHoverIndex, setAnalysisCurveHoverIndex] = useState<number | null>(null);
  const [analysisReturnHoverIndex, setAnalysisReturnHoverIndex] = useState<number | null>(null);
  const tradeId = params?.id ?? "";
  const trade = tradeBots.find((item) => item.id === tradeId);

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
  const visibleFills = tradeFillRows.filter(
    (row) => row.environment === runtimeEnvironment
  );

  const realizedPnl = Number((trade.unrealizedPnl * 2.65).toFixed(2));
  const totalPnl = realizedPnl + trade.unrealizedPnl;
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const estimatedSharpe = Number((0.45 + trade.winRate / 32).toFixed(2));
  const maxDrawdown = Number((3.5 + (100 - trade.winRate) * 0.23).toFixed(2));
  const totalTrades = visibleFills.length * 27;
  const notionalTurnover = visibleFills.reduce((acc, row) => {
    const next = Number(row.value.replace(/,/g, "").replace(" USDT", ""));
    return acc + (Number.isFinite(next) ? next : 0);
  }, 0);
  const usedMargin = visiblePositions.reduce((acc, row) => {
    const next = Number(row.margin.replace(/,/g, "").replace(" USDT", ""));
    return acc + (Number.isFinite(next) ? next : 0);
  }, 0);
  const availableBalance = Math.max(trade.equity - usedMargin, 0);
  const makerTakerFee = Number((notionalTurnover * 0.00045).toFixed(2));
  const profitFactor = Number((1 + trade.winRate / 100).toFixed(2));
  const avgSlippageBps = Number((1.8 + visibleFills.length * 0.35).toFixed(2));

  const executionRows = useMemo(
    () =>
      visibleFills.map((row) => ({
        ...row,
        side: row.action,
        notional: row.value,
      })),
    [visibleFills]
  );
  const anchorPrice = useMemo(() => {
    const fromFill = visibleFills[0] ? parseNumeric(visibleFills[0].price) : 0;
    const fromMark = visiblePositions[0] ? parseNumeric(visiblePositions[0].mark) : 0;
    return fromFill || fromMark || 100;
  }, [visibleFills, visiblePositions]);
  const klineCandles = useMemo(() => {
    const config = chartRangeConfig[chartRange];
    return buildKlineCandles(anchorPrice * 0.986, config.count, config.drift, config.volatility);
  }, [anchorPrice, chartRange]);
  const chartView = useMemo(() => {
    const width = 1180;
    const height = 430;
    const left = 20;
    const right = 54;
    const top = 26;
    const bottom = 34;
    const volumeHeight = 72;
    const plotTop = top;
    const plotBottom = height - volumeHeight - bottom;
    const innerWidth = width - left - right;
    const slot = innerWidth / Math.max(1, klineCandles.length);
    const candleWidth = Math.max(5, slot * 0.62);
    const minPrice = Math.min(...klineCandles.map((item) => item.low));
    const maxPrice = Math.max(...klineCandles.map((item) => item.high));
    const priceRange = Math.max(maxPrice - minPrice, 0.000001);
    const volumeMax = Math.max(...klineCandles.map((item) => item.volume), 1);
    const toY = (value: number) =>
      plotTop + ((maxPrice - value) / priceRange) * (plotBottom - plotTop);
    const candles = klineCandles.map((item, index) => {
      const x = left + slot * index + slot / 2;
      const openY = toY(item.open);
      const closeY = toY(item.close);
      const highY = toY(item.high);
      const lowY = toY(item.low);
      const bodyY = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      const volumeTop = height - bottom - (item.volume / volumeMax) * volumeHeight;
      return {
        ...item,
        x,
        openY,
        closeY,
        highY,
        lowY,
        bodyY,
        bodyHeight,
        volumeTop,
        isBullish: item.close >= item.open,
      };
    });
    const markerIndexes = [
      Math.max(2, Math.floor(candles.length * 0.18)),
      Math.max(4, Math.floor(candles.length * 0.52)),
      Math.max(6, Math.floor(candles.length * 0.78)),
    ];
    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      plotTop,
      plotBottom,
      slot,
      candleWidth,
      minPrice,
      maxPrice,
      candles,
      markerIndexes,
    };
  }, [klineCandles]);
  const hoveredCandle =
    hoveredCandleIndex !== null ? chartView.candles[hoveredCandleIndex] ?? null : null;
  const orderBook = useMemo(() => {
    const mid = chartView.candles[chartView.candles.length - 1]?.close ?? anchorPrice;
    let askSum = 0;
    const asks = Array.from({ length: 12 }, (_, index) => {
      const price = mid * (1 + (index + 1) * 0.00035);
      const size = 5 + ((index * 13) % 29) + Math.abs(Math.sin(index * 0.6)) * 8;
      askSum += size;
      return { price, size, sum: askSum };
    });
    let bidSum = 0;
    const bids = Array.from({ length: 12 }, (_, index) => {
      const price = mid * (1 - (index + 1) * 0.00035);
      const size = 6 + ((index * 11) % 31) + Math.abs(Math.cos(index * 0.55)) * 8;
      bidSum += size;
      return { price, size, sum: bidSum };
    });
    const maxSum = Math.max(asks[asks.length - 1]?.sum ?? 1, bids[bids.length - 1]?.sum ?? 1);
    return { mid, asks, bids, maxSum };
  }, [anchorPrice, chartView.candles]);
  const orderBookDepth = 8;
  const infoRows = useMemo(() => {
    const high24h = Math.max(...klineCandles.map((item) => item.high));
    const low24h = Math.min(...klineCandles.map((item) => item.low));
    const volume24h = klineCandles.reduce((acc, item) => acc + item.volume, 0);
    const turnover24h = klineCandles.reduce((acc, item) => acc + item.close * item.volume, 0);
    const openInterest = usedMargin * 1.84;
    const fundingRate = (runtimeEnvironment === "live" ? -0.0125 : -0.0094) / 100;
    return [
      { label: tr("24h High", "24小时最高价"), value: `${high24h.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` },
      { label: tr("24h Low", "24小时最低价"), value: `${low24h.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` },
      { label: tr("24h Volume", "24小时成交量"), value: `${volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${trade.symbol.replace("USDT", "")}` },
      { label: tr("24h Turnover", "24小时成交额"), value: `${turnover24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT` },
      { label: tr("Open Interest", "未平仓合约量"), value: `${openInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT` },
      { label: tr("Funding Rate", "资金费率"), value: `${(fundingRate * 100).toFixed(4)}%` },
      { label: tr("Next Funding", "下次结算"), value: "16:00:00 UTC" },
    ];
  }, [klineCandles, runtimeEnvironment, trade.symbol, tr, usedMargin]);
  const realtimePositions = useMemo(
    () =>
      visiblePositions.map((row) => {
        const margin = parseNumeric(row.margin);
        const roe = margin > 0 ? (row.pnl / margin) * 100 : 0;
        return { ...row, roe };
      }),
    [visiblePositions]
  );
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
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/trade">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {tr("Back", "返回")}
            </Button>
          </Link>
          <h1 className="mt-3 text-foreground">{trade.name}</h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            {tr("Trade ID", "交易 ID")}: {trade.id} &middot; {tr("Symbol", "标的")}: {trade.symbol} &middot; {tr("Updated", "更新于")}: {trade.updatedAt}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${
                runtimeEnvironment === "paper"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {runtimeEnvironment === "paper" ? tr("Paper Execution", "模拟执行") : tr("Live Execution", "实盘执行")}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${
                runtimeStatus === "running"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {runtimeStatus === "running" ? tr("running", "运行中") : tr("paused", "已暂停")}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {trade.market}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {uiLang === "zh" ? `${trade.leverage} 杠杆` : `${trade.leverage} leverage`}
            </span>
          </div>
        </div>
      </div>

      <div className="inline-flex h-9 items-center rounded-xl border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setViewMode("trading")}
          className={`inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
            viewMode === "trading"
              ? "border border-primary/30 bg-primary/12 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tr("Trading View", "交易视图")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("analysis")}
          className={`ml-1 inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
            viewMode === "analysis"
              ? "border border-primary/30 bg-primary/12 text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tr("Analysis View", "分析视图")}
        </button>
      </div>

      <section className="surface-card space-y-6 p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <TopMetric
            label={tr("Total Equity (USDT)", "总权益（USDT）")}
            value={trade.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          />
          <TopMetric
            label={tr("PnL (USDT)", "盈亏（USDT）")}
            value={formatSigned(totalPnl)}
            tone={totalPnl >= 0 ? "positive" : "negative"}
          />
          <TopMetric
            label={tr("ROI", "ROI")}
            value={`${formatSigned(roi)}%`}
            tone={roi >= 0 ? "positive" : "negative"}
          />
          <TopMetric
            label={tr("Win Rate", "胜率")}
            value={`${trade.winRate.toFixed(2)}%`}
            tone={trade.winRate >= 50 ? "positive" : "neutral"}
          />
          <TopMetric
            label={tr("Sharpe", "夏普比率")}
            value={estimatedSharpe.toFixed(2)}
            tone={estimatedSharpe >= 1 ? "positive" : "neutral"}
          />
          <TopMetric
            label={tr("Max Drawdown", "最大回撤")}
            value={`${maxDrawdown.toFixed(2)}%`}
            tone="negative"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <DetailListCard
            title={tr("Fund Snapshot", "资金快照")}
            icon={Wallet}
            rows={[
              {
                label: tr("Account Equity", "账户权益"),
                value: `${trade.equity.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: tr("Used Margin", "已用保证金"),
                value: `${usedMargin.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: tr("Available Balance", "可用余额"),
                value: `${availableBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: tr("Unrealized PnL", "未实现盈亏"),
                value: `${formatSigned(trade.unrealizedPnl)} USDT`,
                tone: trade.unrealizedPnl >= 0 ? "positive" : "negative",
              },
            ]}
          />
          <DetailListCard
            title={tr("Performance Metrics", "绩效指标")}
            icon={TrendingUp}
            rows={[
              { label: tr("Win Rate", "胜率"), value: `${trade.winRate.toFixed(2)}%`, tone: trade.winRate >= 50 ? "positive" : "negative" },
              { label: tr("Estimated Sharpe", "预估夏普比率"), value: estimatedSharpe.toFixed(2), tone: estimatedSharpe >= 1 ? "positive" : "neutral" },
              { label: tr("Profit Factor", "盈亏因子"), value: profitFactor.toFixed(2), tone: profitFactor >= 1 ? "positive" : "neutral" },
              { label: tr("Average Slippage", "平均滑点"), value: `${avgSlippageBps.toFixed(2)} bps` },
            ]}
          />
          <DetailListCard
            title={tr("Execution Statistics", "执行统计")}
            icon={ClipboardList}
            rows={[
              { label: tr("Open Positions", "未平仓位"), value: `${visiblePositions.length}` },
              { label: tr("Filled Orders", "已成交订单"), value: `${totalTrades}` },
              {
                label: tr("Notional Turnover", "名义成交额"),
                value: `${notionalTurnover.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: tr("Maker/Taker Fee (est.)", "Maker/Taker 手续费（估算）"),
                value: `${makerTakerFee.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
            ]}
          />
        </div>
      </section>

      {viewMode === "trading" ? (
        <>
      <section className="surface-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{tr("Candlestick Chart", "K线图")} · {trade.symbol}</h2>
          <div className="inline-flex rounded-lg border border-border/70 bg-accent/35 p-1">
            {chartRanges.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setChartRange(item);
                  setHoveredCandleIndex(null);
                }}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  chartRange === item
                    ? "border border-primary/40 bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="relative px-3 pb-3 pt-2">
          <svg
            viewBox={`0 0 ${chartView.width} ${chartView.height}`}
            className="h-[460px] w-full"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientX - rect.left) / rect.width;
              const index = Math.min(
                chartView.candles.length - 1,
                Math.max(0, Math.floor(ratio * chartView.candles.length))
              );
              setHoveredCandleIndex(index);
            }}
            onMouseLeave={() => setHoveredCandleIndex(null)}
          >
            <rect x="0" y="0" width={chartView.width} height={chartView.height} rx="12" fill="rgba(6,11,22,0.92)" />
            {Array.from({ length: 6 }, (_, index) => {
              const y =
                chartView.plotTop +
                index * ((chartView.plotBottom - chartView.plotTop) / 5);
              return (
                <line
                  key={`grid-h-${index}`}
                  x1={chartView.left}
                  y1={y}
                  x2={chartView.width - chartView.right}
                  y2={y}
                  stroke="rgba(148,163,184,0.11)"
                  strokeDasharray="4 7"
                />
              );
            })}
            {Array.from({ length: 10 }, (_, index) => {
              const x =
                chartView.left +
                index * ((chartView.width - chartView.left - chartView.right) / 9);
              return (
                <line
                  key={`grid-v-${index}`}
                  x1={x}
                  y1={chartView.plotTop}
                  x2={x}
                  y2={chartView.plotBottom}
                  stroke="rgba(148,163,184,0.08)"
                />
              );
            })}

            {chartView.candles.map((item, index) => (
              <g key={`candle-${index}`}>
                <line
                  x1={item.x}
                  y1={item.highY}
                  x2={item.x}
                  y2={item.lowY}
                  stroke={item.isBullish ? "#4DD59B" : "#F0647D"}
                  strokeWidth="1.4"
                />
                <rect
                  x={item.x - chartView.candleWidth / 2}
                  y={item.bodyY}
                  width={chartView.candleWidth}
                  height={item.bodyHeight}
                  rx="1.5"
                  fill={item.isBullish ? "#5EDDA5" : "#E85D76"}
                  opacity={hoveredCandleIndex === index ? 1 : 0.9}
                />
                <rect
                  x={item.x - chartView.candleWidth / 2}
                  y={item.volumeTop}
                  width={chartView.candleWidth}
                  height={chartView.height - chartView.bottom - item.volumeTop}
                  fill={item.isBullish ? "rgba(94,221,165,0.32)" : "rgba(232,93,118,0.28)"}
                />
              </g>
            ))}

            {chartView.markerIndexes.map((index, markerIndex) => {
              const candle = chartView.candles[index];
              if (!candle) return null;
              const isBuy = markerIndex % 2 === 0;
              return (
                <g key={`marker-${index}`}>
                  <path
                    d={`M ${candle.x} ${isBuy ? candle.lowY + 6 : candle.highY - 6} l ${isBuy ? -8 : -8} ${
                      isBuy ? 9 : -9
                    } h 16 z`}
                    fill={isBuy ? "#4DD59B" : "#F0647D"}
                  />
                  <text
                    x={candle.x}
                    y={isBuy ? candle.lowY + 24 : candle.highY - 14}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {tr(isBuy ? "Buy" : "Sell", isBuy ? "买入" : "卖出")}
                  </text>
                </g>
              );
            })}

            {hoveredCandle ? (
              <line
                x1={hoveredCandle.x}
                y1={chartView.plotTop}
                x2={hoveredCandle.x}
                y2={chartView.plotBottom}
                stroke="rgba(255,255,255,0.26)"
                strokeDasharray="5 6"
              />
            ) : null}

            {Array.from({ length: 6 }, (_, index) => {
              const value =
                chartView.maxPrice -
                (index * (chartView.maxPrice - chartView.minPrice)) / 5;
              const y =
                chartView.plotTop +
                index * ((chartView.plotBottom - chartView.plotTop) / 5);
              return (
                <text
                  key={`price-label-${index}`}
                  x={chartView.width - chartView.right + 8}
                  y={y + 4}
                  className="fill-muted-foreground text-[11px]"
                >
                  {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </text>
              );
            })}

            {chartView.candles
              .filter((_, index) => index % Math.max(1, Math.floor(chartView.candles.length / 8)) === 0)
              .map((item) => (
                <text
                  key={`time-${item.timeLabel}`}
                  x={item.x}
                  y={chartView.height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {item.timeLabel}
                </text>
              ))}
          </svg>

          {hoveredCandle ? (
            <div
              className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
              style={{
                left: `${Math.min(
                  82,
                  Math.max(8, (hoveredCandle.x / chartView.width) * 100)
                )}%`,
                top: 16,
              }}
            >
              <div className="font-mono text-muted-foreground">{hoveredCandle.timeLabel}</div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="text-muted-foreground">{tr("O", "开")}</span>
                <span className="font-mono text-foreground">{hoveredCandle.open.toFixed(2)}</span>
                <span className="text-muted-foreground">{tr("H", "高")}</span>
                <span className="font-mono text-foreground">{hoveredCandle.high.toFixed(2)}</span>
                <span className="text-muted-foreground">{tr("L", "低")}</span>
                <span className="font-mono text-foreground">{hoveredCandle.low.toFixed(2)}</span>
                <span className="text-muted-foreground">{tr("C", "收")}</span>
                <span className="font-mono text-foreground">{hoveredCandle.close.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        <section className="surface-card overflow-hidden p-0">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">{tr("Order Book", "订单簿")} · {trade.symbol}</h2>
          </div>
          <div className="p-3">
            <div className="mb-1.5 grid grid-cols-3 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <span>{tr("Price (USDT)", "价格（USDT）")}</span>
              <span className="text-right">{tr("Size", "数量")}</span>
              <span className="text-right">{tr("Sum", "累计")}</span>
            </div>
            <div className="space-y-0.5">
              {orderBook.asks
                .slice(-orderBookDepth)
                .reverse()
                .map((row, index) => (
                  <div key={`ask-${index}`} className="relative grid grid-cols-3 items-center overflow-hidden rounded-md px-2 py-1 text-xs">
                    <div
                      className="absolute inset-y-0 right-0 bg-rose-500/10"
                      style={{ width: `${(row.sum / orderBook.maxSum) * 100}%` }}
                    />
                    <span className="relative z-10 font-mono text-rose-300">
                      {row.price.toFixed(2)}
                    </span>
                    <span className="relative z-10 text-right font-mono text-muted-foreground">
                      {row.size.toFixed(1)}K
                    </span>
                    <span className="relative z-10 text-right font-mono text-muted-foreground">
                      {row.sum.toFixed(1)}K
                    </span>
                  </div>
                ))}
              <div className="my-1 border-t border-border/50 py-1 text-center text-sm font-semibold text-foreground">
                {orderBook.mid.toFixed(2)}
              </div>
              {orderBook.bids.slice(0, orderBookDepth).map((row, index) => (
                <div key={`bid-${index}`} className="relative grid grid-cols-3 items-center overflow-hidden rounded-md px-2 py-1 text-xs">
                  <div
                    className="absolute inset-y-0 left-0 bg-emerald-500/10"
                    style={{ width: `${(row.sum / orderBook.maxSum) * 100}%` }}
                  />
                  <span className="relative z-10 font-mono text-emerald-300">
                    {row.price.toFixed(2)}
                  </span>
                  <span className="relative z-10 text-right font-mono text-muted-foreground">
                    {row.size.toFixed(1)}K
                  </span>
                  <span className="relative z-10 text-right font-mono text-muted-foreground">
                    {row.sum.toFixed(1)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="surface-card overflow-hidden p-0">
          <div className="border-b border-border/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">{tr("Info", "信息")} · {trade.symbol}</h2>
          </div>
          <div className="p-4">
            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{trade.symbol}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="font-mono text-3xl font-semibold text-amber-300">
                  {orderBook.mid.toFixed(2)}
                </div>
                <div className={`${trade.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"} text-sm font-semibold`}>
                  {trade.unrealizedPnl >= 0 ? "+" : "-"}
                  {Math.abs((trade.unrealizedPnl / Math.max(trade.equity, 1)) * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-xs text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="surface-card overflow-hidden p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{tr("Real-Time Positions", "实时持仓")}</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border/70">
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{tr("Symbol", "标的")}</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{tr("Size", "数量")}</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{tr("Entry", "开仓价")}</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{tr("Mark", "标记价")}</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{tr("Margin", "保证金")}</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground text-right">{tr("PnL (ROE)", "盈亏（ROE）")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {realtimePositions.map((row) => (
                <TableRow key={row.id} className="border-border/70">
                  <TableCell>
                    <div className="font-semibold text-foreground">{row.symbol}</div>
                    <div className="text-[11px] text-muted-foreground">{tr("Perp", "永续")} {trade.leverage}</div>
                  </TableCell>
                  <TableCell className={`font-mono ${row.side === "long" ? "text-emerald-300" : "text-rose-300"}`}>
                    {row.size}
                  </TableCell>
                  <TableCell className="font-mono text-foreground">{row.entry}</TableCell>
                  <TableCell className="font-mono text-foreground">{row.mark}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{row.margin}</TableCell>
                  <TableCell className="text-right">
                    <div className={`font-mono ${row.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatSigned(row.pnl)} USDT
                    </div>
                    <div className={`text-[11px] ${row.roe >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      ({row.roe >= 0 ? "+" : ""}
                      {row.roe.toFixed(2)}%)
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="surface-card overflow-hidden p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{tr("Trade History", "成交历史")}</h2>
        </div>
        <div className="space-y-3 p-4">
          {executionRows.map((row) => {
            const isLong = row.side.includes("Long");
            return (
              <div key={row.id} className="rounded-xl border border-border/60 bg-accent/20 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${isLong ? "bg-emerald-400" : "bg-rose-400"}`} />
                  <span className="font-mono">{row.time}</span>
                  <ActionBadge action={row.side} />
                </div>
                <div className="mt-2 text-sm text-foreground">
                  <span className="font-semibold text-amber-300">{row.symbol}</span>{" "}
                  <span className="text-muted-foreground">{tr("perpetual at", "永续合约，成交价")}</span>{" "}
                  <span className="font-mono">{row.price} USDT</span>
                  <span className="text-muted-foreground">{tr(", qty ", "，数量 ")}</span>
                  <span className="font-mono">{row.qty}</span>
                  <span className="text-muted-foreground">{tr(", notional ", "，名义价值 ")}</span>
                  <span className="font-mono">{row.notional}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
        </>
      ) : null}

      {viewMode === "analysis" ? (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="surface-card overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-[0.08em] text-foreground">{tr("Asset Curve", "资产曲线")}</h2>
                <div className="inline-flex rounded-lg border border-border/70 bg-accent/35 p-1">
                  {analysisRanges.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setAnalysisCurveRange(item);
                        setAnalysisCurveHoverIndex(null);
                      }}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        analysisCurveRange === item
                          ? "border border-primary/40 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center gap-5 text-xs">
                  <span className="text-muted-foreground">
                    {tr("Strategy", "策略")}{" "}
                    <span className={analysisCurve.strategyReturn >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                      {formatSigned(analysisCurve.strategyReturn)}%
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {tr("Benchmark", "基准")}{" "}
                    <span className={analysisCurve.benchmarkReturn >= 0 ? "font-semibold text-sky-400" : "font-semibold text-rose-400"}>
                      {formatSigned(analysisCurve.benchmarkReturn)}%
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {tr("Excess", "超额")}{" "}
                    <span className={analysisCurve.excessReturn >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                      {formatSigned(analysisCurve.excessReturn)}%
                    </span>
                  </span>
                </div>

                <div className="relative">
                  <svg
                    viewBox={`0 0 ${analysisCurve.width} ${analysisCurve.height}`}
                    className="h-[340px] w-full"
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
                        <stop offset="0%" stopColor="#F0C13B" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#F0C13B" stopOpacity="0.04" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width={analysisCurve.width} height={analysisCurve.height} rx="12" fill="rgba(7,12,24,0.8)" />
                    {Array.from({ length: 5 }, (_, index) => (
                      <line
                        key={`curve-grid-${index}`}
                        x1={analysisCurve.padding}
                        y1={analysisCurve.padding + index * ((analysisCurve.height - analysisCurve.padding * 2) / 4)}
                        x2={analysisCurve.width - analysisCurve.padding}
                        y2={analysisCurve.padding + index * ((analysisCurve.height - analysisCurve.padding * 2) / 4)}
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="4 6"
                      />
                    ))}
                    <path d={analysisCurve.strategyArea} fill="url(#trade-curve-fill)" />
                    <path d={analysisCurve.strategyPath} fill="none" stroke="#F0C13B" strokeWidth="2.6" />
                    <path d={analysisCurve.benchmarkPath} fill="none" stroke="#6E82F6" strokeWidth="2.1" opacity="0.85" />
                    {analysisCurveHoverPoint ? (
                      <>
                        <line
                          x1={analysisCurveHoverPoint.x}
                          y1={analysisCurve.padding}
                          x2={analysisCurveHoverPoint.x}
                          y2={analysisCurve.height - analysisCurve.padding}
                          stroke="rgba(255,255,255,0.22)"
                          strokeDasharray="4 5"
                        />
                        <circle
                          cx={analysisCurveHoverPoint.x}
                          cy={analysisCurveHoverPoint.y}
                          r="4.5"
                          fill="#F0C13B"
                          stroke="#091326"
                          strokeWidth="2"
                        />
                      </>
                    ) : null}
                  </svg>

                  {analysisCurveHoverPoint ? (
                    <div
                      className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                      style={{
                        left: `${Math.min(80, Math.max(8, (analysisCurveHoverPoint.x / analysisCurve.width) * 100))}%`,
                        top: 12,
                      }}
                    >
                      <div className="font-mono text-muted-foreground">
                        {tr("Strategy", "策略")} {analysisCurve.strategyValues[analysisCurveHoverIndex ?? 0].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="mt-1 font-mono text-sky-300">
                        {tr("Benchmark", "基准")} {analysisCurve.benchmarkValues[analysisCurveHoverIndex ?? 0].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  {analysisCurve.labels.map((label) => (
                    <span key={label}>{translateMonthLabel(label)}</span>
                  ))}
                </div>
              </div>
            </section>

            <section className="surface-card overflow-hidden p-0">
              <div className="border-b border-border/60 px-4 py-3">
                <h2 className="text-sm font-semibold tracking-[0.08em] text-foreground">{tr("Asset Preferences", "资产偏好")}</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-[0.95fr_1.05fr]">
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 240 240" className="h-[220px] w-[220px]">
                    <circle cx="120" cy="120" r="70" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="30" />
                    {(() => {
                      const circumference = 2 * Math.PI * 70;
                      let offset = 0;
                      return assetPreferences.map((slice) => {
                        const length = (slice.value / 100) * circumference;
                        const node = (
                          <circle
                            key={slice.label}
                            cx="120"
                            cy="120"
                            r="70"
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="30"
                            strokeDasharray={`${length} ${circumference - length}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 120 120)"
                          />
                        );
                        offset += length;
                        return node;
                      });
                    })()}
                    <circle cx="120" cy="120" r="46" fill="rgba(5,10,20,0.92)" />
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {assetPreferences.map((slice) => (
                    <div key={slice.label} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        {translatePreferenceLabel(slice.label)}
                      </span>
                      <span className="font-mono text-foreground">{slice.value.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="surface-card overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-foreground">{tr("Daily Returns", "日收益")}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {tr("Avg", "均值")}{" "}
                  <span className={analysisReturnSummary.avg >= 0 ? "font-semibold text-emerald-400" : "font-semibold text-rose-400"}>
                    {formatSigned(analysisReturnSummary.avg)}%
                  </span>
                </span>
                <span className="font-medium text-emerald-400">{tr("W", "胜")}{analysisReturnSummary.wins}</span>
                <span className="font-medium text-rose-400">{tr("L", "负")}{analysisReturnSummary.losses}</span>
                <div className="inline-flex rounded-lg border border-border/70 bg-accent/35 p-1">
                  {analysisRanges.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setAnalysisReturnRange(item);
                        setAnalysisReturnHoverIndex(null);
                      }}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        analysisReturnRange === item
                          ? "border border-primary/40 bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="relative p-4">
              <svg
                viewBox="0 0 1120 260"
                className="h-[300px] w-full"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = (event.clientX - rect.left) / rect.width;
                  const index = Math.round(
                    Math.max(0, Math.min(1, ratio)) * (analysisReturns.length - 1)
                  );
                  setAnalysisReturnHoverIndex(index);
                }}
                onMouseLeave={() => setAnalysisReturnHoverIndex(null)}
              >
                <rect x="0" y="0" width="1120" height="260" rx="12" fill="rgba(7,12,24,0.8)" />
                {Array.from({ length: 5 }, (_, index) => (
                  <line
                    key={`ret-grid-${index}`}
                    x1="22"
                    y1={28 + index * 50}
                    x2="1098"
                    y2={28 + index * 50}
                    stroke="rgba(148,163,184,0.10)"
                    strokeDasharray="4 6"
                  />
                ))}
                <line x1="22" y1="130" x2="1098" y2="130" stroke="rgba(148,163,184,0.2)" />
                {analysisReturns.map((value, index) => {
                  const slot = 1076 / analysisReturns.length;
                  const barWidth = Math.max(6, slot - 4);
                  const x = 22 + index * slot + (slot - barWidth) / 2;
                  const magnitude = Math.min(96, Math.abs(value) * 85);
                  const y = value >= 0 ? 130 - magnitude : 130;
                  return (
                    <rect
                      key={`ret-bar-${index}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(2, magnitude)}
                      rx="2"
                      fill={value >= 0 ? "#66D39A" : "#E16373"}
                      opacity={analysisReturnHoverIndex === index ? 1 : 0.88}
                    />
                  );
                })}
              </svg>
            </div>
          </section>

          <section className="surface-card overflow-hidden p-0">
              <div className="border-b border-border/60 px-4 py-3">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-foreground">{tr("Position History", "持仓历史")}</h2>
              </div>
            <div className="space-y-3 p-4">
              {executionRows.map((row) => {
                const isLong = row.side.includes("Long");
                return (
                  <article key={`history-${row.id}`} className="rounded-xl border border-border/60 bg-background/35 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-foreground">{row.symbol}</h3>
                        <span className="inline-flex rounded-md border border-border/70 bg-accent/45 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {trade.market}
                        </span>
                        <ActionBadge action={row.side} />
                        <span className="inline-flex rounded-md border border-border/70 bg-accent/45 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {tr("Closed", "已平仓")}
                        </span>
                      </div>
                      <div className={`text-xl font-semibold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
                        {isLong ? "+" : "-"}
                        {row.notional}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Entry Price", "开仓价")}</div>
                        <div className="mt-1 font-mono text-foreground">{row.price}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Max Open Interest", "最大持仓量")}</div>
                        <div className="mt-1 font-mono text-foreground">{row.qty}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Opened", "开仓时间")}</div>
                        <div className="mt-1 font-mono text-foreground">{row.time}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Closed", "平仓时间")}</div>
                        <div className="mt-1 font-mono text-foreground">{row.time}</div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
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

type SectionRow = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
};

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

function ActionBadge({ action }: { action: FillRow["action"] }) {
  const { uiLang } = useAppLanguage();
  const isLong = action.includes("Long");
  const label =
    uiLang === "zh"
      ? action
          .replace("Open Long", "开多")
          .replace("Close Long", "平多")
          .replace("Open Short", "开空")
          .replace("Close Short", "平空")
      : action;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isLong
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
      }`}
    >
      {label}
    </span>
  );
}
