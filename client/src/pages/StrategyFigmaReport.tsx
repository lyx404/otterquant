import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import "./StrategyFigmaReport.css";

type MetricTone = "good" | "warn" | "muted";
type ChartSeriesKey = "net" | "gross" | "drawdown";

export type ReportMetric = { label: string; value: string; tone: MetricTone };

export type ReportPositionRecord = {
  symbol: string;
  side: "Cross Long" | "Cross Short";
  entry: string;
  interest: string;
  opened: string;
  closed: string;
  pnl: string;
};

const defaultHeaderMetrics: ReportMetric[] = [
  { label: "Sharpe", value: "2.054", tone: "good" },
  { label: "IC", value: "—", tone: "muted" },
  { label: "Max DD", value: "20.8%", tone: "warn" },
  { label: "Calmar", value: "4.800", tone: "good" },
  { label: "Hit Rate", value: "—", tone: "muted" },
  { label: "Turnover", value: "1.231", tone: "muted" },
];

const navMetrics: Array<[string, string]> = [
  ["fee_rate (backtest param)", "0.0005"],
  ["Annual (net)", "0.996769"],
  ["Sharpe (net)", "2.05374"],
  ["MDD", "0.207646"],
  ["Annual (gross)", "2.16376"],
  ["Sharpe (gross)", "3.41495"],
  ["Turnover (avg/bar)", "1.23103"],
  ["Turnover cost (cum, ret)", "1.00082"],
  ["total_funding_ret", "0"],
  ["n_periods", "1626"],
];

const exposureRows = [
  "Meme",
  "Internet of Things (IOT)",
  "Avalanche Ecosystem",
  "UNKNOWN",
  "Near Protocol Ecosystem",
  "Fantom Ecosystem",
  "Automated Market Maker (AMM)",
  "Entertainment",
  "Huobi ECO Chain Ecosystem",
  "Cosmos Ecosystem",
  "Bridged-Tokens",
  "Cross-chain Communication",
  "Masternodes",
  "Linea Ecosystem",
  "Infrastructure",
  "Storage",
  "Gaming (GameFi)",
  "Artificial Intelligence (AI)",
  "Decentralized Exchange (DEX)",
  "Crypto-Backed Tokens",
  "Solana Ecosystem",
  "BNB Chain Ecosystem",
  "Decentralized Finance (DeFi)",
  "Smart Contract Platform",
].map((label, index, rows) => {
  const progress = index / (rows.length - 1);
  return {
    label,
    long: 0.38 + progress * 0.52 + (index % 5) * 0.02,
    short: 0.32 + progress * 0.44 + (index % 7) * 0.018,
  };
});

const sectorRankRows: Array<[string, number]> = [
  ["Gaming (GameFi)", -0.23],
  ["NFT", -0.17],
  ["Automated Market Maker (AMM)", -0.02],
  ["GMT", 0.01],
  ["Huobi ECO Chain Ecosystem", 0.02],
  ["Fantom Ecosystem", 0.04],
  ["Solana Ecosystem", 0.05],
  ["Linea Ecosystem", 0.06],
  ["Cosmos Ecosystem", 0.07],
  ["Avalanche Ecosystem", 0.08],
  ["IoT", 0.09],
  ["Masternodes", 0.1],
  ["Bridged-Tokens", 0.11],
  ["Internet of Things (IOT)", 0.12],
  ["UNKNOWN", 0.13],
  ["Cross-chain Communication", 0.15],
  ["Crypto-Backed Tokens", 0.17],
  ["Decentralized Finance (DeFi)", 0.3],
  ["Decentralized Exchange (DEX)", 0.33],
  ["Smart Contract Platform", 0.55],
];

const defaultPositions: ReportPositionRecord[] = [
  { symbol: "FILUSDT", side: "Cross Short", entry: "0.885", interest: "451.4 FIL", opened: "2026-02-10 22:17:26", closed: "2026-02-10 23:08:11", pnl: "+1.35 USDT" },
  { symbol: "ICPUSDT", side: "Cross Long", entry: "2.375", interest: "168 ICP", opened: "2026-02-10 22:17:26", closed: "2026-02-10 23:08:08", pnl: "+2.52 USDT" },
  { symbol: "DOTUSDT", side: "Cross Short", entry: "1.278", interest: "312.8 DOT", opened: "2026-02-10 18:02:43", closed: "2026-02-10 21:44:43", pnl: "-2.50 USDT" },
  { symbol: "KSMUSDT", side: "Cross Long", entry: "4.153", interest: "96.3 KSM", opened: "2026-02-11 04:32:33", closed: "2026-02-11 11:54:24", pnl: "+2.82 USDT" },
];

