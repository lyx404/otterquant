/*
 * AlphaDetail — Katana Deep Navy Design System
 * bg-0: #0d111c | bg-1: #101631 | Primary: #0058ff | Success: #00ffc2
 * Text: rgba(236,238,243, 0.92/0.48/0.32) | Border: rgba(236,238,243, 0.08/0.12)
 */
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams, Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  BarChart3,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  factors,
  generatePnLData,
  generateSharpeData,
  generateTurnoverData,
  generateReturnsData,
  generateDrawdownData,
  aggregateData,
  osAggregateData,
  yearlySummary,
  osYearlySummary,
  testingStatus,
  correlationData,
} from "@/lib/mockData";
import { useKatanaColors } from "@/hooks/useKatanaColors";

/* ── color tokens (derived from theme) ── */
function useC() {
  const k = useKatanaColors();
  return {
    ...k,
    primaryBorder: k.isDark ? "rgba(0,88,255,0.30)" : "rgba(0,88,255,0.20)",
    successDim: k.isDark ? "rgba(0,255,194,0.10)" : "rgba(0,200,150,0.08)",
    successBorder: k.isDark ? "rgba(0,255,194,0.20)" : "rgba(0,200,150,0.15)",
    dangerDim: k.isDark ? "rgba(241,34,17,0.10)" : "rgba(241,34,17,0.06)",
    dangerBorder: k.isDark ? "rgba(241,34,17,0.20)" : "rgba(241,34,17,0.12)",
  };
}

type ChartType = "pnl" | "sharpe" | "turnover" | "returns" | "drawdown";

/* Deep navy chart colors */
const CHART_COLORS = {
  train: "#0058ff",
  test: "#00ffc2",
  grid: "rgba(236,238,243,0.06)",
  tick: "rgba(236,238,243,0.40)",
  tooltipBg: "#131a2e",
  tooltipBorder: "rgba(236,238,243,0.15)",
};

