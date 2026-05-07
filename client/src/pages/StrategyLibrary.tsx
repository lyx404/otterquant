/*
 * StrategyLibrary — Official strategy template library
 * Aligned with My Alphas / My Strategy page layout and toolbar style
 */
import { useEffect, useId, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { strategies } from "@/lib/mockData";
import { buildSeries } from "@/lib/strategyUtils";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { ArrowUpDown, ArrowUpRight, Search, Star, Users } from "lucide-react";

const filterOptions = ["all", "official", "graduated"] as const;
type FilterKey = (typeof filterOptions)[number];
type StrategySortKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type SortDir = "asc" | "desc" | null;
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

function getDefaultStrategySortDir(key: StrategySortKey): Exclude<SortDir, null> {
  return key === "maxDrawdown" ? "asc" : "desc";
}

function parseMetricValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsed = Number(value.replace(/[%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStrategyTier(strategy: (typeof strategies)[number]): Exclude<FilterKey, "all"> {
  return strategy.author.toLowerCase().includes("quandora") ? "official" : "graduated";
}

function strategyMetricColor(key: StrategySortKey, value: string | number, chartColors: ChartColorTokens) {
  const parsed = parseMetricValue(value);
  if (key === "roi") return parsed < 0 ? chartColors.downHex : chartColors.upHex;
  if (key === "maxDrawdown") return parsed === 0 ? undefined : chartColors.downHex;
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
    <div className="mt-4 space-y-2 border-t border-slate-200/70 pt-4 dark:border-border/50">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[78px] w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => (
          <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}-${run.color}`}>
            <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${svgId}-strategy-library-curve-fill-${index})`} />
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
                key={`${svgId}-strategy-library-curve-fill-${index}`}
                id={`${svgId}-strategy-library-curve-fill-${index}`}
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

function MetricPill({
  label,
  value,
  tone = "neutral",
  valueColor,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  valueColor?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
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
      </div>
    </div>
  );
}

export default function StrategyLibrary() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<StrategySortKey | null>("roi");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [starredStrategies, setStarredStrategies] = useState<Set<string>>(() => new Set());
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const filterLabels: Record<FilterKey, string> = {
    all: tr("All", "全部"),
    official: tr("Official", "官方"),
    graduated: tr("Graduated", "三方"),
  };
  const translateDescription = (strategy: (typeof strategies)[number]) => {
    if (uiLang !== "zh") return strategy.description;
    switch (strategy.id) {
      case "STR-001":
        return "结合 RSI 交叉、成交量背离与资金费率信号的多因子动量策略，适用于 BTC 永续合约。";
      case "STR-002":
        return "从 TVL 资金流、LP 行为和 Gas 费模式中提取信号，覆盖主要 DeFi 协议。";
      case "STR-003":
        return "利用主流 CEX 平台间的价格偏差，结合价差分析与订单簿深度进行套利。";
      case "STR-004":
        return "基于动量、巨鲸跟踪与链上指标，在前 50 大山寨币之间进行系统化轮动。";
      case "STR-005":
        return "聚焦资金费率套利与基差交易的低风险策略，并通过受控敞口提升收益稳定性。";
      case "STR-006":
        return "通过识别并规避 MEV 攻击，同时捕捉具备抗 Sandwich 特征的机会来生成 Alpha。";
      default:
        return strategy.description;
    }
  };

  const filteredStrategies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sortValue = (strategy: (typeof strategies)[number]) => {
      switch (sortKey) {
        case "roi":
          return parseMetricValue(strategy.annualReturn);
        case "winRate":
          return parseMetricValue(strategy.winRate);
        case "sharpe":
          return strategy.sharpe;
        case "maxDrawdown":
          return parseMetricValue(strategy.maxDrawdown);
        default:
          return 0;
      }
    };
    const filtered = strategies.filter((strategy) => {
      const matchQuery =
        !q ||
        strategy.name.toLowerCase().includes(q) ||
        strategy.description.toLowerCase().includes(q) ||
        strategy.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        strategy.author.toLowerCase().includes(q);
      const tier = getStrategyTier(strategy);
      const matchFilter = filter === "all" ? true : tier === filter;
      return matchQuery && matchFilter;
    });

    if (!sortKey || !sortDir) return filtered;

    const direction = sortDir === "asc" ? 1 : -1;
    return filtered.sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [filter, query, sortKey, sortDir]);

  const sortOptions: { key: StrategySortKey; label: string }[] = [
    { key: "roi", label: "ROI" },
    { key: "winRate", label: tr("Win Rate", "胜率") },
    { key: "sharpe", label: tr("Sharpe Ratio", "夏普比率") },
    { key: "maxDrawdown", label: tr("Max Drawdown", "最大回撤") },
  ];
  const sortDirectionLabel = (direction: SortDir) => {
    if (direction === "asc") return tr("Ascending", "升序");
    if (direction === "desc") return tr("Descending", "降序");
    return tr("Default", "默认");
  };

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

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground">{tr("Official Strategy Library", "官方策略库")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Browse deployable strategy templates and use them as a starting point.", "浏览可部署的策略模板，并将其作为你的起点。")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="relative w-full max-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
            className="h-8 rounded-xl border-border bg-white pl-9 pr-3 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:ring-primary/20 dark:bg-accent/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as FilterKey)}>
            <SelectTrigger
              size="sm"
              className="h-8 w-fit rounded-full border-border bg-card px-3 text-xs text-foreground shadow-none transition-all duration-200 ease-in-out hover:border-slate-300 dark:hover:border-slate-600"
              aria-label={tr("Category filter", "分类筛选")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="rounded-xl">
              {filterOptions.map((option) => (
                <SelectItem key={option} value={option} className="text-xs">
                  {filterLabels[option]}
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
                            setSortDir(getDefaultStrategySortDir(option.key));
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {filteredStrategies.map((strategy) => {
          const tier = getStrategyTier(strategy);
          const statusClass = "border-primary/30 bg-primary/10 text-primary";
          const statusLabel = tier === "official" ? tr("Official", "官方") : tr("Graduated", "三方");
          const isStarred = starredStrategies.has(strategy.id);
          const usedCount = strategy.subscribers ?? 0;

          return (
            <div
              key={strategy.id}
              className="surface-card overflow-hidden border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:border-border/70 dark:bg-card dark:shadow-none"
            >
              <div className="px-5 pb-2 pt-4">
                <Link href={`/strategies/${strategy.id}?source=official&tier=${tier}`}>
                  <h3 className="cursor-pointer truncate text-lg font-semibold leading-7 text-foreground transition-colors hover:text-primary">
                    {strategy.name}
                  </h3>
                </Link>
                <p className="mt-2 text-xs text-slate-500 dark:text-muted-foreground">
                  {tr("Created Date", "创建日期")}:{strategy.updatedAt} ID:{strategy.id}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {uiLang === "zh" ? `已使用${usedCount}次` : `Used ${usedCount} times`}
                  </span>
                  <span className={`inline-flex h-[25px] items-center rounded-full border px-[11px] py-[5px] text-[10px] font-semibold font-sans uppercase tracking-normal ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="px-5 pb-3 pt-2">
                <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{translateDescription(strategy)}</p>

                <StrategyCurveSparkline
                  values={strategyCardCurveValues}
                  label={tr("Asset Curve", "资产曲线")}
                  upColor={chartColors.upHex}
                  downColor={chartColors.downHex}
                />

                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200/70 pt-4 dark:border-border/50 xl:grid-cols-4">
                  <MetricPill label={tr("ROI", "ROI")} value={strategy.annualReturn} valueColor={strategyMetricColor("roi", strategy.annualReturn, chartColors)} />
                  <MetricPill label={tr("Win Rate", "胜率")} value={strategy.winRate} />
                  <MetricPill label={tr("Sharpe", "夏普比率")} value={strategy.sharpe.toFixed(2)} />
                  <MetricPill label={tr("Max Drawdown", "最大回撤")} value={strategy.maxDrawdown} valueColor={strategyMetricColor("maxDrawdown", strategy.maxDrawdown, chartColors)} />
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-200/70 pt-2 dark:border-border/40">
                  <button
                    type="button"
                    className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
                      isStarred
                        ? "border-amber-400/70 bg-amber-400/20 text-amber-600 dark:border-[#ffb900]/60 dark:bg-[#ffb900]/30 dark:text-[#ffb900]"
                        : "border-border/70 bg-card text-amber-500 hover:border-amber-400/60 dark:border-border/60 dark:bg-background/30 dark:text-[#ffb900]"
                    }`}
                    onClick={() =>
                      setStarredStrategies((current) => {
                        const next = new Set(current);
                        if (next.has(strategy.id)) {
                          next.delete(strategy.id);
                        } else {
                          next.add(strategy.id);
                        }
                        return next;
                      })
                    }
                    aria-pressed={isStarred}
                    aria-label={isStarred ? tr("Unfavorite strategy", "取消收藏策略") : tr("Favorite strategy", "收藏策略")}
                  >
                    <Star className={`h-[14px] w-[14px] ${isStarred ? "fill-current" : ""}`} />
                  </button>
                  <Link href={`/strategies/new?template=${strategy.id}&creationMode=platform&scale=single&inputMethod=form`}>
                    <Button
                      variant="outline"
                      className="h-8 rounded-full border-border/70 bg-card px-4 text-xs font-medium text-foreground shadow-none hover:border-muted-foreground/40 hover:bg-accent/50 hover:text-foreground hover:shadow-none"
                    >
                      {tr("Use Template", "使用模板")}
                    </Button>
                  </Link>
                  <Link href={`/strategies/${strategy.id}?source=official&tier=${tier}`}>
                    <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                      {tr("View", "查看")}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStrategies.length === 0 && (
          <div className="surface-card border border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
            {tr("No strategies match your filters.", "没有符合当前筛选条件的策略。")}
          </div>
        )}
      </div>
    </div>
  );
}
