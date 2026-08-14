import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Chart } from "@antv/g2";

export type TradeTrendMetric = "return" | "pnl";
export type TradeTrendMetricKey = "returnValue" | "pnlValue";

export type TradeTrendPoint = {
  date: string;
  returnValue: number;
  pnlValue: number;
};

export function buildTradeTrendData({
  returnRate,
  pnl,
  updatedAt,
}: {
  returnRate: number;
  pnl: number;
  updatedAt: string;
}): TradeTrendPoint[] {
  const parsedDate = new Date(`${updatedAt.slice(0, 10)}T00:00:00`);
  const endDate = Number.isNaN(parsedDate.getTime()) ? new Date("2026-04-18T00:00:00") : parsedDate;

  return Array.from({ length: 365 }, (_, index) => {
    const progress = index / 364;
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - (364 - index));
    const wave = (
      Math.sin(progress * Math.PI * 7) * 0.75
      + Math.sin(progress * Math.PI * 19) * 0.25
    ) * Math.sin(progress * Math.PI);
    const drawdownEnvelope = Math.sin(progress * Math.PI) * ((1 - progress) ** 1.4);
    const returnValue = returnRate * progress
      + wave * Math.max(Math.abs(returnRate) * 0.14, 0.04)
      - drawdownEnvelope * Math.max(Math.abs(returnRate) * 0.75, 0.75);
    const pnlValue = pnl * progress
      + wave * Math.max(Math.abs(pnl) * 0.05, 8)
      - drawdownEnvelope * Math.max(Math.abs(pnl) * 0.75, 25);

    return {
      date: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-"),
      returnValue: Number(returnValue.toFixed(3)),
      pnlValue: Number(pnlValue.toFixed(2)),
    };
  });
}

function getNiceStep(rawStep: number, minimumStep: number) {
  const safeStep = Math.max(Math.abs(rawStep), minimumStep);
  const magnitude = 10 ** Math.floor(Math.log10(safeStep));
  const normalized = safeStep / magnitude;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return multiplier * magnitude;
}

function roundAxisValue(value: number, step: number) {
  const precision = Math.min(8, Math.max(0, Math.ceil(-Math.log10(step)) + 2));
  return Number(value.toFixed(precision));
}

function getTrendAxis(values: number[], minimumStep: number) {
  const finiteValues = values.filter(Number.isFinite);
  const dataMin = Math.min(0, ...finiteValues);
  const dataMax = Math.max(0, ...finiteValues);
  const step = getNiceStep((dataMax - dataMin) / 4, minimumStep);

  let domainMin = Math.floor(dataMin / step) * step;
  let domainMax = Math.ceil(dataMax / step) * step;
  if (domainMin === domainMax) {
    domainMin -= step * 2;
    domainMax += step * 2;
  }

  domainMin = roundAxisValue(domainMin, step);
  domainMax = roundAxisValue(domainMax, step);
  const intervalCount = Math.round((domainMax - domainMin) / step);
  const ticks = Array.from({ length: intervalCount + 1 }, (_, index) => (
    roundAxisValue(domainMin + index * step, step)
  ));

  return { domain: [domainMin, domainMax] as [number, number], ticks };
}

type TrendSeriesPoint = {
  date: Date;
  value: number;
  series: string;
};

type NavigatorCurvePoint = {
  x: number;
  y: number;
};

const NAVIGATOR_CURVE_HEIGHT = 10;
const NAVIGATOR_CURVE_INSET = 2;
const NAVIGATOR_CURVE_SPAN = NAVIGATOR_CURVE_HEIGHT - NAVIGATOR_CURVE_INSET * 2;
const NAVIGATOR_HEIGHT = 48;
const NAVIGATOR_TRACK_INSET = 6;

function formatTrendDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function formatTrendAxisDate(value: Date | number | string, pointCount: number) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return pointCount > 90 ? `${String(date.getFullYear()).slice(-2)}.${month}` : `${month}-${day}`;
}

