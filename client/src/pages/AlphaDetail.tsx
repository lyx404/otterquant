/*
 * AlphaDetail — Indigo/Sky + Slate Design System
 * Dual view mode: Beginner (simplified) / Pro (full detail)
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald | Danger: Red
 */
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useParams, useSearch } from "wouter";
import { useState, useMemo, useEffect, useId, useRef, Fragment, type ReactNode } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import {
  ArrowLeft, CheckCircle, XCircle, BarChart3, TrendingUp,
  ChevronDown, ChevronUp, RefreshCw, Sparkles,
  Loader2, FlaskConical, LineChart as LineChartIcon, Settings2, BookOpenText, Copy, Star,
} from "lucide-react";
import ShinyTag from "@/components/ui/shiny-tag";
import ScratchCard from "@/components/ui/scratch-card";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { useAlphaViewMode } from "@/contexts/AlphaViewModeContext";
import {
  factors, generatePnLData, aggregateData, osAggregateData,
  yearlySummary, osYearlySummary, testingStatus, correlationData,
  getAlphaGrade, GRADE_CONFIG, type Factor,
} from "@/lib/mockData";

type SummaryPeriod = "IS" | "OS" | "DIFF";
type PnlSamplePeriod = "IS" | "OS";

type AlphaDetailProps = {
  embedded?: boolean;
  factorIdOverride?: string;
  factorOverride?: Partial<Factor>;
};

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

type PnlChartPoint = { date: string; value: number };
type PnlScreenPoint = PnlChartPoint & { x: number; y: number };
type PnlAreaRun = { color: string; points: PnlScreenPoint[] };

function formatPnlValue(value: number) {
  return Math.round(value).toLocaleString();
}

