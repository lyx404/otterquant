/*
 * AlphaDetail — Indigo/Sky + Slate Design System
 * Dual view mode: Beginner (simplified) / Pro (full detail)
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald | Danger: Red
 */
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useParams, useSearch } from "wouter";
import { useState, useMemo, useEffect, useId, useRef, type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import gsap from "gsap";
import {
  ArrowLeft, CheckCircle, XCircle, BarChart3,
  ChevronDown, ChevronUp, Sparkles,
  Loader2, FlaskConical, LineChart as LineChartIcon, Settings2, BookOpenText, Copy, Star,
} from "lucide-react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { useAlphaViewMode } from "@/contexts/AlphaViewModeContext";
import {
  factors, generatePnLData, aggregateData, osAggregateData,
  yearlySummary, osYearlySummary, testingStatus,
  getAlphaGrade, type Factor,
} from "@/lib/mockData";

type SummaryPeriod = "IS" | "OS" | "DIFF";
type DetailChartKey = "pnl" | "crossNav" | "cumIc" | "icDecay" | "factorAutoCorr" | "groupCumReturn";
type AlphaDetailProps = {
  embedded?: boolean;
  hideHeader?: boolean;
  factorIdOverride?: string;
  factorOverride?: Partial<Factor>;
};

const expressionProcessSteps = [
  "return = pct_change(close, return_period);",
  "return_z = zscore(return, lookback);",
  "volume_z = zscore(volume, lookback);",
];

const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const CHART_LEGEND_CLASS_NAME = "pointer-events-auto absolute left-4 top-3 z-40 flex max-w-[calc(100%-2rem)] flex-wrap items-center justify-start gap-x-4 gap-y-1 bg-transparent px-0 py-0 text-xs font-semibold text-[#2c2117]";
const CHART_HOVER_TOOLTIP_CLASS_NAME = "pointer-events-none absolute z-50 w-max min-w-max whitespace-nowrap rounded-md bg-[#fff8e8]/90 px-2.5 py-1.5 text-xs shadow-sm";
const CHART_LEFT_AXIS_TITLE_CLASS_NAME = "absolute left-[-57px] top-1/2 w-[156px] -translate-y-1/2 -rotate-90 whitespace-nowrap text-center text-[11px] font-bold text-[#725d42]";
const CHART_RIGHT_AXIS_TITLE_CLASS_NAME = "absolute right-[-44px] top-1/2 w-[80px] -translate-y-1/2 rotate-90 whitespace-nowrap text-center text-[11px] font-bold text-[#725d42]";
const CHART_BOTTOM_AXIS_TITLE_CLASS_NAME = "absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-bold text-[#725d42]";

function getChartTooltipTransform(x: number, chartWidth: number) {
  const edgeGutter = 144;
  if (x <= edgeGutter) return "translate(0, calc(-100% - 8px))";
  if (x >= chartWidth - edgeGutter) return "translate(-100%, calc(-100% - 8px))";
  return "translate(-50%, calc(-100% - 8px))";
}

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
type MultiLineChartSeries = {
  key: string;
  label: string;
  color: string;
  points: PnlChartPoint[];
  strokeWidth?: number;
  strokeDasharray?: string;
};
type ChartAxisLabels = {
  x: string;
  y: string;
  rightY?: string;
};
type CumIcComparisonPoint = {
  date: string;
  x: number;
  ic: number;
  wpcc: number;
  cumIc: number;
  cumWpcc: number;
  bandY: number;
};

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

function buildCumIcComparisonSeries(data: PnlChartPoint[]) {
  const lastIndex = Math.max(data.length - 1, 1);
  const points: CumIcComparisonPoint[] = [];
  let cumIc = 0;
  let cumWpcc = 0;
  let sumIc = 0;
  let sumWpcc = 0;
  let sumIcSq = 0;

  for (let index = 0; index < data.length; index += 1) {
    const progress = index / lastIndex;
    const seasonal = Math.sin(index * 0.022) * 0.006 + Math.cos(index * 0.009 + 0.8) * 0.004;
    const pulse = Math.max(0, Math.sin(index * 0.11 + 0.5)) * 0.084;
    const earlyDrag = index < 45 ? -0.006 * (1 - index / 45) : 0;

    const ic = Number((0.0118 + progress * 0.0019 + seasonal + pulse + earlyDrag).toFixed(5));
    const wpcc = Number((0.0122 + progress * 0.0014 + seasonal * 0.9 + pulse * 0.76 + earlyDrag * 0.8).toFixed(5));

    cumIc += ic;
    cumWpcc += wpcc;
    sumIc += ic;
    sumWpcc += wpcc;
    sumIcSq += ic * ic;

    points.push({
      date: data[index].date,
      x: 0,
      ic,
      wpcc,
      cumIc: Number(cumIc.toFixed(3)),
      cumWpcc: Number(cumWpcc.toFixed(3)),
      bandY: ic,
    });
  }

  const meanIc = points.length ? sumIc / points.length : 0;
  const meanWpcc = points.length ? sumWpcc / points.length : 0;
  const varianceIc = points.length ? Math.max(sumIcSq / points.length - meanIc * meanIc, 0) : 0;
  const stdIc = Math.sqrt(varianceIc) || 1;

  return {
    points,
    meanIc,
    meanWpcc,
    icir: meanIc / stdIc,
  };
}

function buildIcDecaySeries(data: PnlChartPoint[]): Array<{ lag: number; value: number }> {
  const lags = [1, 3, 5, 10, 20, 50];
  const baseValues: Record<number, number> = {
    1: 0.0038,
    3: -0.0092,
    5: -0.0284,
    10: -0.0078,
    20: 0.0007,
    50: -0.0093,
  };
  const signature = Math.tanh((data[0]?.value ?? 0) / 1_000_000) * 0.0002;

  return lags.map((lag, index) => {
    const wobble = Math.sin(lag * 0.87 + index * 0.51) * 0.00035 + Math.cos(lag * 0.21) * 0.00014;
    return {
      lag,
      value: Number((baseValues[lag] + wobble + signature).toFixed(5)),
    };
  });
}

function buildFactorAutocorrSeries(data: PnlChartPoint[]): Array<{ lag: number; value: number }> {
  const lags = [1, 3, 5, 10, 20, 50];
  const anchors: Record<number, number> = {
    1: -0.0178,
    3: 0.0126,
    5: 0.0171,
    10: 0.0056,
    20: -0.0104,
    50: -0.0028,
  };
  const signature = Math.tanh((data[0]?.value ?? 0) / 1_000_000) * 0.00018;

  return lags.map((lag, index) => {
    const wobble = Math.sin(lag * 0.31 + index * 0.43) * 0.00012;
    return {
      lag,
      value: Number((anchors[lag] + signature + wobble).toFixed(5)),
    };
  });
}

function useMeasuredChartSize(initialHeight = 300) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState({ width: 1120, height: initialHeight });

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || typeof ResizeObserver === "undefined") return;

    const updateSize = () => {
      const bounds = chart.getBoundingClientRect();
      setChartSize((current) => {
        const next = {
          width: Math.round(bounds.width),
          height: Math.round(bounds.height),
        };
        if (next.width <= 0 || next.height <= 0) return current;
        return current.width === next.width && current.height === next.height ? current : next;
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(chart);
    return () => resizeObserver.disconnect();
  }, []);

  return { chartRef, chartSize };
}

function isCompactChart(width: number) {
  return width <= 520;
}

function pickEvenlySpacedIndexes(count: number, maxTicks: number) {
  if (count <= 0) return [];
  if (count <= maxTicks) return Array.from({ length: count }, (_, index) => index);

  return Array.from(
    new Set(
      Array.from({ length: maxTicks }, (_, index) =>
        Math.round((index * (count - 1)) / Math.max(1, maxTicks - 1))
      )
    )
  );
}

function pickChartXTickIndexes(count: number, width: number, desktopTicks = 6) {
  const maxTicks = isCompactChart(width) ? 3 : desktopTicks;
  return pickEvenlySpacedIndexes(count, maxTicks);
}

function pickChartYTicks<T>(ticks: T[], width: number, mobileTicks = 4) {
  if (!isCompactChart(width) || ticks.length <= mobileTicks) return ticks;
  return pickEvenlySpacedIndexes(ticks.length, mobileTicks).map((index) => ticks[index]).filter((tick): tick is T => tick !== undefined);
}

function pickLagTicks<T extends { lag: number }>(points: T[], width: number) {
  if (!isCompactChart(width)) return points;
  const preferred = new Set([points[0]?.lag, 10, points[points.length - 1]?.lag]);
  const selected = points.filter((point) => preferred.has(point.lag));
  return selected.length >= 3 ? selected : pickEvenlySpacedIndexes(points.length, 3).map((index) => points[index]).filter((point): point is T => Boolean(point));
}

