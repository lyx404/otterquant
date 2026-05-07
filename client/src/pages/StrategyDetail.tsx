/*
 * StrategyDetail — strategy backtest dashboard rebuilt into a
 * multi-panel quant research layout while preserving the top metrics block.
 */
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { strategies } from "@/lib/mockData";
import { buildSeries, parsePercent } from "@/lib/strategyUtils";
import {
  getExchangeVenueMeta,
  readExchangeApiConnections,
  type ExchangeApiConnection,
} from "@/lib/exchangeApiConnections";
import { deployStrategyToTrade, getStrategyDeployment } from "@/lib/tradeDeployments";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { useAlphaViewMode } from "@/contexts/AlphaViewModeContext";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  ClipboardList,
  HelpCircle,
  Unplug,
  PieChart,
  Star,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

const curveRanges = ["7D", "30D", "90D", "365D"] as const;
type CurveRange = (typeof curveRanges)[number];
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown" ? stored : "greenUpRedDown";
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
  explanation?: string;
};

type StrategyConfigRow = {
  key: string;
  label: string;
  value: string;
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

const preferenceSlices: PreferenceSlice[] = [
  { label: "ETH", value: 14.3, color: "var(--chart-1)" },
  { label: "BTC", value: 11.64, color: "var(--chart-4)" },
  { label: "WLD", value: 9.05, color: "var(--chart-2)" },
  { label: "CRV", value: 6.8, color: "var(--warning)" },
  { label: "WIF", value: 5.28, color: "var(--chart-3)" },
  { label: "1000PEPE", value: 4.87, color: "var(--success)" },
  { label: "SUI", value: 3.91, color: "var(--primary)" },
  { label: "BCH", value: 3.71, color: "var(--secondary)" },
  { label: "BSV", value: 3.7, color: "color-mix(in srgb, var(--warning) 78%, var(--foreground))" },
  { label: "APE", value: 3.57, color: "color-mix(in srgb, var(--chart-1) 82%, var(--foreground))" },
  { label: "Other", value: 33.17, color: "var(--muted-foreground)" },
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

function getPlotHoverIndex(
  clientX: number,
  rect: DOMRect,
  chartWidth: number,
  padding: number,
  count: number
) {
  const svgX = ((clientX - rect.left) / rect.width) * chartWidth;
  const innerLeft = padding;
  const innerRight = chartWidth - padding;
  const clampedX = Math.max(innerLeft, Math.min(innerRight, svgX));
  const ratio = (clampedX - innerLeft) / Math.max(1, innerRight - innerLeft);
  return Math.round(ratio * Math.max(0, count - 1));
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
  if (tone === "positive") return "text-[var(--semantic-up)]";
  if (tone === "negative") return "text-[var(--semantic-down)]";
  return "text-foreground";
}

function positionTone(value: string) {
  return value.startsWith("-") ? "text-[var(--semantic-down)]" : "text-[var(--semantic-up)]";
}

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled?: boolean;
  explanation?: string;
  children: ReactNode;
}) {
  if (!enabled || !explanation) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-5">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

function percentLevel(value: number, tr: (en: string, zh: string) => string, higherIsBetter = true) {
  const abs = Math.abs(value);
  if (higherIsBetter) {
    if (abs >= 60) return tr("high", "较高");
    if (abs >= 45) return tr("moderate", "中等");
    return tr("low", "较低");
  }
  if (abs <= 8) return tr("well controlled", "控制较好");
  if (abs <= 15) return tr("noticeable", "需要关注");
  return tr("high risk", "风险较高");
}

function sideClass(side: PositionRecord["side"]) {
  return side === "Cross Long"
    ? "border-border/70 bg-accent/45 text-muted-foreground"
    : "border-border/70 bg-accent/45 text-muted-foreground";
}

function TopMetric({
  label,
  value,
  tone = "neutral",
  explanation,
  explainEnabled,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  explanation?: string;
  explainEnabled?: boolean;
}) {
  const content = (
    <div className="h-full w-full rounded-xl px-2 py-1.5 text-left">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-[20px] font-semibold leading-none ${classForTone(tone)}`}>{value}</div>
    </div>
  );

  return (
    <MaybeExplainTooltip enabled={explainEnabled} explanation={explanation}>
      {content}
    </MaybeExplainTooltip>
  );
}

function DetailListCard({
  title,
  icon: Icon,
  rows,
  explainEnabled,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  rows: SectionRow[];
  explainEnabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <MaybeExplainTooltip key={row.label} enabled={explainEnabled} explanation={row.explanation}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className={`text-xs font-semibold ${classForTone(row.tone)}`}>{row.value}</span>
            </div>
          </MaybeExplainTooltip>
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
  explainEnabled,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  explanation?: string;
  explainEnabled?: boolean;
}) {
  return (
    <MaybeExplainTooltip enabled={explainEnabled} explanation={explanation}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        {label}
        <span className={`font-semibold ${classForTone(tone)}`}>{value}</span>
      </span>
    </MaybeExplainTooltip>
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
  actions?: React.ReactNode;
  contentClassName?: string;
  showHeaderDivider?: boolean;
  flushHeaderBottom?: boolean;
  children: React.ReactNode;
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

export default function StrategyDetail() {
  const { uiLang } = useAppLanguage();
  const { alphaViewMode } = useAlphaViewMode();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
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
  const strategyFromGeneratedId = (() => {
    const match = params.id?.match(/^STR-(\d+)$/);
    if (!match) return undefined;
    const index = Number(match[1]) - 463;
    return index >= 0 ? { ...strategies[index % strategies.length], id: params.id } : undefined;
  })();
  const strategy = strategyFromStore ?? strategyFromGeneratedId ?? {
    id: params.id,
    name: customName || tr("Strategy", "策略"),
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
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return true;
  });
  const [connectedExchangeApis, setConnectedExchangeApis] = useState<ExchangeApiConnection[]>(() =>
    readExchangeApiConnections()
  );
  const [selectedExchangeApiId, setSelectedExchangeApiId] = useState<string>("");
  const [liveCapitalInput, setLiveCapitalInput] = useState("1000");
  const shouldShowPlainExplanations = alphaViewMode === "beginner" && plainExplainEnabled;
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const semanticColorVars = useMemo(
    () =>
      ({
        "--semantic-up": chartColors.upHex,
        "--semantic-down": chartColors.downHex,
      }) as CSSProperties,
    [chartColors]
  );

  const strategyName = customName || strategy.name;
  const strategyHeading = strategyName;
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
  const selectedExchange = useMemo(
    () => connectedExchangeApis.find((item) => item.id === selectedExchangeApiId) ?? null,
    [connectedExchangeApis, selectedExchangeApiId]
  );
  useEffect(() => {
    if (connectedExchangeApis.length === 0) {
      setSelectedExchangeApiId("");
      return;
    }
    if (!selectedExchangeApiId || !connectedExchangeApis.some((item) => item.id === selectedExchangeApiId)) {
      setSelectedExchangeApiId(connectedExchangeApis[0].id);
    }
  }, [connectedExchangeApis, selectedExchangeApiId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PLAIN_EXPLANATION_STORAGE_KEY, String(plainExplainEnabled));
  }, [plainExplainEnabled]);
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
  const toReadableItems = (value: string | null | undefined, splitter: RegExp) => {
    const normalized = normalizeConfigValue(value);
    if (!normalized) return [];
    return normalized
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const formatConfigDate = (value: string) => {
    const normalized = value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").trim();
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (!match) return normalized;
    return `${match[1]} ${match[2] ?? "00"}:${match[3] ?? "00"}`;
  };
  const formatDecimalWeight = (value: number) => Number(value.toFixed(2)).toString();
  const formatCooldown = (value: string | null) => {
    if (!value) return null;
    const hours = value.match(/[\d.]+/)?.[0];
    if (!hours) return value;
    if (uiLang === "zh") return `${hours} 小时`;
    return `${hours} ${Number(hours) === 1 ? "hour" : "hours"}`;
  };
  const inferSymbolFromName = (value: string) => {
    const upperName = value.toUpperCase();
    if (upperName.includes("BTC")) return "BTCUSDT";
    if (upperName.includes("ETH")) return "ETHUSDT";
    return null;
  };
  const translateMonthLabel = (label: string) => {
    if (uiLang !== "zh") return label;
    switch (label) {
      case "Apr":
        return "4月";
      case "Jun":
        return "6月";
      case "Aug":
        return "8月";
      case "Oct":
        return "10月";
      case "Dec":
        return "12月";
      case "Feb":
        return "2月";
      default:
        return label;
    }
  };
  const translatePreferenceLabel = (label: string) => (label === "Other" ? tr("Other", "其他") : label);
  const translatePositionContract = (contract: PositionRecord["contract"]) =>
    contract === "Perp" ? tr("Perp", "永续") : contract;
  const translatePositionSide = (side: PositionRecord["side"]) => {
    switch (side) {
      case "Cross Long":
        return tr("Cross Long", "全仓多");
      case "Cross Short":
        return tr("Cross Short", "全仓空");
      default:
        return side;
    }
  };
  const translatePositionStatus = (status: PositionRecord["status"]) =>
    status === "Closed" ? tr("Closed", "已平仓") : status;

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
  const sortingRuleRaw = normalizeConfigValue(searchParams.get("sorting"));
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
  const signalItems = toReadableItems(searchParams.get("factors"), /\|/);
  const signalSelectionRaw = signalItems.length > 0 ? signalItems.join(", ") : null;
  const strategyTypeKey = strategyTypeRaw?.toLowerCase().replace(/\s+/g, "-");
  const isTimeSeriesStrategy = strategyTypeKey === "time-series";
  const isCrossSectionStrategy =
    strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section";
  const strategyTypeLabel =
    strategyTypeKey === "time-series"
      ? tr("Time Series", "时序策略")
      : strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section"
        ? tr("Cross Section", "截面策略")
        : strategyTypeRaw;
  const factorWeightItems = (() => {
    const explicitWeights = normalizeConfigValue(searchParams.get("weights"));
    if (explicitWeights) {
      const parsed = explicitWeights
        .split("|")
        .map((item) => {
          const [label, weight] = item.split(":");
          const parsedWeight = Number(weight);
          if (!label?.trim() || !Number.isFinite(parsedWeight)) return null;
          return {
            label: label.trim(),
            value: parsedWeight,
          };
        })
        .filter((item): item is { label: string; value: number } => item !== null);
      if (parsed.length > 0) return parsed;
    }

    if (weightingModeRaw?.toLowerCase() === "equal" && signalItems.length > 0) {
      const equalWeight = 1 / signalItems.length;
      return signalItems.map((label) => ({ label, value: equalWeight }));
    }

    return [];
  })();
  const factorWeightSummary =
    factorWeightItems.length > 0
      ? factorWeightItems
          .map((item) => `${item.label} ${formatDecimalWeight(item.value)}`)
          .join(" | ")
      : null;
  const factorWeightTotal = factorWeightItems.reduce((sum, item) => sum + item.value, 0);
  const factorWeightColors = ["#6E82F6", "#16E0A7", "#22D3EE", "#F0C13B", "#FF6B88"];
  const strategySideValue =
    executionSideRaw === "long"
      ? tr("Long-Only", "仅做多")
      : executionSideRaw === "short"
        ? tr("Short-Only", "仅做空")
        : executionSideRaw === "neutral"
          ? tr("Market-Neutral", "市场中性")
          : executionSideRaw;
  const topTailRuleValue =
    rankValueRaw && isCrossSectionStrategy
      ? uiLang === "zh"
        ? `头部/尾部 ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " 个交易对"}`
        : `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " instruments"}`
      : sortingRuleRaw;
  const stopLossValue = stopLossRaw ? (stopLossRaw.includes("%") ? stopLossRaw : `${stopLossRaw}%`) : null;
  const cooldownValue = formatCooldown(cooldownRaw);
  const unsetConfigValue = tr("N/A", "未设置");
  const factorWeightValue =
    factorWeightSummary ??
    (weightingModeRaw?.toLowerCase() === "equal" ? tr("Equal Weight", "等权") : null);
  const strategyConfigRows: StrategyConfigRow[] = [
    { key: "strategy-id", label: tr("Strategy ID", "策略 ID"), value: strategyId },
    { key: "created-date", label: tr("Created Date", "创建时间"), value: formatConfigDate(createdAt) },
    { key: "strategy-type", label: tr("Strategy Type", "策略类型"), value: strategyTypeLabel ?? unsetConfigValue },
    {
      key: "symbol",
      label: tr("Symbol", "交易对"),
      value: symbolScopeRaw ?? inferSymbolFromName(strategyName) ?? unsetConfigValue,
    },
    { key: "signal", label: tr("Signal", "因子"), value: signalSelectionRaw ?? unsetConfigValue },
    { key: "factor-weights", label: tr("Factor Weights", "因子权重"), value: factorWeightValue ?? unsetConfigValue },
    { key: "stop-loss", label: tr("Stop Loss", "止损"), value: stopLossValue ?? unsetConfigValue },
    { key: "cooldown", label: tr("Cooldown", "冷却时间"), value: cooldownValue ?? unsetConfigValue },
    { key: "strategy-side", label: tr("Strategy Side", "策略方向"), value: strategySideValue ?? unsetConfigValue },
    { key: "top-tail-rule", label: tr("Top/Tail Rule", "头尾分层规则"), value: topTailRuleValue ?? unsetConfigValue },
  ];
  const getStrategyConfigRow = (key: string) => strategyConfigRows.find((row) => row.key === key);
  const strategyConfigGroups = [
    {
      title: tr("Basic Info", "基础信息"),
      rows: ["strategy-id", "created-date", "strategy-type"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
    {
      title: tr("Inputs", "策略输入"),
      rows: ["symbol", "signal", "factor-weights"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
    {
      title: tr("Risk & Execution", "风控与执行"),
      rows: ["stop-loss", "cooldown", "strategy-side", "top-tail-rule"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
  ].filter((group) => group.rows.length > 0);

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
      label: tr("Peak Equity", "最高权益"),
      value: `${peakEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
      explanation: tr(
        "Highest account equity during the backtest.",
        "回测期间账户权益的最高值。"
      ),
    },
    {
      label: tr("Min Equity", "最低权益"),
      value: `${minEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
      explanation: tr(
        "Lowest account equity during the backtest.",
        "回测期间账户权益的最低值。"
      ),
    },
    {
      label: tr("Realized PnL", "已实现盈亏"),
      value: `${fmtSigned(realizedPnl)} USDT`,
      tone: realizedPnl >= 0 ? "positive" : "negative",
      explanation: tr(
        "Confirmed PnL from closed positions.",
        "已平仓仓位确认的盈亏。"
      ),
    },
    {
      label: tr("Unrealized PnL", "未实现盈亏"),
      value: `${fmtSigned(unrealizedPnl)} USDT`,
      tone: unrealizedPnl >= 0 ? "positive" : "negative",
      explanation: tr(
        "Floating PnL from open positions.",
        "未平仓仓位的浮动盈亏。"
      ),
    },
  ];

  const perfRows: SectionRow[] = [
    {
      label: tr("Sharpe Ratio", "夏普比率"),
      value: strategy.sharpe.toFixed(2),
      explanation: tr(
        "Sharpe measures return stability. Higher is better.",
        "夏普比率衡量收益稳定性，越高越好。"
      ),
    },
    {
      label: tr("Calmar Ratio", "Calmar比率"),
      value: calmar.toFixed(2),
      explanation: tr(
        "Calmar compares return with drawdown. Higher is better.",
        "Calmar 比率衡量收益相对回撤的表现，越高越好。"
      ),
    },
    {
      label: tr("Win Rate", "胜率"),
      value: `${winRate.toFixed(2)}%`,
      explanation: tr(
        `Win rate is profitable trades divided by total trades. ${winRate.toFixed(2)}% is ${percentLevel(winRate, tr)}.`,
        `盈利交易次数占总交易次数的比例，${winRate.toFixed(2)}% 属于${percentLevel(winRate, tr)}。`
      ),
    },
    {
      label: tr("Profit/Loss Ratio", "盈亏比"),
      value: profitLossRatio.toFixed(2),
      explanation: tr(
        "Average profit divided by average loss.",
        "平均盈利与平均亏损的比例。"
      ),
    },
  ];

  const tradeRows: SectionRow[] = [
    {
      label: tr("Trading Days", "交易天数"),
      value: `${tradingDays}`,
      explanation: tr(
        "Trading days covered by this backtest.",
        "本次回测覆盖的交易日数量。"
      ),
    },
    {
      label: tr("Total Trades", "总交易次数"),
      value: `${totalTrades}`,
      explanation: tr(
        "Completed trades during the backtest.",
        "回测期间完成的交易次数。"
      ),
    },
    {
      label: tr("Max Exposure", "最大敞口"),
      value: `${maxExposure.toFixed(2)}%`,
      explanation: tr(
        "Largest capital share exposed to risk at one time.",
        "单一时点投入风险中的最大资金比例。"
      ),
    },
    {
      label: tr("Total Fees", "总手续费"),
      value: `${totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`,
      explanation: tr(
        "Estimated transaction costs during the backtest.",
        "回测期间累计产生的交易成本。"
      ),
    },
  ];

  const curveChart = useMemo(() => {
    const meta = curveMeta[curveRange];
    const width = 720;
    const height = 280;
    const padding = 28;
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
      toast.success(tr("Deployed to paper trading.", "已部署到模拟交易。"));
      return;
    }
    if (options?.exchangeLabel && options.capitalUsdt) {
      toast.success(
        uiLang === "zh"
          ? `已提交至 ${options.exchangeLabel} 的实盘部署，基础资金 ${options.capitalUsdt.toLocaleString()} USDT。`
          : `Live deployment submitted to ${options.exchangeLabel} with ${options.capitalUsdt.toLocaleString()} USDT base capital.`
      );
      return;
    }
    toast.success(tr("Deployed to live trading.", "已部署到实盘交易。"));
  };

  const openLiveDeployModal = () => {
    const latestExchangeApis = readExchangeApiConnections();
    setConnectedExchangeApis(latestExchangeApis);
    if (latestExchangeApis.length > 0) {
      setSelectedExchangeApiId((current) =>
        latestExchangeApis.some((item) => item.id === current) ? current : latestExchangeApis[0].id
      );
    } else {
      setSelectedExchangeApiId("");
    }
    setIsLiveDeployOpen(true);
  };

  const goToExchangeApi = () => {
    setIsLiveDeployOpen(false);
    window.location.assign("/account?tab=exchangeApi");
  };

  const submitLiveDeployment = () => {
    if (!selectedExchange) {
      toast.error(tr("Select an exchange account before submitting live deployment.", "提交实盘部署前请先选择交易所账户。"));
      return;
    }
    if (!isLiveCapitalNumeric || parsedLiveCapital <= 0) {
      toast.error(tr("Enter a valid base capital amount in USDT.", "请输入有效的 USDT 基础资金金额。"));
      return;
    }
    if (parsedLiveCapital < minLiveCapital) {
      toast.error(
        uiLang === "zh"
          ? `最低启用资金为 ${minLiveCapital} USDT，低于该阈值无法发起部署。`
          : `Minimum activation capital is ${minLiveCapital} USDT. Deployment cannot be initiated below this threshold.`
      );
      return;
    }
    const venue = getExchangeVenueMeta(selectedExchange.venue);
    deployStrategy("live", {
      exchangeLabel: `${selectedExchange.accountName} (${venue.label})`,
      capitalUsdt: parsedLiveCapital,
    });
    setIsLiveDeployOpen(false);
  };

  const tierBadgeClass = "border-primary/30 bg-primary/10 text-primary";
  const tierBadgeLabel = strategyTier === "official" ? tr("Official", "官方") : tr("Graduated", "三方");
  const activeSlice = preferenceSlices[activePreference];
  const equityCurveColor = curveStats.total >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";
  const curveHoverPoint =
    curveHoverIndex !== null ? curveChart.equityPoints[curveHoverIndex] : null;
  const benchmarkHoverPoint =
    curveHoverIndex !== null ? curveChart.benchmarkPoints[curveHoverIndex] : null;
  const returnsHoverSlot = returnsHoverIndex !== null ? 1064 / dailyReturns.length : 0;
  const returnsHoverGeometry =
    returnsHoverIndex !== null
      ? (() => {
          const value = dailyReturns[returnsHoverIndex];
          const x = 28 + returnsHoverIndex * returnsHoverSlot + returnsHoverSlot / 2;
          const magnitude = Math.min(105, (Math.abs(value) / 1.4) * 105);
          const barTop = value >= 0 ? 140 - magnitude : 140;
          const barBottom = value >= 0 ? 140 : 140 + magnitude;
          const y = value >= 0 ? Math.max(24, barTop - 8) : Math.min(252, barBottom + 8);
          return { x, y, value };
        })()
      : null;
  const topMetricExplanations = {
    totalEquity: tr(
      "Total equity equals initial capital plus cumulative PnL.",
      "总权益 = 初始资金 + 累计盈亏。"
    ),
    pnl: tr(
      "Cumulative profit and loss. Positive means profit.",
      "累计盈亏，正数为盈利，负数为亏损。"
    ),
    roi: tr(
      `ROI shows return on invested capital. ${fmtSigned(returnRate)}% is positive.`,
      `ROI 表示投入资金对应的收益比例，${fmtSigned(returnRate)}% 为正收益。`
    ),
    winRate: tr(
      `Win rate is profitable trades divided by total trades. ${winRate.toFixed(2)}% is ${percentLevel(winRate, tr)}.`,
      `盈利交易次数占总交易次数的比例，${winRate.toFixed(2)}% 属于${percentLevel(winRate, tr)}。`
    ),
    sharpe: tr(
      "Sharpe measures return stability. Higher is better.",
      "夏普比率衡量收益稳定性，越高越好。"
    ),
    maxDrawdown: tr(
      `Max drawdown is the largest decline. ${Math.abs(drawdownPct).toFixed(2)}% risk is ${percentLevel(drawdownPct, tr, false)}.`,
      `最大回撤表示期间最大下跌幅度，${Math.abs(drawdownPct).toFixed(2)}% 风险${percentLevel(drawdownPct, tr, false)}。`
    ),
    totalReturn: tr(
      "Equity curve return over the selected range.",
      "所选周期内资产曲线的收益。"
    ),
    excessReturn: tr(
      "Strategy return minus benchmark return.",
      "策略收益减去基准收益后的差值。"
    ),
    calmar: tr(
      "Calmar compares return with drawdown. Higher is better.",
      "Calmar 比率衡量收益相对回撤的表现，越高越好。"
    ),
    avgDailyReturn: tr(
      "Average daily return in the selected range.",
      "所选周期内的平均日收益。"
    ),
    wins: tr(
      "Days with positive returns.",
      "正收益日数量。"
    ),
    losses: tr(
      "Days with negative returns.",
      "负收益日数量。"
    ),
  };

  return (
    <div className="space-y-6 min-w-0" style={semanticColorVars}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-6">
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 shrink-0 gap-1 rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() =>
              window.location.assign(isOfficialLibraryView ? "/strategies/official" : "/strategies")
            }
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tr("Back", "返回")}
          </Button>

          <div className="min-w-0">
            <h1 className="text-foreground">{strategyHeading}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{strategyId}</span>
                <span>·</span>
                <span>{tr("Created", "创建于")} {formatConfigDate(createdAt)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isOfficialLibraryView ? (
                  <span
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${tierBadgeClass}`}
                  >
                    {tierBadgeLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setIsStrategyConfigOpen(true)}
                >
                  {tr("View Strategy Configuration", "查看策略配置")}
                </button>
                {alphaViewMode === "beginner" ? (
                  <button
                    type="button"
                    onClick={() => setPlainExplainEnabled((enabled) => !enabled)}
                    className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs transition-colors ${
                      plainExplainEnabled
                        ? "border-primary/50 bg-primary/12 text-primary"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={plainExplainEnabled}
                    title={tr("Toggle plain-language explanations", "开启/关闭通俗解释")}
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    {tr("Plain explanations", "通俗解释")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOfficialLibraryView ? (
            <>
              <Button
                variant="outline"
                className="h-10 w-10 rounded-full border-border/80 bg-card p-0 text-foreground hover:bg-accent"
                onClick={() => {
                  setStarred((prev) => !prev);
                  toast.success(starred ? tr("Removed from favorites", "已取消收藏") : tr("Added to favorites", "已加入收藏"));
                }}
                aria-label={starred ? tr("Unfavorite strategy", "取消收藏策略") : tr("Favorite strategy", "收藏策略")}
              >
                <Star className={`h-4 w-4 ${starred ? "fill-current text-amber-400" : ""}`} />
              </Button>
              <Button
                className="h-10 rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                onClick={() =>
                  window.location.assign(
                    `/strategies/new?template=${encodeURIComponent(strategyId)}&creationMode=platform&scale=single`
                  )
                }
              >
                {tr("Use Template", "使用模板")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-10 w-10 rounded-full border-border/80 bg-card p-0 text-foreground hover:bg-accent"
                onClick={() => {
                  setStarred((prev) => !prev);
                  toast.success(starred ? tr("Removed from favorites", "已取消收藏") : tr("Added to favorites", "已加入收藏"));
                }}
                aria-label={starred ? tr("Unfavorite strategy", "取消收藏策略") : tr("Favorite strategy", "收藏策略")}
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
                {paperDeployment ? tr("View Paper Trade", "查看模拟交易") : tr("Deploy to Paper Trading", "部署到模拟交易")}
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
                {liveDeployment ? tr("View Live Trade", "查看实盘交易") : tr("Deploy to Live Trading", "部署到实盘交易")}
              </Button>
            </>
          )}
        </div>
      </div>

      <section className="surface-card space-y-6 p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <TopMetric
            label={tr("Total Equity (USDT)", "总权益（USDT）")}
            value={currentEquity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            explanation={topMetricExplanations.totalEquity}
            explainEnabled={shouldShowPlainExplanations}
          />
          <TopMetric
            label={tr("PnL (USDT)", "PnL（USDT）")}
            value={fmtSigned(totalReturn)}
            tone={totalReturn >= 0 ? "positive" : "negative"}
            explanation={topMetricExplanations.pnl}
            explainEnabled={shouldShowPlainExplanations}
          />
          <TopMetric
            label={tr("ROI", "ROI")}
            value={`${fmtSigned(returnRate)}%`}
            tone={returnRate >= 0 ? "positive" : "negative"}
            explanation={topMetricExplanations.roi}
            explainEnabled={shouldShowPlainExplanations}
          />
          <TopMetric
            label={tr("Win Rate", "胜率")}
            value={`${winRate.toFixed(2)}%`}
            explanation={topMetricExplanations.winRate}
            explainEnabled={shouldShowPlainExplanations}
          />
          <TopMetric
            label={tr("Sharpe", "夏普比率")}
            value={strategy.sharpe.toFixed(2)}
            explanation={topMetricExplanations.sharpe}
            explainEnabled={shouldShowPlainExplanations}
          />
          <TopMetric
            label={tr("Max Drawdown", "最大回撤")}
            value={`${Math.abs(drawdownPct).toFixed(2)}%`}
            tone="negative"
            explanation={topMetricExplanations.maxDrawdown}
            explainEnabled={shouldShowPlainExplanations}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <DetailListCard
            title={tr("Fund Snapshot", "资金快照")}
            icon={Wallet}
            rows={fundRows}
            explainEnabled={shouldShowPlainExplanations}
          />
          <DetailListCard
            title={tr("Performance Metrics", "表现指标")}
            icon={TrendingUp}
            rows={perfRows}
            explainEnabled={shouldShowPlainExplanations}
          />
          <DetailListCard
            title={tr("Trade Statistics", "交易统计")}
            icon={ClipboardList}
            rows={tradeRows}
            explainEnabled={shouldShowPlainExplanations}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5">
        <DashboardPanel
          title={tr("Asset Curve", "资产曲线")}
          icon={BarChart3}
          showHeaderDivider={false}
          flushHeaderBottom
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
          <div className="flex min-h-[285px] flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <ChartLegendItem color={equityCurveColor} label={tr("Equity", "权益")} />
                <ChartLegendItem color="var(--chart-1)" label={tr("Benchmark", "基准")} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <ExplainStat
                  label={tr("Total Return", "总收益")}
                  value={`${fmtSigned(curveStats.total)}%`}
                  tone={curveStats.total >= 0 ? "positive" : "negative"}
                  explanation={topMetricExplanations.totalReturn}
                  explainEnabled={shouldShowPlainExplanations}
                />
                <ExplainStat
                  label={tr("Excess Return", "超额收益")}
                  value={`${fmtSigned(curveStats.excess)}%`}
                  tone={curveStats.excess >= 0 ? "positive" : "negative"}
                  explanation={topMetricExplanations.excessReturn}
                  explainEnabled={shouldShowPlainExplanations}
                />
                <ExplainStat
                  label={tr("Sharpe", "夏普比率")}
                  value={strategy.sharpe.toFixed(2)}
                  explanation={topMetricExplanations.sharpe}
                  explainEnabled={shouldShowPlainExplanations}
                />
                <ExplainStat
                  label={tr("Calmar", "Calmar比率")}
                  value={calmar.toFixed(2)}
                  explanation={topMetricExplanations.calmar}
                  explainEnabled={shouldShowPlainExplanations}
                />
              </div>
            </div>

            <div className="relative h-[205px] sm:h-[225px]">
              <svg
                viewBox={`0 0 ${curveChart.width} ${curveChart.height}`}
                preserveAspectRatio="none"
                className="block h-full w-full"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setCurveHoverIndex(
                    getPlotHoverIndex(
                      event.clientX,
                      rect,
                      curveChart.width,
                      curveChart.padding,
                      curveChart.equityValues.length
                    )
                  );
                }}
                onMouseLeave={() => setCurveHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="asset-curve-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={equityCurveColor} stopOpacity="0.24" />
                    <stop offset="100%" stopColor={equityCurveColor} stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width={curveChart.width}
                  height={curveChart.height}
                  rx="14"
                  fill="var(--muted)"
                  opacity="0.38"
                />
                {Array.from({ length: 6 }, (_, index) => (
                  <line
                    key={index}
                    x1={curveChart.padding}
                    y1={curveChart.padding + index * ((curveChart.height - curveChart.padding * 2) / 5)}
                    x2={curveChart.width - curveChart.padding}
                    y2={curveChart.padding + index * ((curveChart.height - curveChart.padding * 2) / 5)}
                    stroke="var(--border)"
                    opacity="0.72"
                    strokeDasharray="3 8"
                  />
                ))}
                <path d={curveChart.equityArea} fill="url(#asset-curve-fill)" />
                <path
                  d={curveChart.equityPath}
                  fill="none"
                  stroke={equityCurveColor}
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d={curveChart.benchmarkPath}
                  fill="none"
                  stroke="var(--chart-1)"
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
                      stroke="var(--muted-foreground)"
                      opacity="0.35"
                      strokeDasharray="4 6"
                    />
                  </>
                ) : null}
              </svg>

              {curveHoverPoint && benchmarkHoverPoint ? (
                <>
                  <span
                    className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm"
                    style={{
                      left: `${(curveHoverPoint.x / curveChart.width) * 100}%`,
                      top: `${(curveHoverPoint.y / curveChart.height) * 100}%`,
                      backgroundColor: equityCurveColor,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--chart-1)] shadow-sm"
                    style={{
                      left: `${(benchmarkHoverPoint.x / curveChart.width) * 100}%`,
                      top: `${(benchmarkHoverPoint.y / curveChart.height) * 100}%`,
                    }}
                  />
                </>
              ) : null}

              {curveHoverIndex !== null ? (
                <div
                  className="pointer-events-none absolute z-30 w-max min-w-[148px] rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                  style={{
                    left: `${(curveChart.equityPoints[curveHoverIndex].x / curveChart.width) * 100}%`,
                    transform:
                      curveHoverIndex === 0
                        ? "translateX(0)"
                        : curveHoverIndex === curveChart.equityPoints.length - 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    top: 18,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {curveMeta[curveRange].labels[Math.min(curveMeta[curveRange].labels.length - 1, Math.floor((curveHoverIndex / Math.max(1, curveChart.equityValues.length - 1)) * curveMeta[curveRange].labels.length))]}
                  </div>
                  <div className="mt-1 grid grid-cols-[auto_auto_1fr] items-center gap-2 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: equityCurveColor }} />
                    <span className="text-muted-foreground">{tr("Equity", "权益")}</span>
                    <span className="text-right font-semibold text-foreground">
                      {curveChart.equityValues[curveHoverIndex].toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-[auto_auto_1fr] items-center gap-2 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
                    <span className="text-muted-foreground">{tr("Benchmark", "基准")}</span>
                    <span className="text-right font-semibold text-foreground">
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

        <DashboardPanel title={tr("Asset Preferences", "资产偏好")} icon={PieChart} showHeaderDivider={false} flushHeaderBottom>
          <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="flex items-center justify-center">
              <div className="relative h-[244px] w-[244px] sm:h-[272px] sm:w-[272px]">
                <svg viewBox="0 0 260 260" className="h-full w-full">
                  <circle cx="130" cy="130" r="84" fill="none" stroke="var(--border)" strokeWidth="34" opacity="0.65" />
                  {(() => {
                    const circumference = 2 * Math.PI * 84;
                    let offset = 0;
                    return preferenceSlices.map((slice, index) => {
                      const length = (slice.value / 100) * circumference;
                      const node = (
                        <circle
                          key={slice.label}
                          cx="130"
                          cy="130"
                          r="84"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={activePreference === index ? 38 : 34}
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
                  <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{tr("Top Asset", "核心资产")}</div>
                  <div className="mt-1 max-w-[86px] truncate text-lg font-semibold leading-none text-foreground">{translatePreferenceLabel(activeSlice.label)}</div>
                  <div className="mt-1 max-w-[96px] text-[11px] leading-4 text-muted-foreground">{activeSlice.value.toFixed(2)}% {tr("allocation", "仓位占比")}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
              {preferenceSlices.map((slice, index) => (
                <button
                  key={slice.label}
                  type="button"
                  onMouseEnter={() => setActivePreference(index)}
                  className={`flex min-h-8 items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    activePreference === index ? "bg-primary/10" : "hover:bg-accent/35"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="font-medium text-muted-foreground">{translatePreferenceLabel(slice.label)}</span>
                  </span>
                  <span className="font-semibold text-foreground">{slice.value.toFixed(2)}%</span>
                </button>
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
              value={`${fmtSigned(returnSummary.avg, 3)}%`}
              tone={returnSummary.avg >= 0 ? "positive" : "negative"}
              explanation={topMetricExplanations.avgDailyReturn}
              explainEnabled={shouldShowPlainExplanations}
            />
            <MaybeExplainTooltip
              enabled={shouldShowPlainExplanations}
              explanation={topMetricExplanations.wins}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--semantic-up)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-up)]" />
                {tr("W", "胜")}{returnSummary.wins}
              </span>
            </MaybeExplainTooltip>
            <MaybeExplainTooltip
              enabled={shouldShowPlainExplanations}
              explanation={topMetricExplanations.losses}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--semantic-down)]">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-down)]" />
                {tr("L", "负")}{returnSummary.losses}
              </span>
            </MaybeExplainTooltip>
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
            preserveAspectRatio="none"
            className="block h-[220px] w-full sm:h-[240px]"
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const svgX = ((event.clientX - rect.left) / rect.width) * 1120;
              const plotX = Math.max(28, Math.min(1092, svgX));
              const slot = 1064 / dailyReturns.length;
              const index = Math.max(0, Math.min(dailyReturns.length - 1, Math.floor((plotX - 28) / slot)));
              setReturnsHoverIndex(index);
            }}
            onMouseLeave={() => setReturnsHoverIndex(null)}
          >
            <rect x="0" y="0" width="1120" height="280" rx="14" fill="var(--muted)" opacity="0.38" />
            {Array.from({ length: 5 }, (_, index) => (
              <line
                key={index}
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
                  fill={value >= 0 ? "var(--semantic-up)" : "var(--semantic-down)"}
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
                    stroke="var(--muted-foreground)"
                    opacity="0.35"
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
                left: `${(((returnsHoverGeometry?.x ?? 28) / 1120) * 100)}%`,
                transform:
                  returnsHoverIndex === 0
                    ? `translate(0, ${dailyReturns[returnsHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`
                    : returnsHoverIndex === dailyReturns.length - 1
                      ? `translate(-100%, ${dailyReturns[returnsHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`
                      : `translate(-50%, ${dailyReturns[returnsHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`,
                top: `${(((returnsHoverGeometry?.y ?? 24) / 280) * 100)}%`,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {translateMonthLabel(returnMeta[returnsRange].labels[
                  Math.min(
                    returnMeta[returnsRange].labels.length - 1,
                    Math.floor(
                      (returnsHoverIndex / Math.max(1, dailyReturns.length - 1)) *
                        returnMeta[returnsRange].labels.length
                    )
                  )
                ])}
              </div>
              <div className={`mt-1 font-semibold ${dailyReturns[returnsHoverIndex] >= 0 ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"}`}>
                {fmtSigned(dailyReturns[returnsHoverIndex], 3)}%
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          {returnMeta[returnsRange].labels.map((label) => (
            <span key={label}>{translateMonthLabel(label)}</span>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel title={tr("Position History", "持仓历史")} icon={BriefcaseBusiness} contentClassName="px-4 pb-4 pt-2" showHeaderDivider={false} flushHeaderBottom>
        <div className="space-y-1">
          <div className="hidden rounded-lg bg-accent/30 px-3 py-2 text-[10px] leading-4 text-muted-foreground md:grid md:grid-cols-[minmax(210px,1.4fr)_minmax(0,4fr)_96px] md:gap-4">
            <div>{tr("Position", "持仓")}</div>
            <div className="grid min-w-0 grid-cols-[0.65fr_0.85fr_1.35fr_1.35fr] gap-x-4">
              <div>{tr("Entry Price", "开仓价")}</div>
              <div>{tr("Max Open Interest", "最大持仓量")}</div>
              <div>{tr("Opened", "开仓时间")}</div>
              <div>{tr("Closed", "平仓时间")}</div>
            </div>
            <div className="text-right">{tr("PnL", "盈亏")}</div>
          </div>
          {positionHistory.map((position) => (
            <article
              key={`${position.symbol}-${position.openedAt}`}
              className="grid grid-cols-1 gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/20 md:grid-cols-[minmax(210px,1.4fr)_minmax(0,4fr)_96px] md:items-center md:gap-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold leading-5 text-foreground">{position.symbol}</h3>
                  <span className="inline-flex items-center justify-start rounded-md bg-accent/45 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {translatePositionContract(position.contract)}
                  </span>
                  <span className={`inline-flex items-center justify-start rounded-md px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${sideClass(position.side)}`}>
                    {translatePositionSide(position.side)}
                  </span>
                  <span className="inline-flex items-center justify-start rounded-md bg-accent/45 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    {translatePositionStatus(position.status)}
                  </span>
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-sm xl:grid-cols-[0.65fr_0.85fr_1.35fr_1.35fr]">
                <div className="min-w-0">
                  <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Entry Price", "开仓价")}</div>
                  <div className="font-mono text-[13px] leading-5 text-foreground">{position.entryPrice}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Max Open Interest", "最大持仓量")}</div>
                  <div className="font-mono text-[13px] leading-5 text-foreground">{position.maxOpenInterest}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Opened", "开仓时间")}</div>
                  <div className="whitespace-nowrap font-mono text-[11px] leading-5 text-foreground xl:text-xs">{position.openedAt}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] leading-4 text-muted-foreground md:hidden">{tr("Closed", "平仓时间")}</div>
                  <div className="whitespace-nowrap font-mono text-[11px] leading-5 text-foreground xl:text-xs">{position.closedAt}</div>
                </div>
              </div>

              <div className={`text-left text-[13px] font-semibold leading-5 md:text-right ${positionTone(position.pnl)}`}>
                {position.pnl}
              </div>
            </article>
          ))}
        </div>
      </DashboardPanel>

      <Dialog
        open={isLiveDeployOpen}
        onOpenChange={(open) => {
          setIsLiveDeployOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl border-border bg-card p-0 text-foreground">
          <>
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle>{tr("Deploy Strategy to Live Trading", "部署到实盘交易")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-5 px-6 py-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {tr("Exchange", "交易所")}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-primary hover:text-primary/80"
                      onClick={goToExchangeApi}
                    >
                      {tr("Manage Connections", "管理连接")}
                    </button>
                  </div>

                  {connectedExchangeApis.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 bg-accent/25 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/40 text-muted-foreground">
                            <Unplug className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{tr("No Exchange API Connected", "未连接交易所 API")}</p>
                            <p className="text-xs text-muted-foreground">
                              {tr("Connect an exchange API account to enable live deployment.", "连接交易所 API 账户后即可启用实盘部署。")}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 shrink-0 rounded-full border-border bg-card px-3 text-xs"
                          onClick={goToExchangeApi}
                        >
                          {tr("Connect Exchange", "连接交易所")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select value={selectedExchangeApiId} onValueChange={setSelectedExchangeApiId}>
                      <SelectTrigger className="h-11 w-full border-border/70 bg-background/35 text-foreground">
                        <SelectValue placeholder={tr("Select exchange account", "选择交易所账户")} />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-card text-foreground">
                        {connectedExchangeApis.map((exchange) => {
                          const venue = getExchangeVenueMeta(exchange.venue);
                          return (
                            <SelectItem key={exchange.id} value={exchange.id}>
                              <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[9px] font-semibold uppercase tracking-[0.08em] ${venue.iconClassName}`}
                              >
                                {venue.iconText}
                              </span>
                              <span className="truncate">
                                {exchange.accountName} · {venue.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {tr("Base Capital", "基础资金")}
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
                    <p className="text-xs text-[#FF2056]">
                      {tr("Minimum activation capital is 100 USDT. Deployment cannot be initiated below this threshold.", "最低启用资金为 100 USDT，低于该阈值无法发起部署。")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {tr("Minimum activation capital: 100 USDT.", "最低启用资金：100 USDT。")}
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
                  {tr("Cancel", "取消")}
                </Button>
                <Button
                  className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
                  disabled={!canSubmitLiveDeploy}
                  onClick={submitLiveDeployment}
                >
                  {tr("Submit Live Deployment", "提交实盘部署")}
                </Button>
              </div>
            </>
        </DialogContent>
      </Dialog>

      <Dialog open={isStrategyConfigOpen} onOpenChange={setIsStrategyConfigOpen}>
        <DialogContent showCloseButton={false} className="max-w-[680px] border-border bg-card p-0 text-foreground">
          <DialogClose className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="px-5 pb-1 pt-4">
            <DialogTitle className="text-base">{tr("Strategy Configuration", "策略配置")}</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {strategyName} · {strategyId}
            </p>
          </DialogHeader>

          <div className="space-y-2 px-5 pb-4 pt-1">
            {strategyConfigGroups.map((group) => (
              <section key={group.title} className="rounded-xl bg-accent/20 px-3.5 py-2.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.title}
                </h3>
                <div className="mt-1.5 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
                  {group.rows.map((row) => (
                    <div
                      key={row.key}
                      className={`min-w-0 ${row.key === "signal" || row.key === "factor-weights" ? "sm:col-span-2" : ""}`}
                    >
                      <p className="text-[11px] leading-4 text-muted-foreground">{row.label}</p>
                      <p className="mt-0.5 break-words text-[13px] font-medium leading-5 text-foreground">{row.value}</p>
                      {row.key === "factor-weights" && factorWeightItems.length > 0 ? (
                        <div className="space-y-1.5 pt-1.5">
                          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/70">
                            {factorWeightItems.map((item, index) => {
                              const width =
                                factorWeightTotal > 0
                                  ? Math.max(0, Math.min((item.value / factorWeightTotal) * 100, 100))
                                  : 0;
                              return (
                                <div
                                  key={`${item.label}-${index}`}
                                  className="h-full"
                                  style={{
                                    width: `${width}%`,
                                    backgroundColor: factorWeightColors[index % factorWeightColors.length],
                                  }}
                                  title={`${item.label} ${formatDecimalWeight(item.value)}`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
                            {factorWeightItems.map((item, index) => (
                              <span key={`${item.label}-legend-${index}`} className="inline-flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: factorWeightColors[index % factorWeightColors.length],
                                  }}
                                />
                                {item.label} {formatDecimalWeight(item.value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