function formatTrendValue(value: number, metric: TradeTrendMetric) {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: metric === "return" ? 2 : 0,
    maximumFractionDigits: metric === "return" ? 2 : 2,
  });
  return `${value > 0 ? "+" : ""}${formatted}${metric === "return" ? "%" : " USDT"}`;
}

function createNavigatorCurvePath(points: NavigatorCurvePoint[]) {
  if (points.length === 0) return "";
  const format = (value: number) => Number(value.toFixed(3));
  if (points.length === 1) return `M ${format(points[0].x)} ${format(points[0].y)}`;

  const segments = points.slice(0, -1).map((point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const firstControl = {
      x: point.x + (next.x - previous.x) / 6,
      y: point.y + (next.y - previous.y) / 6,
    };
    const secondControl = {
      x: next.x - (afterNext.x - point.x) / 6,
      y: next.y - (afterNext.y - point.y) / 6,
    };
    return `C ${format(firstControl.x)} ${format(firstControl.y)} ${format(secondControl.x)} ${format(secondControl.y)} ${format(next.x)} ${format(next.y)}`;
  });

  return `M ${format(points[0].x)} ${format(points[0].y)} ${segments.join(" ")}`;
}

function escapeTooltipText(value: unknown) {
  return String(value ?? "").replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
  })[character] ?? character);
}

function chartPalette(container: HTMLElement) {
  const isDark = document.documentElement.classList.contains("dark");
  const styles = window.getComputedStyle(container);
  const cssColor = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value && !value.startsWith("var(") ? value : fallback;
  };

  return {
    backtest: isDark ? "#aab0ba" : "#73777d",
    live: cssColor("--semantic-up", isDark ? "#42c99a" : "#10b981"),
    down: cssColor("--semantic-down", isDark ? "#ee7e78" : "#df625c"),
    axis: isDark ? "#949ba6" : "#858b94",
    grid: isDark ? "#30353c" : "#e8eaed",
    crosshair: isDark ? "#7c8591" : "#a7adb5",
    liveMarker: isDark ? "#f2a75d" : "#dc6a18",
    tooltipSurface: isDark ? "#292d33" : "#ffffff",
    tooltipBorder: isDark ? "#454c56" : "#e3e6ea",
    tooltipText: isDark ? "#f1f4f7" : "#20242a",
    tooltipMuted: isDark ? "#b8c0ca" : "#68717c",
    tooltipShadow: isDark ? "0 10px 24px rgba(0,0,0,.34)" : "0 10px 24px rgba(31,38,47,.12)",
  };
}