function buildPnlPath(points: PnlScreenPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function buildPnlAreaPath(points: PnlScreenPoint[], zeroY: number) {
  if (points.length < 2) return "";
  const linePath = buildPnlPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(2)} ${zeroY.toFixed(2)} L ${first.x.toFixed(2)} ${zeroY.toFixed(2)} Z`;
}

function getNiceTickStep(range: number) {
  const roughStep = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 0.0001)));
  const normalized = roughStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function buildPnlAreaRuns(points: PnlScreenPoint[], upColor: string, downColor: string, zeroY: number) {
  if (points.length < 2) return [];

  const runs: PnlAreaRun[] = [];
  const appendRun = (color: string, segmentPoints: PnlScreenPoint[]) => {
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
    const zeroPoint: PnlScreenPoint = {
      date: point.date,
      value: 0,
      x: previous.x + (point.x - previous.x) * ratio,
      y: zeroY,
    };
    appendRun(previousIsPositive ? upColor : downColor, [previous, zeroPoint]);
    appendRun(pointIsPositive ? upColor : downColor, [zeroPoint, point]);
  }

  return runs.filter((run) => run.points.length > 1);
}

function PnlLineChart({
  data,
  upColor,
  downColor,
}: {
  data: PnlChartPoint[];
  upColor: string;
  downColor: string;
}) {
  const svgId = useId().replace(/:/g, "");
  const width = 1120;
  const height = 300;
  const padding = { top: 14, right: 58, bottom: 30, left: 118 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const values = data.map((point) => point.value);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const rawRange = rawMax - rawMin || 1;
  const tickStep = getNiceTickStep(rawRange * 1.12);
  const domainMin = Math.floor((rawMin - rawRange * 0.06) / tickStep) * tickStep;
  const domainMax = Math.ceil((rawMax + rawRange * 0.06) / tickStep) * tickStep;
  const domainRange = domainMax - domainMin || 1;
  const yTicks: number[] = [];
  for (let tick = domainMin; tick <= domainMax + tickStep / 2; tick += tickStep) {
    yTicks.push(Number(tick.toFixed(6)));
  }
  const xTicks = Array.from(
    new Set(
      Array.from({ length: Math.min(6, data.length) }, (_, index) =>
        Math.round((index * (data.length - 1)) / Math.max(1, Math.min(6, data.length) - 1))
      )
    )
  );

  const points = data.map((point, index) => {
    const x = padding.left + (index / Math.max(1, data.length - 1)) * plotWidth;
    const y = padding.top + ((domainMax - point.value) / domainRange) * plotHeight;
    return { ...point, x, y };
  });
  const zeroY = padding.top + ((domainMax - 0) / domainRange) * plotHeight;
  const runs = buildPnlAreaRuns(points, upColor, downColor, zeroY);
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex];
  const chartGridColor = "rgba(100,116,139,0.22)";
  const chartZeroColor = "rgba(100,116,139,0.34)";
  const chartTickColor = "rgba(100,116,139,0.84)";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-lg"
      onMouseLeave={() => setHoverIndex(null)}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        const nextIndex = Math.round(ratio * (data.length - 1));
        setHoverIndex((current) => (current === nextIndex ? current : nextIndex));
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="PNL line chart"
      >
        {yTicks.map((tick) => {
          const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={chartGridColor}
                strokeDasharray="5 4"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
        <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke={chartZeroColor} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        <defs>
          {runs.map((run, index) => {
            const fillId = `${svgId}-pnl-area-${index}`;
            const isPositiveRun = run.points.some((point) => point.value > 0);
            const lineEdgeY = isPositiveRun
              ? Math.min(...run.points.map((point) => point.y))
              : Math.max(...run.points.map((point) => point.y));
            return (
              <linearGradient
                key={fillId}
                id={fillId}
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
        {runs.map((run, index) => (
          <g key={`${run.points[0].date}-${run.points[run.points.length - 1].date}-${run.color}`}>
            <path
              d={buildPnlAreaPath(run.points, zeroY)}
              fill={`url(#${svgId}-pnl-area-${index})`}
            />
            <path
              d={buildPnlPath(run.points)}
              fill="none"
              stroke={run.color}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        {hoveredPoint ? (
          <>
            <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={height - padding.bottom} stroke={chartZeroColor} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="3.5" fill="#FFFFFF" stroke={hoveredPoint.value >= 0 ? upColor : downColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>
      {yTicks.map((tick) => {
        const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
        return (
          <div
            key={tick}
            className="pointer-events-none absolute -translate-y-1/2 pr-2 text-right text-[10px] font-bold leading-none tabular-nums"
            style={{
              left: 0,
              top: `${(y / height) * 100}%`,
              width: `${(padding.left / width) * 100}%`,
              color: chartTickColor,
            }}
          >
            {formatPnlValue(tick)}
          </div>
        );
      })}
      {xTicks.map((index) => {
        const point = points[index];
        if (!point) return null;
        const isFirstTick = index === 0;
        const isLastTick = index === data.length - 1;
        return (
          <div
            key={point.date}
            className="pointer-events-none absolute -translate-y-1/2 text-[10px] font-bold leading-none tabular-nums"
            style={{
              left: `${(point.x / width) * 100}%`,
              top: `${((height - 8) / height) * 100}%`,
              transform: isFirstTick ? "translate(0, -50%)" : isLastTick ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
              color: chartTickColor,
            }}
          >
            {point.date.substring(0, 7)}
          </div>
        );
      })}
      {hoveredPoint ? (
        <div
          className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform:
              hoverIndex === 0
                ? "translate(0, calc(-100% - 8px))"
                : hoverIndex === data.length - 1
                  ? "translate(-100%, calc(-100% - 8px))"
                  : "translate(-50%, calc(-100% - 8px))",
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {hoveredPoint.date}
          </div>
          <div className="mt-1 font-semibold" style={{ color: hoveredPoint.value >= 0 ? upColor : downColor }}>
            PNL {formatPnlValue(hoveredPoint.value)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AlphaDetail({ embedded = false, factorIdOverride, factorOverride }: AlphaDetailProps = {}) {
  const { uiLang } = useAppLanguage();
  const params = useParams<{ id: string }>();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const source = searchParams.get("source");
  const isOfficialLibraryView = source === "official";
  const tierParam = searchParams.get("tier");
  const isGeneratingParam = searchParams.get("generating") === "true";
  const customName = searchParams.get("name");
  const resolvedFactorId = factorIdOverride ?? params.id;
  const baseFactor = factors.find((f) => f.id === resolvedFactorId) || factors[0];
  const factor = factorOverride ? { ...baseFactor, ...factorOverride } : baseFactor;
  const usedCount = new Intl.NumberFormat(uiLang === "zh" ? "zh-CN" : "en-US").format(factor.userCount ?? 0);
  const officialTier: "official" | "graduated" =
    tierParam === "graduated"
      ? "graduated"
      : factor.category === "graduated"
        ? "graduated"
        : "official";
  const detailBackPath = isOfficialLibraryView ? "/alphas/official" : "/alphas";
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(readChartColorMode);
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);

  /* ── Generating state ── */
  const [isGenerating, setIsGenerating] = useState(isGeneratingParam);
  const [genStep, setGenStep] = useState(0);
  const GEN_STEPS = [
    { label: tr("Parsing factor parameters", "解析因子参数"), icon: Settings2, duration: 2000 },
    { label: tr("Mining factor ideas", "挖掘因子思路"), icon: FlaskConical, duration: 3000 },
    { label: tr("Running backtests", "运行回测"), icon: BarChart3, duration: 4000 },
    { label: tr("Optimizing parameters", "优化参数"), icon: LineChartIcon, duration: 3000 },
    { label: tr("Evaluating performance", "评估表现"), icon: Sparkles, duration: 2000 },
  ];

  useEffect(() => {
    if (!isGenerating) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cumulative = 0;
    GEN_STEPS.forEach((step, i) => {
      cumulative += step.duration;
      timers.push(setTimeout(() => setGenStep(i + 1), cumulative));
    });
    cumulative += 1500;
    timers.push(setTimeout(() => setIsGenerating(false), cumulative));
    return () => timers.forEach(clearTimeout);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const { alphaViewMode: viewMode } = useAlphaViewMode();
  const [pnlSamplePeriod, setPnlSamplePeriod] = useState<PnlSamplePeriod>("IS");
  const [summaryPeriod, setSummaryPeriod] = useState<SummaryPeriod>("IS");
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const [showTestPeriod, setShowTestPeriod] = useState(true);
  const [expandedTestSections, setExpandedTestSections] = useState<Record<string, boolean>>({
    pass: false, fail: true, pending: false,
  });
  const [copiedExpression, setCopiedExpression] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  async function handleCopyExpression() {
    try {
      await navigator.clipboard.writeText(factor.expression);
      setCopiedExpression(true);
      toast.success(tr("Copied successfully", "复制成功"));
      window.setTimeout(() => setCopiedExpression(false), 1400);
    } catch {
      setCopiedExpression(false);
      toast.error(tr("Copy failed", "复制失败"));
    }
  }

  const grade = getAlphaGrade(factor.osSharpe);
  const gradeConfig = GRADE_CONFIG[grade];
  const gradePlainLabel = {
    S: tr("Legendary", "顶级"),
    A: tr("Excellent", "优秀"),
    B: tr("Good", "良好"),
    C: tr("Average", "一般"),
    D: tr("Needs Work", "需优化"),
    F: tr("Failed", "失败"),
  }[grade];

  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
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

  const pnlData = useMemo(() => generatePnLData(), []);
  const proPnlData = useMemo(() => {
    const sourceData = pnlSamplePeriod === "IS" ? pnlData.train : pnlData.test;
    return sourceData.map((item) => ({ date: item.date, value: item.value }));
  }, [pnlSamplePeriod, pnlData]);
  const beginnerPnlData = useMemo(() => {
    return [...pnlData.train, ...pnlData.test].map((item) => ({ date: item.date, value: item.value }));
  }, [pnlData]);

  const passItems = testingStatus.filter((t) => t.status === "pass");
  const failItems = testingStatus.filter((t) => t.status === "fail");
  const pendingItems = testingStatus.filter((t) => t.status === "pending");
  const translateTestingText = (text: string) => {
    if (uiLang === "en") return text;
    return text
      .replace("Turnover of ", "换手率 ")
      .replace("Sharpe of ", "夏普比率 ")
      .replace("Sub-universe Sharpe of ", "子宇宙夏普比率 ")
      .replace("Fitness of ", "适应度 ")
      .replace("Weight concentration ", "权重集中度 ")
      .replace(" is above cutoff of ", " 高于阈值 ")
      .replace(" is below cutoff of ", " 低于阈值 ")
      .replace(" on ", " ，日期 ")
      .replace("Competition Challenge matches.", "满足 Competition Challenge 条件。")
      .replace("Self-correlation check pending.", "自相关检查待完成。");
  };
  const getStructuredFailText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("sharpe") && lower.includes("below cutoff")) {
      return {
        issue: tr("Sharpe ratio below threshold", "夏普比率低于阈值"),
        impact: tr("Return quality is insufficient", "收益质量不足"),
        suggestion: tr("Check parameter windows or filter low-liquidity assets", "检查参数窗口或过滤低流动性资产"),
      };
    }
    if (lower.includes("fitness") && lower.includes("below cutoff")) {
      return {
        issue: tr("Fitness below threshold", "适应度低于阈值"),
        impact: tr("Overall factor quality is weak", "因子综合质量偏弱"),
        suggestion: tr("Improve signal stability before using it in a strategy", "提升信号稳定性后再加入策略"),
      };
    }
    if (lower.includes("weight concentration")) {
      return {
        issue: tr("Sample concentration is too high", "样本集中度过高"),
        impact: tr("Factor generalization is weak", "因子泛化能力弱"),
        suggestion: tr("Expand the tested asset universe", "扩大测试资产池"),
      };
    }
    if (lower.includes("sub-universe sharpe")) {
      return {
        issue: tr("Sub-universe Sharpe below threshold", "子样本夏普比率低于阈值"),
        impact: tr("Performance is unstable across asset groups", "不同资产分组表现不稳定"),
        suggestion: tr("Segment assets and retest the factor separately", "按资产分组拆分后重新测试"),
      };
    }
    return {
      issue: translateTestingText(text).replace(/\.$/, ""),
      impact: tr("This check increases deployment risk", "该检查项增加上线风险"),
      suggestion: tr("Review the factor expression and rerun validation", "检查因子表达式并重新验证"),
    };
  };
  const getStructuredPassText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("turnover") && lower.includes("above cutoff")) {
      return {
        issue: tr("Turnover above lower threshold", "换手率高于下限"),
        impact: tr("Trading activity meets the basic requirement", "交易活跃度满足基础要求"),
        suggestion: tr("Continue to monitor whether trading cost stays controlled", "继续观察交易成本是否可控"),
      };
    }
    if (lower.includes("turnover") && lower.includes("below cutoff")) {
      return {
        issue: tr("Turnover below upper threshold", "换手率低于上限"),
        impact: tr("Trading frequency is not excessively amplified", "交易频率未过度放大"),
        suggestion: tr("Keep the current turnover constraint and run portfolio tests", "保留当前换手约束，进入组合测试"),
      };
    }
    if (lower.includes("competition challenge")) {
      return {
        issue: tr("Competition requirement met", "满足因子竞技条件"),
        impact: tr("The factor has reached the basic entry requirement", "因子已达到参赛基础要求"),
        suggestion: tr("Enter the next arena round and observe ranking stability", "进入下一轮因子竞技，观察排名稳定性"),
      };
    }
    return {
      issue: tr("Validation check passed", "检查项通过"),
      impact: tr("Risk is controlled on this dimension", "该维度风险可控"),
      suggestion: tr("Keep the current setting and continue validation", "保留当前设置并继续验证"),
    };
  };
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
  const percentLevel = (value: string, higherIsBetter = true) => {
    const parsed = Math.abs(parseFloat(value));
    if (Number.isNaN(parsed)) return tr("for reference", "仅供参考");
    if (higherIsBetter) {
      if (parsed >= 15) return tr("high", "较高");
      if (parsed >= 5) return tr("moderate", "中等");
      return tr("low", "较低");
    }
    if (parsed <= 10) return tr("controlled", "控制较好");
    if (parsed <= 20) return tr("noticeable", "需要关注");
    return tr("high risk", "风险较高");
  };

  const parseMetric = (value: string | number) => {
    if (typeof value === "number") return value;
    return parseFloat(value.replace("%", "").replace("‰", ""));
  };
  const trendTextClass = (value: string | number) => {
    const parsed = parseMetric(value);
    if (Number.isNaN(parsed) || parsed === 0) return "text-foreground";
    return parsed > 0 ? chartColors.upClass : chartColors.downClass;
  };
  const drawdownTextClass = (value: string | number) => {
    const parsed = Math.abs(parseMetric(value));
    return Number.isNaN(parsed) || parsed === 0 ? "text-foreground" : chartColors.downClass;
  };
  const formatDiff = (value: number, unit = "") => `${value >= 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
  const summaryData = summaryPeriod === "OS" ? osYearlySummary : yearlySummary;
  const activeAggregateData = factorOverride
    ? {
        ...aggregateData,
        sharpe: factor.sharpe,
        turnover: factor.turnover,
        fitness: factor.fitness,
        returns: factor.returns,
        drawdown: factor.drawdown,
      }
    : aggregateData;
  const activeOsAggregateData = factorOverride
    ? {
        ...osAggregateData,
        sharpe: factor.osSharpe,
        turnover: factor.turnover,
        fitness: factor.fitness,
        returns: factor.returns,
        drawdown: factor.drawdown,
      }
    : osAggregateData;
  const diffAggData = {
    sharpe: activeOsAggregateData.sharpe - activeAggregateData.sharpe,
    turnover: formatDiff(parseMetric(activeOsAggregateData.turnover) - parseMetric(activeAggregateData.turnover), "%"),
    fitness: activeOsAggregateData.fitness - activeAggregateData.fitness,
    returns: formatDiff(parseMetric(activeOsAggregateData.returns) - parseMetric(activeAggregateData.returns), "%"),
    drawdown: formatDiff(parseMetric(activeOsAggregateData.drawdown) - parseMetric(activeAggregateData.drawdown), "%"),
    margin: formatDiff(parseMetric(activeOsAggregateData.margin) - parseMetric(activeAggregateData.margin), "‰"),
  };
  const aggData = summaryPeriod === "DIFF" ? diffAggData : summaryPeriod === "OS" ? activeOsAggregateData : activeAggregateData;
  const currentSharpe = typeof aggData.sharpe === "number" ? aggData.sharpe : parseMetric(aggData.sharpe);
  const currentFitness = typeof aggData.fitness === "number" ? aggData.fitness : parseMetric(aggData.fitness);
  const proMetricExplanations = {
    sharpe: tr(
      `Higher Sharpe means steadier returns. ${currentSharpe.toFixed(2)} is ${sharpeLevel(currentSharpe)}.`,
      `夏普比率越高代表越稳定，${currentSharpe.toFixed(2)} 为${sharpeLevel(currentSharpe)}。`
    ),
    returns: tr(
      `Higher return means stronger backtest gain. ${aggData.returns} is ${percentLevel(aggData.returns)}.`,
      `收益率越高代表回测收益越强，${aggData.returns} 为${percentLevel(aggData.returns)}。`
    ),
    drawdown: tr(
      `Lower drawdown means smoother risk. ${aggData.drawdown} is ${percentLevel(aggData.drawdown, false)}.`,
      `回撤越低代表风险越平滑，${aggData.drawdown} 为${percentLevel(aggData.drawdown, false)}。`
    ),
    turnover: tr(
      `Higher turnover means more frequent trades. ${aggData.turnover} is ${percentLevel(aggData.turnover)}.`,
      `换手率越高代表交易越频繁，${aggData.turnover} 为${percentLevel(aggData.turnover)}。`
    ),
    fitness: tr(
      `Higher fitness means better overall quality. ${currentFitness.toFixed(2)} is ${fitnessLevel(currentFitness)}.`,
      `适应度越高代表综合质量越好，${currentFitness.toFixed(2)} 为${fitnessLevel(currentFitness)}。`
    ),
    testsPassed: tr(
      `More passed checks means safer validation. ${factor.testsPassed}/${factor.testsFailed}/${factor.testsPending} for passed/failed/pending.`,
      `通过项越多代表验证越充分，${factor.testsPassed}/${factor.testsFailed}/${factor.testsPending} 为通过/失败/待处理。`
    ),
    margin: tr(
      `Lower margin use leaves more room for risk control. ${aggData.margin} is for reference.`,
      `保证金占用越低，风险空间越充足，${aggData.margin} 仅供参考。`
    ),
    grade: tr(
      `The grade summarizes overall quality. ${grade} means ${gradePlainLabel}.`,
      `等级代表综合表现，${grade} 表示${gradePlainLabel}。`
    ),
  };
  const summaryTitle = summaryPeriod === "DIFF" ? tr("Difference Summary", "差异摘要") : `${summaryPeriod} ${tr("Summary", "摘要")}`;
  const comparisonRows = [
    {
      metric: tr("Sharpe", "夏普比率"),
      isValue: aggregateData.sharpe.toFixed(2),
      osValue: osAggregateData.sharpe.toFixed(2),
      diff: formatDiff(diffAggData.sharpe),
    },
    {
      metric: tr("Returns", "收益"),
      isValue: aggregateData.returns,
      osValue: osAggregateData.returns,
      diff: diffAggData.returns,
    },
    {
      metric: tr("Max Drawdown", "最大回撤"),
      isValue: aggregateData.drawdown,
      osValue: osAggregateData.drawdown,
      diff: diffAggData.drawdown,
    },
    {
      metric: tr("Turnover", "换手率"),
      isValue: aggregateData.turnover,
      osValue: osAggregateData.turnover,
      diff: diffAggData.turnover,
    },
    {
      metric: tr("Fitness", "适应度"),
      isValue: aggregateData.fitness.toFixed(2),
      osValue: osAggregateData.fitness.toFixed(2),
      diff: formatDiff(diffAggData.fitness),
    },
    {
      metric: tr("Margin", "保证金"),
      isValue: aggregateData.margin,
      osValue: osAggregateData.margin,
      diff: diffAggData.margin,
    },
  ];
  const conclusionItems = useMemo(() => {
    return [
      {
        label: tr("Range position and active trade-count bias gap", "区间位置与主动成交笔数偏向缺口"),
        text: tr(
          "Subtract active buy/sell trade-count bias from the price position in the rolling range to capture divergence after flow absorption.",
          "价格在滚动区间中的位置减去主动买卖笔数偏向，捕捉流量被吸收后的背离"
        ),
      },
    ];
  }, [tr]);


  /* ── Beginner mode metrics ── */
  const beginnerMetrics = [
    {
      label: tr("Sharpe", "夏普比率"),
      value: factor.osSharpe.toFixed(2),
      color: undefined,
      desc: tr("Out-of-sample", "样本外"),
      explanation: tr(
        `Higher Sharpe means steadier returns. ${factor.osSharpe.toFixed(2)} is ${factor.osSharpe >= 1 ? "relatively steady" : factor.osSharpe >= 0.5 ? "moderate" : "less steady"}.`,
        `夏普比率越高代表越稳定，${factor.osSharpe.toFixed(2)} 为${factor.osSharpe >= 1 ? "相对稳定" : factor.osSharpe >= 0.5 ? "中等" : "不够稳定"}。`
      ),
    },
    {
      label: tr("Returns", "收益"),
      value: factor.returns,
      color: parseMetric(factor.returns) >= 0 ? chartColors.upHex : chartColors.downHex,
      desc: tr("Total return", "总收益"),
      explanation: tr(`Higher return means stronger backtest gain. ${factor.returns} is high.`, `收益率越高代表回测收益越强，${factor.returns} 为较高。`),
    },
    {
      label: tr("Max Drawdown", "最大回撤"),
      value: factor.drawdown,
      color: chartColors.downHex,
      desc: tr("Max loss", "最大亏损"),
      explanation: tr(`Lower drawdown means smoother risk. ${factor.drawdown} is controlled.`, `回撤越低代表风险越平滑，${factor.drawdown} 为控制较好。`),
    },
    {
      label: tr("Test Pass Rate", "测试通过率"),
      value: `${factor.testsPassed}/${factor.testsPassed + factor.testsFailed}`,
      color: undefined,
      desc: tr("Passed/Total", "通过/总数"),
      explanation: tr(
        `More passed checks means safer validation. ${factor.testsPassed}/${factor.testsPassed + factor.testsFailed} passed.`,
        `通过项越多代表验证越充分，${factor.testsPassed}/${factor.testsPassed + factor.testsFailed} 已通过。`
      ),
    },
  ];
  const beginnerRiskItems = [
    tr("Some validation checks did not pass", "部分测试未达标"),
    tr("Performance is unstable in some years", "在某些年份表现不稳定"),
    tr("May not be suitable as a standalone factor", "可能不适合单独使用"),
  ];
  const beginnerSuggestionItems = [
    tr(
      "Factor tuning: review the parameter window and add liquidity or volatility filters to improve stability.",
      "因子调整：检查参数窗口，可加入流动性或波动率过滤，提升信号稳定性。"
    ),
    tr(
      "Factor usage: use it as a supporting signal in a portfolio; avoid using it as the only trading basis.",
      "因子使用：建议作为组合中的辅助信号，不建议单独作为交易依据。"
    ),
    tr(
      "Validation path: add it to a simulated strategy first, then observe turnover, drawdown, and yearly performance.",
      "验证路径：先加入模拟策略，重点观察换手率、回撤和分年度表现。"
    ),
  ];
  const factorDescriptionContent = (
    <div className="grid gap-1.5 text-sm leading-6 text-foreground">
      {conclusionItems.map((item) => (
        <div key={item.label} className="flex items-start">
          <p>
            <span>{item.label}：</span>
            {item.text}
          </p>
        </div>
      ))}
    </div>
  );
  const factorIntroHeader = (
    <div className="flex items-center gap-2">
      <BookOpenText className="w-4 h-4 text-primary" />
      <span className="text-base font-semibold text-foreground">{tr("Factor Introduction", "因子介绍")}</span>
    </div>
  );
  const beginnerMetricCards = (
    <div className={`grid gap-3 ${isOfficialLibraryView ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5"}`}>
      {beginnerMetrics.map((m) => (
        withPlainExplanation(
          m.explanation,
          <div key={m.label} className="text-center p-4 rounded-2xl bg-accent border border-border/60">
            <div className="label-upper mb-1 text-[9px]">{m.label}</div>
            <div className="text-lg font-bold font-mono tabular-nums" style={{ color: m.color }}>
              {m.value}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{m.desc}</div>
          </div>
        )
      ))}
      {!isOfficialLibraryView && withPlainExplanation(
        proMetricExplanations.grade,
        <div>
          <ScratchCard
            factorId={factor.id}
            grade={grade}
            status={factor.status === "active" || factor.status === "testing" ? "passed" : "failed"}
          />
        </div>
      )}
    </div>
  );
  const beginnerIntroSection = (
    <div className="surface-card">
      <div className="px-6 py-4 pb-3">{factorIntroHeader}</div>
      <div className="px-6 pb-6">
        {factorDescriptionContent}
        <div className="mt-5 border-t border-border/60 pt-4">
          {beginnerMetricCards}
        </div>
      </div>
    </div>
  );
  function withPlainExplanation(content: string, child: ReactNode) {
    if (viewMode !== "beginner" || !plainExplainEnabled) return child;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{child}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-5">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }

  /* ── Generating Loading UI ── */
  if (isGenerating) {
    const displayName = customName || resolvedFactorId || "New Alpha";
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {!embedded ? (
            <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground hover:text-foreground" onClick={() => window.location.assign(detailBackPath)}>
              <ArrowLeft className="w-4 h-4" />
              {tr("Back", "返回")}
            </Button>
          ) : null}
          <div className="flex-1">
            <h1 className="text-foreground">{displayName}</h1>
            <p className="text-xs font-mono mt-1 text-muted-foreground">{resolvedFactorId} &middot; {tr("Just created", "刚创建")}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">{tr("Generating factor...", "正在生成因子...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: Factor Name + Header ═══ */}
      <div className="flex items-center gap-4">
        {!embedded ? (
          <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground hover:text-foreground" onClick={() => window.location.assign(detailBackPath)}>
            <ArrowLeft className="w-4 h-4" />
            {tr("Back", "返回")}
          </Button>
        ) : null}
        <div className="flex-1" ref={headerRef}>
          <div className="reveal-line flex items-center gap-3 flex-wrap">
            <h1 className="text-foreground">{factor.name}</h1>
          </div>
          <div className="reveal-line flex items-center gap-2 mt-1">
            {isOfficialLibraryView ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {uiLang === "zh" ? `已使用${usedCount}次` : `Used ${usedCount} times`}
                </span>
                <span
                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"
                >
                  {officialTier === "official" ? tr("Official", "官方") : tr("Graduated", "三方") }
                </span>
              </>
            ) : (
              null
            )}
            <p className="text-xs font-mono text-muted-foreground">
              {factor.id} &middot; {tr("Created", "创建于")} {factor.createdAt}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-10 shrink-0 rounded-full border-border/80 bg-card p-0 text-foreground hover:bg-accent"
          onClick={() => {
            setIsFavorite((value) => !value);
            toast.success(isFavorite ? tr("Removed from favorites", "已取消收藏") : tr("Added to favorites", "已加入收藏"));
          }}
          aria-label={isFavorite ? tr("Unfavorite factor", "取消收藏因子") : tr("Favorite factor", "收藏因子")}
        >
          <Star className={`h-4 w-4 ${isFavorite ? "fill-current text-amber-400" : ""}`} />
        </Button>

      </div>

      {/* ═══ BEGINNER MODE ═══ */}
      {viewMode === "beginner" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {beginnerIntroSection}

          {/* Simplified Chart — PnL only */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">PNL</span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="h-[300px]">
                <PnlLineChart
                  data={beginnerPnlData}
                  upColor={chartColors.upHex}
                  downColor={chartColors.downHex}
                />
              </div>
            </div>
          </div>


          {/* Simple Test Status */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-base font-semibold text-foreground">{tr("Test Results", "测试结果")}</span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-foreground">{passItems.length} {tr("Passed", "通过")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm text-foreground">{failItems.length} {tr("Failed", "失败")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-sm text-foreground">{pendingItems.length} {tr("Pending", "待处理")}</span>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-accent overflow-hidden flex">
                <div className="bg-success h-full" style={{ width: `${(passItems.length / testingStatus.length) * 100}%` }} />
                <div className="bg-destructive h-full" style={{ width: `${(failItems.length / testingStatus.length) * 100}%` }} />
                <div className="bg-slate-400 h-full" style={{ width: `${(pendingItems.length / testingStatus.length) * 100}%` }} />
              </div>
              <div className="mt-5 grid gap-5 border-t border-border/60 pt-4 md:grid-cols-2 md:gap-8">
                <div className="space-y-2">
                  <div className="label-upper text-[9px] text-destructive">{tr("Main Risks", "主要风险")}</div>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {beginnerRiskItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2 md:border-l md:border-border/60 md:pl-8">
                  <div className="label-upper text-[9px] text-primary">{tr("Suggestion", "建议")}</div>
                  <ul className="space-y-1.5 text-sm leading-6 text-foreground">
                    {beginnerSuggestionItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* ═══ PRO MODE ═══ */}
      {viewMode === "pro" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          <div className="surface-card">
            <div className="px-6 py-4 pb-3">
              {factorIntroHeader}
            </div>
            <div className="px-6 pb-6">
              {factorDescriptionContent}
              <div className="mt-5 border-t border-border/60 pt-4">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{summaryTitle}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs mr-2 text-muted-foreground">{tr("View", "视角")}</span>
                  {([
                    ["IS", tr("In-Sample", "样本内")],
                    ["OS", tr("Out-of-Sample", "样本外")],
                    ["DIFF", tr("Difference", "差异")],
                  ] as const).map(([p, label]) => (
                    <button
                      key={p}
                      className={`h-7 text-xs px-3 rounded-full font-medium transition-all duration-200 ease-in-out border ${
                        summaryPeriod === p
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                      }`}
                      onClick={() => setSummaryPeriod(p)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              {/* Top row: Aggregate metric cards */}
              {summaryPeriod !== "DIFF" && (
              <div className={`grid grid-cols-4 gap-3 ${isOfficialLibraryView ? "md:grid-cols-7" : "md:grid-cols-8"}`}>
                {/* Sharpe card — color follows list view osSharpe rule */}
                {withPlainExplanation(
                  proMetricExplanations.sharpe,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("SHARPE", "夏普比率")}</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                    {typeof aggData.sharpe === "number" ? aggData.sharpe.toFixed(2) : aggData.sharpe}
                  </div>
                </div>
                )}
                {/* Returns */}
                {withPlainExplanation(
                  proMetricExplanations.returns,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("RETURNS", "收益")}</div>
                  <div className={`text-lg font-bold font-mono tabular-nums ${trendTextClass(aggData.returns)}`}>{aggData.returns}</div>
                </div>
                )}
                {/* Drawdown */}
                {withPlainExplanation(
                  proMetricExplanations.drawdown,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("MAX DRAWDOWN", "最大回撤")}</div>
                  <div className={`text-lg font-bold font-mono tabular-nums ${drawdownTextClass(aggData.drawdown)}`}>{aggData.drawdown}</div>
                </div>
                )}
                {/* Turnover */}
                {withPlainExplanation(
                  proMetricExplanations.turnover,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("TURNOVER", "换手率")}</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{aggData.turnover}</div>
                </div>
                )}
                {/* Fitness — color follows list view fitness rule */}
                {withPlainExplanation(
                  proMetricExplanations.fitness,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("FITNESS", "适应度")}</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                    {typeof aggData.fitness === "number" ? aggData.fitness.toFixed(2) : aggData.fitness}
                  </div>
                </div>
                )}
                {/* Test pass rate */}
                {withPlainExplanation(
                  proMetricExplanations.testsPassed,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("TEST PASS RATE", "测试通过率")}</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">
                    {factor.testsPassed}/{factor.testsPassed + factor.testsFailed}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{tr("Passed/Total", "通过/总数")}</div>
                </div>
                )}
                {/* Margin */}
                {withPlainExplanation(
                  proMetricExplanations.margin,
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">{tr("MARGIN", "保证金")}</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{aggData.margin}</div>
                </div>
                )}
                {/* Grade card — Scratch to reveal */}
                {!isOfficialLibraryView && withPlainExplanation(
                  proMetricExplanations.grade,
                <div>
                  <ScratchCard
                    factorId={factor.id}
                    grade={grade}
                    status={factor.status === "active" || factor.status === "testing" ? "passed" : "failed"}
                  />
                </div>
                )}
              </div>
              )}

              {/* Yearly breakdown table / comparison table */}
              {summaryPeriod === "DIFF" ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="label-upper text-primary">{tr("Metric", "指标")}</TableHead>
                      <TableHead className="label-upper text-primary">{tr("In-Sample", "样本内")}</TableHead>
                      <TableHead className="label-upper text-primary">{tr("Out-of-Sample", "样本外")}</TableHead>
                      <TableHead className="label-upper text-primary">{tr("Difference", "差异")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonRows.map((row) => (
                      <TableRow key={row.metric} className="border-border hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell className="text-sm font-medium text-foreground">{row.metric}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.isValue}</TableCell>
                        <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.osValue}</TableCell>
                        <TableCell className={`font-mono text-sm tabular-nums ${trendTextClass(row.diff)}`}>{row.diff}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="label-upper text-primary">{tr("Year", "年份")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Sharpe", "夏普比率")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Turnover", "换手率")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Fitness", "适应度")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Returns", "收益")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Drawdown", "回撤")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Margin", "保证金")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Long Count", "多头数量")}</TableHead>
                    <TableHead className="label-upper text-primary">{tr("Short Count", "空头数量")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData.map((row) => (
                    <TableRow key={row.year} className="border-border hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell className="font-mono text-sm font-medium text-foreground">{row.year}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">
                        {row.sharpe.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.turnover}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">
                        {row.fitness.toFixed(2)}
                      </TableCell>
                      <TableCell className={`font-mono text-sm tabular-nums ${trendTextClass(row.returns)}`}>{row.returns}</TableCell>
                      <TableCell className={`font-mono text-sm tabular-nums ${drawdownTextClass(row.drawdown)}`}>{row.drawdown}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.margin}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.longCount.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.shortCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </div>
          </div>

          {/* ── SECTION 3: Alpha Expression ── */}
          <div className="surface-card py-4 px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span className="label-upper shrink-0">{tr("Expression:", "表达式：")}</span>
                <code className="truncate text-sm font-mono text-primary">{factor.expression}</code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyExpression}
                className="h-8 shrink-0 rounded-full border-border bg-background/40 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copiedExpression ? tr("Copied", "已复制") : tr("Copy", "复制")}
              </Button>
            </div>
          </div>

          {/* ── SECTION 4: Charts ── */}
          {/* Show/Hide Test Period Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              className={`h-8 text-xs px-4 rounded-full font-medium transition-all duration-200 ease-in-out border ${
                showTestPeriod
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
              onClick={() => setShowTestPeriod(!showTestPeriod)}
            >
              {showTestPeriod ? tr("Hide test period", "隐藏测试区间") : tr("Show test period", "显示测试区间")}
            </button>
            {showTestPeriod && (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
                {tr("Test period and overall stats are hidden by default when test period is specified.", "指定测试区间后，测试期与总体统计默认隐藏。")}
              </span>
            )}
          </div>

          {/* Chart Section */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">PNL</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/35 p-1">
                  {([
                    ["IS", tr("In-Sample", "样本内")],
                    ["OS", tr("Out-of-Sample", "样本外")],
                  ] as const).map(([period, label]) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setPnlSamplePeriod(period)}
                      className={`h-7 rounded-full px-3 text-xs font-medium transition-colors ${
                        pnlSamplePeriod === period
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="h-[400px]">
                <PnlLineChart
                  data={proPnlData}
                  upColor={chartColors.upHex}
                  downColor={chartColors.downHex}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 5: Test Status ── */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Correlation */}
            <div className="surface-card">
              <div className="px-6 py-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Correlation", "相关性")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {tr("Last Run:", "最近运行：")} {correlationData.lastRun}
                    <button className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6">
                <div className="flex items-center gap-8">
                  <div>
                    <span className="label-upper">{tr("Self Correlation", "自相关")}</span>
                  </div>
                  <div>
                    <span className="text-xs mr-2 text-muted-foreground">{tr("Maximum", "最大值")}</span>
                    <span className="font-mono text-sm text-foreground">{correlationData.selfCorrelation.maximum}</span>
                  </div>
                  <div>
                    <span className="text-xs mr-2 text-muted-foreground">{tr("Minimum", "最小值")}</span>
                    <span className="font-mono text-sm text-foreground">{correlationData.selfCorrelation.minimum}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Testing Status */}
            <div className="surface-card">
              <div className="px-6 py-4 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-base font-semibold text-foreground">{tr("Test Results", "测试结果")}</span>
                </div>
              </div>
              <div className="px-6 pb-6">
                {/* PASS */}
                <div
                  className="border-t border-border/60 first:border-t-0"
                >
                  <div
                    className="flex cursor-pointer items-center justify-between py-3 transition-colors duration-200 ease-in-out hover:text-foreground"
                    onClick={() => setExpandedTestSections((s) => ({ ...s, pass: !s.pass }))}
                  >
                    <span className="text-sm font-medium text-success">{passItems.length} {tr("PASS", "通过")}</span>
                    {expandedTestSections.pass ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {expandedTestSections.pass && (
                    <div className="pb-4 space-y-3">
                      {passItems.map((t, i) => {
                        const structured = getStructuredPassText(t.text);
                        return (
                        <div key={i} className="grid gap-1.5 border-t border-border/60 pt-3 text-xs first:border-t-0 first:pt-0">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                            <div className="min-w-0 space-y-1">
                              <div className="font-medium text-foreground">{structured.issue}</div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-foreground/80">{tr("Impact:", "影响：")}</span>
                                {structured.impact}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-foreground/80">{tr("Suggestion:", "建议：")}</span>
                                {structured.suggestion}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* FAIL */}
                <div
                  className="border-t border-border/60"
                >
                  <div
                    className="flex cursor-pointer items-center justify-between py-3 transition-colors duration-200 ease-in-out hover:text-foreground"
                    onClick={() => setExpandedTestSections((s) => ({ ...s, fail: !s.fail }))}
                  >
                    <span className="text-sm font-medium text-destructive">{failItems.length} {tr("FAIL", "失败")}</span>
                    {expandedTestSections.fail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {expandedTestSections.fail && (
                    <div className="pb-4 space-y-3">
                      {failItems.map((t, i) => {
                        const structured = getStructuredFailText(t.text);
                        return (
                        <div key={i} className="grid gap-1.5 border-t border-border/60 pt-3 text-xs first:border-t-0 first:pt-0">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                            <div className="min-w-0 space-y-1">
                              <div className="font-medium text-foreground">{structured.issue}</div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-foreground/80">{tr("Impact:", "影响：")}</span>
                                {structured.impact}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-foreground/80">{tr("Suggestion:", "建议：")}</span>
                                {structured.suggestion}
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PENDING */}
                <div
                  className="border-t border-border/60"
                >
                  <div
                    className="flex cursor-pointer items-center justify-between py-3 transition-colors duration-200 ease-in-out hover:text-foreground"
                    onClick={() => setExpandedTestSections((s) => ({ ...s, pending: !s.pending }))}
                  >
                    <span className="text-sm font-medium text-muted-foreground">{pendingItems.length} {tr("PENDING", "待处理")}</span>
                    {expandedTestSections.pending ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {expandedTestSections.pending && (
                    <div className="pb-4 space-y-1.5">
                      {pendingItems.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span>{translateTestingText(t.text)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