export default function AlphaDetail() {
  const C = useC();
  const params = useParams<{ id: string }>();
  const factor = factors.find((f) => f.id === params.id) || factors[0];
  const [chartType, setChartType] = useState<ChartType>("pnl");
  const [summaryPeriod, setSummaryPeriod] = useState<"IS" | "OS">("IS");
  const [showTestPeriod, setShowTestPeriod] = useState(true);
  const [expandedTestSections, setExpandedTestSections] = useState<Record<string, boolean>>({
    pass: false,
    fail: true,
    pending: false,
  });
  const headerRef = useRef<HTMLDivElement>(null);

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
    if (chartType === "turnover" || chartType === "returns" || chartType === "drawdown") {
      return `${val.toFixed(0)}%`;
    }
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
          <Button variant="ghost" size="sm" className="gap-1" style={{ color: C.text2 }}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1" ref={headerRef}>
          <div className="reveal-line flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-none" style={{ color: C.text1 }}>{factor.name}</h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em]"
              style={{
                backgroundColor: factor.market === "CEX" ? C.primaryDim : "rgba(162,104,255,0.10)",
                color: factor.market === "CEX" ? C.primaryLight : C.purple,
                border: `1px solid ${factor.market === "CEX" ? C.primaryBorder : "rgba(162,104,255,0.25)"}`,
              }}
            >
              {factor.market}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em]"
              style={{
                backgroundColor: factor.status === "active" ? C.successDim : factor.status === "testing" ? "rgba(219,94,5,0.10)" : C.card,
                color: factor.status === "active" ? C.success : factor.status === "testing" ? C.orange : C.text2,
                border: `1px solid ${factor.status === "active" ? C.successBorder : factor.status === "testing" ? "rgba(219,94,5,0.25)" : C.border}`,
              }}
            >
              {factor.status}
            </span>
          </div>
          <div className="reveal-line">
            <p className="text-xs font-mono mt-1" style={{ color: C.text3 }}>{factor.id} &middot; Created {factor.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Factor Expression */}
      <div className="katana-card py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="label-upper">Expression:</span>
          <code className="text-sm font-mono" style={{ color: C.primaryLight }}>{factor.expression}</code>
        </div>
      </div>

      {/* Show/Hide Test Period Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="h-8 text-xs px-4 rounded-xl font-medium transition-all duration-250"
          style={{
            backgroundColor: showTestPeriod ? C.primaryDim : C.card,
            color: showTestPeriod ? C.primaryLight : C.text2,
            border: `1px solid ${showTestPeriod ? C.primaryBorder : C.border}`,
          }}
          onClick={() => setShowTestPeriod(!showTestPeriod)}
        >
          {showTestPeriod ? "Hide test period" : "Show test period"}
        </button>
        {showTestPeriod && (
          <span className="text-xs px-3 py-1 rounded-full" style={{ color: C.orange, backgroundColor: "rgba(219,94,5,0.10)", border: "1px solid rgba(219,94,5,0.20)" }}>
            Test period and overall stats are hidden by default when test period is specified.
          </span>
        )}
      </div>

      {/* Chart Section */}
      <div className="katana-card">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: C.primaryLight }} />
              <span className="text-base font-semibold" style={{ color: C.text1 }}>Chart</span>
            </div>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[160px] h-8 text-sm rounded-xl" style={{ backgroundColor: C.card, borderColor: C.border }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: C.popover, borderColor: C.border }}>
                <SelectItem value="pnl">PnL</SelectItem>
                <SelectItem value="sharpe">Sharpe</SelectItem>
                <SelectItem value="turnover">Turnover</SelectItem>
                <SelectItem value="returns">Returns</SelectItem>
                <SelectItem value="drawdown">Drawdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "turnover" ? (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.tick }} tickFormatter={(d) => d.substring(0, 7)} interval={Math.floor(chartData.length / 8)} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.tick }} tickFormatter={formatYAxis} />
                  <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltipBg, border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: "12px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: C.text1 }} labelStyle={{ color: CHART_COLORS.tick }} />
                  <Bar dataKey="train" fill="rgba(0,88,255,0.60)" name="Train" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="test" fill="rgba(0,255,194,0.60)" name="Test" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.tick }} tickFormatter={(d) => d.substring(0, 7)} interval={Math.floor(chartData.length / 8)} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.tick }} tickFormatter={formatYAxis} />
                  {chartType === "sharpe" && <ReferenceLine y={0} stroke={C.border} />}
                  <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltipBg, border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: "12px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: C.text1 }} labelStyle={{ color: CHART_COLORS.tick }} />
                  <Line type="monotone" dataKey="train" stroke={CHART_COLORS.train} strokeWidth={1.5} dot={false} name="Train" connectNulls={false} />
                  <Line type="monotone" dataKey="test" stroke={CHART_COLORS.test} strokeWidth={1.5} dot={false} name="Test" connectNulls={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: C.primary }} />
              <span className="text-xs" style={{ color: C.text2 }}>Train</span>
            </div>
            {showTestPeriod && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: C.success }} />
                <span className="text-xs" style={{ color: C.text2 }}>Test (OS)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="katana-card">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: C.primaryLight }} />
              <span className="text-base font-semibold" style={{ color: C.text1 }}>{summaryPeriod} Summary</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs mr-2" style={{ color: C.text2 }}>Period</span>
              {(["IS", "OS"] as const).map((p) => (
                <button
                  key={p}
                  className="h-7 text-xs px-3 rounded-xl font-medium transition-all duration-250"
                  style={{
                    backgroundColor: summaryPeriod === p ? C.primaryDim : "transparent",
                    color: summaryPeriod === p ? C.primaryLight : C.text2,
                    border: summaryPeriod === p ? `1px solid ${C.primaryBorder}` : `1px solid ${C.border}`,
                  }}
                  onClick={() => setSummaryPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-4">
          {/* Aggregate Data Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(aggData).map(([key, val]) => (
              <div key={key} className="text-center p-3 rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.borderWeak}` }}>
                <div className="label-upper mb-1">{key}</div>
                <div className="text-lg stat-value font-bold" style={{ color: C.text1 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Yearly Table */}
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: C.border }}>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Year</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Sharpe</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Turnover</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Fitness</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Returns</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Drawdown</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Margin</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Long Count</TableHead>
                <TableHead className="label-upper" style={{ color: C.primaryLight }}>Short Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((row) => (
                <TableRow key={row.year} style={{ borderColor: C.borderWeak }}>
                  <TableCell className="font-mono text-sm font-medium" style={{ color: C.text1 }}>{row.year}</TableCell>
                  <TableCell className="font-mono text-sm" style={{
                    color: row.sharpe >= 1 ? C.success : row.sharpe >= 0.5 ? C.orange : C.danger
                  }}>
                    {row.sharpe.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.text1 }}>{row.turnover}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.text1 }}>{row.fitness.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.text1 }}>{row.returns}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.danger }}>{row.drawdown}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.text1 }}>{row.margin}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.text1 }}>{row.longCount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: C.text1 }}>{row.shortCount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Correlation + Testing Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Correlation */}
        <div className="katana-card">
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: C.primaryLight }} />
                <span className="text-base font-semibold" style={{ color: C.text1 }}>Correlation</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: C.text2 }}>
                Last Run: {correlationData.lastRun}
                <button className="p-1 rounded transition-colors" style={{ color: C.text3 }}>
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-8">
              <div>
                <span className="label-upper">Self Correlation</span>
              </div>
              <div>
                <span className="text-xs mr-2" style={{ color: C.primaryLight }}>Maximum</span>
                <span className="font-mono text-sm" style={{ color: C.text1 }}>{correlationData.selfCorrelation.maximum}</span>
              </div>
              <div>
                <span className="text-xs mr-2" style={{ color: C.success }}>Minimum</span>
                <span className="font-mono text-sm" style={{ color: C.text1 }}>{correlationData.selfCorrelation.minimum}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Status */}
        <div className="katana-card">
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: C.success }} />
              <span className="text-base font-semibold" style={{ color: C.text1 }}>IS Testing Status</span>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {/* PASS */}
            <div
              className="rounded-r-xl"
              style={{ borderLeft: `2px solid ${C.success}`, backgroundColor: C.successDim, cursor: "pointer" }}
              onClick={() => setExpandedTestSections((s) => ({ ...s, pass: !s.pass }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: C.success }}>{passItems.length} PASS</span>
                {expandedTestSections.pass ? <ChevronUp className="w-4 h-4" style={{ color: C.text3 }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.text3 }} />}
              </div>
              {expandedTestSections.pass && (
                <div className="px-3 pb-2 space-y-1">
                  {passItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: C.text2 }}>
                      <span style={{ color: C.success }} className="mt-0.5">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAIL */}
            <div
              className="rounded-r-xl"
              style={{ borderLeft: `2px solid ${C.danger}`, backgroundColor: C.dangerDim, cursor: "pointer" }}
              onClick={() => setExpandedTestSections((s) => ({ ...s, fail: !s.fail }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: C.danger }}>{failItems.length} FAIL</span>
                {expandedTestSections.fail ? <ChevronUp className="w-4 h-4" style={{ color: C.text3 }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.text3 }} />}
              </div>
              {expandedTestSections.fail && (
                <div className="px-3 pb-2 space-y-1">
                  {failItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: C.text2 }}>
                      <span style={{ color: C.danger }} className="mt-0.5">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PENDING */}
            <div
              className="rounded-r-xl"
              style={{ borderLeft: `2px solid ${C.text3}`, backgroundColor: C.card, cursor: "pointer" }}
              onClick={() => setExpandedTestSections((s) => ({ ...s, pending: !s.pending }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: C.text2 }}>{pendingItems.length} PENDING</span>
                {expandedTestSections.pending ? <ChevronUp className="w-4 h-4" style={{ color: C.text3 }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.text3 }} />}
              </div>
              {expandedTestSections.pending && (
                <div className="px-3 pb-2 space-y-1">
                  {pendingItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: C.text2 }}>
                      <span className="mt-0.5" style={{ color: C.text3 }}>{"\u25CF"}</span>
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