const linePalette = ["#ebbc47", "#479ef5", "#29d668", "#e44444", "#b36af5", "#12c8b1", "#ff7a1a", "#d946ef"];
const portfolioSeriesMeta: Record<ChartSeriesKey, { label: string; color: string; mark?: "bar" | "cross" }> = {
  net: { label: "Net NAV", color: "#dc4900" },
  gross: { label: "Gross NAV", color: "#2a6fdb" },
  drawdown: { label: "Drawdown", color: "#d64550" },
};

function makeSeries(count: number, seed: number, drift = 0.7, amp = 0.2) {
  return Array.from({ length: count }, (_, index) => {
    const x = index / Math.max(1, count - 1);
    const wave = Math.sin(index * (0.27 + seed * 0.015)) * amp;
    const wobble = Math.cos(index * (0.13 + seed * 0.01)) * amp * 0.4;
    return 0.7 + x * drift + wave + wobble + seed * 0.015;
  });
}

function toPath(values: number[], width: number, height: number, padding = 18) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(1, values.length - 1)) * innerWidth;
      const y = height - padding - ((value - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function toPoints(values: number[], width: number, height: number, padding = 18) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values.map((value, index) => ({
    x: padding + (index / Math.max(1, values.length - 1)) * innerWidth,
    y: height - padding - ((value - min) / range) * innerHeight,
    value,
  }));
}

function formatChartValue(value: number, unit: "nav" | "percent" | "score" = "score") {
  if (!Number.isFinite(value)) return "N/A";
  if (unit === "percent") return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  if (unit === "nav") return value.toFixed(2);
  return value.toFixed(3);
}

function formatPortfolioPeriod(index: number, total: number) {
  const start = new Date(Date.UTC(2021, 0, 1));
  const monthOffset = Math.round((index / Math.max(1, total - 1)) * 17);
  start.setUTCMonth(start.getUTCMonth() + monthOffset);
  return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatCompactAxisValue(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return `${Math.round(value)}`;
}

function toPathFromPoints(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function ChartEmptyState({ message = "No chart data available" }: { message?: string }) {
  return (
    <div className="oq-chart-empty" role="status">
      <strong>{message}</strong>
      <span>Check filters or choose another period.</span>
    </div>
  );
}

function InlineChartTooltip({
  title,
  xValue,
  yValue,
  unit,
}: {
  title: string;
  xValue: string;
  yValue: string;
  unit: string;
}) {
  return (
    <div className="oq-chart-inline-tooltip" role="status">
      <span>{title}</span>
      <small>{xValue}</small>
      <strong>{yValue}</strong>
      <em>{unit}</em>
    </div>
  );
}

function DenseChartTooltip({
  xValue,
  unit,
  rows,
}: {
  xValue: string;
  unit: string;
  rows: Array<{ label: string; value: string; color: string; active?: boolean }>;
}) {
  return (
    <div className="oq-dense-tooltip-card" role="status">
      <div className="oq-dense-tooltip-head">
        <span>{xValue}</span>
        <em>{unit}</em>
      </div>
      <div className="oq-dense-tooltip-list">
        {rows.map((row) => (
          <div className="oq-dense-tooltip-row" data-active={row.active} key={row.label}>
            <span className="oq-dense-tooltip-label">
              <i style={{ background: row.color }} />
              <span>{row.label}</span>
            </span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`oq-report-card ${className}`}>
      <header className="oq-report-card-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      <div className="oq-report-card-body">{children}</div>
    </section>
  );
}

function LegendItem({
  color,
  label,
  mark = "bar",
  active = true,
  pressed,
  onFocus,
  onHover,
  onLeave,
  onToggle,
}: {
  color: string;
  label: string;
  mark?: "bar" | "cross";
  active?: boolean;
  pressed?: boolean;
  onFocus?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  onToggle?: () => void;
}) {
  const content = (
    <>
      <span className={mark === "cross" ? "oq-report-cross-mark" : "oq-report-legend-dot"} style={{ color, background: mark === "bar" ? color : undefined }}>
        {mark === "cross" ? "×" : null}
      </span>
      {label}
    </>
  );

  if (onToggle || onHover || onFocus) {
    return (
      <button
        type="button"
        className="oq-report-legend-item is-interactive"
        aria-pressed={pressed}
        data-active={active}
        onClick={onToggle}
        onFocus={onFocus}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        onBlur={onLeave}
      >
        {content}
      </button>
    );
  }

  return (
    <span className="oq-report-legend-item" data-active={active}>
      {content}
    </span>
  );
}

function PortfolioNavChart() {
  const net = makeSeries(92, 1, 1.55, 0.08);
  const gross = makeSeries(92, 3, 2.25, 0.11);
  const drawdown = makeSeries(92, 7, -0.22, 0.24).map((value, index) => -Math.abs(value - 0.78 + Math.sin(index * 0.42) * 0.16));
  const [highlightedSeries, setHighlightedSeries] = useState<ChartSeriesKey | null>(null);
  const [visibleSeries, setVisibleSeries] = useState<Set<ChartSeriesKey>>(() => new Set(["net", "gross", "drawdown"]));
  const [activePoint, setActivePoint] = useState<{
    x: number;
    y: number;
    label: string;
    xValue: string;
    value: string;
    unit: string;
    color: string;
  } | null>(null);
  const chartStackRef = useRef<HTMLDivElement>(null);
  const grossPoints = toPoints(gross, 760, 238, 30).map((point) => ({ ...point, x: point.x + 296, y: point.y + 16 }));
  const netPoints = toPoints(net, 760, 238, 30).map((point) => ({ ...point, x: point.x + 296, y: point.y + 16 }));
  const drawdownPoints = toPoints(drawdown, 760, 150, 18).map((point) => ({ ...point, x: point.x + 296, y: point.y + 298 }));
  const isVisible = (key: ChartSeriesKey) => visibleSeries.has(key);
  const seriesPoints = {
    net: netPoints,
    gross: grossPoints,
    drawdown: drawdownPoints,
  };
  const toggleSeries = (key: ChartSeriesKey) => {
    setHighlightedSeries(null);
    setActivePoint(null);
    setVisibleSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next.size > 0 ? next : current;
    });
  };
  const seriesClass = (key: ChartSeriesKey, baseClass: string) => {
    const isMuted = highlightedSeries !== null && highlightedSeries !== key;
    return `${baseClass} oq-chart-series ${isMuted ? "is-muted" : ""} ${highlightedSeries === key ? "is-highlighted" : ""}`;
  };
  const clearInteraction = () => {
    setHighlightedSeries(null);
    setActivePoint(null);
  };
  useEffect(() => {
    if (highlightedSeries === null && activePoint === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartStackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) clearInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [highlightedSeries, activePoint]);
  const showTooltipForPoint = (
    key: ChartSeriesKey,
    index: number,
    point: { x: number; y: number; value: number }
  ) => {
    const isDrawdown = key === "drawdown";
    setHighlightedSeries(key);
    setActivePoint({
      x: point.x,
      y: point.y,
      label: portfolioSeriesMeta[key].label,
      xValue: formatPortfolioPeriod(index, netPoints.length),
      value: formatChartValue(point.value, isDrawdown ? "percent" : "nav"),
      unit: isDrawdown ? "return" : "NAV",
      color: portfolioSeriesMeta[key].color,
    });
  };
  const showNearestTooltip = (event: PointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const pointer = svgPoint.matrixTransform(matrix.inverse());
    const candidates = (Object.keys(seriesPoints) as ChartSeriesKey[])
      .filter(isVisible)
      .flatMap((key) =>
        seriesPoints[key].map((point, index) => ({
          key,
          index,
          point,
          distance: Math.abs(point.x - pointer.x) * 0.7 + Math.abs(point.y - pointer.y),
        }))
      );
    if (candidates.length === 0) return;
    const nearest = candidates.slice(1).reduce((best, item) => (item.distance < best.distance ? item : best), candidates[0]);
    showTooltipForPoint(nearest.key, nearest.index, nearest.point);
  };
  if (net.length === 0 || gross.length === 0 || drawdown.length === 0) return <ChartEmptyState />;

  return (
    <div ref={chartStackRef} className="oq-chart-stack">
      <div className="oq-chart-toolbar">
        <div className="oq-report-legend" aria-label="Portfolio chart series">
          {(Object.keys(portfolioSeriesMeta) as ChartSeriesKey[]).map((key) => (
            <LegendItem
              key={key}
              color={portfolioSeriesMeta[key].color}
              label={portfolioSeriesMeta[key].label}
              active={isVisible(key)}
              pressed={isVisible(key)}
              onFocus={() => setHighlightedSeries(key)}
              onHover={() => setHighlightedSeries(key)}
              onLeave={() => setHighlightedSeries(null)}
              onToggle={() => toggleSeries(key)}
            />
          ))}
        </div>
      </div>
      <div className="oq-nav-chart" onMouseLeave={clearInteraction} onPointerLeave={clearInteraction}>
        <svg viewBox="240 0 880 486" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Portfolio net NAV, gross NAV and drawdown over time">
          <g className="oq-chart-grid" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((line) => (
              <line key={line} x1="326" x2="1054" y1={48 + line * 54} y2={48 + line * 54} />
            ))}
            {[0, 1, 2].map((line) => (
              <line key={`dd-${line}`} x1="326" x2="1054" y1={314 + line * 46} y2={314 + line * 46} />
            ))}
          </g>
          {isVisible("gross") ? <path d={toPath(gross, 760, 238, 30)} transform="translate(296 16)" className={seriesClass("gross", "oq-line-blue")} /> : null}
          {isVisible("net") ? <path d={toPath(net, 760, 238, 30)} transform="translate(296 16)" className={seriesClass("net", "oq-line-gold")} /> : null}
          {isVisible("drawdown") ? <path d={toPath(drawdown, 760, 150, 18)} transform="translate(296 298)" className={seriesClass("drawdown", "oq-line-drawdown")} /> : null}
          <g className="oq-chart-axis" aria-hidden="true">
            <text x="286" y="50">3.57</text>
            <text x="286" y="104">2.88</text>
            <text x="286" y="158">2.20</text>
            <text x="286" y="212">1.51</text>
            <text x="286" y="266">0.82</text>
            <text x="286" y="314">0%</text>
            <text x="276" y="360">-10%</text>
            <text x="276" y="406">-20%</text>
            <text x="308" y="470">2021-01</text>
            <text x="456" y="470">2021-04</text>
            <text x="606" y="470">2021-07</text>
            <text x="756" y="470">2021-10</text>
            <text x="906" y="470">2022-03</text>
            <text x="1046" y="470">2022-06</text>
            <text x="326" y="294">Drawdown · worst -20.99%</text>
          </g>
          <rect
            className="oq-chart-hit-area"
            x="326"
            y="40"
            width="728"
            height="418"
            onPointerMove={showNearestTooltip}
            onPointerEnter={showNearestTooltip}
            onPointerLeave={clearInteraction}
          />
          {activePoint ? (
            <circle
              className="oq-chart-active-marker"
              cx={activePoint.x}
              cy={activePoint.y}
              r="7"
              style={{ color: activePoint.color }}
              aria-hidden="true"
            />
          ) : null}
        </svg>
        {activePoint ? (
          <div
            className={`oq-chart-tooltip ${activePoint.y < 130 ? "is-below" : ""}`}
            style={{
              left: `clamp(104px, ${((activePoint.x - 240) / 880) * 100}%, calc(100% - 104px))`,
              top: `clamp(58px, ${(activePoint.y / 486) * 100}%, calc(100% - 16px))`,
              borderColor: activePoint.color,
            }}
            role="status"
          >
            <span>{activePoint.label}</span>
            <small>{activePoint.xValue}</small>
            <strong>{activePoint.value}</strong>
            <em>{activePoint.unit}</em>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MetricsTable({ rows = navMetrics }: { rows?: Array<[string, string]> }) {
  if (rows.length === 0) return <ChartEmptyState message="No metrics available" />;

  return (
    <div className="oq-report-metrics-table" role="table" aria-label="Portfolio metrics">
      <div className="oq-report-table-row is-head">
        <span>Metric</span>
        <span>Value</span>
      </div>
      {rows.map(([metric, value]) => (
        <div className="oq-report-table-row" key={metric}>
          <span>{metric}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ExposureChart() {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const activeRow = exposureRows.find((row) => row.label === activeLabel) ?? null;
  const clearInteraction = () => {
    setActiveLabel(null);
    setTooltipPoint(null);
  };
  const setTooltipFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const shouldFlip = localX > rect.width - 244 || event.clientX > window.innerWidth - 244;
    setTooltipPoint({
      x: shouldFlip ? localX - 234 : localX + 14,
      y: event.clientY - rect.top + 14,
    });
  };
  const setTooltipFromRow = (rowElement: HTMLElement) => {
    const chartRect = chartRef.current?.getBoundingClientRect();
    const rowRect = rowElement.getBoundingClientRect();
    if (!chartRect) return;
    setTooltipPoint({
      x: rowRect.right - chartRect.left - 234,
      y: rowRect.top - chartRect.top + rowRect.height / 2 + 10,
    });
  };
  useEffect(() => {
    if (activeLabel === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) clearInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeLabel]);
  if (exposureRows.length === 0) return <ChartEmptyState message="No exposure data available" />;

  return (
    <div ref={chartRef} className="oq-exposure-chart">
      <div className="oq-chart-toolbar is-subtle">
        <div className="oq-report-legend">
          <LegendItem color="#1f8a5b" label="Long" />
          <LegendItem color="#d64550" label="Short" />
        </div>
      </div>
      <div className="oq-exposure-axis">
        <span>-0.15</span><span>-0.07</span><span>0.00</span><span>0.07</span><span>0.15</span>
      </div>
      {exposureRows.map((row) => (
        <div
          className="oq-exposure-row"
          data-active={activeLabel === row.label}
          key={row.label}
          tabIndex={0}
          role="img"
          aria-label={`${row.label}: long ${formatChartValue(row.long, "score")}, short ${formatChartValue(row.short, "score")}`}
          onMouseDown={(event) => event.preventDefault()}
          onFocus={(event) => {
            setActiveLabel(row.label);
            setTooltipFromRow(event.currentTarget);
          }}
          onBlur={clearInteraction}
          onMouseLeave={clearInteraction}
          onPointerEnter={(event) => {
            setActiveLabel(row.label);
            setTooltipFromPointer(event);
          }}
          onPointerMove={(event) => {
            setActiveLabel(row.label);
            setTooltipFromPointer(event);
          }}
          onPointerLeave={clearInteraction}
        >
          <span title={row.label}>{row.label}</span>
          <i style={{ width: `${row.short * 42}%` }} />
          <b style={{ width: `${row.long * 42}%` }} />
        </div>
      ))}
      {activeRow && tooltipPoint ? (
        <div
          className="oq-bar-floating-tooltip"
          style={{
            left: `clamp(12px, ${tooltipPoint.x}px, calc(100% - 232px))`,
            top: `clamp(46px, ${tooltipPoint.y}px, calc(100% - 98px))`,
          }}
        >
          <InlineChartTooltip
            title={activeRow.label}
            xValue="Average sector exposure"
            yValue={`Long ${formatChartValue(activeRow.long)} · Short ${formatChartValue(activeRow.short)}`}
            unit="abs weight"
          />
        </div>
      ) : null}
    </div>
  );
}

function SectorRankChart() {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const activeRankRow = sectorRankRows.find(([label]) => label === activeLabel) ?? null;
  const clearInteraction = () => {
    setActiveLabel(null);
    setTooltipPoint(null);
  };
  const setTooltipFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const shouldFlip = localX > rect.width - 244 || event.clientX > window.innerWidth - 244;
    setTooltipPoint({
      x: shouldFlip ? localX - 234 : localX + 14,
      y: event.clientY - rect.top + 14,
    });
  };
  const setTooltipFromRow = (rowElement: HTMLElement) => {
    const chartRect = chartRef.current?.getBoundingClientRect();
    const rowRect = rowElement.getBoundingClientRect();
    if (!chartRect) return;
    setTooltipPoint({
      x: rowRect.right - chartRect.left - 234,
      y: rowRect.top - chartRect.top + rowRect.height / 2 + 10,
    });
  };
  useEffect(() => {
    if (activeLabel === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) clearInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeLabel]);
  if (sectorRankRows.length === 0) return <ChartEmptyState message="No sector rank data available" />;

  return (
    <div ref={chartRef} className="oq-rank-chart">
      <div className="oq-chart-toolbar is-subtle">
        <div className="oq-report-legend">
          <LegendItem color="#1f8a5b" label="Positive contribution" />
          <LegendItem color="#d64550" label="Negative contribution" />
        </div>
      </div>
      <div className="oq-rank-axis"><span>-0.23</span><span>0.00</span><span>0.29</span><span>0.55</span></div>
      {sectorRankRows.map(([label, value]) => (
        <div
          className="oq-rank-row"
          data-active={activeLabel === label}
          key={label}
          tabIndex={0}
          role="img"
          aria-label={`${label}: ${formatChartValue(value, "score")}`}
          onMouseDown={(event) => event.preventDefault()}
          onFocus={(event) => {
            setActiveLabel(label);
            setTooltipFromRow(event.currentTarget);
          }}
          onBlur={clearInteraction}
          onMouseLeave={clearInteraction}
          onPointerEnter={(event) => {
            setActiveLabel(label);
            setTooltipFromPointer(event);
          }}
          onPointerMove={(event) => {
            setActiveLabel(label);
            setTooltipFromPointer(event);
          }}
          onPointerLeave={clearInteraction}
        >
          <span title={label}>{label}</span>
          <b className={value < 0 ? "is-negative" : ""} style={{ width: `${Math.max(3, Math.abs(value) * 118)}%` }} />
        </div>
      ))}
      {activeRankRow && tooltipPoint ? (
        <div
          className="oq-bar-floating-tooltip"
          style={{
            left: `clamp(12px, ${tooltipPoint.x}px, calc(100% - 232px))`,
            top: `clamp(46px, ${tooltipPoint.y}px, calc(100% - 98px))`,
          }}
        >
          <InlineChartTooltip
            title={activeRankRow[0]}
            xValue="Sector return rank"
            yValue={formatChartValue(activeRankRow[1])}
            unit="pnl contribution"
          />
        </div>
      ) : null}
    </div>
  );
}

function DenseLines({ count = 42, height = 260, compact = false }: { count?: number; height?: number; compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<{ x: number; y: number } | null>(null);
  const [activePoint, setActivePoint] = useState<{ pointIndex: number; value: number; xValue: string } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const renderCount = compact ? Math.min(count, 8) : Math.min(count, count > 20 ? 18 : count);
  const isSmallMultiple = compact || count <= 12;
  const viewBox = { width: isSmallMultiple ? 720 : 1000, height };
  const margin = compact
    ? { top: 22, right: 36, bottom: 42, left: 64 }
    : isSmallMultiple
      ? { top: 36, right: 44, bottom: 52, left: 68 }
      : { top: 44, right: 48, bottom: 56, left: 72 };
  const plotWidth = viewBox.width - margin.left - margin.right;
  const plotHeight = viewBox.height - margin.top - margin.bottom;
  const yMax = compact ? 18000 : 30000;
  const yTicks = compact ? [0, 9000, 18000] : [0, 10000, 20000, 30000];
  const denseSeries = Array.from({ length: renderCount }, (_, index) => {
    const values = makeSeries(70, index, 0.08 - (index % 7) * 0.035, 0.08 + (index % 4) * 0.03)
      .map((value, valueIndex) => {
        const trend = valueIndex / 69;
        return Math.max(0, Math.min(yMax, value * (compact ? 8200 : 12200) + trend * (compact ? 2400 : 5200) + index * (compact ? 160 : 260)));
      });
    const points = values.map((value, pointIndex) => ({
      x: margin.left + (pointIndex / Math.max(1, values.length - 1)) * plotWidth,
      y: margin.top + plotHeight - (value / yMax) * plotHeight,
      value,
    }));
    return {
      index,
      path: toPathFromPoints(points),
      points,
      value: values.at(-1),
      color: linePalette[index % linePalette.length],
    };
  });
  const tooltipRows = activeIndex !== null && activePoint
    ? denseSeries
      .map((series) => ({
        label: `Series ${series.index + 1}`,
        value: formatCompactAxisValue(series.points[activePoint.pointIndex]?.value ?? 0),
        color: series.color,
        active: series.index === activeIndex,
        sortDistance: series.index === activeIndex ? -1 : Math.abs(series.index - activeIndex),
      }))
      .sort((left, right) => left.sortDistance - right.sortDistance)
      .slice(0, compact ? 4 : 6)
    : [];
  const clearDenseInteraction = () => {
    setActiveIndex(null);
    setTooltipPoint(null);
    setActivePoint(null);
  };
  useEffect(() => {
    if (activeIndex === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) clearDenseInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeIndex]);
  const showDenseTooltip = (index: number, pointIndex: number, value: number, event: PointerEvent<SVGElement>) => {
    const chart = event.currentTarget.closest(".oq-dense-chart");
    const rect = chart?.getBoundingClientRect();
    setActiveIndex(index);
    setActivePoint({
      pointIndex,
      value,
      xValue: formatPortfolioPeriod(pointIndex, 70),
    });
    if (!rect) return;
    setTooltipPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };
  const showNearestDenseTooltip = (event: PointerEvent<SVGElement>) => {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const pointer = svgPoint.matrixTransform(matrix.inverse());
    const candidates = denseSeries.flatMap((series) =>
      series.points.map((point, pointIndex) => ({
        index: series.index,
        pointIndex,
        value: point.value,
        distance: Math.abs(point.x - pointer.x) * 0.72 + Math.abs(point.y - pointer.y),
      }))
    );
    const nearest = candidates.slice(1).reduce((best, item) => (item.distance < best.distance ? item : best), candidates[0]);
    showDenseTooltip(nearest.index, nearest.pointIndex, nearest.value, event);
  };
  const showDenseFocusTooltip = (series: (typeof denseSeries)[number]) => {
    const lastPoint = series.points.at(-1);
    if (!lastPoint) return;
    const rect = chartRef.current?.getBoundingClientRect();
    setActiveIndex(series.index);
    setActivePoint({
      pointIndex: series.points.length - 1,
      value: lastPoint.value,
      xValue: formatPortfolioPeriod(series.points.length - 1, 70),
    });
    if (rect) {
      setTooltipPoint({
        x: (lastPoint.x / viewBox.width) * rect.width,
        y: (lastPoint.y / viewBox.height) * rect.height,
      });
    }
  };
  if (count <= 0) return <ChartEmptyState message="No series to display" />;

  return (
    <div ref={chartRef} className={`oq-dense-chart ${compact ? "is-compact" : ""}`} onMouseLeave={clearDenseInteraction} onPointerLeave={clearDenseInteraction}>
      {!compact ? (
        <div className="oq-chart-toolbar is-subtle">
          <div className="oq-dense-legend" aria-label="Line chart legend">
            <span><i style={{ background: activeIndex === null ? linePalette[0] : linePalette[activeIndex % linePalette.length] }} />{activeIndex === null ? "Representative series" : `Series ${activeIndex + 1}`}</span>
            <span><i className="is-muted" />Peer series</span>
          </div>
        </div>
      ) : null}
      <svg
        className="oq-dense-lines"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${renderCount} visible time series`}
        onPointerEnter={showNearestDenseTooltip}
        onPointerMove={showNearestDenseTooltip}
        onPointerLeave={clearDenseInteraction}
        onPointerCancel={clearDenseInteraction}
      >
        <g className="oq-chart-grid" aria-hidden="true">
          {yTicks.map((tick) => {
            const y = margin.top + plotHeight - (tick / yMax) * plotHeight;
            return <line key={tick} x1={margin.left} x2={viewBox.width - margin.right} y1={y} y2={y} />;
          })}
        </g>
        <g className="oq-chart-axis" aria-hidden="true">
          {yTicks.map((tick) => {
            const y = margin.top + plotHeight - (tick / yMax) * plotHeight;
            return <text key={tick} x={margin.left - 18} y={y + 4} textAnchor="end">{formatCompactAxisValue(tick)}</text>;
          })}
          {[0, 17, 34, 52, 69].map((pointIndex) => {
            const x = margin.left + (pointIndex / 69) * plotWidth;
            return <text key={pointIndex} x={x} y={viewBox.height - 18} textAnchor="middle">{formatPortfolioPeriod(pointIndex, 70)}</text>;
          })}
        </g>
        {denseSeries.map((series) => {
          const isDimmed = activeIndex !== null && activeIndex !== series.index;
          return (
            <path
              key={series.index}
              d={series.path}
              stroke={series.color}
              className={`oq-dense-series ${series.index === 0 ? "is-primary" : ""} ${isDimmed ? "is-muted" : ""} ${activeIndex === series.index ? "is-highlighted" : ""}`}
              tabIndex={0}
              aria-label={`Series ${series.index + 1}`}
              onMouseDown={(event) => event.preventDefault()}
              onFocus={() => showDenseFocusTooltip(series)}
              onBlur={clearDenseInteraction}
              onMouseEnter={() => showDenseFocusTooltip(series)}
            >
              <title>{`Series ${series.index + 1}`}</title>
            </path>
          );
        })}
        <rect
          className="oq-dense-hit-area"
          x="0"
          y="0"
          width={viewBox.width}
          height={viewBox.height}
          aria-hidden="true"
          onPointerEnter={showNearestDenseTooltip}
          onPointerMove={showNearestDenseTooltip}
          onPointerLeave={clearDenseInteraction}
          onPointerCancel={clearDenseInteraction}
          onMouseLeave={clearDenseInteraction}
        />
      </svg>
      {activeIndex !== null && activePoint && tooltipPoint ? (
        <div
          className="oq-dense-floating-tooltip"
          style={{
            left: `clamp(12px, ${tooltipPoint.x}px, calc(100% - 260px))`,
            top: `clamp(40px, ${tooltipPoint.y}px, calc(100% - 92px))`,
          }}
        >
          <DenseChartTooltip
            xValue={activePoint.xValue}
            unit="cum pnl"
            rows={tooltipRows}
          />
        </div>
      ) : null}
    </div>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const activeValue = activeIndex === null ? null : values[activeIndex];
  const clearMiniBars = () => setActiveIndex(null);
  useEffect(() => {
    if (activeIndex === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (isOutside) clearMiniBars();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeIndex]);

  return (
    <div ref={chartRef} className="oq-mini-bars-wrap" onMouseLeave={clearMiniBars} onPointerLeave={clearMiniBars}>
      <div className="oq-mini-bars" role="img" aria-label="Mean daily Barra exposure bars">
        {values.map((value, barIndex) => (
          <i
            key={barIndex}
            className={value < 0 ? "is-short" : ""}
            data-active={activeIndex === barIndex}
            style={{ height: `${Math.abs(value) * 82}%` }}
            tabIndex={0}
            title={`Factor ${barIndex + 1}: ${formatChartValue(value)}`}
            aria-label={`Factor ${barIndex + 1}: ${formatChartValue(value)}`}
            onMouseDown={(event) => event.preventDefault()}
            onFocus={() => setActiveIndex(barIndex)}
            onBlur={clearMiniBars}
            onMouseEnter={() => setActiveIndex(barIndex)}
            onPointerEnter={() => setActiveIndex(barIndex)}
            onPointerMove={() => setActiveIndex(barIndex)}
            onPointerLeave={clearMiniBars}
          />
        ))}
      </div>
      {activeValue !== null && activeIndex !== null ? (
        <div className="oq-mini-floating-tooltip">
          <InlineChartTooltip
            title={`Factor ${activeIndex + 1}`}
            xValue={activeValue >= 0 ? "Positive exposure" : "Negative exposure"}
            yValue={formatChartValue(activeValue)}
            unit="factor exposure"
          />
        </div>
      ) : null}
    </div>
  );
}

function AttributionGrid() {
  const titles = [
    "预测分位收益 / Prediction Decile Returns (cum)",
    "风格多空累计收益 / Barra Style Long-Short Returns (cum)",
    "风格暴露 / Mean Daily Barra Exposure",
    "预测衰减 / Prediction Return Autocorr Decay",
    "预测风格相关 / Prediction-Barra Correlation (EMA250)",
    "日换手率 / Daily Turnover Rate",
  ];
  return (
    <div className="oq-attribution-grid">
      {titles.map((title, index) => (
        <div className="oq-mini-card" key={title}>
          <h3><span />{title}</h3>
          {index === 2 ? (
            <MiniBars values={[0.24, -0.16, 0.5, -0.62, 0.54, -0.21, 0.49, 0.08, -0.05, 0.04]} />
          ) : (
            <DenseLines count={index === 3 ? 2 : index === 5 ? 3 : 8} height={240} compact />
          )}
        </div>
      ))}
    </div>
  );
}

function PositionHistory({ rows = defaultPositions }: { rows?: ReportPositionRecord[] }) {
  return (
    <section className="oq-position-card">
      <header>
        <div>
          <h2>Position History</h2>
          <p>Closed positions from the latest strategy replay</p>
        </div>
      </header>
      <div className="oq-position-table">
        <div className="oq-position-head">
          <span>Position</span><span>Entry Price</span><span>Max Open Interest</span><span>Opened</span><span>Closed</span><span>PnL</span>
        </div>
        {rows.map((position) => (
          <article key={position.symbol}>
            <div className="oq-position-symbol">
              <strong>{position.symbol}</strong>
              <span>Perp</span>
              <span>{position.side}</span>
              <small>Closed</small>
            </div>
            <span>{position.entry}</span>
            <span>{position.interest}</span>
            <span>{position.opened}</span>
            <span>{position.closed}</span>
            <b className={position.pnl.startsWith("-") ? "is-loss" : ""}>{position.pnl}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StrategyFigmaReport({
  title = "20260608_020653",
  subtitle = "combo · x_demedian_y_rank",
  headerMetrics = defaultHeaderMetrics,
  dateLabel = "2020-01-01_2020-12-31",
  dateOptions,
  titleAction,
  actions,
  metricRows = navMetrics,
  positions = defaultPositions,
}: {
  title?: string;
  subtitle?: string;
  headerMetrics?: ReportMetric[];
  dateLabel?: string;
  dateOptions?: string[];
  titleAction?: ReactNode;
  actions?: ReactNode;
  metricRows?: Array<[string, string]>;
  positions?: ReportPositionRecord[];
}) {
  const selectableDateOptions = Array.from(
    new Set(dateOptions && dateOptions.length > 0 ? dateOptions : [
      dateLabel,
      "2021-01-01_2021-12-31",
      "2022-01-01_2022-12-31",
      "2023-01-01_2023-12-31",
    ])
  );
  const [selectedDateLabel, setSelectedDateLabel] = useState(dateLabel);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  return (
    <div className="oq-strategy-figma-report">
      <header className="oq-report-top">
        <div className="oq-report-title-block">
          <div className="oq-report-title-row">
            {titleAction}
            <div className="oq-report-title-copy">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {actions ? <div className="oq-report-actions">{actions}</div> : null}
          </div>
          <div className="oq-report-metric-strip">
            {headerMetrics.map((metric) => (
              <div className="oq-report-metric" data-tone={metric.tone} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="oq-report-date-select" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDateMenuOpen(false);
          }
        }}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isDateMenuOpen}
            onClick={() => setIsDateMenuOpen((prev) => !prev)}
          >
            {selectedDateLabel}<span aria-hidden="true">⌄</span>
          </button>
          {isDateMenuOpen ? (
            <div className="oq-report-date-menu" role="listbox" aria-label="Select backtest period">
              {selectableDateOptions.map((option) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedDateLabel === option}
                  key={option}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedDateLabel(option);
                    setIsDateMenuOpen(false);
                  }}
                >
                  <span>{option}</span>
                  {selectedDateLabel === option ? <strong>✓</strong> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <ReportCard title="组合净值 / Portfolio NAV · 回撤 / Drawdown" subtitle="net & gross NAV · 1500 pts" className="is-nav">
        <PortfolioNavChart />
        <MetricsTable rows={metricRows} />
      </ReportCard>

      <div className="oq-report-two-col">
        <ReportCard title="行业暴露 / Average Sector Exposure" subtitle="long (+) / short (-) avg abs weight">
          <ExposureChart />
        </ReportCard>
        <ReportCard title="行业收益排名 / Sector Return Rank" subtitle="total pnl contribution · top + bottom">
          <SectorRankChart />
        </ReportCard>
      </div>

      <ReportCard title="单币种累计 PnL / Single-Symbol Cumulative PnL (All)" subtitle="99 symbols" className="is-symbol-cumulative">
        <DenseLines count={58} height={320} />
      </ReportCard>

      <ReportCard title="单币种 Top/Bottom / Single-Symbol PnL Rank" subtitle="ranked by total pnl">
        <div className="oq-split-lines">
          <DenseLines count={9} height={300} />
          <DenseLines count={9} height={300} />
        </div>
      </ReportCard>

      <ReportCard title="截面归因概览 / CS Attribution Overview" subtitle="7 Barra factors · attribution dashboard">
        <AttributionGrid />
      </ReportCard>

      <PositionHistory rows={positions} />
    </div>
  );
}