function getLinearHoverIndex(clientX: number, bounds: DOMRect, pointCount: number) {
  const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / Math.max(1, bounds.width)));
  return Math.round(ratio * (pointCount - 1));
}

function createLinearPointerHandler(pointCount: number, setHoverIndex: (updater: (current: number | null) => number) => void) {
  return (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextIndex = getLinearHoverIndex(event.clientX, bounds, pointCount);
    setHoverIndex((current) => (current === nextIndex ? current : nextIndex));
  };
}

function renderBottomAxisTitle(label: string, compact: boolean) {
  if (compact) return null;
  return <div className={CHART_BOTTOM_AXIS_TITLE_CLASS_NAME}>{label}</div>;
}

function getChartLegendClassName(compact: boolean) {
  return compact
    ? "pointer-events-auto absolute left-0 top-0 z-40 flex w-full max-w-full items-center gap-3 overflow-x-auto whitespace-nowrap bg-transparent px-0 py-0 text-xs font-semibold text-[#2c2117] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    : CHART_LEGEND_CLASS_NAME;
}

function PnlLineChart({
  data,
  upColor,
  downColor,
  valueLabel = "PNL",
  valueFormatter = formatPnlValue,
  axisLabels,
}: {
  data: PnlChartPoint[];
  upColor: string;
  downColor: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  axisLabels: ChartAxisLabels;
}) {
  const svgId = useId().replace(/:/g, "");
  const { chartRef, chartSize } = useMeasuredChartSize(300);
  const width = Math.max(320, chartSize.width);
  const height = Math.max(220, chartSize.height);
  const compact = isCompactChart(width);
  const padding = compact
    ? { top: 14, right: 18, bottom: 38, left: 76 }
    : { top: 14, right: 28, bottom: 36, left: 88 };
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
  const visibleYTicks = pickChartYTicks(yTicks, width, 4);
  const xTicks = pickChartXTickIndexes(data.length, width, 6);

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
      ref={chartRef}
      className="relative h-full w-full overflow-visible rounded-lg"
      onMouseLeave={() => setHoverIndex(null)}
      onPointerDown={createLinearPointerHandler(data.length, setHoverIndex)}
      onPointerMove={createLinearPointerHandler(data.length, setHoverIndex)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="PNL line chart"
      >
        {visibleYTicks.map((tick) => {
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
      <div className={CHART_LEFT_AXIS_TITLE_CLASS_NAME}>
        {axisLabels.y}
      </div>
      {renderBottomAxisTitle(axisLabels.x, compact)}
      {visibleYTicks.map((tick) => {
        const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
        return (
          <div
            key={tick}
              className="pointer-events-none absolute -translate-y-1/2 pr-2 text-right text-[10px] font-bold leading-none tabular-nums"
              style={{
              left: 4,
              top: `${(y / height) * 100}%`,
              width: `${((padding.left - 8) / width) * 100}%`,
              color: chartTickColor,
            }}
          >
            {valueFormatter(tick)}
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
            className="pointer-events-none absolute -translate-y-1/2 whitespace-nowrap text-[10px] font-bold leading-none tabular-nums"
            style={{
              left: `${(point.x / width) * 100}%`,
              top: `${((height - 8) / height) * 100}%`,
              width: 52,
              transform: isFirstTick ? "translate(0, -50%)" : isLastTick ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
              textAlign: isFirstTick ? "left" : isLastTick ? "right" : "center",
              color: chartTickColor,
            }}
          >
            {point.date.substring(0, 7)}
          </div>
        );
      })}
      {hoveredPoint ? (
        <div
          className={CHART_HOVER_TOOLTIP_CLASS_NAME}
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: getChartTooltipTransform(hoveredPoint.x, width),
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {hoveredPoint.date}
          </div>
          <div className="mt-1 font-semibold" style={{ color: hoveredPoint.value >= 0 ? upColor : downColor }}>
            {valueLabel} {valueFormatter(hoveredPoint.value)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MultiLineReturnChart({ series, axisLabels }: { series: MultiLineChartSeries[]; axisLabels: ChartAxisLabels }) {
  const { chartRef, chartSize } = useMeasuredChartSize(300);
  const width = Math.max(320, chartSize.width);
  const height = Math.max(220, chartSize.height);
  const compact = isCompactChart(width);
  const padding = compact
    ? { top: 58, right: 18, bottom: 42, left: 68 }
    : { top: 40, right: 28, bottom: 56, left: 92 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const domainMin = -1.2;
  const domainMax = 1.8;
  const domainRange = domainMax - domainMin;
  const yTicks = [-1, -0.5, 0, 0.5, 1, 1.5];
  const pointCount = Math.max(...series.map((item) => item.points.length), 1);
  const visibleYTicks = pickChartYTicks(yTicks, width, 4);
  const xTicks = pickChartXTickIndexes(pointCount, width, 6);
  const chartGridColor = "rgba(100,116,139,0.22)";
  const chartZeroColor = "rgba(100,116,139,0.36)";
  const chartTickColor = "rgba(100,116,139,0.84)";

  const screenSeries = series.map((item) => ({
    ...item,
    points: item.points.map((point, index) => ({
      ...point,
      x: padding.left + (index / Math.max(1, item.points.length - 1)) * plotWidth,
      y: padding.top + ((domainMax - point.value) / domainRange) * plotHeight,
    })),
  }));
  const hoveredSeries = hoverIndex === null
    ? []
    : screenSeries
        .map((item) => ({ ...item, point: item.points[Math.min(hoverIndex, item.points.length - 1)] }))
        .filter((item) => item.point);
  const hoveredPoint = hoveredSeries[0]?.point ?? null;

  return (
    <div
      ref={chartRef}
      className="relative isolate h-full w-full overflow-visible rounded-lg"
      data-chart-layer="container"
      onMouseLeave={() => setHoverIndex(null)}
      onPointerDown={createLinearPointerHandler(pointCount, setHoverIndex)}
      onPointerMove={createLinearPointerHandler(pointCount, setHoverIndex)}
    >
      <div className="pointer-events-none absolute inset-0 z-0 rounded-lg" aria-hidden="true" />

      <div
        className={getChartLegendClassName(compact)}
        data-chart-layer="legend"
        aria-label="Chart legend layer"
      >
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2 whitespace-nowrap font-semibold text-[#2c2117]">
            <span className="h-[3px] w-7 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="pointer-events-auto absolute inset-0 z-20" data-chart-layer="axes" aria-label="Chart axis layer">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {visibleYTicks.map((tick) => {
            const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
            return (
              <line
                key={tick}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={tick === 0 ? chartZeroColor : chartGridColor}
                strokeDasharray={tick === 0 ? "4 4" : "5 4"}
                strokeWidth={tick === 0 ? "1.2" : "1"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div className={CHART_LEFT_AXIS_TITLE_CLASS_NAME}>
          {axisLabels.y}
        </div>
        {renderBottomAxisTitle(axisLabels.x, compact)}
        {visibleYTicks.map((tick) => {
          const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
          return (
            <div
              key={tick}
              className="absolute -translate-y-1/2 pr-1 text-right text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: 24,
                top: `${(y / height) * 100}%`,
                width: `${((padding.left - 24) / width) * 100}%`,
                color: chartTickColor,
              }}
            >
              {tick.toFixed(tick === 0 ? 3 : 1)}
            </div>
          );
        })}
        {xTicks.map((index) => {
          const point = series[0]?.points[index];
          if (!point) return null;
          const x = padding.left + (index / Math.max(1, pointCount - 1)) * plotWidth;
          const isFirstTick = index === 0;
          const isLastTick = index === pointCount - 1;
          return (
            <div
              key={point.date}
              className="absolute -translate-y-1/2 whitespace-nowrap text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: `${(x / width) * 100}%`,
                top: `${((height - 26) / height) * 100}%`,
                width: 52,
                transform: isFirstTick ? "translate(0, -50%)" : isLastTick ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
                textAlign: isFirstTick ? "left" : isLastTick ? "right" : "center",
                color: chartTickColor,
              }}
            >
              {point.date.substring(0, 7)}
            </div>
          );
        })}
      </div>

      <svg
        viewBox={`0 ${padding.top} ${width} ${plotHeight}`}
        className="absolute left-0 z-30 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        data-chart-layer="plot"
        role="img"
        aria-label="PNL line chart"
        style={{
          top: `${(padding.top / height) * 100}%`,
          height: `${(plotHeight / height) * 100}%`,
        }}
      >
        {screenSeries.map((item) => (
          <path
            key={item.key}
            d={buildPnlPath(item.points)}
            fill="none"
            stroke={item.color}
            strokeWidth={item.strokeWidth ? String(item.strokeWidth) : item.key === "longShort" ? "2.4" : "2"}
            strokeDasharray={item.strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hoveredPoint ? (
          <>
            <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={height - padding.bottom} stroke={chartZeroColor} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            {hoveredSeries.map((item) => (
              <circle key={item.key} cx={item.point.x} cy={item.point.y} r="3.2" fill="#fffdf4" stroke={item.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            ))}
          </>
        ) : null}
      </svg>
      {hoveredPoint ? (
        <div
          className={CHART_HOVER_TOOLTIP_CLASS_NAME}
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: getChartTooltipTransform(hoveredPoint.x, width),
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {hoveredPoint.date}
          </div>
          <div className="mt-1 grid gap-1">
            {hoveredSeries.map((item) => (
              <div key={item.key} className="font-semibold" style={{ color: item.color }}>
                {item.label} {item.point.value.toFixed(3)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GroupCumReturnChart({ data, axisLabels }: { data: PnlChartPoint[]; axisLabels: ChartAxisLabels }) {
  const { chartRef, chartSize } = useMeasuredChartSize(320);
  const width = Math.max(320, chartSize.width);
  const height = Math.max(220, chartSize.height);
  const compact = isCompactChart(width);
  const padding = compact
    ? { top: 58, right: 18, bottom: 42, left: 68 }
    : { top: 40, right: 28, bottom: 56, left: 92 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const series = useMemo(() => buildGroupCumReturnSeries(data), [data]);
  const pointCount = Math.max(...series.map((item) => item.points.length), 1);
  const domainMin = -2.25;
  const domainMax = 0.75;
  const domainRange = domainMax - domainMin;
  const yTicks = [0.5, 0, -0.5, -1, -1.5, -2];
  const visibleYTicks = pickChartYTicks(yTicks, width, 4);
  const xTicks = compact
    ? pickChartXTickIndexes(pointCount, width, 9)
    : [0, 3, 6, 9, 12, 15, 18, 21, 24].filter((index) => index < pointCount);
  const chartGridColor = "rgba(100,116,139,0.18)";
  const chartZeroColor = "rgba(17,24,39,0.8)";
  const chartTickColor = "rgba(82, 64, 37, 0.82)";

  const screenSeries = series.map((item) => ({
    ...item,
    points: item.points.map((point, index) => ({
      ...point,
      x: padding.left + (index / Math.max(1, item.points.length - 1)) * plotWidth,
      y: padding.top + ((domainMax - point.value) / domainRange) * plotHeight,
    })),
  }));
  const hoveredSeries = hoverIndex === null
    ? []
    : screenSeries
        .map((item) => ({ ...item, point: item.points[Math.min(hoverIndex, item.points.length - 1)] }))
        .filter((item) => item.point);
  const hoveredPoint = hoveredSeries[0]?.point ?? null;

  return (
    <div
      ref={chartRef}
      className="relative isolate h-full w-full overflow-visible rounded-lg"
      data-chart-layer="container"
      onMouseLeave={() => setHoverIndex(null)}
      onPointerDown={createLinearPointerHandler(pointCount, setHoverIndex)}
      onPointerMove={createLinearPointerHandler(pointCount, setHoverIndex)}
    >
      <div className="pointer-events-none absolute inset-0 z-0 rounded-lg" aria-hidden="true" />

      <div
        className={getChartLegendClassName(compact)}
        data-chart-layer="legend"
        aria-label="Group cumulative return chart legend layer"
      >
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2 whitespace-nowrap font-semibold text-[#2c2117]">
            <span
              className="h-[3px] w-7 rounded-full"
              style={
                item.strokeDasharray
                  ? {
                      backgroundImage: `repeating-linear-gradient(90deg, ${item.color} 0 4px, transparent 4px 7px)`,
                    }
                  : { backgroundColor: item.color }
              }
            />
            {item.label}
          </div>
        ))}
      </div>

      <div className="pointer-events-auto absolute inset-0 z-20" data-chart-layer="axes" aria-label="Group cumulative return chart axis layer">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {visibleYTicks.map((tick) => {
            const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
            return (
              <line
                key={`group-cum-return-y-grid-${tick}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={tick === 0 ? chartZeroColor : chartGridColor}
                strokeDasharray={tick === 0 ? "4 4" : "5 4"}
                strokeWidth={tick === 0 ? "1.2" : "1"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        <div className={CHART_LEFT_AXIS_TITLE_CLASS_NAME}>
          {axisLabels.y}
        </div>
        {renderBottomAxisTitle(axisLabels.x, compact)}
        {visibleYTicks.map((tick) => {
          const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
          return (
            <div
              key={`group-cum-return-y-${tick}`}
              className="absolute -translate-y-1/2 pr-1 text-right text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: 24,
                top: `${(y / height) * 100}%`,
                width: `${((padding.left - 24) / width) * 100}%`,
                color: chartTickColor,
              }}
            >
              {tick.toFixed(1)}
            </div>
          );
        })}
        {xTicks.map((index) => {
          const point = series[0]?.points[index];
          if (!point) return null;
          const x = padding.left + (index / Math.max(1, pointCount - 1)) * plotWidth;
          const isFirstTick = index === 0;
          const isLastTick = index === pointCount - 1;
          return (
            <div
              key={point.date}
              className="absolute -translate-y-1/2 whitespace-nowrap text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: `${(x / width) * 100}%`,
                top: `${((height - 26) / height) * 100}%`,
                width: 52,
                transform: isFirstTick ? "translate(0, -50%)" : isLastTick ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
                textAlign: isFirstTick ? "left" : isLastTick ? "right" : "center",
                color: chartTickColor,
              }}
            >
              {point.date}
            </div>
          );
        })}
      </div>

      <svg
        viewBox={`0 ${padding.top} ${width} ${plotHeight}`}
        className="pointer-events-auto absolute left-0 z-30 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        data-chart-layer="plot"
        role="img"
        aria-label="Group cumulative return chart"
        style={{
          top: `${(padding.top / height) * 100}%`,
          height: `${(plotHeight / height) * 100}%`,
        }}
      >
        {screenSeries.map((item) => (
          <path
            key={item.key}
            d={buildPnlPath(item.points)}
            fill="none"
            stroke={item.color}
            strokeWidth={item.strokeWidth ? String(item.strokeWidth) : "2.2"}
            strokeDasharray={item.strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hoveredPoint ? (
          <>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke={chartZeroColor}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            {hoveredSeries.map((item) => (
              <circle
                key={item.key}
                cx={item.point.x}
                cy={item.point.y}
                r={item.key === "ls" ? 5 : 3.8}
                fill="#fffdf4"
                stroke={item.color}
                strokeWidth={item.key === "ls" ? "2.4" : "2"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        ) : null}
      </svg>
      {hoveredPoint ? (
        <div
          className={CHART_HOVER_TOOLTIP_CLASS_NAME}
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: getChartTooltipTransform(hoveredPoint.x, width),
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {hoveredPoint.date}
          </div>
          <div className="mt-1 grid gap-1">
            {hoveredSeries.map((item) => (
              <div key={item.key} className="font-semibold" style={{ color: item.color }}>
                {item.label} {item.point.value.toFixed(3)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CumIcComparisonChart({ data, axisLabels }: { data: PnlChartPoint[]; axisLabels: ChartAxisLabels }) {
  const { chartRef, chartSize } = useMeasuredChartSize(320);
  const width = Math.max(320, chartSize.width);
  const height = Math.max(240, chartSize.height);
  const compact = isCompactChart(width);
  const padding = compact
    ? { top: 70, right: 46, bottom: 42, left: 68 }
    : { top: 40, right: 72, bottom: 56, left: 92 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { points, meanIc, meanWpcc, icir } = useMemo(() => buildCumIcComparisonSeries(data), [data]);
  const lastIndex = Math.max(points.length - 1, 1);
  const leftMax = Math.max(18, ...points.map((point) => Math.max(point.cumIc, point.cumWpcc)));
  const leftRange = leftMax || 1;
  const rightMin = Math.min(-0.02, ...points.map((point) => point.bandY));
  const rightMax = Math.max(0.12, ...points.map((point) => point.bandY));
  const rightRange = rightMax - rightMin || 1;
  const leftTicks = Array.from(
    new Set(
      Array.from({ length: 5 }, (_, index) =>
        Number(((leftMax / 4) * index).toFixed(3))
      )
    )
  );
  const rightTicks = [0, 0.02, 0.04, 0.06, 0.08, 0.10, 0.12];
  const visibleLeftTicks = pickChartYTicks(leftTicks, width, 4);
  const visibleRightTicks = pickChartYTicks(rightTicks, width, 4);

  const screenPoints = points.map((point, index) => {
    const x = padding.left + (index / lastIndex) * plotWidth;
    const cumIcY = padding.top + ((leftMax - point.cumIc) / leftRange) * plotHeight;
    const cumWpccY = padding.top + ((leftMax - point.cumWpcc) / leftRange) * plotHeight;
    const bandY = padding.top + ((rightMax - point.bandY) / rightRange) * plotHeight;
    return { ...point, x, cumIcY, cumWpccY, bandY };
  });
  const areaScreenPoints = screenPoints.map((point) => ({
    date: point.date,
    value: point.bandY,
    x: point.x,
    y: point.bandY,
  }));
  const areaZeroY = padding.top + ((rightMax - 0) / rightRange) * plotHeight;
  const hoveredPoint = hoverIndex === null ? null : screenPoints[hoverIndex];
  const chartGridColor = "rgba(100,116,139,0.18)";
  const chartZeroColor = "rgba(100,116,139,0.32)";
  const leftTickColor = "rgba(82, 64, 37, 0.82)";
  const rightTickColor = "rgba(82, 64, 37, 0.66)";

  const buildAreaPath = (items: { x: number; y: number }[]) => {
    if (items.length < 2) return "";
    const linePath = items.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const first = items[0];
    const last = items[items.length - 1];
    return `${linePath} L ${last.x.toFixed(2)} ${areaZeroY.toFixed(2)} L ${first.x.toFixed(2)} ${areaZeroY.toFixed(2)} Z`;
  };

  const buildLinePath = (items: { x: number; y: number }[]) =>
    items.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return (
    <div
      ref={chartRef}
      className="relative h-full w-full overflow-visible"
      data-chart-layer="container"
      onMouseLeave={() => setHoverIndex(null)}
      onPointerDown={createLinearPointerHandler(points.length, setHoverIndex)}
      onPointerMove={createLinearPointerHandler(points.length, setHoverIndex)}
    >
      <div
        className={getChartLegendClassName(compact)}
        data-chart-layer="legend"
        aria-label="Cumulative IC chart legend layer"
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="h-[2px] w-7 rounded-full bg-[#2d79d7]" />
          <span>Cum IC</span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="h-[2px] w-7 rounded-full bg-[#f28a1a]" />
          <span>Cum WPCC</span>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap text-[#725d42]">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#f3b0a8]/80" />
          <span>{`IC ${meanIc.toFixed(5)} · ICIR ${icir.toFixed(5)} · WPCC ${(meanWpcc * 5.5).toFixed(5)}`}</span>
        </div>
      </div>

      <div className="pointer-events-auto absolute inset-0 z-20" data-chart-layer="axes" aria-label="Cumulative IC chart axis layer">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {visibleLeftTicks.map((tick) => {
            const y = padding.top + ((leftMax - tick) / leftRange) * plotHeight;
            return (
              <line
                key={`left-grid-${tick}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={tick === 0 ? chartZeroColor : chartGridColor}
                strokeDasharray={tick === 0 ? "4 4" : "5 4"}
                strokeWidth={tick === 0 ? "1.15" : "1"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {visibleRightTicks.map((tick) => {
            const y = padding.top + ((rightMax - tick) / rightRange) * plotHeight;
            return (
              <line
                key={`right-grid-${tick}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={chartGridColor}
                strokeDasharray="5 4"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        <div className={CHART_LEFT_AXIS_TITLE_CLASS_NAME}>
          {axisLabels.y}
        </div>
        <div className={CHART_RIGHT_AXIS_TITLE_CLASS_NAME}>
          {axisLabels.rightY ?? "IC"}
        </div>
        {renderBottomAxisTitle(axisLabels.x, compact)}

        {visibleLeftTicks.map((tick) => {
          const y = padding.top + ((leftMax - tick) / leftRange) * plotHeight;
          return (
            <div
              key={`left-label-${tick}`}
              className="absolute -translate-y-1/2 pr-2 text-right text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: 4,
                top: `${(y / height) * 100}%`,
                width: `${((padding.left - 10) / width) * 100}%`,
                color: leftTickColor,
              }}
            >
              {formatPnlValue(tick)}
            </div>
          );
        })}

        {visibleRightTicks.map((tick) => {
          const y = padding.top + ((rightMax - tick) / rightRange) * plotHeight;
          return (
            <div
              key={`right-label-${tick}`}
              className="absolute -translate-y-1/2 pl-2 text-left text-[10px] font-bold leading-none tabular-nums"
              style={{
                right: 4,
                top: `${(y / height) * 100}%`,
                width: `${((padding.right - 10) / width) * 100}%`,
                color: rightTickColor,
              }}
            >
              {tick.toFixed(2)}
            </div>
          );
        })}

        {points.length > 0 ? (
          <div
            className="absolute -translate-y-1/2 whitespace-nowrap text-[10px] font-bold leading-none tabular-nums"
            style={{
              left: `${(screenPoints[0]?.x ?? padding.left) / width * 100}%`,
              top: `${((height - 26) / height) * 100}%`,
              width: 52,
              transform: "translate(0, -50%)",
              textAlign: "left",
              color: leftTickColor,
            }}
          >
            {points[0].date.substring(0, 7)}
          </div>
        ) : null}

        {points.length > 0 ? (
          <div
            className="absolute -translate-y-1/2 whitespace-nowrap text-[10px] font-bold leading-none tabular-nums"
            style={{
              left: `${(screenPoints[screenPoints.length - 1]?.x ?? width - padding.right) / width * 100}%`,
              top: `${((height - 26) / height) * 100}%`,
              width: 52,
              transform: "translate(-100%, -50%)",
              textAlign: "right",
              color: leftTickColor,
            }}
          >
            {points[points.length - 1].date.substring(0, 7)}
          </div>
        ) : null}
      </div>

      <svg
        viewBox={`0 ${padding.top} ${width} ${plotHeight}`}
        className="pointer-events-auto absolute left-0 z-30 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        data-chart-layer="plot"
        role="img"
        aria-label="Cumulative IC chart"
        style={{
          top: `${(padding.top / height) * 100}%`,
          height: `${(plotHeight / height) * 100}%`,
        }}
      >
        <path d={buildAreaPath(areaScreenPoints)} fill="rgba(248, 166, 161, 0.42)" />
        <path
          d={buildLinePath(screenPoints.map((point) => ({ x: point.x, y: point.cumIcY })))}
          fill="none"
          stroke="#2d79d7"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={buildLinePath(screenPoints.map((point) => ({ x: point.x, y: point.cumWpccY })))}
          fill="none"
          stroke="#f28a1a"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <line x1={padding.left} x2={width - padding.right} y1={areaZeroY} y2={areaZeroY} stroke="rgba(248, 149, 146, 0.78)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        {hoveredPoint ? (
          <>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke={chartZeroColor}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.cumIcY} r="3.5" fill="#fffdf6" stroke="#2d79d7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.cumWpccY} r="3.5" fill="#fffdf6" stroke="#f28a1a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>

      {hoveredPoint ? (
        <div
          className={CHART_HOVER_TOOLTIP_CLASS_NAME}
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.cumIcY / height) * 100}%`,
            transform: getChartTooltipTransform(hoveredPoint.x, width),
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {hoveredPoint.date}
          </div>
          <div className="mt-1 grid gap-1 font-semibold text-[#2c2117]">
            <div style={{ color: "#2d79d7" }}>{`Cum IC ${hoveredPoint.cumIc.toFixed(3)}`}</div>
            <div style={{ color: "#f28a1a" }}>{`Cum WPCC ${hoveredPoint.cumWpcc.toFixed(3)}`}</div>
            <div style={{ color: "#f08f86" }}>{`IC ${hoveredPoint.ic.toFixed(5)}`}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IcDecayChart({ data, axisLabels }: { data: PnlChartPoint[]; axisLabels: ChartAxisLabels }) {
  const { chartRef, chartSize } = useMeasuredChartSize(320);
  const width = Math.max(320, chartSize.width);
  const height = Math.max(240, chartSize.height);
  const compact = isCompactChart(width);
  const padding = compact
    ? { top: 28, right: 18, bottom: 42, left: 68 }
    : { top: 40, right: 28, bottom: 56, left: 92 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const series = useMemo(() => buildIcDecaySeries(data), [data]);

  const domainMax = 0.005;
  const domainRange = 0.035;
  const yTicks = [0.005, 0, -0.005, -0.01, -0.015, -0.02, -0.025];
  const visibleYTicks = pickChartYTicks(yTicks, width, 4);
  const minLog = Math.log(series[0]?.lag ?? 1);
  const maxLog = Math.log(series[series.length - 1]?.lag ?? 50);
  const logRange = maxLog - minLog || 1;
  const points = series.map((item) => {
    const progress = (Math.log(item.lag) - minLog) / logRange;
    const x = padding.left + progress * plotWidth;
    const y = padding.top + ((domainMax - item.value) / domainRange) * plotHeight;
    return { ...item, x, y };
  });
  const visibleXTicks = pickLagTicks(points, width);
  const zeroY = padding.top + ((domainMax - 0) / domainRange) * plotHeight;
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex];
  const chartGridColor = "rgba(100,116,139,0.20)";
  const chartZeroColor = "rgba(103,232,249,0.86)";
  const chartTickColor = "rgba(82, 64, 37, 0.84)";

  const buildLinePath = (items: { x: number; y: number }[]) =>
    items.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return (
    <div
      ref={chartRef}
      className="relative h-full w-full overflow-visible"
      data-chart-layer="container"
      onMouseLeave={() => setHoverIndex(null)}
      onPointerDown={createLinearPointerHandler(points.length, setHoverIndex)}
      onPointerMove={createLinearPointerHandler(points.length, setHoverIndex)}
    >
      <div className="pointer-events-auto absolute inset-0 z-20" data-chart-layer="axes" aria-label="IC decay chart axis layer">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {visibleYTicks.map((tick) => {
            const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
            return (
              <line
                key={`ic-decay-grid-${tick}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={tick === 0 ? chartZeroColor : chartGridColor}
                strokeDasharray={tick === 0 ? "4 4" : "5 4"}
                strokeWidth={tick === 0 ? "1.15" : "1"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke={chartZeroColor} strokeDasharray="4 4" strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className={CHART_LEFT_AXIS_TITLE_CLASS_NAME}>
          {axisLabels.y}
        </div>
        {renderBottomAxisTitle(axisLabels.x, compact)}

        {visibleYTicks.map((tick) => {
          const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
          return (
            <div
              key={`ic-decay-y-${tick}`}
              className="absolute -translate-y-1/2 pr-2 text-right text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: 4,
                top: `${(y / height) * 100}%`,
                width: `${((padding.left - 10) / width) * 100}%`,
                color: chartTickColor,
              }}
            >
              {tick.toFixed(3)}
            </div>
          );
        })}

        {visibleXTicks.map((point) => {
          if (!point) return null;
          const isFirstTick = point.lag === points[0]?.lag;
          const isLastTick = point.lag === points[points.length - 1]?.lag;
          return (
            <div
              key={`ic-decay-x-${point.lag}`}
              className="absolute -translate-y-1/2 text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: `${(point.x / width) * 100}%`,
                top: `${((height - 26) / height) * 100}%`,
                transform: isFirstTick ? "translate(0, -50%)" : isLastTick ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
                color: chartTickColor,
              }}
            >
              {point.lag}
            </div>
          );
        })}
      </div>

      <svg
        viewBox={`0 ${padding.top} ${width} ${plotHeight}`}
        className="pointer-events-auto absolute left-0 z-30 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        data-chart-layer="plot"
        role="img"
        aria-label="IC decay chart"
        style={{
          top: `${(padding.top / height) * 100}%`,
          height: `${(plotHeight / height) * 100}%`,
        }}
      >
        <path
          d={buildLinePath(points)}
          fill="none"
          stroke="#2d79d7"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <circle
            key={point.lag}
            cx={point.x}
            cy={point.y}
            r="5.5"
            fill="#2d79d7"
            stroke="#f6f0de"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hoveredPoint ? (
          <>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke={chartZeroColor}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="7"
              fill="#fffdf6"
              stroke="#2d79d7"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>

      {hoveredPoint ? (
        <div
          className={CHART_HOVER_TOOLTIP_CLASS_NAME}
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: getChartTooltipTransform(hoveredPoint.x, width),
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Lag {hoveredPoint.lag}
          </div>
          <div className="mt-1 font-semibold text-[#2d79d7]">
            {`IC mean ${hoveredPoint.value.toFixed(5)}`}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FactorAutocorrChart({ data, axisLabels }: { data: PnlChartPoint[]; axisLabels: ChartAxisLabels }) {
  const { chartRef, chartSize } = useMeasuredChartSize(320);
  const width = Math.max(320, chartSize.width);
  const height = Math.max(240, chartSize.height);
  const compact = isCompactChart(width);
  const padding = compact
    ? { top: 28, right: 18, bottom: 42, left: 68 }
    : { top: 40, right: 28, bottom: 56, left: 92 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const series = useMemo(() => buildFactorAutocorrSeries(data), [data]);

  const domainMax = 0.018;
  const domainRange = 0.038;
  const yTicks = [0.015, 0.01, 0.005, 0, -0.005, -0.01, -0.015];
  const visibleYTicks = pickChartYTicks(yTicks, width, 4);
  const minLog = Math.log(1);
  const maxLog = Math.log(50);
  const logRange = maxLog - minLog || 1;
  const points = series.map((item) => {
    const progress = (Math.log(item.lag) - minLog) / logRange;
    const x = padding.left + progress * plotWidth;
    const y = padding.top + ((domainMax - item.value) / domainRange) * plotHeight;
    return { ...item, x, y };
  });
  const visibleXTicks = pickLagTicks(points, width);
  const zeroY = padding.top + ((domainMax - 0) / domainRange) * plotHeight;
  const hoveredPoint = hoverIndex === null ? null : points[hoverIndex];
  const chartGridColor = "rgba(100,116,139,0.20)";
  const chartZeroColor = "rgba(100,116,139,0.42)";
  const chartTickColor = "rgba(82, 64, 37, 0.84)";

  const buildLinePath = (items: { x: number; y: number }[]) =>
    items.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return (
    <div
      ref={chartRef}
      className="relative h-full w-full overflow-visible rounded-lg"
      data-chart-layer="container"
      onMouseLeave={() => setHoverIndex(null)}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
        const targetLog = minLog + ratio * logRange;
        const nextIndex = points.reduce((bestIndex, point, index) => {
          if (bestIndex < 0) return index;
          const bestPoint = points[bestIndex];
          const bestDistance = Math.abs(Math.log(bestPoint.lag) - targetLog);
          const currentDistance = Math.abs(Math.log(point.lag) - targetLog);
          return currentDistance < bestDistance ? index : bestIndex;
        }, -1);
        setHoverIndex((current) => (current === nextIndex ? current : nextIndex));
      }}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
        const targetLog = minLog + ratio * logRange;
        const nextIndex = points.reduce((bestIndex, point, index) => {
          if (bestIndex < 0) return index;
          const bestPoint = points[bestIndex];
          const bestDistance = Math.abs(Math.log(bestPoint.lag) - targetLog);
          const currentDistance = Math.abs(Math.log(point.lag) - targetLog);
          return currentDistance < bestDistance ? index : bestIndex;
        }, -1);
        setHoverIndex((current) => (current === nextIndex ? current : nextIndex));
      }}
    >
      <div className="pointer-events-auto absolute inset-0 z-20" data-chart-layer="axes" aria-label="Factor autocorrelation chart axis layer">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {visibleYTicks.map((tick) => {
            const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
            return (
              <line
                key={`autocorr-grid-${tick}`}
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke={tick === 0 ? chartZeroColor : chartGridColor}
                strokeDasharray={tick === 0 ? "4 4" : "5 4"}
                strokeWidth={tick === 0 ? "1.15" : "1"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <line x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} stroke={chartZeroColor} strokeDasharray="4 4" strokeWidth="1.15" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className={CHART_LEFT_AXIS_TITLE_CLASS_NAME}>
          {axisLabels.y}
        </div>
        {renderBottomAxisTitle(axisLabels.x, compact)}

        {visibleYTicks.map((tick) => {
          const y = padding.top + ((domainMax - tick) / domainRange) * plotHeight;
          return (
            <div
              key={`autocorr-y-${tick}`}
              className="absolute -translate-y-1/2 pr-2 text-right text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: 4,
                top: `${(y / height) * 100}%`,
                width: `${((padding.left - 10) / width) * 100}%`,
                color: chartTickColor,
              }}
            >
              {tick.toFixed(3)}
            </div>
          );
        })}

        {visibleXTicks.map((point) => {
          if (!point) return null;
          const isFirstTick = point.lag === points[0]?.lag;
          const isLastTick = point.lag === points[points.length - 1]?.lag;
          return (
            <div
              key={`autocorr-x-${point.lag}`}
              className="absolute -translate-y-1/2 text-[10px] font-bold leading-none tabular-nums"
              style={{
                left: `${(point.x / width) * 100}%`,
                top: `${((height - 26) / height) * 100}%`,
                transform: isFirstTick ? "translate(0, -50%)" : isLastTick ? "translate(-100%, -50%)" : "translate(-50%, -50%)",
                color: chartTickColor,
              }}
            >
              {point.lag}
            </div>
          );
        })}
      </div>

      <svg
        viewBox={`0 ${padding.top} ${width} ${plotHeight}`}
        className="pointer-events-auto absolute left-0 z-30 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        data-chart-layer="plot"
        role="img"
        aria-label="Factor autocorrelation chart"
        style={{
          top: `${(padding.top / height) * 100}%`,
          height: `${(plotHeight / height) * 100}%`,
        }}
      >
        <path
          d={buildLinePath(points)}
          fill="none"
          stroke="#2d79d7"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <circle
            key={point.lag}
            cx={point.x}
            cy={point.y}
            r="5.8"
            fill="#2d79d7"
            stroke="#f6f0de"
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {hoveredPoint ? (
          <>
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke={chartZeroColor}
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="7"
              fill="#fffdf6"
              stroke="#2d79d7"
              strokeWidth="2.2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>

      {hoveredPoint ? (
        <div
          className={CHART_HOVER_TOOLTIP_CLASS_NAME}
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: getChartTooltipTransform(hoveredPoint.x, width),
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Lag {hoveredPoint.lag}
          </div>
          <div className="mt-1 font-semibold text-[#2d79d7]">
            {`AR ${hoveredPoint.value.toFixed(5)}`}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildDetailChartData(data: PnlChartPoint[], chartKey: DetailChartKey): PnlChartPoint[] {
  const maxAbs = Math.max(...data.map((item) => Math.abs(item.value)), 1);
  const lastIndex = Math.max(data.length - 1, 1);

  return data.map((item, index) => {
    const progress = index / lastIndex;
    const wave = Math.sin(index / 8);
    const value =
      chartKey === "pnl"
        ? item.value
        : chartKey === "crossNav"
          ? 1 + item.value / maxAbs + progress * 0.18
          : chartKey === "cumIc"
            ? progress * 0.18 + wave * 0.018
            : chartKey === "icDecay"
              ? Math.exp(-progress * 4) * 0.12 + Math.sin(index / 3) * 0.004
              : chartKey === "factorAutoCorr"
                ? Math.exp(-progress * 2.2) * 0.82 + Math.cos(index / 7) * 0.045
                : item.value * 0.72 + Math.sin(index / 12) * 120000;

    return { date: item.date, value };
  });
}

function buildCrossNavSeries(): MultiLineChartSeries[] {
  const dates = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(2024, index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const lastIndex = Math.max(dates.length - 1, 1);

  const anchors = {
    longOnly: [
      [0, 0.02],
      [0.1, -0.18],
      [0.18, 0.5],
      [0.3, 0.08],
      [0.42, -0.32],
      [0.52, -0.18],
      [0.62, 0.38],
      [0.72, -0.15],
      [0.82, -0.05],
      [0.92, -0.58],
      [1, -0.86],
    ] as Array<[number, number]>,
    shortOnly: [
      [0, 0.02],
      [0.08, 0.16],
      [0.16, -0.48],
      [0.28, -0.06],
      [0.38, 0.6],
      [0.5, 0.26],
      [0.62, 0.72],
      [0.72, 0.3],
      [0.84, 0.7],
      [0.94, 1.55],
      [1, 1.38],
    ] as Array<[number, number]>,
    longShort: [
      [0, 0],
      [0.12, -0.06],
      [0.24, 0.06],
      [0.34, 0.16],
      [0.46, 0.08],
      [0.58, -0.22],
      [0.68, -0.1],
      [0.76, 0.22],
      [0.86, 0.38],
      [0.94, 0.48],
      [1, 0.2],
    ] as Array<[number, number]>,
  };

  const interpolate = (anchorList: Array<[number, number]>, progress: number) => {
    for (let index = 1; index < anchorList.length; index += 1) {
      const [prevProgress, prevValue] = anchorList[index - 1];
      const [nextProgress, nextValue] = anchorList[index];
      if (progress <= nextProgress) {
        const span = Math.max(nextProgress - prevProgress, 0.0001);
        const ratio = Math.max(0, Math.min(1, (progress - prevProgress) / span));
        const base = prevValue + (nextValue - prevValue) * ratio;
        const wobble = Math.sin(progress * Math.PI * 10 + index) * 0.04;
        return Number((base + wobble).toFixed(3));
      }
    }
    return anchorList[anchorList.length - 1][1];
  };

  return [
    {
      key: "longOnly",
      label: "Long-Only (G1)",
      color: "#1ca486",
      points: dates.map((date, index) => ({
        date,
        value: interpolate(anchors.longOnly, index / lastIndex),
      })),
    },
    {
      key: "shortOnly",
      label: "Short-Only (-G5)",
      color: "#d08a33",
      points: dates.map((date, index) => ({
        date,
        value: interpolate(anchors.shortOnly, index / lastIndex),
      })),
    },
    {
      key: "longShort",
      label: "Long-Short",
      color: "#7561b8",
      points: dates.map((date, index) => ({
        date,
        value: interpolate(anchors.longShort, index / lastIndex),
      })),
    },
  ];
}

function buildGroupCumReturnSeries(data: PnlChartPoint[]): MultiLineChartSeries[] {
  const dates = Array.from({ length: 26 }, (_, index) => {
    const date = new Date(2024, index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
  const lastIndex = Math.max(dates.length - 1, 1);
  const seed = Math.tanh((data[0]?.value ?? 0) / 1_000_000) * 0.03;

  const interpolate = (anchors: Array<[number, number]>, progress: number, wobble = 0, phase = 0) => {
    for (let index = 1; index < anchors.length; index += 1) {
      const [prevProgress, prevValue] = anchors[index - 1];
      const [nextProgress, nextValue] = anchors[index];
      if (progress <= nextProgress) {
        const span = Math.max(nextProgress - prevProgress, 0.0001);
        const ratio = Math.max(0, Math.min(1, (progress - prevProgress) / span));
        const base = prevValue + (nextValue - prevValue) * ratio;
        const ripple = Math.sin(progress * Math.PI * 16 + phase) * wobble;
        return Number((base + ripple + seed).toFixed(3));
      }
    }
    return Number((anchors[anchors.length - 1][1] + seed).toFixed(3));
  };

  const configs = [
    {
      key: "g1",
      label: "G1",
      color: "#d05a97",
      strokeWidth: 2.2,
      anchors: [
        [0, -0.02],
        [0.08, 0.18],
        [0.14, 0.55],
        [0.22, 0.34],
        [0.31, 0.05],
        [0.39, 0.28],
        [0.48, -0.18],
        [0.56, -0.06],
        [0.64, 0.32],
        [0.72, -0.08],
        [0.82, -0.28],
        [0.9, -0.66],
        [1, -0.9],
      ] as Array<[number, number]>,
      wobble: 0.055,
      phase: 0.3,
    },
    {
      key: "g2",
      label: "G2",
      color: "#f09a74",
      strokeWidth: 2.2,
      anchors: [
        [0, -0.04],
        [0.08, 0.12],
        [0.14, 0.5],
        [0.22, 0.18],
        [0.3, 0.24],
        [0.38, -0.1],
        [0.46, 0.12],
        [0.54, -0.26],
        [0.64, -0.38],
        [0.73, -0.12],
        [0.82, -0.42],
        [0.9, -0.88],
        [1, -1.78],
      ] as Array<[number, number]>,
      wobble: 0.05,
      phase: 1.15,
    },
    {
      key: "g3",
      label: "G3",
      color: "#dfe46f",
      strokeWidth: 2.2,
      anchors: [
        [0, -0.02],
        [0.08, 0.06],
        [0.15, 0.2],
        [0.23, -0.3],
        [0.31, -0.52],
        [0.39, -0.42],
        [0.48, -0.18],
        [0.56, -0.64],
        [0.65, -1.1],
        [0.74, -1.38],
        [0.83, -1.12],
        [0.91, -1.72],
        [1, -2.12],
      ] as Array<[number, number]>,
      wobble: 0.045,
      phase: 2.1,
    },
    {
      key: "g4",
      label: "G4",
      color: "#9ad77b",
      strokeWidth: 2.2,
      anchors: [
        [0, -0.06],
        [0.08, 0.1],
        [0.15, 0.04],
        [0.23, -0.2],
        [0.31, -0.46],
        [0.4, -0.64],
        [0.49, -0.34],
        [0.58, -0.76],
        [0.67, -1.08],
        [0.75, -0.92],
        [0.83, -1.3],
        [0.91, -1.78],
        [1, -1.36],
      ] as Array<[number, number]>,
      wobble: 0.042,
      phase: 2.65,
    },
    {
      key: "g5",
      label: "G5",
      color: "#33bbb6",
      strokeWidth: 2.2,
      anchors: [
        [0, -0.02],
        [0.08, 0.16],
        [0.14, 0.46],
        [0.22, 0.1],
        [0.31, -0.22],
        [0.39, -0.48],
        [0.48, -0.12],
        [0.56, -0.58],
        [0.64, -0.46],
        [0.73, -0.62],
        [0.81, -0.9],
        [0.9, -1.2],
        [1, -1.38],
      ] as Array<[number, number]>,
      wobble: 0.04,
      phase: 3.05,
    },
    {
      key: "ls",
      label: "LS",
      color: "#4a6fb8",
      strokeWidth: 3.6,
      anchors: [
        [0, 0],
        [0.08, 0.02],
        [0.14, -0.08],
        [0.22, -0.04],
        [0.3, 0.15],
        [0.38, 0.22],
        [0.47, 0.08],
        [0.56, -0.12],
        [0.66, -0.28],
        [0.74, 0.12],
        [0.82, 0.28],
        [0.91, 0.22],
        [1, 0.48],
      ] as Array<[number, number]>,
      wobble: 0.03,
      phase: 0.6,
    },
    {
      key: "longAvg",
      label: "Long-Avg",
      color: "#a27dee",
      strokeWidth: 2.2,
      strokeDasharray: "3 5",
      anchors: [
        [0, 0],
        [0.08, 0.04],
        [0.14, 0.12],
        [0.22, 0.08],
        [0.3, 0.14],
        [0.39, 0.06],
        [0.48, 0.02],
        [0.56, 0.04],
        [0.64, 0],
        [0.72, 0.42],
        [0.8, 0.48],
        [0.9, 0.45],
        [1, 0.66],
      ] as Array<[number, number]>,
      wobble: 0.025,
      phase: 1.8,
    },
  ];

  return configs.map((config) => ({
    key: config.key,
    label: config.label,
    color: config.color,
    strokeWidth: config.strokeWidth,
    strokeDasharray: config.strokeDasharray,
    points: dates.map((date, index) => ({
      date,
      value: interpolate(config.anchors, index / lastIndex, config.wobble, config.phase),
    })),
  }));
}

function formatCompactChartValue(value: number) {
  if (Math.abs(value) >= 1000) return formatPnlValue(value);
  return value.toFixed(Math.abs(value) >= 1 ? 2 : 3);
}

export default function AlphaDetail({ embedded = false, hideHeader = false, factorIdOverride, factorOverride }: AlphaDetailProps = {}) {
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
  const [activeChartKey, setActiveChartKey] = useState<DetailChartKey>("pnl");
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const crossNavSeries = useMemo(() => buildCrossNavSeries(), []);
  const detailChartOptions = useMemo<Array<{ key: DetailChartKey; label: string; valueLabel: string }>>(
    () => [
      { key: "pnl", label: "PNL", valueLabel: "PNL" },
      { key: "crossNav", label: tr("Cross-sectional NAV", "截面净值曲线"), valueLabel: tr("NAV", "净值") },
      { key: "cumIc", label: tr("Cumulative IC", "累计IC"), valueLabel: "IC" },
      { key: "icDecay", label: tr("IC Decay", "IC衰减"), valueLabel: tr("Decay", "衰减") },
      { key: "factorAutoCorr", label: tr("Factor Autocorrelation", "因子自相关性"), valueLabel: tr("Corr", "相关性") },
      { key: "groupCumReturn", label: tr("Group Cumulative Return", "分组累计收益率"), valueLabel: tr("Return", "收益") },
    ],
    [uiLang]
  );
  const activeChartOption = detailChartOptions.find((option) => option.key === activeChartKey) ?? detailChartOptions[0];

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
  const summaryPeriod: SummaryPeriod = "IS";
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const [expandedTestSections, setExpandedTestSections] = useState<Record<string, boolean>>({
    pass: true, fail: false, pending: false,
  });
  const [copiedExpression, setCopiedExpression] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  function showCopyToast(type: "success" | "error") {
    const isSuccess = type === "success";
    const Icon = isSuccess ? CheckCircle : XCircle;
    toast.custom(
      () => (
        <div className={`alpha-copy-toast alpha-copy-toast--${type}`}>
          <span className="alpha-copy-toast__icon" aria-hidden="true">
            <Icon size={18} strokeWidth={3} />
          </span>
          <div className="alpha-copy-toast__body">
            <div className="alpha-copy-toast__title">
              {isSuccess ? tr("Copied successfully", "复制成功") : tr("Copy failed", "复制失败")}
            </div>
            <div className="alpha-copy-toast__message">
              {isSuccess ? tr("Expression has been copied.", "表达式已复制。") : tr("Please try again.", "请稍后重试。")}
            </div>
          </div>
        </div>
      ),
      { duration: 1800 }
    );
  }

  async function handleCopyExpression() {
    try {
      await navigator.clipboard.writeText(factor.expression);
      setCopiedExpression(true);
      showCopyToast("success");
      window.setTimeout(() => setCopiedExpression(false), 1400);
    } catch {
      setCopiedExpression(false);
      showCopyToast("error");
    }
  }

  const grade = getAlphaGrade(factor.osSharpe);
  const displayGradeMap = {
    SS: "SSS",
    S: "SS",
    A: "S",
    B: "A",
    C: "B",
    D: "C",
    F: "D",
  } as const;
  const displayGrade = displayGradeMap[grade];
  const gradePlainLabel = {
    SSS: tr("Legendary", "顶级"),
    SS: tr("Legendary", "顶级"),
    S: tr("Excellent", "优秀"),
    A: tr("Good", "良好"),
    B: tr("Average", "一般"),
    C: tr("Needs Work", "需优化"),
    D: tr("Failed", "失败"),
  }[displayGrade];

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
    return pnlData.train.map((item) => ({ date: item.date, value: item.value }));
  }, [pnlData]);
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
  const formatSignedMetric = (value: string | number, signMode: "trend" | "risk") => {
    const parsed = parseMetric(value);
    const unsignedText = String(value).trim().replace(/^[+-]/, "");
    if (Number.isNaN(parsed) || parsed === 0) return unsignedText;
    if (signMode === "risk") return `-${unsignedText}`;
    return `${parsed > 0 ? "+" : "-"}${unsignedText}`;
  };
  const formatDiff = (value: number, unit = "") => `${value >= 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
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
    correlation: tr(
      "Lower correlation means the factor is less duplicated with existing signals. 0.55 is for reference.",
      "相关性越低代表与现有信号重复度越低，0.55 仅供参考。"
    ),
    margin: tr(
      `Lower margin use leaves more room for risk control. ${aggData.margin} is for reference.`,
      `保证金占用越低，风险空间越充足，${aggData.margin} 仅供参考。`
    ),
    grade: tr(
      `The grade summarizes overall quality. ${displayGrade} means ${gradePlainLabel}.`,
      `等级代表综合表现，${displayGrade} 表示${gradePlainLabel}。`
    ),
  };
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
      label: tr("Correlation", "相关性"),
      value: "0.55",
      color: undefined,
      desc: tr("Correlation", "相关性"),
      explanation: tr(
        "Lower correlation means the factor is less duplicated with existing signals. 0.55 is for reference.",
        "相关性越低代表与现有信号重复度越低，0.55 仅供参考。"
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
      <span className="text-base font-semibold text-foreground">{tr("Factor Details", "因子详情")}</span>
    </div>
  );
  const beginnerMetricCards = (
    <div className={`alpha-metric-grid grid gap-3 ${isOfficialLibraryView ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5"}`}>
      {beginnerMetrics.map((m) => (
        withPlainExplanation(
          m.explanation,
          <div key={m.label} className="alpha-metric-card text-center p-4 rounded-2xl bg-accent border border-border/60">
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
        <div className="alpha-metric-card text-center p-4 rounded-2xl bg-accent border border-border/60">
          <div className="label-upper mb-1 text-[9px]">{tr("GRADE", "等级")}</div>
          <div className="text-lg font-bold font-mono tabular-nums" style={{ color: "rgb(44, 33, 23)" }}>
            {displayGrade}
          </div>
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
    if (!plainExplainEnabled) return child;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{child}</TooltipTrigger>
        <TooltipContent side="top" className="alpha-detail-tooltip max-w-[220px] text-xs leading-5">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  }
  function renderMetricCard({
    label,
    value,
    valueClassName = "text-foreground",
    valueStyle,
  }: {
    label: ReactNode;
    value: ReactNode;
    valueClassName?: string;
    valueStyle?: CSSProperties;
  }) {
    return (
      <div className="alpha-metric-card relative isolate flex min-h-[60px] items-center justify-center overflow-hidden rounded-md bg-[rgb(255,247,227)] text-center">
        <div className="pointer-events-none absolute inset-0 rounded-md" aria-hidden="true" />
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-0">
          <div className="relative z-10 mb-1 text-[9px] text-muted-foreground">{label}</div>
          <div className={`relative z-20 text-lg font-bold font-mono tabular-nums ${valueClassName}`} style={valueStyle}>
            {value}
          </div>
        </div>
      </div>
    );
  }
  function renderChartCard(data: PnlChartPoint[], heightClass: string) {
    const chartData = activeChartKey === "icDecay" || activeChartKey === "factorAutoCorr" || activeChartKey === "groupCumReturn"
      ? data
      : buildDetailChartData(data, activeChartKey);
    const valueFormatter = activeChartKey === "pnl" || activeChartKey === "groupCumReturn"
      ? formatPnlValue
      : formatCompactChartValue;
    const returnAxisLabels: ChartAxisLabels = {
      y: tr("Cumulative Return", "累计收益"),
      x: tr("Time", "时间"),
    };
    const groupReturnAxisLabels: ChartAxisLabels = {
      y: tr("Log Cumulative Return", "对数累计收益"),
      x: tr("Time", "时间"),
    };
    const cumIcAxisLabels: ChartAxisLabels = {
      y: tr("Cumulative", "累计值"),
      rightY: "IC",
      x: tr("Time", "时间"),
    };
    const icDecayAxisLabels: ChartAxisLabels = {
      y: tr("Rolling IC Mean", "滚动 IC 均值"),
      x: tr("Lag (bars)", "滞后期（K线）"),
    };
    const autocorrAxisLabels: ChartAxisLabels = {
      y: "AR",
      x: tr("Lag", "滞后期"),
    };

    return (
      <div className="surface-card">
        <div className="px-6 py-4 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">{activeChartOption.label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" aria-label={tr("Chart selector", "图表选择器")}>
              {detailChartOptions.map((option) => {
                const isActive = activeChartKey === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-[#b88d4a] bg-[#fff3d3] text-[#2c2117]"
                        : "border-[#d7c39b] bg-[#f6efe0] text-[#6f5a43] hover:border-[#cdbb9f] hover:bg-[#fff8e8] hover:text-[#2c2117]"
                    }`}
                    aria-pressed={isActive}
                    onClick={() => setActiveChartKey(option.key)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div
          className={
            activeChartKey === "pnl"
              ? "px-6 pb-6 pr-[18px]"
              : activeChartKey === "crossNav"
              ? "px-6 pb-6"
              : activeChartKey === "cumIc" || activeChartKey === "icDecay" || activeChartKey === "factorAutoCorr" || activeChartKey === "groupCumReturn"
                ? "px-6 pb-6"
                : "px-6 pb-6 pr-[30px]"
          }
        >
          <div className={heightClass}>
            {activeChartKey === "crossNav" ? (
              <MultiLineReturnChart series={crossNavSeries} axisLabels={returnAxisLabels} />
            ) : activeChartKey === "cumIc" ? (
              <CumIcComparisonChart data={data} axisLabels={cumIcAxisLabels} />
            ) : activeChartKey === "icDecay" ? (
              <IcDecayChart data={data} axisLabels={icDecayAxisLabels} />
            ) : activeChartKey === "factorAutoCorr" ? (
              <FactorAutocorrChart data={data} axisLabels={autocorrAxisLabels} />
            ) : activeChartKey === "groupCumReturn" ? (
              <GroupCumReturnChart data={data} axisLabels={groupReturnAxisLabels} />
            ) : (
              <PnlLineChart
                data={chartData}
                upColor={chartColors.upHex}
                downColor={chartColors.downHex}
                valueLabel={activeChartOption.valueLabel}
                valueFormatter={valueFormatter}
                axisLabels={returnAxisLabels}
              />
            )}
          </div>
        </div>
      </div>
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
      {!hideHeader && (
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
      )}

      {/* ═══ BEGINNER MODE ═══ */}
      {viewMode === "beginner" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {beginnerIntroSection}

          {renderChartCard(beginnerPnlData, "h-[300px]")}


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
              <div className="mt-4 rounded-[8px] bg-[#fff7e3] px-5 py-4">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-sm font-bold text-[#2c2117]">{tr("Expression", "表达式")}</h3>
                </div>
                <div className="grid gap-2 pt-0">
                  {expressionProcessSteps.map((step) => (
                    <code
                      key={step}
                      className="block min-w-0 whitespace-normal break-words font-mono text-xs leading-5 text-[#dcc78f]"
                    >
                      {step}
                    </code>
                  ))}
                  <div className="mt-0 flex min-w-0 items-center gap-3 rounded-md bg-[#fff7e3] px-0 py-0">
                    <code className="min-w-0 flex-1 whitespace-normal break-words font-mono text-sm font-bold leading-6 text-[#725d42]">
                      {factor.expression}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyExpression}
                      className="h-8 shrink-0 !rounded-[8px] !border-0 !bg-[rgba(255,243,211,0.78)] !opacity-100 px-3 text-xs text-[#725d42] hover:!bg-[rgba(255,243,211,0.78)] hover:text-[#2c2117]"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {copiedExpression ? tr("Copied", "已复制") : tr("Copy", "复制")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              {/* Top row: Aggregate metric cards */}
              {summaryPeriod !== "DIFF" && (
              <div className={`alpha-metric-grid grid grid-cols-2 gap-3 sm:grid-cols-4 ${isOfficialLibraryView ? "md:grid-cols-7" : "md:grid-cols-8"}`}>
                {/* Sharpe card — color follows list view osSharpe rule */}
                {withPlainExplanation(
                  proMetricExplanations.sharpe,
                renderMetricCard({
                  label: tr("SHARPE", "夏普比率"),
                  value: typeof aggData.sharpe === "number" ? aggData.sharpe.toFixed(2) : aggData.sharpe,
                })
                )}
                {/* Returns */}
                {withPlainExplanation(
                  proMetricExplanations.returns,
                renderMetricCard({
                  label: tr("RETURNS", "收益"),
                  value: formatSignedMetric(aggData.returns, "trend"),
                  valueClassName: trendTextClass(aggData.returns),
                })
                )}
                {/* Drawdown */}
                {withPlainExplanation(
                  proMetricExplanations.drawdown,
                renderMetricCard({
                  label: tr("MAX DRAWDOWN", "最大回撤"),
                  value: formatSignedMetric(aggData.drawdown, "risk"),
                  valueClassName: drawdownTextClass(aggData.drawdown),
                })
                )}
                {/* Turnover */}
                {withPlainExplanation(
                  proMetricExplanations.turnover,
                renderMetricCard({
                  label: tr("TURNOVER", "换手率"),
                  value: aggData.turnover,
                })
                )}
                {/* Fitness — color follows list view fitness rule */}
                {withPlainExplanation(
                  proMetricExplanations.fitness,
                renderMetricCard({
                  label: tr("FITNESS", "适应度"),
                  value: typeof aggData.fitness === "number" ? aggData.fitness.toFixed(2) : aggData.fitness,
                })
                )}
                {/* Correlation */}
                {withPlainExplanation(
                  proMetricExplanations.correlation,
                renderMetricCard({
                  label: tr("CORRELATION", "相关性"),
                  value: "0.55",
                })
                )}
                {/* Margin */}
                {withPlainExplanation(
                  proMetricExplanations.margin,
                renderMetricCard({
                  label: tr("MARGIN", "保证金"),
                  value: aggData.margin,
                })
                )}
                {!isOfficialLibraryView && withPlainExplanation(
                  proMetricExplanations.grade,
                renderMetricCard({
                  label: tr("GRADE", "等级"),
                  value: displayGrade,
                  valueStyle: { color: "rgb(44, 33, 23)" },
                })
                )}
              </div>
              )}

            </div>
          </div>

          {/* ── SECTION 4: Charts ── */}
          {renderChartCard(proPnlData, "h-[400px]")}

          {/* ── SECTION 5: Test Status ── */}
          <div className="grid gap-8">
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
                                <span className="font-medium text-[#725d42]">{tr("Impact:", "影响：")}</span>
                                {structured.impact}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-[#725d42]">{tr("Suggestion:", "建议：")}</span>
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
                                <span className="font-medium text-[#725d42]">{tr("Impact:", "影响：")}</span>
                                {structured.impact}
                              </div>
                              <div className="text-muted-foreground">
                                <span className="font-medium text-[#725d42]">{tr("Suggestion:", "建议：")}</span>
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
