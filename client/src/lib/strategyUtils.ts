import type { Strategy } from "@/lib/mockData";

export function parsePercent(value: string): number {
  const parsed = Number.parseFloat(value.replace(/%/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildSeries(length: number, start: number, slope: number, volatility: number): number[] {
  const safeLength = Math.max(2, length);
  return Array.from({ length: safeLength }, (_, index) => {
    const progress = index / (safeLength - 1);
    const trend = start + progress * slope * safeLength;
    const wave = Math.sin(progress * Math.PI * 5.2) * volatility * 1.6;
    const wobble = Math.cos(progress * Math.PI * 2.6) * volatility * 0.65;
    return Number((trend + wave + wobble).toFixed(2));
  });
}

export function buildPath(values: number[], width: number, height: number, padding = 18): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);

  return values
    .map((value, index) => {
      const x = padding + (index * innerWidth) / Math.max(1, values.length - 1);
      const y = height - padding - ((value - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildCalendarValues(days: number, base = 1.8): number[] {
  const safeDays = Math.max(1, days);
  return Array.from({ length: safeDays }, (_, index) => {
    const progress = index / Math.max(1, safeDays - 1);
    const swing = Math.sin(progress * Math.PI * 3.4) * base;
    const wobble = Math.cos(progress * Math.PI * 8.6) * base * 0.35;
    const trend = progress * base * 1.2;
    return Number((swing + wobble + trend).toFixed(2));
  });
}

export function getTopTags(strategies: Strategy[], limit = 6) {
  const counts = new Map<string, number>();
  strategies.forEach((strategy) => {
    strategy.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export function getMarketBreakdown(strategies: Strategy[]) {
  const counts = new Map<string, number>();
  strategies.forEach((strategy) => {
    counts.set(strategy.market, (counts.get(strategy.market) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
