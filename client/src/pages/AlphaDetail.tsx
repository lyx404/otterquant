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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useParams, useSearch } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, CheckCircle, XCircle, BarChart3, TrendingUp,
  ChevronDown, ChevronUp, RefreshCw, Eye, Sparkles,
  Loader2, FlaskConical, LineChart as LineChartIcon, Settings2,
} from "lucide-react";
import ShinyTag from "@/components/ui/shiny-tag";
import {
  factors, generatePnLData, generateSharpeData, generateTurnoverData,
  generateReturnsData, generateDrawdownData, aggregateData, osAggregateData,
  yearlySummary, osYearlySummary, testingStatus, correlationData,
  getAlphaGrade, GRADE_CONFIG,
} from "@/lib/mockData";
import { useTheme } from "@/contexts/ThemeContext";

type ChartType = "pnl" | "sharpe" | "turnover" | "returns" | "drawdown";
type ViewMode = "beginner" | "pro";

export default function AlphaDetail() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const params = useParams<{ id: string }>();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const isGeneratingParam = searchParams.get("generating") === "true";
  const customName = searchParams.get("name");
  const factor = factors.find((f) => f.id === params.id) || factors[0];

  /* ── Generating state ── */
  const [isGenerating, setIsGenerating] = useState(isGeneratingParam);
  const [genStep, setGenStep] = useState(0);
  const GEN_STEPS = [
    { label: "Parsing strategy parameters", icon: Settings2, duration: 2000 },
    { label: "Mining alpha factors", icon: FlaskConical, duration: 3000 },
    { label: "Running backtests", icon: BarChart3, duration: 4000 },
    { label: "Optimizing parameters", icon: LineChartIcon, duration: 3000 },
    { label: "Evaluating performance", icon: Sparkles, duration: 2000 },
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

  const [chartType, setChartType] = useState<ChartType>("pnl");
  const [summaryPeriod, setSummaryPeriod] = useState<"IS" | "OS">("IS");
  const [showTestPeriod, setShowTestPeriod] = useState(true);
  const [expandedTestSections, setExpandedTestSections] = useState<Record<string, boolean>>({
    pass: false, fail: true, pending: false,
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("alphaforge_view_mode");
    return (saved === "beginner" || saved === "pro") ? saved : "pro";
  });
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("alphaforge_view_mode", viewMode);
  }, [viewMode]);

  const grade = getAlphaGrade(factor.osSharpe);
  const gradeConfig = GRADE_CONFIG[grade];

  const CHART = {
    train: isDark ? "#818CF8" : "#4F46E5",
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


  /* ── Beginner mode metrics ── */
  const beginnerMetrics = [
    { label: "Grade", value: grade, color: gradeConfig.color, desc: gradeConfig.label },
    { label: "OS Sharpe", value: factor.osSharpe.toFixed(2), color: factor.osSharpe >= 1.0 ? "#34D399" : factor.osSharpe >= 0.5 ? "#FBBF24" : "#F87171", desc: factor.osSharpe >= 1.0 ? "Strong" : factor.osSharpe >= 0.5 ? "Moderate" : "Weak" },
    { label: "Returns", value: factor.returns, color: "#34D399", desc: "Total return" },
    { label: "Drawdown", value: factor.drawdown, color: "#F87171", desc: "Max loss" },
    { label: "Tests", value: `${factor.testsPassed}/${factor.testsPassed + factor.testsFailed}`, color: factor.testsPassed > factor.testsFailed ? "#34D399" : "#F87171", desc: "Passed/Total" },
  ];

  /* ── Generating Loading UI ── */
  if (isGenerating) {
    const displayName = customName || params.id || "New Alpha";
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground hover:text-foreground" onClick={() => window.location.assign('/alphas')}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-foreground">{displayName}</h1>
            <p className="text-xs font-mono mt-1 text-muted-foreground">{params.id} &middot; Just created</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">Generating alpha factor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: Factor Name + Header ═══ */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground hover:text-foreground" onClick={() => window.location.assign('/alphas')}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1" ref={headerRef}>
          <div className="reveal-line flex items-center gap-3 flex-wrap">
            <h1 className="text-foreground">{factor.name}</h1>
            {/* Grade Badge — synced with list view */}
            {(grade === "S" || grade === "A") ? (
              <ShinyTag tier={grade} />
            ) : (
              <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border-[0.5px] border-white/40 text-[10px] font-semibold text-white bg-transparent">
                {grade}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] whitespace-nowrap border ${
              factor.status === "active" || factor.status === "testing"
                ? "bg-success/10 text-success border-success/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            }`}>
              {factor.status === "active" || factor.status === "testing" ? "PASSED" : "FAILED"}
            </span>
          </div>
          <div className="reveal-line">
            <p className="text-xs font-mono mt-1 text-muted-foreground">{factor.id} &middot; Created {factor.createdAt}</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-accent border border-border shrink-0">
          <button
            onClick={() => setViewMode("beginner")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              viewMode === "beginner"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Beginner
          </button>
          <button
            onClick={() => setViewMode("pro")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              viewMode === "pro"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pro
          </button>
        </div>
      </div>

      {/* ═══ BEGINNER MODE ═══ */}
      {viewMode === "beginner" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {beginnerMetrics.map((m) => (
              <div key={m.label} className="surface-card p-4 text-center">
                <div className="label-upper mb-2">{m.label}</div>
                <div className="text-2xl font-bold font-mono" style={{ color: m.color }}>
                  {m.value}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{m.desc}</div>
              </div>
            ))}
          </div>

          {/* Simplified Expression */}
          <div className="surface-card py-4 px-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="label-upper">Alpha Expression</span>
            </div>
            <code className="text-sm font-mono text-primary block">{factor.expression}</code>
          </div>

          {/* Simplified Chart — PnL only */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">Performance</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cumulative profit and loss over time</p>
            </div>
            <div className="px-6 pb-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART.tick }} tickFormatter={(d) => d.substring(0, 7)} interval={Math.floor(chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10, fill: CHART.tick }} tickFormatter={formatYAxis} />
                    <Tooltip contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.tooltipBorder}`, borderRadius: "16px", fontSize: "12px", fontFamily: "'Roboto Mono', monospace", color: CHART.tooltipText }} labelStyle={{ color: CHART.tick }} />
                    <Line type="monotone" dataKey="train" stroke={CHART.train} strokeWidth={1.5} dot={false} name="Train" connectNulls={false} />
                    <Line type="monotone" dataKey="test" stroke={CHART.test} strokeWidth={1.5} dot={false} name="Test" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 rounded bg-primary" />
                  <span className="text-xs text-muted-foreground">Train (In-Sample)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 rounded bg-success" />
                  <span className="text-xs text-muted-foreground">Test (Out-of-Sample)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simplified Summary */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">Quick Summary</span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {Object.entries(aggData).map(([key, val]) => (
                  <div key={key} className="text-center p-3 rounded-2xl bg-accent border border-border/60">
                    <div className="label-upper mb-1 text-[9px]">{key}</div>
                    <div className="text-base stat-value font-bold text-foreground">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Simple Test Status */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-base font-semibold text-foreground">Test Results</span>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-foreground">{passItems.length} Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm text-foreground">{failItems.length} Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <span className="text-sm text-foreground">{pendingItems.length} Pending</span>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-accent overflow-hidden flex">
                <div className="bg-success h-full" style={{ width: `${(passItems.length / testingStatus.length) * 100}%` }} />
                <div className="bg-destructive h-full" style={{ width: `${(failItems.length / testingStatus.length) * 100}%` }} />
                <div className="bg-slate-400 h-full" style={{ width: `${(pendingItems.length / testingStatus.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Upgrade prompt */}
          <div className="flex items-start gap-2 p-4 rounded-2xl text-xs bg-primary/5 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Switch to <strong>Pro mode</strong> for detailed charts, yearly breakdowns, correlation analysis, and full testing status.</span>
          </div>
        </div>
      )}

      {/* ═══ PRO MODE ═══ */}
      {viewMode === "pro" && (
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* ── SECTION 2: Factor Overview + IS/OS Summary (merged) ── */}
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
              {/* Top row: Grade + Tests + Aggregate metric cards */}
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {/* Grade card */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">GRADE</div>
                  <div className="text-lg font-bold font-mono" style={{ color: gradeConfig.color }}>{grade}</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{gradeConfig.label}</div>
                </div>
                {/* Sharpe card — color follows list view osSharpe rule */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">SHARPE</div>
                  <div className={`text-lg font-bold font-mono tabular-nums ${
                    (typeof aggData.sharpe === "number" ? aggData.sharpe : 0) >= 1 ? "text-success" : (typeof aggData.sharpe === "number" ? aggData.sharpe : 0) >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                  }`}>
                    {typeof aggData.sharpe === "number" ? aggData.sharpe.toFixed(2) : aggData.sharpe}
                  </div>
                </div>
                {/* Turnover */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">TURNOVER</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{aggData.turnover}</div>
                </div>
                {/* Fitness — color follows list view fitness rule */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">FITNESS</div>
                  <div className={`text-lg font-bold font-mono tabular-nums ${
                    (typeof aggData.fitness === "number" ? aggData.fitness : 0) >= 1 ? "text-success" : (typeof aggData.fitness === "number" ? aggData.fitness : 0) >= 0.5 ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {typeof aggData.fitness === "number" ? aggData.fitness.toFixed(2) : aggData.fitness}
                  </div>
                </div>
                {/* Returns */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">RETURNS</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{aggData.returns}</div>
                </div>
                {/* Drawdown — always destructive like list view */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">DRAWDOWN</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-destructive">{aggData.drawdown}</div>
                </div>
                {/* Margin */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">MARGIN</div>
                  <div className="text-lg font-bold font-mono tabular-nums text-foreground">{aggData.margin}</div>
                </div>
                {/* Tests card */}
                <div className="text-center p-4 rounded-2xl bg-accent border border-border/60">
                  <div className="label-upper mb-1 text-[9px]">TESTS</div>
                  <div className={`text-lg font-bold font-mono tabular-nums ${factor.testsPassed > factor.testsFailed ? "text-success" : "text-destructive"}`}>
                    {factor.testsPassed}/{factor.testsPassed + factor.testsFailed}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">Passed/Total</div>
                </div>
              </div>

              {/* Yearly breakdown table */}
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
                    <TableRow key={row.year} className="border-border hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <TableCell className="font-mono text-sm font-medium text-foreground">{row.year}</TableCell>
                      <TableCell className={`font-mono text-sm tabular-nums ${
                        row.sharpe >= 1 ? "text-success" : row.sharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                      }`}>
                        {row.sharpe.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.turnover}</TableCell>
                      <TableCell className={`font-mono text-sm tabular-nums ${
                        row.fitness >= 1 ? "text-success" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {row.fitness.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.returns}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-destructive">{row.drawdown}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.margin}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.longCount.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-foreground">{row.shortCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ── SECTION 3: Alpha Expression ── */}
          <div className="surface-card py-4 px-6">
            <div className="flex items-center gap-2">
              <span className="label-upper">Expression:</span>
              <code className="text-sm font-mono text-primary">{factor.expression}</code>
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
                      <Bar dataKey="train" fill={isDark ? "rgba(129,140,248,0.6)" : "rgba(79,70,229,0.6)"} name="Train" radius={[2, 2, 0, 0]} />
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

          {/* ── SECTION 5: Test Status ── */}
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
      )}
    </div>
  );
}
