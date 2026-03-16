/*
 * AlphaDetail — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent, white/10 borders, white/50 secondary
 * GSAP staggered reveal, chart with acid green palette
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

type ChartType = "pnl" | "sharpe" | "turnover" | "returns" | "drawdown";

/* Acid green chart colors */
const CHART_COLORS = {
  train: "#C5FF4A",
  test: "rgb(255,200,50)",
  grid: "rgba(255,255,255,0.06)",
  tick: "rgba(255,255,255,0.40)",
  tooltipBg: "#151515",
  tooltipBorder: "rgba(255,255,255,0.15)",
};

export default function AlphaDetail() {
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

  // GSAP staggered reveal for header
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
          <Button variant="ghost" size="sm" className="gap-1" style={{ color: "rgba(255,255,255,0.50)" }}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1" ref={headerRef}>
          <div className="reveal-line flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-medium tracking-tighter leading-none text-white">{factor.name}</h1>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em]"
              style={{
                backgroundColor: factor.market === "CEX" ? "rgba(100,180,255,0.08)" : "rgba(197,255,74,0.08)",
                color: factor.market === "CEX" ? "rgb(100,180,255)" : "#C5FF4A",
                border: `1px solid ${factor.market === "CEX" ? "rgba(100,180,255,0.20)" : "rgba(197,255,74,0.20)"}`,
              }}
            >
              {factor.market}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em]"
              style={{
                backgroundColor: factor.status === "active" ? "rgba(74,222,128,0.08)" : factor.status === "testing" ? "rgba(255,200,50,0.08)" : "rgba(255,255,255,0.05)",
                color: factor.status === "active" ? "rgb(74,222,128)" : factor.status === "testing" ? "rgb(255,200,50)" : "rgba(255,255,255,0.50)",
                border: `1px solid ${factor.status === "active" ? "rgba(74,222,128,0.20)" : factor.status === "testing" ? "rgba(255,200,50,0.20)" : "rgba(255,255,255,0.10)"}`,
              }}
            >
              {factor.status}
            </span>
          </div>
          <div className="reveal-line">
            <p className="text-xs font-mono mt-1" style={{ color: "rgba(255,255,255,0.40)" }}>{factor.id} &middot; Created {factor.createdAt}</p>
          </div>
        </div>
      </div>

      {/* Factor Expression */}
      <div className="katana-card py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="label-upper">Expression:</span>
          <code className="text-sm font-mono" style={{ color: "rgb(100,180,255)" }}>{factor.expression}</code>
        </div>
      </div>

      {/* Show/Hide Test Period Toggle */}
      <div className="flex items-center gap-3">
        <button
          className="h-8 text-xs px-4 rounded-md font-medium transition-all"
          style={{
            backgroundColor: showTestPeriod ? "rgba(197,255,74,0.10)" : "rgba(255,255,255,0.05)",
            color: showTestPeriod ? "#C5FF4A" : "rgba(255,255,255,0.50)",
            border: `1px solid ${showTestPeriod ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)"}`,
          }}
          onClick={() => setShowTestPeriod(!showTestPeriod)}
        >
          {showTestPeriod ? "Hide test period" : "Show test period"}
        </button>
        {showTestPeriod && (
          <span className="text-xs px-3 py-1 rounded-full" style={{ color: "rgb(255,200,50)", backgroundColor: "rgba(255,200,50,0.08)", border: "1px solid rgba(255,200,50,0.15)" }}>
            Test period and overall stats are hidden by default when test period is specified.
          </span>
        )}
      </div>

      {/* Chart Section */}
      <div className="katana-card">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: "rgb(100,180,255)" }} />
              <span className="text-base font-semibold text-white">Chart</span>
            </div>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[160px] h-8 text-sm" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "#151515", borderColor: "rgba(255,255,255,0.10)" }}>
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
                  <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltipBg, border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: "6px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#fff" }} labelStyle={{ color: CHART_COLORS.tick }} />
                  <Bar dataKey="train" fill="rgba(197,255,74,0.60)" name="Train" />
                  <Bar dataKey="test" fill="rgba(255,200,50,0.60)" name="Test" />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_COLORS.tick }} tickFormatter={(d) => d.substring(0, 7)} interval={Math.floor(chartData.length / 8)} />
                  <YAxis tick={{ fontSize: 10, fill: CHART_COLORS.tick }} tickFormatter={formatYAxis} />
                  {chartType === "sharpe" && <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />}
                  <Tooltip contentStyle={{ backgroundColor: CHART_COLORS.tooltipBg, border: `1px solid ${CHART_COLORS.tooltipBorder}`, borderRadius: "6px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "#fff" }} labelStyle={{ color: CHART_COLORS.tick }} />
                  <Line type="monotone" dataKey="train" stroke={CHART_COLORS.train} strokeWidth={1.5} dot={false} name="Train" connectNulls={false} />
                  <Line type="monotone" dataKey="test" stroke={CHART_COLORS.test} strokeWidth={1.5} dot={false} name="Test" connectNulls={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded" style={{ backgroundColor: "#C5FF4A" }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Train</span>
            </div>
            {showTestPeriod && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: "rgb(255,200,50)" }} />
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Test (OS)</span>
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
              <TrendingUp className="w-4 h-4" style={{ color: "rgb(100,180,255)" }} />
              <span className="text-base font-semibold text-white">{summaryPeriod} Summary</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs mr-2" style={{ color: "rgba(255,255,255,0.50)" }}>Period</span>
              {(["IS", "OS"] as const).map((p) => (
                <button
                  key={p}
                  className="h-7 text-xs px-3 rounded-md font-medium transition-all"
                  style={{
                    backgroundColor: summaryPeriod === p ? "rgba(197,255,74,0.10)" : "transparent",
                    color: summaryPeriod === p ? "#C5FF4A" : "rgba(255,255,255,0.50)",
                    border: summaryPeriod === p ? "1px solid rgba(197,255,74,0.20)" : "1px solid rgba(255,255,255,0.10)",
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
              <div key={key} className="text-center p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="label-upper mb-1">{key}</div>
                <div className="text-lg stat-value font-bold text-white">{val}</div>
              </div>
            ))}
          </div>

          {/* Yearly Table */}
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Year</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Sharpe</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Turnover</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Fitness</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Returns</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Drawdown</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Margin</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Long Count</TableHead>
                <TableHead className="label-upper" style={{ color: "rgb(100,180,255)" }}>Short Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((row) => (
                <TableRow key={row.year} style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <TableCell className="font-mono text-sm font-medium text-white">{row.year}</TableCell>
                  <TableCell className="font-mono text-sm" style={{
                    color: row.sharpe >= 1 ? "#C5FF4A" : row.sharpe >= 0.5 ? "rgb(255,200,50)" : "rgb(248,113,113)"
                  }}>
                    {row.sharpe.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.turnover}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.fitness.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.returns}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgb(248,113,113)" }}>{row.drawdown}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.margin}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.longCount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.shortCount.toLocaleString()}</TableCell>
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
                <BarChart3 className="w-4 h-4" style={{ color: "rgb(100,180,255)" }} />
                <span className="text-base font-semibold text-white">Correlation</span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                Last Run: {correlationData.lastRun}
                <button className="p-1 rounded transition-colors" style={{ color: "rgba(255,255,255,0.30)" }}>
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
                <span className="text-xs mr-2" style={{ color: "rgb(100,180,255)" }}>Maximum</span>
                <span className="font-mono text-sm text-white">{correlationData.selfCorrelation.maximum}</span>
              </div>
              <div>
                <span className="text-xs mr-2" style={{ color: "rgb(74,222,128)" }}>Minimum</span>
                <span className="font-mono text-sm text-white">{correlationData.selfCorrelation.minimum}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Status */}
        <div className="katana-card">
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: "rgb(74,222,128)" }} />
              <span className="text-base font-semibold text-white">IS Testing Status</span>
            </div>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {/* PASS */}
            <div
              className="rounded-r-md"
              style={{ borderLeft: "2px solid rgb(74,222,128)", backgroundColor: "rgba(74,222,128,0.04)", cursor: "pointer" }}
              onClick={() => setExpandedTestSections((s) => ({ ...s, pass: !s.pass }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: "rgb(74,222,128)" }}>{passItems.length} PASS</span>
                {expandedTestSections.pass ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} />}
              </div>
              {expandedTestSections.pass && (
                <div className="px-3 pb-2 space-y-1">
                  {passItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                      <span style={{ color: "rgb(74,222,128)" }} className="mt-0.5">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAIL */}
            <div
              className="rounded-r-md"
              style={{ borderLeft: "2px solid rgb(248,113,113)", backgroundColor: "rgba(248,113,113,0.04)", cursor: "pointer" }}
              onClick={() => setExpandedTestSections((s) => ({ ...s, fail: !s.fail }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: "rgb(248,113,113)" }}>{failItems.length} FAIL</span>
                {expandedTestSections.fail ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} />}
              </div>
              {expandedTestSections.fail && (
                <div className="px-3 pb-2 space-y-1">
                  {failItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                      <span style={{ color: "rgb(248,113,113)" }} className="mt-0.5">{"\u25CF"}</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PENDING */}
            <div
              className="rounded-r-md"
              style={{ borderLeft: "2px solid rgba(255,255,255,0.30)", backgroundColor: "rgba(255,255,255,0.03)", cursor: "pointer" }}
              onClick={() => setExpandedTestSections((s) => ({ ...s, pending: !s.pending }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>{pendingItems.length} PENDING</span>
                {expandedTestSections.pending ? <ChevronUp className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgba(255,255,255,0.30)" }} />}
              </div>
              {expandedTestSections.pending && (
                <div className="px-3 pb-2 space-y-1">
                  {pendingItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                      <span className="mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{"\u25CF"}</span>
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
