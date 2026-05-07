/*
 * MyStrategies — Figma-aligned strategy list page
 * Structure: Header + Summary cards + Toolbar + Strategy cards (grid/list)
 * Visual style stays aligned with existing My Alphas dark design tokens.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { strategies } from "@/lib/mockData";
import { buildSeries, parsePercent } from "@/lib/strategyUtils";
import { useAlphaViewMode } from "@/contexts/AlphaViewModeContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  ArrowUpDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Columns3,
  Grid2x2,
  HelpCircle,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";

type SortKey = "updated" | "name" | "roi" | "winRate" | "sharpe";
type ViewMode = "grid" | "list";
type MetricKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type DisplayItemKey = MetricKey | "createdAt" | "id";
type StrategyFilter = "all" | "favorites" | "trading" | "idle";
type ExecutionMode = "paper" | "live" | "idle";

interface StrategyViewRow {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  statusLabel: "Paper Trading" | "Live Trading" | "Not Running";
  executionMode: ExecutionMode;
  statusClass: string;
  roi: string;
  winRate: string;
  sharpe: string;
  maxDrawdown: string;
}

const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
const DELETED_STRATEGIES_STORAGE_KEY = "otterquant:mystrategies:deleted-strategies";
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

type ChartColorTokens = ReturnType<typeof getChartColorTokens>;

function strategyMetricColor(key: MetricKey, value: string, chartColors: ChartColorTokens) {
  if (key === "roi") return parsePercent(value) < 0 ? chartColors.downHex : chartColors.upHex;
  if (key === "maxDrawdown") return parsePercent(value) === 0 ? undefined : chartColors.downHex;
  return undefined;
}

const strategyCardEquityValues = buildSeries(64, 99100, 138, 260);
const strategyCardCurveValues = strategyCardEquityValues.map((value) =>
  Number((value - strategyCardEquityValues[0]).toFixed(2))
);

function buildSparklinePoints(values: number[], width: number, height: number, padding = 6) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / Math.max(1, values.length - 1);

  return values.map((value, index) => ({
    x: padding + index * step,
    y: height - padding - ((value - min) / range) * (height - padding * 2),
    value,
  }));
}

function buildSparklineAreaPath(points: Array<{ x: number; y: number }>, zeroY: number) {
  if (points.length < 2) return "";
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${zeroY.toFixed(2)} L ${first.x.toFixed(2)} ${zeroY.toFixed(2)} Z`;
}

function buildSparklineAreaRuns(
  points: Array<{ x: number; y: number; value: number }>,
  upColor: string,
  downColor: string,
  zeroY: number
) {
  if (points.length < 2) return [];

  const runs: Array<{ color: string; points: typeof points }> = [];
  const appendRun = (color: string, segmentPoints: typeof points) => {
    if (segmentPoints.length < 2) return;
    const previous = runs[runs.length - 1];
    if (previous?.color === color) {
      previous.points.push(...segmentPoints.slice(1));
      return;
    }
    runs.push({ color, points: segmentPoints });
  };

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const previousIsPositive = previous.value >= 0;
    const pointIsPositive = point.value >= 0;

    if (previousIsPositive === pointIsPositive || previous.value === 0 || point.value === 0) {
      appendRun(pointIsPositive ? upColor : downColor, [previous, point]);
      continue;
    }

    const ratio = (0 - previous.value) / (point.value - previous.value);
    const zeroPoint = {
      value: 0,
      x: previous.x + (point.x - previous.x) * ratio,
      y: zeroY,
    };
    appendRun(previousIsPositive ? upColor : downColor, [previous, zeroPoint]);
    appendRun(pointIsPositive ? upColor : downColor, [zeroPoint, point]);
  }

  return runs.filter((run) => run.points.length > 1);
}

function StrategyCurveSparkline({
  values,
  label,
  upColor,
  downColor,
}: {
  values: number[];
  label: string;
  upColor: string;
  downColor: string;
}) {
  const svgId = useId().replace(/:/g, "");
  const width = 420;
  const height = 86;
  const points = buildSparklinePoints(values, width, height);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const zeroY = height - 6 - ((0 - min) / range) * (height - 12);
  const runs = buildSparklineAreaRuns(points, upColor, downColor, zeroY);

  return (
    <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[62px] w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => (
          <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}-${run.color}`}>
            <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${svgId}-strategy-curve-fill-${index})`} />
            <path
              d={run.points
                .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
                .join(" ")}
              stroke={run.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <defs>
          {runs.map((run, index) => {
            const isPositiveRun = run.points.some((point) => point.value > 0);
            const lineEdgeY = isPositiveRun
              ? Math.min(...run.points.map((point) => point.y))
              : Math.max(...run.points.map((point) => point.y));
            return (
              <linearGradient
                key={`${svgId}-strategy-curve-fill-${index}`}
                id={`${svgId}-strategy-curve-fill-${index}`}
                x1="0"
                x2="0"
                y1={isPositiveRun ? lineEdgeY : zeroY}
                y2={isPositiveRun ? zeroY : lineEdgeY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={run.color} stopOpacity="0.58" />
                <stop offset="100%" stopColor={run.color} stopOpacity="0.12" />
              </linearGradient>
            );
          })}
        </defs>
      </svg>
    </div>
  );
}

function StrategyTableCurveSparkline({
  values,
  upColor,
  downColor,
}: {
  values: number[];
  upColor: string;
  downColor: string;
}) {
  const svgId = useId().replace(/:/g, "");
  const width = 108;
  const height = 42;
  const points = buildSparklinePoints(values, width, height, 4);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const zeroY = height - 4 - ((0 - min) / range) * (height - 8);
  const runs = buildSparklineAreaRuns(points, upColor, downColor, zeroY);

  return (
    <div className="flex h-full min-h-[42px] w-[108px] items-center" aria-label="资产曲线">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => (
          <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}-${run.color}`}>
            <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${svgId}-strategy-table-curve-fill-${index})`} />
            <path
              d={run.points
                .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
                .join(" ")}
              stroke={run.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <defs>
          {runs.map((run, index) => {
            const isPositiveRun = run.points.some((point) => point.value > 0);
            const lineEdgeY = isPositiveRun
              ? Math.min(...run.points.map((point) => point.y))
              : Math.max(...run.points.map((point) => point.y));
            return (
              <linearGradient
                key={`${svgId}-strategy-table-curve-fill-${index}`}
                id={`${svgId}-strategy-table-curve-fill-${index}`}
                x1="0"
                x2="0"
                y1={isPositiveRun ? lineEdgeY : zeroY}
                y2={isPositiveRun ? zeroY : lineEdgeY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={run.color} stopOpacity="0.58" />
                <stop offset="100%" stopColor={run.color} stopOpacity="0.12" />
              </linearGradient>
            );
          })}
        </defs>
      </svg>
    </div>
  );
}

const sortLabels: Record<SortKey, string> = {
  updated: "Updated Time",
  name: "Name",
  roi: "ROI",
  winRate: "Win Rate",
  sharpe: "Sharpe",
};

const defaultVisibleItems: Record<DisplayItemKey, boolean> = {
  roi: true,
  winRate: true,
  sharpe: true,
  maxDrawdown: true,
  createdAt: true,
  id: true,
};

function toStrategyViewRow(index: number): StrategyViewRow {
  const strategy = strategies[index % strategies.length];
  const baseExecutionMode: ExecutionMode =
    strategy.status === "live"
      ? "live"
      : (strategy.status as string) === "paper"
        ? "paper"
        : "idle";
  const id = `STR-${463 + index}`;
  const statusSamples: Partial<Record<string, ExecutionMode>> = {
    "STR-467": "idle",
    "STR-471": "live",
    "STR-473": "paper",
    "STR-477": "idle",
  };
  const demoStatusSequence: ExecutionMode[] = ["idle", "live", "paper", "idle"];
  const executionMode = statusSamples[id] ?? demoStatusSequence[index % demoStatusSequence.length] ?? baseExecutionMode;

  const statusLabel =
    executionMode === "live"
      ? "Live Trading"
      : executionMode === "paper"
        ? "Paper Trading"
        : "Not Running";

  const statusClass =
    executionMode === "live"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : executionMode === "paper"
        ? "border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300"
        : "border-slate-400/25 bg-slate-500/10 text-slate-600 dark:text-slate-300";

  return {
    id,
    name: strategy.name,
    description: strategy.description,
    updatedAt: strategy.updatedAt,
    statusLabel,
    executionMode,
    statusClass,
    roi: strategy.annualReturn,
    winRate: strategy.winRate,
    sharpe: strategy.sharpe.toFixed(2),
    maxDrawdown: strategy.maxDrawdown,
  };
}

const strategyRows: StrategyViewRow[] = Array.from({ length: 20 }, (_, index) => toStrategyViewRow(index));

function getStatusLabel(label: StrategyViewRow["statusLabel"], tr: (en: string, zh: string) => string) {
  if (label === "Live Trading") return tr("Live Trading", "实盘交易");
  if (label === "Paper Trading") return tr("Paper Trading", "模拟交易");
  return tr("Not Running", "未运行");
}

function readDeletedStrategyIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(DELETED_STRATEGIES_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled?: boolean;
  explanation: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-xs leading-5">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

function percentLevel(value: string, tr: (en: string, zh: string) => string, higherIsBetter = true) {
  const parsed = Math.abs(parsePercent(value));
  if (Number.isNaN(parsed)) return tr("for reference", "仅供参考");

  if (higherIsBetter) {
    if (parsed >= 20) return tr("high", "较高");
    if (parsed >= 10) return tr("moderate", "中等");
    return tr("low", "较低");
  }

  if (parsed <= 5) return tr("well controlled", "控制较好");
  if (parsed <= 12) return tr("noticeable", "需要关注");
  return tr("high risk", "风险较高");
}

function sharpeLevel(value: string, tr: (en: string, zh: string) => string) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return tr("for reference", "仅供参考");
  if (parsed >= 3) return tr("very steady", "非常稳定");
  if (parsed >= 1.5) return tr("relatively steady", "相对稳定");
  if (parsed >= 1) return tr("usable", "可用");
  return tr("less steady", "不够稳定");
}

function getMetricExplanation(
  key: MetricKey,
  row: StrategyViewRow,
  tr: (en: string, zh: string) => string
) {
  if (key === "roi") {
    return tr(
      `ROI shows return. ${row.roi} is ${percentLevel(row.roi, tr)}.`,
      `ROI 表示收益率，${row.roi} 属于${percentLevel(row.roi, tr)}。`
    );
  }
  if (key === "winRate") {
    return tr(
      `Win rate is profitable trades divided by total trades. ${row.winRate} is ${percentLevel(row.winRate, tr)}.`,
      `盈利交易次数占总交易次数的比例，${row.winRate} 属于${percentLevel(row.winRate, tr)}。`
    );
  }
  if (key === "sharpe") {
    return tr(
      `Sharpe measures return stability. ${row.sharpe} is ${sharpeLevel(row.sharpe, tr)}.`,
      `夏普比率衡量收益稳定性，${row.sharpe} 属于${sharpeLevel(row.sharpe, tr)}。`
    );
  }
  return tr(
    `Max drawdown is the largest decline. ${row.maxDrawdown} risk is ${percentLevel(row.maxDrawdown, tr, false)}.`,
    `最大回撤表示期间最大下跌幅度，${row.maxDrawdown} 风险${percentLevel(row.maxDrawdown, tr, false)}。`
  );
}

function MetricBox({
  label,
  value,
  tone = "neutral",
  valueColor,
  explanation,
  explainEnabled,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  valueColor?: string;
  explanation?: string;
  explainEnabled?: boolean;
}) {
  const content = (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold font-mono tabular-nums ${
          valueColor
            ? ""
            : tone === "positive"
            ? "text-emerald-600 dark:text-[#00d492]"
            : tone === "negative"
              ? "text-rose-500 dark:text-[#ff637e]"
              : "text-foreground"
        }`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  );

  return (
    <MaybeExplainTooltip enabled={explainEnabled && Boolean(explanation)} explanation={explanation ?? ""}>
      {content}
    </MaybeExplainTooltip>
  );
}

function StrategyCard({
  row,
  starred,
  onToggleStar,
  onRequestDelete,
  visibleItems,
  plainExplainEnabled,
  uiLang,
  chartColors,
}: {
  row: StrategyViewRow;
  starred: boolean;
  onToggleStar: () => void;
  onRequestDelete: () => void;
  visibleItems: Record<DisplayItemKey, boolean>;
  plainExplainEnabled: boolean;
  uiLang: "en" | "zh";
  chartColors: ChartColorTokens;
}) {
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const translatedDescription = (() => {
    if (uiLang !== "zh") return row.description;
    switch (row.name) {
      case "Cross-Exchange Arb Pro":
        return "利用主流 CEX 平台间的价格偏差，并结合价差分析与订单簿深度进行套利。";
      case "Stable Yield Optimizer":
        return "聚焦资金费率套利与基差交易的低风险策略，并通过受控敞口提升收益稳定性。";
      case "BTC Alpha Composite":
        return "结合 RSI 交叉、成交量背离与资金费率信号的多因子动量策略，适用于 BTC 永续合约。";
      case "DeFi Yield Hunter":
        return "从 TVL 资金流、LP 行为和 Gas 费模式中提取 Alpha，覆盖主要 DeFi 协议。";
      case "Altcoin Rotation":
        return "基于动量、巨鲸跟踪与链上指标，在前 50 大山寨币之间进行系统化轮动。";
      case "MEV Protection Alpha":
        return "通过识别并规避 MEV 攻击，同时捕捉具备抗 Sandwich 特征的机会来生成 Alpha。";
      default:
        return row.description;
    }
  })();
  const metaItems = [
    visibleItems.createdAt ? `${tr("Created", "创建日期")}:${row.updatedAt}` : null,
    visibleItems.id ? `ID:${row.id}` : null,
  ].filter(Boolean);

  return (
    <div className="surface-card overflow-hidden border border-border/70">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <p className="min-w-0 truncate text-lg font-semibold leading-7 text-foreground">{row.name}</p>
        </div>
        {metaItems.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {metaItems.join("  ")}
          </p>
        ) : null}
      </div>

      <div className="px-5 pb-4 pt-1">
        <p className="text-xs leading-5 text-muted-foreground">{translatedDescription}</p>

        <StrategyCurveSparkline
          values={strategyCardCurveValues}
          label={tr("Asset Curve", "资产曲线")}
          upColor={chartColors.upHex}
          downColor={chartColors.downHex}
        />

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/50 pt-3 xl:grid-cols-4">
          {visibleItems.roi ? <MetricBox label="ROI" value={row.roi} valueColor={strategyMetricColor("roi", row.roi, chartColors)} explanation={getMetricExplanation("roi", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
          {visibleItems.winRate ? <MetricBox label={tr("Win Rate", "胜率")} value={row.winRate} explanation={getMetricExplanation("winRate", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
          {visibleItems.sharpe ? <MetricBox label={tr("Sharpe", "夏普比率")} value={row.sharpe} explanation={getMetricExplanation("sharpe", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
          {visibleItems.maxDrawdown ? <MetricBox label={tr("Max DD", "最大回撤")} value={row.maxDrawdown} valueColor={strategyMetricColor("maxDrawdown", row.maxDrawdown, chartColors)} explanation={getMetricExplanation("maxDrawdown", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-accent/50 hover:text-foreground"
                aria-label={tr("More actions", "更多操作")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-32 rounded-xl p-1" align="end">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                onClick={onRequestDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tr("Delete", "删除")}
              </button>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
              starred
                ? "border-amber-400/70 bg-amber-400/20 text-amber-600 dark:border-[#ffb900]/60 dark:bg-[#ffb900]/30 dark:text-[#ffb900]"
                : "border-border/70 bg-card text-amber-500 hover:border-amber-400/60 dark:border-border/60 dark:bg-background/30 dark:text-[#ffb900]"
            }`}
            onClick={onToggleStar}
            aria-label={tr("Toggle favorite", "切换收藏")}
          >
            <Star className={`h-[14px] w-[14px] ${starred ? "fill-current" : ""}`} />
          </button>

          <Link href={`/strategies/${row.id}`}>
            <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              {tr("View", "查看")}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyStrategies() {
  const { uiLang } = useAppLanguage();
  const { alphaViewMode } = useAlphaViewMode();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDesc, setSortDesc] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("all");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Record<DisplayItemKey, boolean>>(defaultVisibleItems);
  const [starred, setStarred] = useState<Set<string>>(new Set(["STR-463", "STR-470"]));
  const [deletedStrategyIds, setDeletedStrategyIds] = useState<Set<string>>(() => readDeletedStrategyIds());
  const [pendingDeleteStrategy, setPendingDeleteStrategy] = useState<StrategyViewRow | null>(null);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
    return true;
  });
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const shouldShowPlainExplanations = alphaViewMode === "beginner" && plainExplainEnabled;
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(target)) {
        setShowColumnsMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DELETED_STRATEGIES_STORAGE_KEY, JSON.stringify(Array.from(deletedStrategyIds)));
  }, [deletedStrategyIds]);

  const activeStrategyRows = useMemo(
    () => strategyRows.filter((row) => !deletedStrategyIds.has(row.id)),
    [deletedStrategyIds]
  );

  const filtered = useMemo(() => {
    const byTopFilter = activeStrategyRows.filter((row) => {
      if (strategyFilter === "favorites") return starred.has(row.id);
      if (strategyFilter === "trading") return row.executionMode === "paper" || row.executionMode === "live";
      if (strategyFilter === "idle") return row.executionMode === "idle";
      return true;
    });

    const keyword = query.trim().toLowerCase();
    if (!keyword) return byTopFilter;
    return byTopFilter.filter((row) => row.name.toLowerCase().includes(keyword) || row.id.toLowerCase().includes(keyword));
  }, [activeStrategyRows, query, strategyFilter, starred]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let comp = 0;
      if (sortKey === "updated") {
        comp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortKey === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortKey === "roi") {
        comp = parsePercent(a.roi) - parsePercent(b.roi);
      } else if (sortKey === "winRate") {
        comp = parsePercent(a.winRate) - parsePercent(b.winRate);
      } else if (sortKey === "sharpe") {
        comp = Number(a.sharpe) - Number(b.sharpe);
      }
      return sortDesc ? -comp : comp;
    });
    return rows;
  }, [filtered, sortDesc, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, sorted]
  );

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, strategyFilter, sortKey, sortDesc, pageSize]);

  const getPageRange = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const tradingCount = useMemo(
    () => activeStrategyRows.filter((row) => row.executionMode === "paper" || row.executionMode === "live").length,
    [activeStrategyRows]
  );
  const idleCount = useMemo(
    () => activeStrategyRows.filter((row) => row.executionMode === "idle").length,
    [activeStrategyRows]
  );
  const favoriteCount = useMemo(
    () => activeStrategyRows.filter((row) => starred.has(row.id)).length,
    [activeStrategyRows, starred]
  );

  const requestDeleteStrategy = (row: StrategyViewRow) => {
    setPendingDeleteStrategy(row);
  };

  const confirmDeleteStrategy = () => {
    if (!pendingDeleteStrategy) return;
    const strategyId = pendingDeleteStrategy.id;
    setDeletedStrategyIds((prev) => {
      const next = new Set(prev);
      next.add(strategyId);
      return next;
    });
    setStarred((prev) => {
      if (!prev.has(strategyId)) return prev;
      const next = new Set(prev);
      next.delete(strategyId);
      return next;
    });
    setPendingDeleteStrategy(null);
    setPage(1);
  };

  const topStats = [
    {
      key: "all" as const,
      label: "Total",
      value: String(activeStrategyRows.length),
      icon: <List className="h-3.5 w-3.5 text-slate-400" />,
      tone: "text-foreground",
      labelClass: "text-muted-foreground",
    },
    {
      key: "favorites" as const,
      label: "My Favorites",
      value: String(favoriteCount),
      icon: <Star className="h-3.5 w-3.5 text-[#ffb900]" />,
      tone: "text-[#ffb900]",
      labelClass: "text-[#ffb900]",
    },
    {
      key: "trading" as const,
      label: "Trading",
      value: String(tradingCount),
      icon: <ArrowUpDown className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />,
      tone: "text-indigo-600 dark:text-indigo-400",
      labelClass: "text-indigo-600 dark:text-indigo-400",
    },
    {
      key: "idle" as const,
      label: "Not Running",
      value: String(idleCount),
      icon: <Circle className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />,
      tone: "text-slate-600 dark:text-slate-300",
      labelClass: "text-slate-600 dark:text-slate-300",
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-4">
          <h1 className="text-foreground">{tr("My Strategy", "我的策略")}</h1>
        <Link href="/strategies/new?creationMode=platform&scale=single">
            <Button className="h-10 rounded-full bg-primary px-4 text-sm text-primary-foreground shadow-sm hover:bg-primary/90">
            <Plus className="mr-1 h-3.5 w-3.5" />
            {tr("New Strategy", "新建策略")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="relative w-full max-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
              placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
            className="h-8 w-full rounded-xl border border-border bg-accent/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSortMenu((prev) => !prev)}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {tr("Sort", "排序")}
            </button>

            {showSortMenu ? (
              <div className="absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-dropdown)]">
                {(["updated", "name", "roi", "winRate", "sharpe"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      sortKey === key ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    onClick={() => {
                      if (sortKey === key) {
                        setSortDesc((prev) => !prev);
                      } else {
                        setSortKey(key);
                        setSortDesc(true);
                      }
                    }}
                  >
                    <span>
                      {key === "updated"
                        ? tr("Updated Time", "更新时间")
                        : key === "name"
                          ? tr("Name", "名称")
                          : key === "roi"
                            ? "ROI"
                            : key === "winRate"
                              ? tr("Win Rate", "胜率")
                              : tr("Sharpe", "夏普比率")}
                    </span>
                    {sortKey === key ? <span>{sortDesc ? tr("Descending", "降序") : tr("Ascending", "升序")}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowColumnsMenu((prev) => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
                {tr("Display Items", "显示项")}
            </button>

            {showColumnsMenu ? (
              <div className="absolute right-0 z-40 mt-2 w-44 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-dropdown)]">
                {([
                  { key: "roi", label: "ROI" },
                  { key: "winRate", label: tr("Win Rate", "胜率") },
                  { key: "sharpe", label: tr("Sharpe", "夏普比率") },
                  { key: "maxDrawdown", label: tr("Max Drawdown", "最大回撤") },
                  { key: "createdAt", label: tr("Created Date", "创建日期") },
                  { key: "id", label: "ID" },
                ] as Array<{ key: DisplayItemKey; label: string }>).map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleItems[item.key]}
                      onChange={() =>
                        setVisibleItems((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className="h-3.5 w-3.5 accent-indigo-500"
                    />
                  </label>
                ))}
                <div className="mt-1 border-t border-border/60 pt-1">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => setVisibleItems({ ...defaultVisibleItems })}
                  >
                    {tr("Restore defaults", "恢复默认")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {alphaViewMode === "beginner" && (
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
          )}

          <div className="inline-flex h-[34px] items-center overflow-hidden rounded-xl border border-border bg-card p-px">
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center ${
                viewMode === "list" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center ${
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid2x2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {sorted.slice(0, 8).map((row) => (
            <StrategyCard
              key={row.id}
              row={row}
              starred={starred.has(row.id)}
              onToggleStar={() =>
                setStarred((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.id)) next.delete(row.id);
                  else next.add(row.id);
                  return next;
                })
              }
              onRequestDelete={() => requestDeleteStrategy(row)}
              visibleItems={visibleItems}
              plainExplainEnabled={shouldShowPlainExplanations}
              uiLang={uiLang}
              chartColors={chartColors}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card overflow-hidden border border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-border/60">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Name", "名称")}</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Status", "状态")}</th>
                  <th className="w-[126px] px-4 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Asset Curve", "资产曲线")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ROI</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Win Rate", "胜率")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Sharpe", "夏普比率")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Max Drawdown", "最大回撤")}</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Created", "创建日期")}</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-t border-border/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setStarred((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-[#ffb900]"
                          aria-label={tr("Toggle favorite", "切换收藏")}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${starred.has(row.id) ? "fill-[#ffb900] text-[#ffb900]" : ""}`}
                          />
                        </button>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                          <p className="text-xs text-muted-foreground">ID:{row.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${row.statusClass}`}>
                        {getStatusLabel(row.statusLabel, tr)}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex justify-center">
                        <StrategyTableCurveSparkline
                          values={strategyCardCurveValues}
                          upColor={chartColors.upHex}
                          downColor={chartColors.downHex}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm" style={{ color: strategyMetricColor("roi", row.roi, chartColors) }}>
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("roi", row, tr)}>
                        <span>{row.roi}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-foreground">
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("winRate", row, tr)}>
                        <span>{row.winRate}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-foreground">
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("sharpe", row, tr)}>
                        <span>{row.sharpe}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm" style={{ color: strategyMetricColor("maxDrawdown", row.maxDrawdown, chartColors) }}>
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("maxDrawdown", row, tr)}>
                        <span>{row.maxDrawdown}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{row.updatedAt}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-accent/50 hover:text-foreground"
                              aria-label={tr("More actions", "更多操作")}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-32 rounded-xl p-1" align="end">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                              onClick={() => requestDeleteStrategy(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {tr("Delete", "删除")}
                            </button>
                          </PopoverContent>
                        </Popover>
                        <Link href={`/strategies/${row.id}`}>
                          <Button className="h-8 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                            {tr("View", "查看")}
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      {tr("No strategies match your filters.", "没有符合当前筛选条件的策略。")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 bg-card/40 px-6 py-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
              </span>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                  <span>{tr("Rows", "行数")}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-6 w-16 rounded-lg border-border bg-transparent text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {getPageRange().map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 rounded-lg p-0 text-xs font-mono tabular-nums ${
                    p === page ? "bg-primary text-primary-foreground" : "border-border"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={Boolean(pendingDeleteStrategy)} onOpenChange={(open) => !open && setPendingDeleteStrategy(null)}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 text-foreground">
          <div className="border-b border-border/60 px-5 py-4">
            <DialogTitle className="text-base font-semibold">{tr("Delete Strategy", "删除策略")}</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-6 text-foreground">
              {pendingDeleteStrategy?.name
                ? tr(
                    `Confirm deleting ${pendingDeleteStrategy.name} (${pendingDeleteStrategy.id})? This action cannot be undone.`,
                    `确认删除 ${pendingDeleteStrategy.name}（${pendingDeleteStrategy.id}）？删除后无法恢复。`
                  )
                : tr("Confirm deleting this strategy? This action cannot be undone.", "确认删除该策略？删除后无法恢复。")}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
            <Button
              variant="outline"
              className="h-8 rounded-full border-border bg-card px-3 text-xs"
              onClick={() => setPendingDeleteStrategy(null)}
            >
              {tr("Cancel", "取消")}
            </Button>
            <Button
              className="h-8 rounded-full bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteStrategy}
            >
              {tr("Delete", "删除")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
