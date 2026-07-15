import type { ComponentType, ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const curveRanges = ["7D", "30D", "90D", "365D"] as const;
export type CurveRange = (typeof curveRanges)[number];

export type SectionRow = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  explanation?: string;
};

export type StrategyConfigRow = {
  key: string;
  label: string;
  value: string;
};

export type CurvePoint = {
  x: number;
  y: number;
  value: number;
};

export type PreferenceSlice = {
  label: string;
  value: number;
  color: string;
};

export type PositionRecord = {
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

export const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
export type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
export const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";

export const curveMeta: Record<
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

export const returnMeta: Record<CurveRange, { bars: number; amplitude: number; labels: string[] }> = {
  "7D": { bars: 14, amplitude: 0.42, labels: ["04-15", "04-17", "04-19", "04-21"] },
  "30D": { bars: 30, amplitude: 0.74, labels: ["03-22", "03-29", "04-05", "04-12", "04-19"] },
  "90D": { bars: 56, amplitude: 1.18, labels: ["11-14", "11-28", "12-12", "12-26", "01-09", "01-23", "02-06"] },
  "365D": { bars: 72, amplitude: 1.34, labels: ["Apr", "Jun", "Aug", "Oct", "Dec", "Feb"] },
};

export const preferenceSlices: PreferenceSlice[] = [
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

export const positionHistory: PositionRecord[] = [
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

export function fmtSigned(value: number, fractionDigits = 2) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function buildSeriesPoints(
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

export function pointsToPath(points: CurvePoint[]) {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function pointsToArea(points: CurvePoint[], height: number, padding: number) {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${pointsToPath(points)} L ${last.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${first.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;
}

export function getPlotHoverIndex(
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

export function buildReturnBars(count: number, amplitude: number) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.37) * amplitude * 0.58;
    const wobble = Math.cos(index * 0.83) * amplitude * 0.34;
    const drift = (index % 9 === 0 ? -1 : 1) * amplitude * 0.08;
    return Number((wave + wobble + drift).toFixed(3));
  });
}

export function classForTone(tone?: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-[var(--semantic-up)]";
  if (tone === "negative") return "text-[var(--semantic-down)]";
  return "text-foreground";
}

export function positionTone(value: string) {
  return value.startsWith("-") ? "text-[var(--semantic-down)]" : "text-[var(--semantic-up)]";
}

export function percentLevel(value: number, tr: (en: string, zh: string) => string, higherIsBetter = true) {
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

export function sideClass(side: PositionRecord["side"]) {
  return side === "Cross Long"
    ? "border-border/70 bg-accent/45 text-muted-foreground"
    : "border-border/70 bg-accent/45 text-muted-foreground";
}

export function MaybeExplainTooltip({
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
      <TooltipContent side="top" className="oq-plain-explanation-tooltip">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

export function TopMetric({
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
    <div className="oq-sd-top-metric h-full w-full rounded-xl px-2 py-1.5 text-left">
      <div className="oq-sd-kicker text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-[20px] font-semibold leading-none ${classForTone(tone)}`}>{value}</div>
    </div>
  );

  return (
    <MaybeExplainTooltip enabled={explainEnabled} explanation={explanation}>
      {content}
    </MaybeExplainTooltip>
  );
}

export function DetailListCard({
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
    <div className="oq-sd-detail-card rounded-xl border border-border/70 bg-accent/35 p-4">
      <div className="oq-sd-detail-title mb-3 flex items-center gap-2 text-[11px] font-medium text-foreground">
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

export function ExplainStat({
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

export function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function DashboardPanel({
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
    <section className="oq-sd-panel surface-card h-full overflow-hidden p-0">
      <div className={`oq-sd-panel-header flex items-center justify-between px-4 pt-3 ${flushHeaderBottom ? "pb-0" : "pb-3"} ${showHeaderDivider ? "border-b border-border/60" : ""}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h2 className="oq-sd-panel-title text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </h2>
        </div>
        {actions}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
