/*
 * AlphaDetail — Amber/Orange + Warm Beige Design System
 * Cards: rounded-3xl, p-8 beige #F5F1E1 | Buttons: rounded-full | Inputs: rounded-xl
 * Primary: Amber | Secondary: Orange | Success: Emerald | Danger: Red
 * Pure Tailwind classes — zero inline styles (except Recharts which requires inline)
 */
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useParams, Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, CheckCircle, XCircle, BarChart3, TrendingUp,
  ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import {
  factors, generatePnLData, generateSharpeData, generateTurnoverData,
  generateReturnsData, generateDrawdownData, aggregateData, osAggregateData,
  yearlySummary, osYearlySummary, testingStatus, correlationData,
} from "@/lib/mockData";
import { useTheme } from "@/contexts/ThemeContext";

type ChartType = "pnl" | "sharpe" | "turnover" | "returns" | "drawdown";

export default function AlphaDetail() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const params = useParams<{ id: string }>();
  const factor = factors.find((f) => f.id === params.id) || factors[0];
  const [chartType, setChartType] = useState<ChartType>("pnl");
  const [summaryPeriod, setSummaryPeriod] = useState<"IS" | "OS">("IS");
  const [showTestPeriod, setShowTestPeriod] = useState(true);
  const [expandedTestSections, setExpandedTestSections] = useState<Record<string, boolean>>({
    pass: false, fail: true, pending: false,
  });
  const headerRef = useRef<HTMLDivElement>(null);

  /* Recharts needs inline colors — derive from theme */
  const CHART = {
    train: isDark ? "#FBBF24" : "#F59E0B",
    test: isDark ? "#34D399" : "#10B981",
    grid: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.06)",
    tick: isDark ? "rgba(148,163,184,0.5)" : "rgba(15,23,42,0.4)",
    tooltipBg: isDark ? "#0F172A" : "#FFFFFF",
    tooltipBorder: isDark ? "rgba(148,163,184,0.15)" : "rgba(15,23,42,0.1)",
    tooltipText: isDark ? "#F8FAFC" : "#0F172A",
    refLine: isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.1)",
  };

  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
  }, []);

  const pnlData = useMemo(() => generatePnLData(), []);
  const sharpeData = useMemo(() => generateSharpeData(), []);
  const turnoverData = useMemo(() => generateTurnoverData(), []);
  const returnsData = useMemo(() => generateReturnsData(), []);
  const drawdownData = useMemo(() => generateDrawdownData(), []);

  const getChartData = () => {
    const dataMap = { pnl: pnlData, sharpe: sharpeData, turnover: turnoverData, returns: returnsData, drawdown: drawdownData };
    const raw = dataMap[chartType];
    const trainMap = new Map(raw.train.map((d) => [d.date, d.value]));
    const testMap = new Map(raw.test.map((d) => [d.date, d.value]));
    const allDatesSet = new Set([...raw.train.map((d) => d.date), ...raw.test.map((d) => d.date)]);
    const allDates = Array.from(allDatesSet).sort();
    return allDates.map((date) => ({
      date,
      train: trainMap.get(date) ?? null,
      test: showTestPeriod ? (testMap.get(date) ?? null) : null,
    }));
  };

  const chartData = useMemo(getChartData, [chartType, showTestPeriod, pnlData, sharpeData, turnoverData, returnsData, drawdownData]);

  const formatYAxis = (val: number) => {
    if (chartType === "pnl") {
      if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}K`;
      return val.toString();
    }
    if (chartType === "turnover" || chartType === "returns" || chartType === "drawdown") return `${val.toFixed(0)}%`;
    return val.toFixed(2);
  };

  const passItems = testingStatus.filter((t) => t.status === "pass");
  const failItems = testingStatus.filter((t) => t.status === "fail");
  const pendingItems = testingStatus.filter((t) => t.status === "pending");

  const summaryData = summaryPeriod === "IS" ? yearlySummary : osYearlySummary;
  const aggData = summaryPeriod === "IS" ? aggregateData : osAggregateData;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/alphas">
          <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1" ref={headerRef}>
          <div className="reveal-line flex items-center gap-3 flex-wrap">
            <h1 className="text-foreground">{factor.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] border ${
              factor.market === "CEX"
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/25"
            }`}>
              {factor.market}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] border ${
              factor.status === "active"
                ? "bg-success/10 text-success border-success/20"
                : factor.status === "testing"
                  ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20"
                  : "bg-muted text-muted-foreground border-border"
            }`}>
              {factor.status}
            </span>
          </div>
          <div className="reveal-line">
            <p className="text-xs font-mono mt-1 text-muted-foreground">{factor.id} &middot; Created {factor.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Factor Expression */}
      <div className="surface-card py-4 px-6">
        <div className="flex items-center gap-2">
          <span className="label-upper">Expression:</span>
          <code className="text-sm font-mono text-primary">{factor.expression}</code>
        </div>
      </div>

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
          {showTestPeriod ? "Hide test period" : "Show test period"}
        </button>
        {showTestPeriod && (
          <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
            Test period and overall stats are hidden by default when test period is specified.
          </span>
        )}
      </div>

      {/* Chart Section */}
      <div className="surface-card">
        <div className="px-6 py-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">Chart</span>
            </div>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[160px] h-8 text-sm rounded-lg bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pnl">PnL</SelectItem>
                <SelectItem value="sharpe">Sharpe</SelectItem>
                <SelectItem value="turnover">Turnover</SelectItem>
                <SelectItem value="returns">Returns</SelectItem>
                <SelectItem value="drawdown">Drawdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "turnover" ? (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART.tick }} tickFormatter={(d) => d.substring(0, 7)} interval={Math.floor(chartData.length / 8)} />
                  <YAxis tick={{ fontSize: 10, fill: CHART.tick }} tickFormatter={formatYAxis} />
                  <Tooltip contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: "16px", fontSize: "12px", fontFamily: "'Roboto Mono', monospace", color: CHART.tooltipText }} labelStyle={{ color: CHART.tick }} />
                  <Bar dataKey="train" fill={isDark ? "rgba(251,191,36,0.6)" : "rgba(245,158,11,0.6)"} name="Train" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="test" fill={isDark ? "rgba(52,211,153,0.6)" : "rgba(16,185,129,0.6)"} name="Test" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART.tick }} tickFormatter={(d) => d.substring(0, 7)} interval={Math.floor(chartData.length / 8)} />
                  <YAxis tick={{ fontSize: 10, fill: CHART.tick }} tickFormatter={formatYAxis} />
                  {chartType === "sharpe" && <ReferenceLine y={0} stroke={CHART.refLine} />}
                  <Tooltip contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: "16px", fontSize: "12px", fontFamily: "'Roboto Mono', monospace", color: CHART.tooltipText }} labelStyle={{ color: CHART.tick }} />
                  <Line type="monotone" dataKey="train" stroke={CHART.train} strokeWidth={1.5} dot={false} name="Train" connectNulls={false} />
                  <Line type="monotone" dataKey="test" stroke={CHART.test} strokeWidth={1.5} dot={false} name="Test" connectNulls={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded bg-primary" />
              <span className="text-xs text-muted-foreground">Train</span>
            </div>
            {showTestPeriod && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 rounded bg-success" />
                <span className="text-xs text-muted-foreground">Test (OS)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="surface-card">
        <div className="px-6 py-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">{summaryPeriod} Summary</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs mr-2 text-muted-foreground">Period</span>
              {(["IS", "OS"] as const).map((p) => (
                <button
                  key={p}
                  className={`h-7 text-xs px-3 rounded-full font-medium transition-all duration-200 ease-in-out border ${
                    summaryPeriod === p
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                  }`}
                  onClick={() => setSummaryPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 space-y-4">
          {/* Aggregate Data Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Object.entries(aggData).map(([key, val]) => (
              <div key={key} className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                <div className="label-upper mb-1">{key}</div>
                <div className="text-lg stat-value font-bold text-foreground">{val}</div>
              </div>
            ))}
          </div>

          {/* Yearly Table */}
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="label-upper text-primary">Year</TableHead>
                <TableHead className="label-upper text-primary">Sharpe</TableHead>
                <TableHead className="label-upper text-primary">Turnover</TableHead>
                <TableHead className="label-upper text-primary">Fitness</TableHead>
                <TableHead className="label-upper text-primary">Returns</TableHead>
                <TableHead className="label-upper text-primary">Drawdown</TableHead>
                <TableHead className="label-upper text-primary">Margin</TableHead>
                <TableHead className="label-upper text-primary">Long Count</TableHead>
                <TableHead className="label-upper text-primary">Short Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((row) => (
                <TableRow key={row.year} className="border-border hover:bg-amber-50 dark:hover:bg-slate-800/30">
                  <TableCell className="font-mono text-sm font-medium text-foreground">{row.year}</TableCell>
                  <TableCell className={`font-mono text-sm ${
                    row.sharpe >= 1 ? "text-success" : row.sharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                  }`}>
                    {row.sharpe.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-foreground">{row.turnover}</TableCell>
                  <TableCell className="font-mono text-sm text-foreground">{row.fitness.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm text-foreground">{row.returns}</TableCell>
                  <TableCell className="font-mono text-sm text-destructive">{row.drawdown}</TableCell>
                  <TableCell className="font-mono text-sm text-foreground">{row.margin}</TableCell>
                  <TableCell className="font-mono text-sm text-foreground">{row.longCount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm text-foreground">{row.shortCount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Correlation + Testing Status */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Correlation */}
        <div className="surface-card">
          <div className="px-6 py-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">Correlation</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Last Run: {correlationData.lastRun}
                <button className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-center gap-8">
              <div>
                <span className="label-upper">Self Correlation</span>
              </div>
              <div>
                <span className="text-xs mr-2 text-primary">Maximum</span>
                <span className="font-mono text-sm text-foreground">{correlationData.selfCorrelation.maximum}</span>
              </div>
              <div>
                <span className="text-xs mr-2 text-success">Minimum</span>
                <span className="font-mono text-sm text-foreground">{correlationData.selfCorrelation.minimum}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Status */}
        <div className="surface-card">
          <div className="px-6 py-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-base font-semibold text-foreground">IS Testing Status</span>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-2">
            {/* PASS */}
            <div
              className="rounded-r-2xl border-l-2 border-l-success bg-success/5 dark:bg-success/10 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-success/10 dark:hover:bg-success/15"
              onClick={() => setExpandedTestSections((s) => ({ ...s, pass: !s.pass }))}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium text-success">{passItems.length} PASS</span>
                {expandedTestSections.pass ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedTestSections.pass && (
                <div className="px-4 pb-2 space-y-1">
                  {passItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-success">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAIL */}
            <div
              className="rounded-r-2xl border-l-2 border-l-destructive bg-destructive/5 dark:bg-destructive/10 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-destructive/10 dark:hover:bg-destructive/15"
              onClick={() => setExpandedTestSections((s) => ({ ...s, fail: !s.fail }))}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium text-destructive">{failItems.length} FAIL</span>
                {expandedTestSections.fail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedTestSections.fail && (
                <div className="px-4 pb-2 space-y-1">
                  {failItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-destructive">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PENDING */}
            <div
              className="rounded-r-2xl border-l-2 border-l-slate-400 dark:border-l-slate-600 bg-accent/50 dark:bg-slate-800/30 cursor-pointer transition-colors duration-200 ease-in-out hover:bg-accent dark:hover:bg-slate-800/50"
              onClick={() => setExpandedTestSections((s) => ({ ...s, pending: !s.pending }))}
            >
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium text-muted-foreground">{pendingItems.length} PENDING</span>
                {expandedTestSections.pending ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedTestSections.pending && (
                <div className="px-4 pb-2 space-y-1">
                  {pendingItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 text-slate-400">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
