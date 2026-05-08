import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { Link, useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Activity,
  BarChart3,
  ChevronDown,
  ClipboardList,
  PieChart,
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
type TradeSidePanelMode = "orderBook" | "info";
type AnalysisRange = "7D" | "30D" | "90D" | "365D";
type CurvePoint = { x: number; y: number; value: number };
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
type TradeMarketProfile = {
  symbol: string;
  base: string;
  icon: string;
  lastPrice: number;
  mark: string;
  oracle: string;
  volume24h: string;
  change24h: string;
  openInterest: string;
  funding: string;
};

const chartRanges: ChartRange[] = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
const analysisRanges: AnalysisRange[] = ["7D", "30D", "90D", "365D"];
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
const tradeMarketProfiles: TradeMarketProfile[] = [
  {
    symbol: "BTCUSDT",
    base: "BTC",
    icon: "₿",
    lastPrice: 63383.41,
    mark: "$79,830",
    oracle: "$79,862",
    volume24h: "$2.49B",
    change24h: "-1.31%",
    openInterest: "$2.49B",
    funding: "+0.0013%",
  },
  {
    symbol: "ETHUSDT",
    base: "ETH",
    icon: "Ξ",
    lastPrice: 3084.72,
    mark: "$3,085",
    oracle: "$3,087",
    volume24h: "$894.2M",
    change24h: "+0.84%",
    openInterest: "$1.16B",
    funding: "+0.0008%",
  },
  {
    symbol: "SOLUSDT",
    base: "SOL",
    icon: "S",
    lastPrice: 146.28,
    mark: "$146.28",
    oracle: "$146.31",
    volume24h: "$326.7M",
    change24h: "+2.18%",
    openInterest: "$428.6M",
    funding: "-0.0005%",
  },
];
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

function stripLeadingUsdSymbol(value: string) {
  return value.replace(/^\$/, "");
}

function formatChartRangeLabel(range: ChartRange, uiLang: string) {
  if (uiLang !== "zh") return range;
  switch (range) {
    case "1m":
      return "1分";
    case "5m":
      return "5分";
    case "15m":
      return "15分";
    case "1H":
      return "1小时";
    case "4H":
      return "4小时";
    case "1D":
      return "1日";
    case "1W":
      return "1周";
    default:
      return range;
  }
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
  const [viewMode, setViewMode] = useState<TradeViewMode>("trading");
  const [tradeSidePanelMode, setTradeSidePanelMode] = useState<TradeSidePanelMode>("orderBook");
  const [selectedMarketSymbol, setSelectedMarketSymbol] = useState("BTCUSDT");
  const [isMarketMenuOpen, setIsMarketMenuOpen] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>("15m");
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);
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
  const selectedMarket =
    tradeMarketProfiles.find((item) => item.symbol === selectedMarketSymbol) ??
    tradeMarketProfiles.find((item) => item.symbol === trade.symbol) ??
    tradeMarketProfiles[0];
  const marketSwitchStats = [
    {
      label: tr("Mark Price (USD)", "标记价格(USD)"),
      value: stripLeadingUsdSymbol(selectedMarket.mark),
      explanation: tr("Reference price used for futures valuation and liquidation checks.", "用于合约估值和强平判断的参考价格。"),
    },
    {
      label: tr("Oracle Price (USD)", "预言机价格(USD)"),
      value: stripLeadingUsdSymbol(selectedMarket.oracle),
      explanation: tr("External index price used to reduce single-exchange price noise.", "来自外部指数的参考价格，用于降低单一交易所价格噪声。"),
    },
    {
      label: tr("24h Volume (USD)", "24小时成交量(USD)"),
      value: stripLeadingUsdSymbol(selectedMarket.volume24h),
      explanation: tr("Total traded notional in the last 24 hours.", "最近 24 小时内的累计成交额。"),
    },
    {
      label: tr("24h Change", "24小时涨跌幅"),
      value: selectedMarket.change24h,
      tone: selectedMarket.change24h.startsWith("-") ? ("negative" as const) : ("positive" as const),
      explanation: tr("Price change percentage over the last 24 hours.", "最近 24 小时价格相对变化比例。"),
    },
    {
      label: tr("Open Interest (USD)", "未平仓合约量(USD)"),
      value: stripLeadingUsdSymbol(selectedMarket.openInterest),
      explanation: tr("Current notional value of contracts that remain open.", "当前尚未平仓合约的名义价值。"),
    },
    {
      label: tr("Funding Rate", "资金费率"),
      value: selectedMarket.funding,
      tone: selectedMarket.funding.startsWith("-") ? ("negative" as const) : ("positive" as const),
      explanation: tr("Periodic fee rate exchanged between long and short positions.", "多空持仓之间定期结算的资金费用比例。"),
    },
  ];

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
    if (selectedMarket.symbol !== trade.symbol) return selectedMarket.lastPrice;
    const fromFill = visibleFills[0] ? parseNumeric(visibleFills[0].price) : 0;
    const fromMark = visiblePositions[0] ? parseNumeric(visiblePositions[0].mark) : 0;
    return fromFill || fromMark || selectedMarket.lastPrice;
  }, [selectedMarket.lastPrice, selectedMarket.symbol, trade.symbol, visibleFills, visiblePositions]);
  const klineCandles = useMemo(() => {
    const config = chartRangeConfig[chartRange];
    return buildKlineCandles(anchorPrice * 0.986, config.count, config.drift, config.volatility);
  }, [anchorPrice, chartRange]);
  const chartView = useMemo(() => {
    const width = 1180;
    const height = 640;
    const left = 28;
    const right = 76;
    const top = 34;
    const bottom = 48;
    const volumeHeight = 108;
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
  const latestCandle = chartView.candles[chartView.candles.length - 1] ?? null;
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
    return [
      {
        label: tr("24h High (USDT)", "24小时最高价(USDT)"),
        value: high24h.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        explanation: tr("Highest traded price in the last 24 hours.", "最近 24 小时内成交过的最高价格。"),
      },
      {
        label: tr("24h Low (USDT)", "24小时最低价(USDT)"),
        value: low24h.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        explanation: tr("Lowest traded price in the last 24 hours.", "最近 24 小时内成交过的最低价格。"),
      },
      {
        label: tr(`24h Volume (${selectedMarket.base})`, `24小时成交量(${selectedMarket.base})`),
        value: volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        explanation: tr("Total base-asset quantity traded in the last 24 hours.", "最近 24 小时内累计成交的基础资产数量。"),
      },
      {
        label: tr("24h Turnover (USDT)", "24小时成交额(USDT)"),
        value: turnover24h.toLocaleString(undefined, { maximumFractionDigits: 0 }),
        explanation: tr("Total quote-currency notional traded in the last 24 hours.", "最近 24 小时内累计成交的计价货币金额。"),
      },
      {
        label: tr("Open Interest (USDT)", "未平仓合约量(USDT)"),
        value: openInterest.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        explanation: tr("Notional value of open contracts that have not been closed.", "尚未平仓合约对应的名义价值。"),
      },
      {
        label: tr("Funding Rate", "资金费率"),
        value: selectedMarket.funding,
        tone: selectedMarket.funding.startsWith("-") ? ("negative" as const) : ("positive" as const),
        explanation: tr("Periodic fee rate exchanged between long and short positions.", "多空持仓之间定期结算的资金费用比例。"),
      },
      {
        label: tr("Next Funding", "下次结算"),
        value: "16:00:00 UTC",
        explanation: tr("Scheduled time for the next funding-rate settlement.", "下一次资金费率结算的计划时间。"),
      },
    ];
  }, [klineCandles, selectedMarket.base, selectedMarket.funding, tr, usedMargin]);
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
  const viewModeTabs = (
    <div className="inline-flex h-9 w-fit items-center rounded-xl border border-border bg-card p-1">
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
  );
  const performanceSummaryPanel = (
    <section className="surface-card space-y-6 p-6">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <TopMetric
          label={tr("Total Equity (USDT)", "总权益（USDT）")}
          value={trade.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          explanation={tr("Current account equity. Total equity = account balance + unrealized PnL.", "当前账户权益总额，权益总额 = 账户余额 + 未实现盈亏。")}
          explainEnabled={plainExplainEnabled}
        />
        <TopMetric
          label={tr("PnL (USDT)", "盈亏（USDT）")}
          value={formatSigned(totalPnl)}
          tone={totalPnl >= 0 ? "positive" : "negative"}
          explanation={tr("Total profit or loss for the strategy. PnL = realized PnL + unrealized PnL.", "当前策略的总盈亏，盈亏 = 已实现盈亏 + 未实现盈亏。")}
          explainEnabled={plainExplainEnabled}
        />
        <TopMetric
          label={tr("ROI", "ROI")}
          value={`${formatSigned(roi)}%`}
          tone={roi >= 0 ? "positive" : "negative"}
          explanation={tr("Return on invested capital. ROI = PnL / initial equity.", "投入资金的收益比例，ROI = 盈亏 / 初始权益。")}
          explainEnabled={plainExplainEnabled}
        />
        <TopMetric
          label={tr("Win Rate", "胜率")}
          value={`${trade.winRate.toFixed(2)}%`}
          tone={trade.winRate >= 50 ? "positive" : "neutral"}
          explanation={tr("Share of profitable trades. Win rate = winning trades / total trades.", "盈利交易占全部交易的比例，胜率 = 盈利交易数 / 总交易数。")}
          explainEnabled={plainExplainEnabled}
        />
        <TopMetric
          label={tr("Sharpe", "夏普比率")}
          value={estimatedSharpe.toFixed(2)}
          tone={estimatedSharpe >= 1 ? "positive" : "neutral"}
          explanation={tr("Risk-adjusted return indicator. Higher Sharpe means better return per unit of volatility.", "衡量风险调整后收益的指标，数值越高代表单位波动带来的收益越好。")}
          explainEnabled={plainExplainEnabled}
        />
        <TopMetric
          label={tr("Max Drawdown", "最大回撤")}
          value={`${maxDrawdown.toFixed(2)}%`}
          tone="negative"
          explanation={tr("Largest decline from a peak. Max drawdown = maximum peak-to-trough loss.", "从高点到低点的最大跌幅，最大回撤 = 峰值到谷值的最大损失比例。")}
          explainEnabled={plainExplainEnabled}
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
  );
  return (
    <div className="space-y-6 min-w-0" style={semanticColorVars}>
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

      <div className="rounded-2xl bg-card/80 p-2 shadow-sm dark:bg-slate-950/80">
      <section className="relative z-20 overflow-visible px-2 py-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between xl:gap-10">
          <div className="relative flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => setIsMarketMenuOpen((open) => !open)}
              className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl border border-border/60 bg-accent/45 px-3 text-left text-foreground transition-colors hover:bg-accent/70 dark:border-white/10 dark:bg-white/7 dark:text-white dark:hover:bg-white/10"
              aria-label={tr("Switch trading symbol", "切换交易品种")}
              aria-expanded={isMarketMenuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f7931a] text-base font-bold text-white shadow-sm">
                {selectedMarket.icon}
              </span>
              <span className="text-base font-semibold leading-none">{selectedMarket.base}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {isMarketMenuOpen ? (
              <div className="absolute left-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 shadow-xl dark:border-white/10">
                {tradeMarketProfiles.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedMarketSymbol(item.symbol);
                      setHoveredCandleIndex(null);
                      setIsMarketMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      selectedMarket.symbol === item.symbol ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f7931a] text-sm font-bold text-white">
                      {item.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-4">{item.base}</span>
                      <span className="block font-mono text-[10px] leading-4 text-muted-foreground">{item.symbol}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid flex-1 grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 xl:grid-cols-6 xl:pl-2 2xl:pl-4">
            {marketSwitchStats.map((item) => (
              <MaybeExplainTooltip key={item.label} enabled={plainExplainEnabled} explanation={item.explanation}>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{item.label}</div>
                  <div
                    className={`mt-1 whitespace-nowrap font-mono text-base leading-none tabular-nums ${classForTone(item.tone)}`}
                  >
                    {item.value}
                  </div>
                </div>
              </MaybeExplainTooltip>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-2 grid grid-cols-1 items-stretch gap-2 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl bg-background/70 p-0 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
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
                {formatChartRangeLabel(item, uiLang)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-transparent px-3 pb-3 pt-2">
          <svg
            viewBox={`0 0 ${chartView.width} ${chartView.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-full w-full"
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
                  stroke="rgba(148,163,184,0.16)"
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
                  stroke="rgba(148,163,184,0.14)"
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
                  stroke={item.isBullish ? "var(--semantic-up)" : "var(--semantic-down)"}
                  strokeWidth="1.4"
                />
                <rect
                  x={item.x - chartView.candleWidth / 2}
                  y={item.bodyY}
                  width={chartView.candleWidth}
                  height={item.bodyHeight}
                  rx="1.5"
                  fill={item.isBullish ? "var(--semantic-up)" : "var(--semantic-down)"}
                  opacity={hoveredCandleIndex === index ? 1 : 0.9}
                />
                <rect
                  x={item.x - chartView.candleWidth / 2}
                  y={item.volumeTop}
                  width={chartView.candleWidth}
                  height={chartView.height - chartView.bottom - item.volumeTop}
                  fill={item.isBullish ? "var(--semantic-up)" : "var(--semantic-down)"}
                  opacity="0.24"
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
                    fill={isBuy ? "var(--semantic-up)" : "var(--semantic-down)"}
                  />
                  <text
                    x={candle.x}
                    y={isBuy ? candle.lowY + 24 : candle.highY - 14}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[12px]"
                  >
                    {tr(isBuy ? "Buy" : "Sell", isBuy ? "买入" : "卖出")}
                  </text>
                </g>
              );
            })}

            {hoveredCandle ? (
              <>
                <line
                  x1={hoveredCandle.x}
                  y1={chartView.plotTop}
                  x2={hoveredCandle.x}
                  y2={chartView.plotBottom}
                  stroke="rgba(226,232,240,0.35)"
                  strokeDasharray="4 5"
                />
                <line
                  x1={chartView.left}
                  y1={hoveredCandle.closeY}
                  x2={chartView.width - chartView.right}
                  y2={hoveredCandle.closeY}
                  stroke="rgba(226,232,240,0.28)"
                  strokeDasharray="4 5"
                />
              </>
            ) : null}

            {latestCandle ? (
              <>
                <line
                  x1={chartView.left}
                  y1={latestCandle.closeY}
                  x2={chartView.width - chartView.right}
                  y2={latestCandle.closeY}
                  stroke={latestCandle.isBullish ? "var(--semantic-up)" : "var(--semantic-down)"}
                  strokeDasharray="2 4"
                />
                <rect
                  x={chartView.width - 86}
                  y={latestCandle.closeY - 12}
                  width="78"
                  height="24"
                  rx="3"
                  fill={latestCandle.isBullish ? "var(--semantic-up)" : "var(--semantic-down)"}
                />
                <text
                  x={chartView.width - 47}
                  y={latestCandle.closeY + 4}
                  textAnchor="middle"
                  className="fill-white text-[13px] font-medium"
                >
                  {latestCandle.close.toFixed(2)}
                </text>
              </>
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
                  className="fill-muted-foreground text-[13px]"
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
                  y={chartView.height - 12}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[12px]"
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

        <section className="flex h-[550px] flex-col overflow-hidden rounded-xl bg-background/70 p-0 dark:bg-white/[0.03]">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <div className="inline-flex h-8 items-center rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setTradeSidePanelMode("orderBook")}
                className={`inline-flex h-6 items-center rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                  tradeSidePanelMode === "orderBook"
                    ? "border border-primary/30 bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr("Order Book", "订单簿")}
              </button>
              <button
                type="button"
                onClick={() => setTradeSidePanelMode("info")}
                className={`ml-1 inline-flex h-6 items-center rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                  tradeSidePanelMode === "info"
                    ? "border border-primary/30 bg-primary/12 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr("Info", "信息")}
              </button>
            </div>
          </div>

          {tradeSidePanelMode === "orderBook" ? (
          <div className="flex-1 p-3">
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
	                      className="absolute inset-y-0 right-0"
	                      style={{
	                        width: `${(row.sum / orderBook.maxSum) * 100}%`,
	                        backgroundColor: "color-mix(in srgb, var(--semantic-down) 12%, transparent)",
	                      }}
	                    />
	                    <span className="relative z-10 font-mono text-[var(--semantic-down)]">
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
	                    className="absolute inset-y-0 left-0"
	                    style={{
	                      width: `${(row.sum / orderBook.maxSum) * 100}%`,
	                      backgroundColor: "color-mix(in srgb, var(--semantic-up) 12%, transparent)",
	                    }}
	                  />
	                  <span className="relative z-10 font-mono text-[var(--semantic-up)]">
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
          ) : (
          <div className="flex-1 p-4">
            <div className="border-b border-border/60 pb-3">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{selectedMarket.symbol}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="font-mono text-3xl font-semibold text-foreground">
                  {orderBook.mid.toFixed(2)}
                </div>
                <div className={`${trade.unrealizedPnl >= 0 ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"} text-sm font-semibold`}>
                  {trade.unrealizedPnl >= 0 ? "+" : "-"}
                  {Math.abs((trade.unrealizedPnl / Math.max(trade.equity, 1)) * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {infoRows.map((row) => (
                <MaybeExplainTooltip key={row.label} enabled={plainExplainEnabled} explanation={row.explanation}>
                  <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`font-mono text-xs ${classForTone(row.tone)}`}>{row.value}</span>
                  </div>
                </MaybeExplainTooltip>
              ))}
            </div>
          </div>
          )}
        </section>
      </div>
      </div>

      {viewModeTabs}

      {viewMode === "trading" ? (
        <>
          {performanceSummaryPanel}

          <DashboardPanel title={tr("Real-Time Positions", "实时持仓")} icon={Activity} contentClassName="px-4 pb-4 pt-2" showHeaderDivider={false} flushHeaderBottom>
            <div className="space-y-1">
              <div className="hidden rounded-lg bg-accent/30 px-3 py-2 text-[10px] leading-4 text-muted-foreground md:grid md:grid-cols-[minmax(190px,1.3fr)_minmax(110px,0.8fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(130px,0.9fr)_minmax(140px,1fr)] md:gap-4">
                <div>{tr("Symbol", "标的")}</div>
                <div>{tr("Size", "数量")}</div>
                <div>{tr("Entry", "开仓价")}</div>
                <div>{tr("Mark", "标记价")}</div>
                <div>{tr("Margin", "保证金")}</div>
                <div className="text-right">{tr("PnL (ROE)", "盈亏（ROE）")}</div>
              </div>
              {realtimePositions.map((row) => {
                const isLong = row.side === "long";
                const isProfit = row.pnl >= 0;
                return (
                  <article
                    key={row.id}
                    className="grid grid-cols-1 gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/20 md:grid-cols-[minmax(190px,1.3fr)_minmax(110px,0.8fr)_minmax(100px,0.75fr)_minmax(100px,0.75fr)_minmax(130px,0.9fr)_minmax(140px,1fr)] md:items-center md:gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-5 text-foreground">{row.symbol}</div>
                      <div className="text-[11px] leading-4 text-muted-foreground">{tr("Perp", "永续")} {trade.leverage}</div>
                    </div>
                    <div className={`font-mono text-[13px] leading-5 ${isLong ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"}`}>
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Size", "数量")}</div>
                      {row.size}
                    </div>
                    <div className="font-mono text-[13px] leading-5 text-foreground">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Entry", "开仓价")}</div>
                      {row.entry}
                    </div>
                    <div className="font-mono text-[13px] leading-5 text-foreground">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Mark", "标记价")}</div>
                      {row.mark}
                    </div>
                    <div className="font-mono text-[13px] leading-5 text-muted-foreground">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Margin", "保证金")}</div>
                      {row.margin}
                    </div>
                    <div className={`text-left text-[13px] font-semibold leading-5 md:text-right ${isProfit ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"}`}>
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("PnL (ROE)", "盈亏（ROE）")}</div>
                      <div className="font-mono">{formatSigned(row.pnl)} USDT</div>
                      <div className="text-[11px]">
                        ({row.roe >= 0 ? "+" : ""}
                        {row.roe.toFixed(2)}%)
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </DashboardPanel>

          <DashboardPanel title={tr("Trade History", "成交历史")} icon={ClipboardList} contentClassName="px-4 pb-4 pt-2" showHeaderDivider={false} flushHeaderBottom>
            <div className="space-y-1">
              <div className="hidden rounded-lg bg-accent/30 px-3 py-2 text-[10px] leading-4 text-muted-foreground md:grid md:grid-cols-[150px_80px_minmax(120px,1fr)_96px_120px_120px_140px] md:gap-4">
                <div>{tr("Time", "时间")}</div>
                <div>{tr("Action", "方向")}</div>
                <div>{tr("Symbol", "标的")}</div>
                <div>{tr("Contract", "合约")}</div>
                <div>{tr("Price", "成交价")}</div>
                <div>{tr("Qty", "数量")}</div>
                <div className="text-right">{tr("Notional", "名义价值")}</div>
              </div>
              {executionRows.map((row) => {
                const isLong = row.side.includes("Long");
                return (
                  <article
                    key={row.id}
                    className="grid grid-cols-1 gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/20 md:grid-cols-[150px_80px_minmax(120px,1fr)_96px_120px_120px_140px] md:items-center md:gap-4"
                  >
                    <div className="font-mono text-[11px] leading-5 text-muted-foreground xl:text-xs">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Time", "时间")}</div>
                      {row.time}
                    </div>
                    <div>
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Action", "方向")}</div>
                      <ActionBadge action={row.side} />
                    </div>
                    <div className="text-sm font-semibold leading-5 text-foreground">
                      <div className="text-[10px] font-normal leading-4 text-muted-foreground md:hidden">{tr("Symbol", "标的")}</div>
                      {row.symbol}
                    </div>
                    <div className="text-[13px] leading-5 text-muted-foreground">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Contract", "合约")}</div>
                      {tr("Perp", "永续")}
                    </div>
                    <div className="font-mono text-[13px] leading-5 text-foreground">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Price", "成交价")}</div>
                      {row.price} USDT
                    </div>
                    <div className="font-mono text-[13px] leading-5 text-foreground">
                      <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Qty", "数量")}</div>
                      {row.qty}
                    </div>
                    <div className={`text-left font-mono text-[13px] font-semibold leading-5 md:text-right ${isLong ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"}`}>
                      <div className="text-[10px] font-normal leading-4 text-muted-foreground md:hidden">{tr("Notional", "名义价值")}</div>
                      {row.notional}
                    </div>
                  </article>
                );
              })}
            </div>
          </DashboardPanel>

		        </>
	      ) : null}

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

function TopMetric({
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
      <div className="h-full w-full rounded-xl px-2 py-1.5 text-left">
        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
        <div className="mt-2">
          <div className={`stat-value text-[20px] font-semibold leading-none ${classForTone(tone)}`}>{value}</div>
        </div>
      </div>
    </MaybeExplainTooltip>
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
            <span className={`data-value text-xs font-semibold ${classForTone(row.tone)}`}>
              {row.value}
            </span>
          </div>
        ))}
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
          ? "border-border/70 bg-accent/45 text-[var(--semantic-up)]"
          : "border-border/70 bg-accent/45 text-[var(--semantic-down)]"
      }`}
    >
      {label}
    </span>
  );
}
