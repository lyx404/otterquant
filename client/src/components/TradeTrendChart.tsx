import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";

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

  return Array.from({ length: 30 }, (_, index) => {
    const progress = index / 29;
    const date = new Date(endDate);
    date.setDate(endDate.getDate() - (29 - index));
    const wave = Math.sin(index * 0.58) * Math.sin(progress * Math.PI);
    const drawdownEnvelope = Math.sin(progress * Math.PI) * ((1 - progress) ** 1.4);
    const returnValue = returnRate * progress
      + wave * Math.max(Math.abs(returnRate) * 0.28, 0.04)
      - drawdownEnvelope * Math.max(Math.abs(returnRate) * 0.75, 0.75);
    const pnlValue = pnl * progress
      + wave * Math.max(Math.abs(pnl) * 0.08, 8)
      - drawdownEnvelope * Math.max(Math.abs(pnl) * 0.75, 25);

    return {
      date: `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
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

function TrendActiveDot({
  cx,
  cy,
  payload,
  metricKey,
}: {
  cx?: number;
  cy?: number;
  payload?: Partial<Record<TradeTrendMetricKey, number>>;
  metricKey: TradeTrendMetricKey;
}) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;

  const value = payload?.[metricKey] ?? 0;
  const stroke = value >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";

  return <circle cx={cx} cy={cy} r={4} fill="var(--td-bg)" stroke={stroke} strokeWidth={2.4} />;
}

function TrendTooltip({
  active,
  label,
  payload,
  metric,
  metricLabel,
  year,
}: {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: string | number }[];
  metric: TradeTrendMetric;
  metricLabel: string;
  year: string;
}) {
  const numericValue = Number(payload?.[0]?.value);

  if (!active || !Number.isFinite(numericValue)) return null;

  const formattedValue = `${numericValue > 0 ? "+" : ""}${numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${metric === "return" ? "%" : " USDT"}`;

  return (
    <div className="oq-trade-trend-tooltip" role="status">
      <div className="oq-trade-trend-tooltip-date">{year}-{String(label ?? "--")}</div>
      <div className="oq-trade-trend-tooltip-row">
        <i
          style={{ backgroundColor: numericValue >= 0 ? "var(--semantic-up)" : "var(--semantic-down)" }}
          aria-hidden="true"
        />
        <span>{metricLabel}</span>
        <strong>{formattedValue}</strong>
      </div>
    </div>
  );
}

export function TradeTrendChart({
  data,
  metric,
  metricLabel,
  year,
  ariaLabel,
}: {
  data: TradeTrendPoint[];
  metric: TradeTrendMetric;
  metricLabel: string;
  year: string;
  ariaLabel: string;
}) {
  const metricKey: TradeTrendMetricKey = metric === "return" ? "returnValue" : "pnlValue";
  const values = data.map((row) => row[metricKey]);
  const finalValue = values.at(-1) ?? 0;
  const endColor = finalValue >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";
  const axis = getTrendAxis(values, metric === "return" ? 0.1 : 10);
  const valueMin = Math.min(0, ...values);
  const valueMax = Math.max(0, ...values);
  const zeroOffset = valueMax <= 0 ? 0 : valueMin >= 0 ? 1 : valueMax / (valueMax - valueMin);
  const gradientSuffix = useId().replace(/:/g, "");
  const strokeId = `trade-trend-stroke-${gradientSuffix}-${metric}`;
  const fillId = `trade-trend-fill-${gradientSuffix}-${metric}`;

  return (
    <div className="oq-trade-trend-body">
      <ChartContainer
        className="oq-trade-trend-chart"
        config={{ [metricKey]: { label: metricLabel, color: endColor } }}
        role="img"
        aria-label={ariaLabel}
      >
        <AreaChart data={data} accessibilityLayer margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={strokeId} x1="0" y1="0" x2="0" y2="1">
              <stop offset={`${zeroOffset * 100}%`} stopColor="var(--semantic-up)" />
              <stop offset={`${zeroOffset * 100}%`} stopColor="var(--semantic-down)" />
            </linearGradient>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--semantic-up)" stopOpacity={0.08} />
              <stop offset={`${zeroOffset * 100}%`} stopColor="var(--semantic-up)" stopOpacity={0.08} />
              <stop offset={`${zeroOffset * 100}%`} stopColor="var(--semantic-down)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="var(--semantic-down)" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--td-chart-grid)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval={5}
            minTickGap={24}
            tick={{ fill: "var(--td-muted)", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            width={48}
            domain={axis.domain}
            ticks={axis.ticks}
            tick={{ fill: "var(--td-muted)", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 500 }}
            tickFormatter={(value) => {
              const numericValue = Number(value);
              if (numericValue === 0) return metric === "return" ? "0%" : "0";
              return metric === "return"
                ? `${numericValue.toFixed(1)}%`
                : numericValue.toLocaleString(undefined, { maximumFractionDigits: 0 });
            }}
          />
          <RechartsTooltip
            cursor={{ stroke: "var(--td-muted)", strokeDasharray: "4 6", strokeOpacity: 0.45 }}
            wrapperStyle={{ zIndex: 8, pointerEvents: "none" }}
            content={<TrendTooltip metric={metric} metricLabel={metricLabel} year={year} />}
          />
          <Area
            type="monotone"
            dataKey={metricKey}
            stroke={`url(#${strokeId})`}
            strokeWidth={2.4}
            fill={`url(#${fillId})`}
            fillOpacity={1}
            dot={false}
            activeDot={<TrendActiveDot metricKey={metricKey} />}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
