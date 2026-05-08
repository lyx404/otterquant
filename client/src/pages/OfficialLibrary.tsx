/*
 * OfficialLibrary — Browse official and graduated factors
 * Design: Card-based view with category filtering
 * Reuses FactorCard pattern from AlphaCardView
 */
import { useState, useMemo, useRef, useEffect, useId, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import gsap from "gsap";
import {
  ArrowUpDown,
  Search,
  Star,
  Users,
  Sparkles,
  Info,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { factors, type Factor, generatePnLData } from "@/lib/mockData";
import { toast } from "sonner";
import { useAlphaViewMode, type AlphaViewMode } from "@/contexts/AlphaViewModeContext";

type CategoryFilter = "all" | "official" | "graduated";
type FactorSortKey = "isSharpe" | "osSharpe" | "fitness" | "returns" | "turnover" | "drawdown";
type SortDir = "asc" | "desc" | null;
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";

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
        upClass: "text-rose-500",
        downClass: "text-emerald-500",
        upHex: "#F43F5E",
        downHex: "#10B981",
      }
    : {
        upClass: "text-emerald-500",
        downClass: "text-rose-500",
        upHex: "#10B981",
        downHex: "#F43F5E",
      };
}

function getDefaultFactorSortDir(key: FactorSortKey): Exclude<SortDir, null> {
  return key === "turnover" || key === "drawdown" ? "asc" : "desc";
}

function parseMetricValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsed = Number(value.replace(/[%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSparklinePath(values: number[], width: number, height: number, padding = 6) {
  if (values.length < 2) return "";

  return buildSparklinePoints(values, width, height, padding)
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildSparklinePoints(values: number[], width: number, height: number, padding = 6) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y, value };
    });
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

function buildSparklineAreaPath(points: Array<{ x: number; y: number }>, zeroY: number) {
  if (points.length < 2) return "";
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${zeroY.toFixed(2)} L ${first.x.toFixed(2)} ${zeroY.toFixed(2)} Z`;
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
      <TooltipContent side="top" className="max-w-[220px] text-xs leading-5">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

function PnlSparkline({
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
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[78px] w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => (
          <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}-${run.color}`}>
            <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${svgId}-official-pnl-fill-${index})`} />
            <path
              d={run.points.map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")}
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
                key={`${svgId}-official-pnl-fill-${index}`}
                id={`${svgId}-official-pnl-fill-${index}`}
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

/* ── Factor Flywheel Banner ── */
function FlywheelBanner() {
  return (
    <div className="surface-card overflow-hidden border-l-4 border-l-primary">
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">Factor Flywheel</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Develop factors
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Submit to competition
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Top factors graduate to official library
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Others use them in strategies
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            You earn rewards
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Single Factor Card ── */
function FactorCard({ factor, isStarred, onToggleStar, viewMode, plainExplainEnabled }: {
  factor: Factor;
  isStarred: boolean;
  onToggleStar: () => void;
  viewMode: AlphaViewMode;
  plainExplainEnabled: boolean;
}) {
  const { uiLang } = useAppLanguage();
  const [, navigate] = useLocation();
  const isOfficial = factor.category === "official";
  const isGraduated = factor.category === "graduated";
  const isBeginnerMode = viewMode === "beginner";
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(readChartColorMode);
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const usedCount = new Intl.NumberFormat(uiLang === "zh" ? "zh-CN" : "en-US").format(factor.userCount ?? 0);
  const detailHref = `/alphas/${factor.id}?source=official&tier=${isGraduated ? "graduated" : "official"}`;
  const pnlValues = useMemo(() => {
    const pnlData = generatePnLData();
    const combined = [...pnlData.train, ...pnlData.test].map((item) => item.value);
    const sampleEvery = Math.max(1, Math.floor(combined.length / 36));
    return combined.filter((_, index) => index % sampleEvery === 0).slice(-36);
  }, []);

  useEffect(() => {
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);

  const statusClass = "border-primary/30 bg-primary/10 text-primary";

  const returnsColor = parseMetricValue(factor.returns) >= 0 ? chartColors.upClass : chartColors.downClass;
  const drawdownColor = parseMetricValue(factor.drawdown) === 0 ? undefined : chartColors.downClass;

  const sharpeLevel = (value: number) => {
    if (value >= 1) return tr("relatively steady", "相对稳定");
    if (value >= 0.5) return tr("moderate", "中等");
    return tr("less steady", "不够稳定");
  };
  const fitnessLevel = (value: number) => {
    if (value >= 1) return tr("strong", "较强");
    if (value >= 0.5) return tr("usable", "可用");
    return tr("weak", "偏弱");
  };
  const metricExplanations = {
    sharpe: tr(
      `Higher Sharpe means steadier returns. ${factor.sharpe.toFixed(2)} is ${sharpeLevel(factor.sharpe)}.`,
      `夏普比率越高代表越稳定，${factor.sharpe.toFixed(2)} 为${sharpeLevel(factor.sharpe)}。`
    ),
    osSharpe: tr(
      `Higher OS Sharpe means better robustness. ${factor.osSharpe.toFixed(2)} is ${sharpeLevel(factor.osSharpe)}.`,
      `样本外夏普越高代表泛化越稳，${factor.osSharpe.toFixed(2)} 为${sharpeLevel(factor.osSharpe)}。`
    ),
    fitness: tr(
      `Higher fitness means better overall quality. ${factor.fitness.toFixed(2)} is ${fitnessLevel(factor.fitness)}.`,
      `适应度越高代表综合质量越好，${factor.fitness.toFixed(2)} 为${fitnessLevel(factor.fitness)}。`
    ),
  };

  const MetricCell = ({ label, value, colorClass, explanation }: { label: string; value: string; colorClass?: string; explanation?: string }) => (
    <MaybeExplainTooltip enabled={plainExplainEnabled && Boolean(explanation)} explanation={explanation ?? ""}>
    <div className="min-w-0">
      <div className="mb-1 whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold font-mono tabular-nums ${colorClass || "text-foreground"}`}>
        {value}
      </div>
    </div>
    </MaybeExplainTooltip>
  );

  return (
    <div
      className="surface-card group flex h-full cursor-pointer flex-col overflow-hidden transition-all duration-200 hover:border-primary/30"
      role="link"
      tabIndex={0}
      onClick={() => navigate(detailHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(detailHref);
        }
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href={detailHref}>
              <span className="block cursor-pointer truncate text-sm font-semibold leading-5 text-foreground transition-colors duration-200 hover:text-primary">
                {factor.name}
              </span>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {uiLang === "zh" ? `已使用${usedCount}次` : `Used ${usedCount} times`}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold font-sans uppercase tracking-normal ${statusClass}`}>
                {isGraduated ? tr("Graduated", "三方") : tr("Official", "官方")}
              </span>
              {!isBeginnerMode && (
                <span className="text-[10px] font-mono text-muted-foreground">{factor.id}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 py-3">
        <PnlSparkline
          values={pnlValues}
          label={tr("PnL", "PNL")}
          upColor={chartColors.upHex}
          downColor={chartColors.downHex}
        />

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 xl:grid-cols-3">
          <MetricCell label={tr("IS Sharpe", "样本内夏普比率")} value={factor.sharpe.toFixed(2)} explanation={metricExplanations.sharpe} />
          <MetricCell label={tr("OS Sharpe", "样本外夏普比率")} value={factor.osSharpe.toFixed(2)} explanation={metricExplanations.osSharpe} />
          <MetricCell label={tr("Fitness", "适应度")} value={factor.fitness.toFixed(2)} explanation={metricExplanations.fitness} />
          {!isBeginnerMode && <MetricCell label={tr("Returns", "收益")} value={factor.returns} colorClass={returnsColor} />}
          {!isBeginnerMode && <MetricCell label={tr("Turnover", "换手率")} value={factor.turnover} />}
          {!isBeginnerMode && <MetricCell label={tr("Drawdown", "回撤")} value={factor.drawdown} colorClass={drawdownColor} />}
        </div>
      </div>

      <div className="mt-auto border-t border-border/40 px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onToggleStar();
            }}
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
              isStarred
                ? "border-[#ffb900]/60 bg-[#ffb900]/30 text-[#ffb900]"
                : "border-border/60 bg-background/30 text-[#ffb900] hover:border-[#ffb900]/50"
            }`}
            title={isStarred ? tr("Unfavorite", "取消收藏") : tr("Favorite", "收藏")}
          >
            <Star className={`h-[14px] w-[14px] ${isStarred ? "fill-current" : ""}`} />
          </button>
          <Link href={detailHref}>
            <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-white hover:bg-primary/90 dark:text-[#020617]">
              {tr("View", "查看")}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Main OfficialLibrary Page ── */
export default function OfficialLibrary() {
  const { uiLang } = useAppLanguage();
  const { alphaViewMode } = useAlphaViewMode();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortKey, setSortKey] = useState<FactorSortKey | null>("isSharpe");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set(["AF-001", "AF-004"]));
  const [showFlywheelInfo, setShowFlywheelInfo] = useState(false);
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const listRef = useRef<HTMLDivElement>(null);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  // Only show official and graduated factors
  const libraryFactors = useMemo(() => {
    return factors.filter((f) => f.category === "official" || f.category === "graduated");
  }, []);

  const filtered = useMemo(() => {
    const sortValue = (factor: Factor) => {
      switch (sortKey) {
        case "isSharpe":
          return factor.sharpe;
        case "osSharpe":
          return factor.osSharpe;
        case "fitness":
          return factor.fitness;
        case "returns":
          return parseMetricValue(factor.returns);
        case "turnover":
          return parseMetricValue(factor.turnover);
        case "drawdown":
          return parseMetricValue(factor.drawdown);
        default:
          return 0;
      }
    };

    const filteredFactors = libraryFactors.filter((f) => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !f.name.toLowerCase().includes(q) &&
          !(f.tag || "").toLowerCase().includes(q) &&
          !(f.description || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    if (!sortKey || !sortDir) return filteredFactors;

    const direction = sortDir === "asc" ? 1 : -1;
    return filteredFactors.sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [libraryFactors, categoryFilter, searchQuery, sortKey, sortDir]);

  // Entrance animation
  useEffect(() => {
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll(".factor-card-item");
    gsap.set(cards, { y: 20, opacity: 0 });
    gsap.to(cards, {
      y: 0, opacity: 1,
      duration: 0.4, stagger: 0.05, ease: "power3.out",
    });
  }, [categoryFilter, searchQuery]);

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

  const tabs: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: tr("All", "全部") },
    { key: "official", label: tr("Official", "官方") },
    { key: "graduated", label: tr("Graduated", "三方") },
  ];
  const sortOptions: { key: FactorSortKey; label: string }[] = [
    { key: "isSharpe", label: tr("IS Sharpe", "IS夏普") },
    { key: "osSharpe", label: tr("OS Sharpe", "OS 夏普") },
    { key: "fitness", label: tr("Fitness", "适应度") },
    { key: "returns", label: tr("Returns", "收益率") },
    { key: "turnover", label: tr("Turnover", "换手率") },
    { key: "drawdown", label: tr("Drawdown", "回撤") },
  ];
  const sortDirectionLabel = (direction: SortDir) => {
    if (direction === "asc") return tr("Ascending", "升序");
    if (direction === "desc") return tr("Descending", "降序");
    return tr("Default", "默认");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">{tr("Official Factor Library", "官方因子库")}</h1>
          <button
            onClick={() => setShowFlywheelInfo(true)}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title={tr("Factor Flywheel", "因子飞轮")}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {tr("Browse proven trading signals. Use them as building blocks for your strategies.", "浏览经过验证的交易信号，并将它们作为你策略的构建模块。")}
        </p>
      </div>

      {/* Flywheel Info Modal */}
      {showFlywheelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowFlywheelInfo(false)}>
          <div className="relative w-full max-w-lg mx-4 surface-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFlywheelInfo(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{tr("Factor Flywheel", "因子飞轮")}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tr("Develop factors", "开发因子")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("Submit to competition", "提交到竞赛")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("Top factors graduate to official library", "优秀因子进入官方库")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("Others use them in strategies", "其他人将它们用于策略")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("You earn rewards", "你获得奖励")}
            </p>
          </div>
        </div>
      )}

      {/* Search + Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-[420px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-xl border border-border bg-accent/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-fit rounded-full border-border bg-card px-3 text-xs text-foreground shadow-none transition-all duration-200 ease-in-out hover:border-slate-300 dark:hover:border-slate-600"
              aria-label={tr("Category filter", "分类筛选")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="rounded-xl">
              {tabs.map((tab) => (
                <SelectItem key={tab.key} value={tab.key} className="text-xs">
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {tr("Sort", "排序")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-2xl" align="end">
              <div className="space-y-2">
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {sortOptions.map((option) => {
                    const active = sortKey === option.key;
                    return (
                      <button
                        key={option.key}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                          active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          if (active) {
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          } else {
                            setSortKey(option.key);
                            setSortDir(getDefaultFactorSortDir(option.key));
                          }
                        }}
                      >
                        <span>{option.label}</span>
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {active ? sortDirectionLabel(sortDir) : tr("Default", "默认")}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {sortKey && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                    >
                      {tr("Toggle direction", "切换方向")}
                    </button>
                    <button
                      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => {
                        setSortKey(null);
                        setSortDir(null);
                      }}
                    >
                      {tr("Clear", "清除")}
                    </button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

        </div>
      </div>

      {/* Factor Cards */}
      <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((factor) => (
          <div key={factor.id} className="factor-card-item">
            <FactorCard
              factor={factor}
              isStarred={starred.has(factor.id)}
              viewMode={alphaViewMode}
              plainExplainEnabled={alphaViewMode === "beginner" && plainExplainEnabled}
              onToggleStar={() => {
                setStarred((prev) => {
                  const next = new Set(prev);
                  const willStar = !next.has(factor.id);
                  if (willStar) next.add(factor.id);
                  else next.delete(factor.id);
                  toast.success(willStar ? tr("Added to favorites", "已加入收藏") : tr("Removed from favorites", "已取消收藏"));
                  return next;
                });
              }}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="surface-card px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{tr("No factors match the current filters.", "没有符合当前筛选条件的因子。")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