export function TradeTrendChart({
  data,
  metric,
  metricLabel,
  year,
  ariaLabel,
  showBacktestLive = false,
  backtestLabel = "Backtest",
  liveLabel = "Live",
  showBacktest = true,
  showLive = true,
  seriesSplitIndex,
  dataOffset = 0,
}: {
  data: TradeTrendPoint[];
  metric: TradeTrendMetric;
  metricLabel: string;
  year: string;
  ariaLabel: string;
  showBacktestLive?: boolean;
  backtestLabel?: string;
  liveLabel?: string;
  showBacktest?: boolean;
  showLive?: boolean;
  seriesSplitIndex?: number;
  dataOffset?: number;
}) {
  const metricKey: TradeTrendMetricKey = metric === "return" ? "returnValue" : "pnlValue";
  const values = data.map((row) => row[metricKey]);
  const axis = getTrendAxis(values, metric === "return" ? 0.1 : 10);
  const defaultSplitIndex = Math.max(1, Math.floor((data.length - 1) * 0.72));
  const globalSplitIndex = Math.max(0, Math.min(seriesSplitIndex ?? defaultSplitIndex, data.length - 1));
  const splitIndex = globalSplitIndex - dataOffset;
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length < 2) return;

    const palette = chartPalette(container);
    const finalValue = values.at(-1) ?? 0;
    const singleSeriesColor = finalValue >= 0 ? palette.live : palette.down;
    const splitDate = data[splitIndex] ? new Date(`${data[splitIndex].date}T00:00:00`) : undefined;
    const chartData = data.flatMap((row, index): TrendSeriesPoint[] => {
      const point = { date: new Date(`${row.date}T00:00:00`), value: row[metricKey] };
      if (!showBacktestLive) return [{ ...point, series: metricLabel }];
      const series: TrendSeriesPoint[] = [];
      const globalIndex = dataOffset + index;
      if (showBacktest && globalIndex <= globalSplitIndex) series.push({ ...point, series: backtestLabel });
      if (showLive && globalIndex >= globalSplitIndex) series.push({ ...point, series: liveLabel });
      return series;
    });
    const colorDomain = showBacktestLive ? [backtestLabel, liveLabel] : [metricLabel];
    const colorRange = showBacktestLive ? [palette.backtest, palette.live] : [singleSeriesColor];
    const chart = chartRef.current ?? new Chart({ container, autoFit: true });
    chartRef.current = chart;

    chart.options({
      type: "view",
      data: chartData,
      paddingLeft: 42,
      paddingRight: 12,
      paddingTop: 18,
      paddingBottom: 30,
      animate: false,
      legend: false,
      scale: {
        x: { type: "time" },
        y: { domain: axis.domain, nice: false },
        color: { domain: colorDomain, range: colorRange },
      },
      axis: {
        x: {
          title: false,
          tick: false,
          grid: false,
          labelFill: palette.axis,
          labelFontSize: 9,
          labelSpacing: 10,
          tickCount: data.length > 90 ? 6 : 5,
          labelFormatter: (value: Date | number | string) => formatTrendAxisDate(value, data.length),
        },
        y: {
          title: false,
          tick: false,
          grid: true,
          gridStroke: palette.grid,
          gridLineWidth: 1,
          gridLineDash: [3, 4],
          labelFill: palette.axis,
          labelFontSize: 9,
          labelSpacing: 8,
          tickCount: axis.ticks.length,
          labelFormatter: (value: number) => {
            if (value === 0) return metric === "return" ? "0%" : "0";
            return metric === "return"
              ? `${Number(value).toFixed(1)}%`
              : Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
          },
        },
      },
      interaction: {
        tooltip: {
          shared: true,
          crosshairs: true,
          crosshairsX: true,
          crosshairsY: false,
          crosshairsStroke: palette.crosshair,
          crosshairsLineDash: [4, 4],
          crosshairsLineWidth: 1,
          render: (_event: unknown, { title, items }: { title: string; items: Array<{ color?: unknown; name?: unknown; value?: unknown }> }) => {
            const rows = items.map((item) => {
              const series = item.name || metricLabel;
              const value = Number(item.value);
              return `<div style="display:grid;grid-template-columns:7px minmax(0,1fr) auto;align-items:center;gap:8px"><i style="display:block;width:7px;height:7px;border-radius:50%;background:${escapeTooltipText(item.color || singleSeriesColor)}"></i><span style="overflow:hidden;color:${palette.tooltipMuted};font-family:var(--font-body,ui-sans-serif,sans-serif);font-size:12px;font-weight:550;line-height:18px;letter-spacing:0;text-overflow:ellipsis;white-space:nowrap">${escapeTooltipText(series)}</span><strong style="color:${palette.tooltipText};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:650;font-variant-numeric:tabular-nums;line-height:18px;letter-spacing:0;white-space:nowrap">${escapeTooltipText(formatTrendValue(value, metric))}</strong></div>`;
            }).join("");
            return `<div style="display:grid;width:max-content;max-width:min(300px,calc(100vw - 32px));box-sizing:border-box;gap:8px;border:1px solid ${palette.tooltipBorder};border-radius:12px;background:${palette.tooltipSurface};padding:12px 14px;color:${palette.tooltipText};font-family:var(--font-body,ui-sans-serif,sans-serif);box-shadow:${palette.tooltipShadow}"><div style="color:${palette.tooltipText};font-size:12px;font-weight:650;line-height:18px;letter-spacing:0">${escapeTooltipText(title)}</div>${rows}</div>`;
          },
        },
      },
      children: [
        {
          type: "area",
          encode: { x: "date", y: "value", color: "series", shape: "smooth" },
          style: { fillOpacity: 0.075 },
          tooltip: false,
        },
        {
          type: "line",
          encode: { x: "date", y: "value", color: "series", shape: "smooth" },
          style: { lineWidth: 2.25 },
        },
        ...(showBacktestLive && showBacktest && showLive && splitDate ? [{
          type: "lineX" as const,
          data: [splitDate],
          style: { stroke: palette.liveMarker, strokeOpacity: 0.9, lineDash: [5, 5], lineWidth: 1.2 },
          labels: [{ text: () => liveLabel, position: "top", style: { fill: palette.liveMarker, fontSize: 10, fontWeight: 700 } }],
          tooltip: false,
        }] : []),
      ],
    });
    void chart.render();
  }, [axis.domain, axis.ticks.length, backtestLabel, data, dataOffset, globalSplitIndex, liveLabel, metric, metricKey, metricLabel, showBacktest, showBacktestLive, showLive, splitIndex, values]);

  useEffect(() => () => {
    chartRef.current?.destroy();
    chartRef.current = null;
  }, []);

  return (
    <div className="oq-trade-trend-body">
      <div
        ref={containerRef}
        className="oq-trade-trend-chart"
        role="img"
        aria-label={ariaLabel}
      />
    </div>
  );
}

function formatNavigatorDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year.slice(-2)}.${month}.${day}`;
}

function formatNavigatorMonth(value: string) {
  const [year, month] = value.split("-");
  return `${year.slice(-2)}.${month}`;
}

function formatNavigatorSliderDate(value: Date | number | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatNavigatorMonth([
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-"));
}

export function TradeTrendNavigator({
  data,
  metric = "return",
  startIndex,
  endIndex,
  onRangeChange,
  ariaLabel,
  showBacktest = true,
  showLive = true,
  seriesSplitIndex,
}: {
  data: TradeTrendPoint[];
  metric?: TradeTrendMetric;
  startIndex: number;
  endIndex: number;
  onRangeChange: (range: { startIndex: number; endIndex: number }) => void;
  ariaLabel: string;
  showBacktest?: boolean;
  showLive?: boolean;
  seriesSplitIndex?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const onRangeChangeRef = useRef(onRangeChange);
  const lastEmittedRef = useRef(`${startIndex}:${endIndex}`);
  const [isInteracting, setIsInteracting] = useState(false);
  const pointerInteractionRef = useRef<{
    pointerId: number;
    mode: "start" | "end" | "selection";
    initialRatio: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);
  const selectionStart = Math.max(0, Math.min(startIndex, data.length - 1));
  const selectionEnd = Math.max(selectionStart, Math.min(endIndex, data.length - 1));
  const visibleData = data.slice(selectionStart, selectionEnd + 1);
  const defaultSplitIndex = Math.max(1, Math.floor((data.length - 1) * 0.72));
  const globalSplitIndex = Math.max(0, Math.min(seriesSplitIndex ?? defaultSplitIndex, data.length - 1));
  const metricKey: TradeTrendMetricKey = metric === "return" ? "returnValue" : "pnlValue";
  const visibleAxis = getTrendAxis(visibleData.map((row) => row[metricKey]), metric === "return" ? 0.1 : 10);
  const [axisMin, axisMax] = visibleAxis.domain;
  const axisSpan = Math.max(axisMax - axisMin, Number.EPSILON);
  const navigatorCurvePoints = visibleData.map((row, index) => ({
    x: (index / Math.max(visibleData.length - 1, 1)) * 100,
    y: NAVIGATOR_CURVE_INSET + (1 - (row[metricKey] - axisMin) / axisSpan) * NAVIGATOR_CURVE_SPAN,
  }));
  const backtestPointCount = Math.max(0, Math.min(navigatorCurvePoints.length, globalSplitIndex - selectionStart + 1));
  const liveStartIndex = Math.max(0, Math.min(navigatorCurvePoints.length, globalSplitIndex - selectionStart));
  const backtestCurvePath = createNavigatorCurvePath(navigatorCurvePoints.slice(0, backtestPointCount));
  const liveCurvePath = createNavigatorCurvePath(navigatorCurvePoints.slice(liveStartIndex));

  const emitRangeChange = useCallback((range: { startIndex: number; endIndex: number }) => {
    const nextKey = `${range.startIndex}:${range.endIndex}`;
    if (nextKey === lastEmittedRef.current) return false;
    lastEmittedRef.current = nextKey;
    onRangeChangeRef.current(range);
    return true;
  }, []);

  const setSliderValues = useCallback((startRatio: number, endRatio: number) => {
    const slider = chartRef.current?.getContext().canvas?.document?.getElementsByClassName("slider")[0] as { setValues?: (values: [number, number]) => void } | undefined;
    slider?.setValues?.([startRatio, endRatio]);
  }, []);

  const getTrackRatio = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleNavigatorPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const denominator = Math.max(data.length - 1, 1);
    const ratio = getTrackRatio(event.clientX);
    const startRatio = selectionStart / denominator;
    const endRatio = selectionEnd / denominator;
    const distanceToStart = Math.abs(ratio - startRatio);
    const distanceToEnd = Math.abs(ratio - endRatio);
    const selectionIsFullRange = endRatio - startRatio >= 1 - 1 / denominator;
    const mode = selectionIsFullRange
      ? distanceToStart <= distanceToEnd ? "start" : "end"
      : ratio >= startRatio && ratio <= endRatio
        ? "selection"
        : distanceToStart <= distanceToEnd ? "start" : "end";

    pointerInteractionRef.current = {
      pointerId: event.pointerId,
      mode,
      initialRatio: ratio,
      initialStart: startRatio,
      initialEnd: endRatio,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsInteracting(true);
    event.preventDefault();
  };

  const handleNavigatorPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const interaction = pointerInteractionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const denominator = Math.max(data.length - 1, 1);
    const ratio = getTrackRatio(event.clientX);
    const delta = ratio - interaction.initialRatio;
    const span = interaction.initialEnd - interaction.initialStart;
    let nextStart = interaction.initialStart;
    let nextEnd = interaction.initialEnd;
    if (interaction.mode === "start") {
      nextStart = Math.max(0, Math.min(interaction.initialEnd - 1 / denominator, ratio));
    } else if (interaction.mode === "end") {
      nextEnd = Math.min(1, Math.max(interaction.initialStart + 1 / denominator, ratio));
    } else {
      nextStart = Math.max(0, Math.min(1 - span, interaction.initialStart + delta));
      nextEnd = nextStart + span;
    }
    setSliderValues(nextStart, nextEnd);
    emitRangeChange({
      startIndex: Math.round(nextStart * denominator),
      endIndex: Math.round(nextEnd * denominator),
    });
    event.preventDefault();
  };

  const handleNavigatorPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerInteractionRef.current?.pointerId === event.pointerId) {
      pointerInteractionRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      setIsInteracting(false);
    }
  };

  useEffect(() => {
    onRangeChangeRef.current = onRangeChange;
  }, [onRangeChange]);

  useEffect(() => {
    lastEmittedRef.current = `${selectionStart}:${selectionEnd}`;
    const chart = chartRef.current;
    if (!chart) return;
    const slider = chart.getContext().canvas?.document?.getElementsByClassName("slider")[0] as { setValues?: (values: [number, number]) => void } | undefined;
    slider?.setValues?.([
      selectionStart / Math.max(data.length - 1, 1),
      selectionEnd / Math.max(data.length - 1, 1),
    ]);
  }, [data.length, selectionEnd, selectionStart]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length < 2) return;
    const denominator = Math.max(data.length - 1, 1);
    const overviewData = data.map((row) => ({
      date: new Date(`${row.date}T00:00:00`),
      value: row[metric === "return" ? "returnValue" : "pnlValue"],
    }));
    const values = overviewData.map((row) => row.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const padding = Math.max((dataMax - dataMin) * 0.08, 0.02);
    const chart = new Chart({ container, autoFit: true, height: NAVIGATOR_HEIGHT });
    chartRef.current = chart;
    chart.on("sliderX:filter", (event: { data?: { selection?: [[Date | number, Date | number]] } }) => {
      const selection = event.data?.selection?.[0];
      if (!selection) return;
      const firstTime = overviewData[0].date.getTime();
      const lastTime = overviewData.at(-1)?.date.getTime() ?? firstTime;
      const timeSpan = Math.max(lastTime - firstTime, 1);
      const toRatio = (value: Date | number) => {
        if (value instanceof Date) return (value.getTime() - firstTime) / timeSpan;
        return value >= 0 && value <= 1 ? value : (value - firstTime) / timeSpan;
      };
      const minimumSpan = 1;
      const rawStart = Math.max(0, Math.min(denominator, Math.round(toRatio(selection[0]) * denominator)));
      const rawEnd = Math.max(0, Math.min(denominator, Math.round(toRatio(selection[1]) * denominator)));
      const nextStart = Math.min(rawStart, denominator - minimumSpan);
      const nextEnd = Math.max(rawEnd, nextStart + minimumSpan);
      emitRangeChange({ startIndex: nextStart, endIndex: nextEnd });
    });
    chart.options({
      type: "line",
      data: overviewData,
      padding: 0,
      paddingLeft: 6,
      paddingRight: 6,
      animate: false,
      axis: { x: false, y: false },
      legend: false,
      tooltip: false,
      scale: {
        x: { type: "time" },
        y: { domain: [dataMin - padding, dataMax + padding] },
      },
      encode: { x: "date", y: "value", shape: "smooth" },
      // Keep the time-series mark as the slider's data domain, but hide the overview line.
      style: { stroke: "transparent", lineWidth: 0, strokeOpacity: 0, fillOpacity: 0 },
      slider: {
        x: {
          position: "top",
          values: [selectionStart / denominator, selectionEnd / denominator],
          labelFormatter: (value: Date | number | string) => formatNavigatorSliderDate(value),
          showLabel: false,
          showLabelOnInteraction: false,
          style: {
            trackSize: 12,
            trackFill: "transparent",
            trackFillOpacity: 0,
            trackZIndex: 1,
            selectionFill: "transparent",
            selectionFillOpacity: 0,
            selectionZIndex: 2,
            sparklineColor: ["transparent"],
            sparklineLineLineWidth: 0,
            handleIconSize: 8,
            handleIconFill: "transparent",
            handleIconStroke: "transparent",
            handleIconStrokeOpacity: 0,
            handleIconLineWidth: 1,
            handleIconZIndex: 3,
            handleLabelFill: "#6f7782",
            handleLabelFillOpacity: 1,
            handleLabelFontSize: 10,
          },
        },
      },
      interaction: {
        sliderFilter: { wait: 16, leading: true, trailing: true },
      },
    });
    void chart.render().then(() => {
      const slider = chart.getContext().canvas?.document?.getElementsByClassName("slider")[0] as { addEventListener?: (event: string, handler: () => void) => void } | undefined;
      slider?.addEventListener?.("pointerdown", () => setIsInteracting(true));
      slider?.addEventListener?.("pointerup", () => setIsInteracting(false));
      slider?.addEventListener?.("pointercancel", () => setIsInteracting(false));
    });
    return () => {
      chartRef.current = null;
      chart.destroy();
    };
  }, [data, emitRangeChange, metric]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const chart = chartRef.current;
    if (!chart || data.length < 2) return;
    event.preventDefault();
    const slider = chart.getContext().canvas?.document?.getElementsByClassName("slider")[0] as { getValues?: () => [number, number]; setValues?: (values: [number, number]) => void } | undefined;
    const values = slider?.getValues?.();
    if (!values || !slider?.setValues) return;
    const sensitivity = 0.08;
    const minRange = 0.02;
    const range = Math.max(values[1] - values[0], minRange);
    const delta = Math.min(0.45, Math.max(minRange, Math.abs(event.deltaY) / 100 * sensitivity));
    const nextRange = Math.max(minRange, Math.min(1, range + (event.deltaY > 0 ? delta : -delta)));
    const center = (values[0] + values[1]) / 2;
    const nextStartRatio = Math.max(0, Math.min(1 - nextRange, center - nextRange / 2));
    const nextEndRatio = Math.min(1, nextStartRatio + nextRange);
    slider.setValues([nextStartRatio, nextEndRatio]);
    const denominator = Math.max(data.length - 1, 1);
    const rawStart = Math.round(nextStartRatio * denominator);
    const rawEnd = Math.round(nextEndRatio * denominator);
    const startIndex = Math.min(rawStart, denominator - 1);
    emitRangeChange({ startIndex, endIndex: Math.max(rawEnd, startIndex + 1) });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const span = selectionEnd - selectionStart;
    const step = event.shiftKey ? 7 : 1;
    let offset = 0;
    if (event.key === "ArrowLeft") offset = -step;
    else if (event.key === "ArrowRight") offset = step;
    else if (event.key === "PageUp") offset = -Math.max(7, span);
    else if (event.key === "PageDown") offset = Math.max(7, span);
    else if (event.key === "Home") offset = -data.length;
    else if (event.key === "End") offset = data.length;
    else return;
    event.preventDefault();
    const nextStart = Math.max(0, Math.min(selectionStart + offset, data.length - 1 - span));
    emitRangeChange({ startIndex: nextStart, endIndex: nextStart + span });
  };

  return (
    <div
      className={`oq-trade-trend-navigator${isInteracting ? " is-dragging" : ""}`}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={Math.max(data.length - 1, 1)}
      aria-valuenow={selectionEnd}
      aria-valuetext={`${data[selectionStart] ? formatNavigatorDate(data[selectionStart].date) : "--"} - ${data[selectionEnd] ? formatNavigatorDate(data[selectionEnd].date) : "--"}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      onPointerUp={() => setIsInteracting(false)}
      onPointerCancel={() => setIsInteracting(false)}
    >
      <div className="oq-trade-trend-navigator-track" aria-hidden="true" ref={trackRef}>
        <div
          className="oq-trade-trend-navigator-selection"
          style={{
            left: `${(selectionStart / Math.max(data.length - 1, 1)) * 100}%`,
            width: `${((selectionEnd - selectionStart) / Math.max(data.length - 1, 1)) * 100}%`,
          }}
        />
        <span
          className="oq-trade-trend-navigator-handle is-start"
          style={{ left: `${(selectionStart / Math.max(data.length - 1, 1)) * 100}%` }}
        />
        <span
          className="oq-trade-trend-navigator-handle is-end"
          style={{ left: `${(selectionEnd / Math.max(data.length - 1, 1)) * 100}%` }}
        />
      </div>
      <div ref={containerRef} className="oq-trade-trend-navigator-chart" aria-hidden="true" />
      <div
        className="oq-trade-trend-navigator-interaction"
        aria-hidden="true"
        onPointerDown={handleNavigatorPointerDown}
        onPointerMove={handleNavigatorPointerMove}
        onPointerUp={handleNavigatorPointerEnd}
        onPointerCancel={handleNavigatorPointerEnd}
      />
      <svg
        className="oq-trade-trend-navigator-curve"
        viewBox={`0 0 100 ${NAVIGATOR_CURVE_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {showBacktest && backtestCurvePath && <path d={backtestCurvePath} className="is-backtest" />}
        {showLive && liveCurvePath && <path d={liveCurvePath} className="is-live" />}
      </svg>
    </div>
  );
}
