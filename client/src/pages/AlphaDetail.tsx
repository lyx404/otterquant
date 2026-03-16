/*
 * AlphaDetail - Factor detail page (WorldQuant BRAIN style)
 * Charts: PnL / Sharpe / Turnover / Returns / Drawdown
 * Summary table, Testing Status, Correlation
 * Train period = cyan, Test period = orange
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useState, useMemo } from "react";
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
  Legend,
  ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
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
import { motion } from "framer-motion";

type ChartType = "pnl" | "sharpe" | "turnover" | "returns" | "drawdown";

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

  // Generate chart data
  const pnlData = useMemo(() => generatePnLData(), []);
  const sharpeData = useMemo(() => generateSharpeData(), []);
  const turnoverData = useMemo(() => generateTurnoverData(), []);
  const returnsData = useMemo(() => generateReturnsData(), []);
  const drawdownData = useMemo(() => generateDrawdownData(), []);

  const getChartData = () => {
    const dataMap = { pnl: pnlData, sharpe: sharpeData, turnover: turnoverData, returns: returnsData, drawdown: drawdownData };
    const raw = dataMap[chartType];
    // Merge train + test into single array with separate fields
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
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold">{factor.name}</h1>
            <Badge variant="outline" className={`text-xs ${factor.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : "border-neon-purple/30 text-neon-purple"}`}>
              {factor.market}
            </Badge>
            <Badge variant="outline" className={`text-xs ${factor.status === "active" ? "bg-neon-green/10 text-neon-green border-neon-green/20" : factor.status === "testing" ? "bg-neon-amber/10 text-neon-amber border-neon-amber/20" : "bg-muted text-muted-foreground border-border"}`}>
              {factor.status}
            </Badge>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">{factor.id} &middot; Created {factor.createdAt}</p>
        </div>
      </div>

      {/* Factor Expression */}
      <Card className="terminal-card">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Expression:</span>
            <code className="text-sm font-mono text-neon-cyan">{factor.expression}</code>
          </div>
        </CardContent>
      </Card>

      {/* Show/Hide Test Period Toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant={showTestPeriod ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setShowTestPeriod(!showTestPeriod)}
        >
          {showTestPeriod ? "Hide test period" : "Show test period"}
        </Button>
        {showTestPeriod && (
          <span className="text-xs text-neon-amber bg-neon-amber/10 px-3 py-1 rounded-full">
            Test period and overall stats are hidden by default when test period is specified.
          </span>
        )}
      </div>

      {/* Chart Section */}
      <Card className="terminal-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neon-cyan" />
              Chart
            </CardTitle>
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[160px] h-8 text-sm bg-secondary border-border">
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
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "turnover" ? (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 280)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "oklch(0.55 0.01 280)" }}
                    tickFormatter={(d) => d.substring(0, 7)}
                    interval={Math.floor(chartData.length / 8)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 280)" }} tickFormatter={formatYAxis} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.14 0.01 280)",
                      border: "1px solid oklch(0.25 0.01 280)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    labelStyle={{ color: "oklch(0.55 0.01 280)" }}
                  />
                  <Bar dataKey="train" fill="oklch(0.78 0.15 190 / 0.7)" name="Train" />
                  <Bar dataKey="test" fill="oklch(0.80 0.18 80 / 0.7)" name="Test" />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 280)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "oklch(0.55 0.01 280)" }}
                    tickFormatter={(d) => d.substring(0, 7)}
                    interval={Math.floor(chartData.length / 8)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.55 0.01 280)" }} tickFormatter={formatYAxis} />
                  {chartType === "sharpe" && <ReferenceLine y={0} stroke="oklch(0.35 0.01 280)" />}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.14 0.01 280)",
                      border: "1px solid oklch(0.25 0.01 280)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    labelStyle={{ color: "oklch(0.55 0.01 280)" }}
                  />
                  <Line type="monotone" dataKey="train" stroke="oklch(0.78 0.15 190)" strokeWidth={1.5} dot={false} name="Train" connectNulls={false} />
                  <Line type="monotone" dataKey="test" stroke="oklch(0.80 0.18 80)" strokeWidth={1.5} dot={false} name="Test" connectNulls={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-neon-cyan rounded" />
              <span className="text-xs text-muted-foreground">Train</span>
            </div>
            {showTestPeriod && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-neon-amber rounded" />
                <span className="text-xs text-muted-foreground">Test (OS)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card className="terminal-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-neon-cyan" />
              {summaryPeriod} Summary
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-2">Period</span>
              {(["IS", "OS"] as const).map((p) => (
                <Button
                  key={p}
                  variant={summaryPeriod === p ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs px-3 ${summaryPeriod === p ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                  onClick={() => setSummaryPeriod(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aggregate Data Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(aggData).map(([key, val]) => (
              <div key={key} className="text-center p-3 bg-secondary/30 rounded-lg">
                <div className="text-xs text-muted-foreground capitalize mb-1">{key}</div>
                <div className="text-lg font-mono font-bold text-foreground">{val}</div>
              </div>
            ))}
          </div>

          {/* Yearly Table */}
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-neon-cyan font-mono">Year</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Sharpe</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Turnover</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Fitness</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Returns</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Drawdown</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Margin</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Long Count</TableHead>
                <TableHead className="text-xs text-neon-cyan font-mono">Short Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryData.map((row) => (
                <TableRow key={row.year} className="border-border hover:bg-secondary/20">
                  <TableCell className="font-mono text-sm font-medium">{row.year}</TableCell>
                  <TableCell className={`font-mono text-sm ${row.sharpe >= 1 ? "text-neon-green" : row.sharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
                    {row.sharpe.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.turnover}</TableCell>
                  <TableCell className="font-mono text-sm">{row.fitness.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm">{row.returns}</TableCell>
                  <TableCell className="font-mono text-sm text-neon-red">{row.drawdown}</TableCell>
                  <TableCell className="font-mono text-sm">{row.margin}</TableCell>
                  <TableCell className="font-mono text-sm">{row.longCount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-sm">{row.shortCount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Correlation + Testing Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Correlation */}
        <Card className="terminal-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-neon-cyan" />
                Correlation
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Last Run: {correlationData.lastRun}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div>
                <span className="text-xs text-muted-foreground">Self Correlation</span>
              </div>
              <div>
                <span className="text-xs text-neon-cyan mr-2">Maximum</span>
                <span className="font-mono text-sm">{correlationData.selfCorrelation.maximum}</span>
              </div>
              <div>
                <span className="text-xs text-neon-green mr-2">Minimum</span>
                <span className="font-mono text-sm">{correlationData.selfCorrelation.minimum}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Testing Status */}
        <Card className="terminal-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-neon-green" />
              IS Testing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* PASS */}
            <div
              className="border-l-2 border-neon-green bg-neon-green/5 rounded-r-md cursor-pointer"
              onClick={() => setExpandedTestSections((s) => ({ ...s, pass: !s.pass }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-neon-green">{passItems.length} PASS</span>
                {expandedTestSections.pass ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedTestSections.pass && (
                <div className="px-3 pb-2 space-y-1">
                  {passItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-neon-green mt-0.5">●</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FAIL */}
            <div
              className="border-l-2 border-neon-red bg-neon-red/5 rounded-r-md cursor-pointer"
              onClick={() => setExpandedTestSections((s) => ({ ...s, fail: !s.fail }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-neon-red">{failItems.length} FAIL</span>
                {expandedTestSections.fail ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedTestSections.fail && (
                <div className="px-3 pb-2 space-y-1">
                  {failItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-neon-red mt-0.5">●</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PENDING */}
            <div
              className="border-l-2 border-muted-foreground bg-muted/30 rounded-r-md cursor-pointer"
              onClick={() => setExpandedTestSections((s) => ({ ...s, pending: !s.pending }))}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm font-medium text-muted-foreground">{pendingItems.length} PENDING</span>
                {expandedTestSections.pending ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
              {expandedTestSections.pending && (
                <div className="px-3 pb-2 space-y-1">
                  {pendingItems.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5">●</span>
                      <span>{t.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
