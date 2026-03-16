/*
 * MyAlphas - Combined Alpha overview + Submission pipeline
 * Terminal Noir: Two views via tabs - Table (WQ-style) and Pipeline (submission tracking)
 * Merged from separate MyAlphas and Submissions pages
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Settings2,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  Trophy,
  Zap,
  BarChart3,
  Table as TableIcon,
  GitPullRequest,
} from "lucide-react";
import {
  factors,
  submissions,
  submissionPipeline,
  submissionStats,
  type Factor,
  type Submission,
} from "@/lib/mockData";
import { motion } from "framer-motion";

// ============================================================
// TABLE VIEW TYPES & CONFIG
// ============================================================
type AlphaRow = Factor & {
  submissionStatus: "unsubmitted" | "queued" | "backtesting" | "is_testing" | "os_testing" | "passed" | "failed" | "rejected";
  submittedAt?: string;
  osFitness?: number;
  compositeScore?: number;
};

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  width?: string;
}

const allColumns: ColumnDef[] = [
  { key: "id", label: "ID", defaultVisible: true, sortable: true, width: "90px" },
  { key: "name", label: "Name", defaultVisible: true, sortable: true, width: "200px" },
  { key: "market", label: "Market", defaultVisible: true, sortable: true, width: "80px" },
  { key: "type", label: "Type", defaultVisible: true, sortable: true, width: "90px" },
  { key: "submissionStatus", label: "Status", defaultVisible: true, sortable: true, width: "130px" },
  { key: "createdAt", label: "Date Created", defaultVisible: true, sortable: true, width: "130px" },
  { key: "osSharpe", label: "OS Sharpe", defaultVisible: true, sortable: true, width: "100px" },
  { key: "sharpe", label: "IS Sharpe", defaultVisible: true, sortable: true, width: "100px" },
  { key: "fitness", label: "Fitness", defaultVisible: true, sortable: true, width: "90px" },
  { key: "returns", label: "Returns", defaultVisible: true, sortable: true, width: "90px" },
  { key: "turnover", label: "Turnover", defaultVisible: true, sortable: true, width: "90px" },
  { key: "drawdown", label: "Drawdown", defaultVisible: false, sortable: true, width: "100px" },
  { key: "testsPassed", label: "Tests", defaultVisible: true, sortable: true, width: "80px" },
  { key: "submittedAt", label: "Date Submitted", defaultVisible: false, sortable: true, width: "140px" },
];

type SortDir = "asc" | "desc" | null;

// ============================================================
// PIPELINE VIEW HELPERS
// ============================================================
function pipelineStepStatus(sub: Submission, stepIndex: number) {
  if (sub.status === "rejected" && stepIndex >= sub.currentStep) return "rejected";
  if (stepIndex < sub.currentStep) return "completed";
  if (stepIndex === sub.currentStep && !["passed", "failed", "rejected"].includes(sub.status)) return "active";
  if (stepIndex === sub.currentStep && sub.status === "passed") return "completed";
  if (stepIndex === sub.currentStep && sub.status === "failed") return "failed";
  return "pending";
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function MyAlphas() {
  const [mainTab, setMainTab] = useState("table");

  // --- Table view state ---
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(allColumns.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterName, setFilterName] = useState("");
  const [filterMarket, setFilterMarket] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSharpeMin, setFilterSharpeMin] = useState("");
  const [filterReturnsMin, setFilterReturnsMin] = useState("");
  const [filterTurnoverMin, setFilterTurnoverMin] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set(["AF-004", "AF-009"]));

  // --- Pipeline view state ---
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState("all");

  // ============================================================
  // TABLE VIEW LOGIC
  // ============================================================
  const alphaRows: AlphaRow[] = useMemo(() => {
    return factors.map((f) => {
      const sub = submissions.find((s) => s.factorId === f.id);
      return {
        ...f,
        submissionStatus: sub ? sub.status as AlphaRow["submissionStatus"] : "unsubmitted",
        submittedAt: sub?.submittedAt,
        osFitness: sub?.fitness,
        compositeScore: sub?.osSharpe ? sub.osSharpe * 40 + (sub.fitness || 0) * 30 : undefined,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    return alphaRows.filter((r) => {
      if (filterName && !r.name.toLowerCase().includes(filterName.toLowerCase()) && !r.id.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterMarket !== "all" && r.market !== filterMarket) return false;
      if (filterStatus !== "all" && r.submissionStatus !== filterStatus) return false;
      if (filterType !== "all" && r.status !== filterType) return false;
      if (filterSharpeMin && r.osSharpe < parseFloat(filterSharpeMin)) return false;
      if (filterReturnsMin) {
        const rv = parseFloat(r.returns);
        if (!isNaN(rv) && rv < parseFloat(filterReturnsMin)) return false;
      }
      if (filterTurnoverMin) {
        const tv = parseFloat(r.turnover);
        if (!isNaN(tv) && tv < parseFloat(filterTurnoverMin)) return false;
      }
      return true;
    });
  }, [alphaRows, filterName, filterMarket, filterStatus, filterType, filterSharpeMin, filterReturnsMin, filterTurnoverMin]);

  const sorted = useMemo(() => {
    if (!sortDir || !sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "createdAt" || sortKey === "submittedAt") {
        av = a[sortKey as keyof AlphaRow] ? new Date(a[sortKey as keyof AlphaRow] as string).getTime() : 0;
        bv = b[sortKey as keyof AlphaRow] ? new Date(b[sortKey as keyof AlphaRow] as string).getTime() : 0;
      } else if (sortKey === "returns" || sortKey === "turnover" || sortKey === "drawdown") {
        av = parseFloat(String(a[sortKey as keyof AlphaRow])) || 0;
        bv = parseFloat(String(b[sortKey as keyof AlphaRow])) || 0;
      } else if (sortKey === "submissionStatus") {
        const order = { passed: 0, os_testing: 1, is_testing: 2, backtesting: 3, queued: 4, unsubmitted: 5, failed: 6, rejected: 7 };
        av = order[a.submissionStatus] ?? 99;
        bv = order[b.submissionStatus] ?? 99;
      } else {
        av = a[sortKey as keyof AlphaRow] ?? 0;
        bv = b[sortKey as keyof AlphaRow] ?? 0;
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else if (sortDir === "asc") { setSortDir(null); setSortKey(""); }
      else { setSortDir("desc"); }
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusBadge = (status: AlphaRow["submissionStatus"]) => {
    const map: Record<string, { label: string; className: string }> = {
      unsubmitted: { label: "UNSUBMITTED", className: "bg-neon-amber/15 text-neon-amber border-neon-amber/30 font-mono text-[10px]" },
      queued: { label: "QUEUED", className: "bg-muted text-muted-foreground border-border font-mono text-[10px]" },
      backtesting: { label: "BACKTESTING", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30 font-mono text-[10px]" },
      is_testing: { label: "IS TESTING", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30 font-mono text-[10px]" },
      os_testing: { label: "OS TESTING", className: "bg-neon-purple/15 text-neon-purple border-neon-purple/30 font-mono text-[10px]" },
      passed: { label: "PASSED", className: "bg-neon-green/15 text-neon-green border-neon-green/30 font-mono text-[10px]" },
      failed: { label: "FAILED", className: "bg-neon-red/15 text-neon-red border-neon-red/30 font-mono text-[10px]" },
      rejected: { label: "REJECTED", className: "bg-neon-red/15 text-neon-red border-neon-red/30 font-mono text-[10px]" },
    };
    const s = map[status] || map.unsubmitted;
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    if (sortDir === "desc") return <ArrowDown className="w-3 h-3 text-primary" />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 text-primary" />;
    return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  };

  const visibleCols = allColumns.filter((c) => visibleColumns.has(c.key));

  const renderCell = (row: AlphaRow, colKey: string) => {
    switch (colKey) {
      case "id":
        return <span className="font-mono text-xs text-muted-foreground">{row.id}</span>;
      case "name":
        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            <button onClick={(e) => { e.stopPropagation(); toggleStar(row.id); }} className="shrink-0">
              <Star className={`w-3.5 h-3.5 ${starred.has(row.id) ? "fill-neon-amber text-neon-amber" : "text-muted-foreground/40 hover:text-muted-foreground"}`} />
            </button>
            <span className="truncate text-sm">{row.name}</span>
          </div>
        );
      case "market":
        return (
          <Badge variant="outline" className={`text-[10px] font-mono ${row.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : "border-neon-purple/30 text-neon-purple"}`}>
            {row.market}
          </Badge>
        );
      case "type":
        return (
          <span className={`text-xs capitalize ${row.status === "active" ? "text-neon-green" : row.status === "testing" ? "text-neon-amber" : "text-muted-foreground"}`}>
            {row.status === "active" ? "Regular" : row.status === "testing" ? "Testing" : "Archived"}
          </span>
        );
      case "submissionStatus":
        return statusBadge(row.submissionStatus);
      case "createdAt":
        return <span className="font-mono text-xs text-muted-foreground">{row.createdAt}</span>;
      case "osSharpe":
        return (
          <span className={`font-mono text-sm ${row.osSharpe >= 1 ? "text-neon-green" : row.osSharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
            {row.osSharpe.toFixed(2)}
          </span>
        );
      case "sharpe":
        return <span className="font-mono text-sm">{row.sharpe.toFixed(2)}</span>;
      case "fitness":
        return (
          <span className={`font-mono text-sm ${row.fitness >= 1 ? "text-neon-green" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground"}`}>
            {row.fitness.toFixed(2)}
          </span>
        );
      case "returns":
        return <span className="font-mono text-sm">{row.returns}</span>;
      case "turnover":
        return <span className="font-mono text-sm">{row.turnover}</span>;
      case "drawdown":
        return <span className="font-mono text-sm text-neon-red">{row.drawdown}</span>;
      case "testsPassed":
        return (
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-neon-green">{row.testsPassed}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-neon-red">{row.testsFailed}</span>
            {row.testsPending > 0 && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{row.testsPending}</span>
              </>
            )}
          </div>
        );
      case "submittedAt":
        return <span className="font-mono text-xs text-muted-foreground">{row.submittedAt || "—"}</span>;
      default:
        return null;
    }
  };

  // ============================================================
  // PIPELINE VIEW LOGIC
  // ============================================================
  const filteredSubs = pipelineFilter === "all"
    ? submissions
    : pipelineFilter === "in_progress"
    ? submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status))
    : pipelineFilter === "passed"
    ? submissions.filter((s) => s.status === "passed")
    : submissions.filter((s) => s.status === "failed" || s.status === "rejected");

  const statusIcon = (status: Submission["status"]) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-4 h-4 text-neon-green" />;
      case "failed": return <XCircle className="w-4 h-4 text-neon-red" />;
      case "rejected": return <AlertTriangle className="w-4 h-4 text-neon-red" />;
      case "queued": return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" />;
    }
  };

  const statusLabel = (status: Submission["status"]) => {
    const map: Record<string, { label: string; className: string }> = {
      queued: { label: "QUEUED", className: "bg-muted text-muted-foreground border-border" },
      backtesting: { label: "BACKTESTING", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30" },
      is_testing: { label: "IS TESTING", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30" },
      os_testing: { label: "OS TESTING", className: "bg-neon-purple/15 text-neon-purple border-neon-purple/30" },
      passed: { label: "PASSED", className: "bg-neon-green/15 text-neon-green border-neon-green/30" },
      failed: { label: "FAILED", className: "bg-neon-red/15 text-neon-red border-neon-red/30" },
      rejected: { label: "REJECTED", className: "bg-neon-red/15 text-neon-red border-neon-red/30" },
    };
    const s = map[status] || map.queued;
    return <Badge variant="outline" className={`${s.className} font-mono text-[10px]`}>{s.label}</Badge>;
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Alphas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {factors.length} alphas · {submissions.filter((s) => s.status === "passed").length} passed · {submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status)).length} in pipeline
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="table" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-1.5">
            <TableIcon className="w-3.5 h-3.5" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary gap-1.5">
            <GitPullRequest className="w-3.5 h-3.5" />
            Submission Pipeline
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* TABLE VIEW */}
        {/* ============================================================ */}
        <TabsContent value="table" className="mt-4">
          <div className="terminal-card overflow-hidden">
            {/* Column selector + filter row header */}
            <div className="border-b border-border bg-secondary/30">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-2.5 w-[40px]">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 text-primary text-xs hover:text-primary/80 transition-colors whitespace-nowrap">
                              <Settings2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Columns</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 bg-popover border-border" align="start">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Toggle Columns</p>
                              {allColumns.map((col) => (
                                <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-secondary/50 cursor-pointer">
                                  <Checkbox
                                    checked={visibleColumns.has(col.key)}
                                    onCheckedChange={() => toggleColumn(col.key)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span className="text-xs">{col.label}</span>
                                </label>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </th>
                      <th className="w-[28px]" />
                      {visibleCols.map((col) => (
                        <th
                          key={col.key}
                          className={`px-3 py-2.5 text-left ${col.sortable ? "cursor-pointer hover:bg-secondary/50" : ""}`}
                          style={{ minWidth: col.width }}
                          onClick={() => col.sortable && handleSort(col.key)}
                        >
                          <span className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground font-medium whitespace-nowrap select-none">
                            {col.label}
                            {col.sortable && <SortIcon colKey={col.key} />}
                          </span>
                        </th>
                      ))}
                      <th className="w-[36px]" />
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Filter row */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    <tr className="bg-secondary/20">
                      <td className="px-2 py-1.5 w-[40px]" />
                      <td className="w-[28px]" />
                      {visibleCols.map((col) => (
                        <td key={col.key} className="px-2 py-1.5" style={{ minWidth: col.width }}>
                          {col.key === "name" || col.key === "id" ? (
                            <div className="relative">
                              <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                              <Input
                                placeholder="Search"
                                value={filterName}
                                onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
                                className="h-7 text-xs pl-6 bg-input border-border"
                              />
                            </div>
                          ) : col.key === "market" ? (
                            <Select value={filterMarket} onValueChange={(v) => { setFilterMarket(v); setPage(1); }}>
                              <SelectTrigger className="h-7 text-xs bg-input border-border">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="CEX">CEX</SelectItem>
                                <SelectItem value="DEX">DEX</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : col.key === "submissionStatus" ? (
                            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                              <SelectTrigger className="h-7 text-xs bg-input border-border">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="unsubmitted">Unsubmitted</SelectItem>
                                <SelectItem value="queued">Queued</SelectItem>
                                <SelectItem value="backtesting">Backtesting</SelectItem>
                                <SelectItem value="is_testing">IS Testing</SelectItem>
                                <SelectItem value="os_testing">OS Testing</SelectItem>
                                <SelectItem value="passed">Passed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : col.key === "type" ? (
                            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                              <SelectTrigger className="h-7 text-xs bg-input border-border">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Regular</SelectItem>
                                <SelectItem value="testing">Testing</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (col.key === "osSharpe" || col.key === "sharpe" || col.key === "fitness") ? (
                            <Input
                              placeholder="e.g > 1"
                              value={col.key === "osSharpe" ? filterSharpeMin : ""}
                              onChange={(e) => { if (col.key === "osSharpe") { setFilterSharpeMin(e.target.value); setPage(1); } }}
                              className="h-7 text-xs bg-input border-border font-mono"
                            />
                          ) : col.key === "returns" ? (
                            <Input
                              placeholder="e.g > 1"
                              value={filterReturnsMin}
                              onChange={(e) => { setFilterReturnsMin(e.target.value); setPage(1); }}
                              className="h-7 text-xs bg-input border-border font-mono"
                            />
                          ) : col.key === "turnover" ? (
                            <Input
                              placeholder="e.g > 1"
                              value={filterTurnoverMin}
                              onChange={(e) => { setFilterTurnoverMin(e.target.value); setPage(1); }}
                              className="h-7 text-xs bg-input border-border font-mono"
                            />
                          ) : (
                            <div className="h-7" />
                          )}
                        </td>
                      ))}
                      <td className="w-[36px]" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Data rows */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody>
                  {paginated.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 hover:bg-secondary/20 transition-colors group"
                    >
                      <td className="px-2 py-2.5 w-[40px]">
                        <span className="text-[10px] font-mono text-muted-foreground/50">
                          {(page - 1) * pageSize + i + 1}
                        </span>
                      </td>
                      <td className="w-[28px] py-2.5">
                        <button onClick={() => toggleStar(row.id)}>
                          <Star className={`w-3.5 h-3.5 ${starred.has(row.id) ? "fill-neon-amber text-neon-amber" : "text-muted-foreground/30 hover:text-muted-foreground"}`} />
                        </button>
                      </td>
                      {visibleCols.map((col) => (
                        <td key={col.key} className="px-3 py-2.5" style={{ minWidth: col.width }}>
                          {renderCell(row, col.key)}
                        </td>
                      ))}
                      <td className="w-[36px] py-2.5">
                        <Link href={`/alphas/${row.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={visibleCols.length + 3} className="text-center py-12 text-muted-foreground text-sm">
                        No alphas match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Page size</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-16 text-xs bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>out of {sorted.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs border-border" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className={`h-7 w-7 text-xs p-0 ${p !== page ? "border-border" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 text-xs border-border" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* PIPELINE VIEW */}
        {/* ============================================================ */}
        <TabsContent value="pipeline" className="mt-4 space-y-4">
          {/* Pipeline Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  <BarChart3 className="w-3.5 h-3.5" /> Total
                </div>
                <div className="font-mono text-2xl font-bold">{submissionStats.total}</div>
                <div className="text-xs text-muted-foreground mt-1">submissions</div>
              </CardContent>
            </Card>
            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-neon-green uppercase tracking-wider mb-2">
                  <CheckCircle className="w-3.5 h-3.5" /> Passed
                </div>
                <div className="font-mono text-2xl font-bold text-neon-green">{submissionStats.passed}</div>
                <div className="text-xs text-muted-foreground mt-1">pass rate: {submissionStats.passRate}</div>
              </CardContent>
            </Card>
            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-neon-cyan uppercase tracking-wider mb-2">
                  <Loader2 className="w-3.5 h-3.5" /> In Progress
                </div>
                <div className="font-mono text-2xl font-bold text-neon-cyan">{submissionStats.inProgress}</div>
                <div className="text-xs text-muted-foreground mt-1">avg time: {submissionStats.avgProcessingTime}</div>
              </CardContent>
            </Card>
            <Card className="terminal-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-neon-red uppercase tracking-wider mb-2">
                  <XCircle className="w-3.5 h-3.5" /> Failed
                </div>
                <div className="font-mono text-2xl font-bold text-neon-red">{submissionStats.failed + 1}</div>
                <div className="text-xs text-muted-foreground mt-1">{submissionStats.rejected} rejected</div>
              </CardContent>
            </Card>
          </div>

          {/* Pipeline Filter Tabs */}
          <Tabs value={pipelineFilter} onValueChange={setPipelineFilter}>
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                All ({submissions.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan">
                In Progress ({submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status)).length})
              </TabsTrigger>
              <TabsTrigger value="passed" className="text-xs data-[state=active]:bg-neon-green/20 data-[state=active]:text-neon-green">
                Passed ({submissions.filter((s) => s.status === "passed").length})
              </TabsTrigger>
              <TabsTrigger value="failed" className="text-xs data-[state=active]:bg-neon-red/20 data-[state=active]:text-neon-red">
                Failed ({submissions.filter((s) => s.status === "failed" || s.status === "rejected").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={pipelineFilter} className="mt-4 space-y-3">
              {filteredSubs.map((sub, i) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Collapsible
                    open={expandedId === sub.id}
                    onOpenChange={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                  >
                    <Card className="terminal-card overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="py-3 px-4 cursor-pointer hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {statusIcon(sub.status)}
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-muted-foreground">{sub.id}</span>
                                  <span className="font-medium text-sm">{sub.factorName}</span>
                                  <Badge variant="outline" className={`text-[10px] font-mono ${sub.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : "border-neon-purple/30 text-neon-purple"}`}>
                                    {sub.market}
                                  </Badge>
                                  {statusLabel(sub.status)}
                                  {sub.epochQualified && (
                                    <Badge variant="outline" className="bg-neon-amber/10 text-neon-amber border-neon-amber/30 text-[10px] font-mono">
                                      <Trophy className="w-2.5 h-2.5 mr-0.5" /> EPOCH QUALIFIED
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  Submitted {sub.submittedAt}
                                  {sub.estimatedTime && (
                                    <span className="ml-2 text-neon-cyan">ETA: {sub.estimatedTime}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {sub.osSharpe !== undefined && (
                                <div className="hidden md:flex items-center gap-4 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">OS Sharpe </span>
                                    <span className={`font-mono ${sub.osSharpe >= 1 ? "text-neon-green" : sub.osSharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
                                      {sub.osSharpe.toFixed(2)}
                                    </span>
                                  </div>
                                  {sub.fitness !== undefined && (
                                    <div>
                                      <span className="text-muted-foreground">Fitness </span>
                                      <span className="font-mono">{sub.fitness.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={sub.progress} className="h-1.5 bg-secondary" />
                                <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">{sub.progress}%</span>
                              </div>
                              {expandedId === sub.id ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4 space-y-4">
                          {/* Expression */}
                          <div className="bg-[#0a0f14] border border-border rounded-md p-3">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Expression</div>
                            <code className="font-mono text-xs text-neon-cyan">{sub.expression}</code>
                          </div>

                          {/* Pipeline steps */}
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Pipeline Progress</div>
                            <div className="flex items-center gap-0">
                              {submissionPipeline.map((step, idx) => {
                                const stepStatus = pipelineStepStatus(sub, idx);
                                return (
                                  <div key={step.step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border-2 ${
                                        stepStatus === "completed" ? "bg-neon-green/20 border-neon-green text-neon-green" :
                                        stepStatus === "active" ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan animate-pulse" :
                                        stepStatus === "failed" ? "bg-neon-red/20 border-neon-red text-neon-red" :
                                        stepStatus === "rejected" ? "bg-neon-red/20 border-neon-red text-neon-red" :
                                        "bg-secondary border-border text-muted-foreground"
                                      }`}>
                                        {stepStatus === "completed" ? <CheckCircle className="w-3.5 h-3.5" /> :
                                         stepStatus === "active" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                         stepStatus === "failed" || stepStatus === "rejected" ? <XCircle className="w-3.5 h-3.5" /> :
                                         idx}
                                      </div>
                                      <span className={`text-[9px] mt-1 text-center leading-tight ${
                                        stepStatus === "completed" ? "text-neon-green" :
                                        stepStatus === "active" ? "text-neon-cyan" :
                                        stepStatus === "failed" || stepStatus === "rejected" ? "text-neon-red" :
                                        "text-muted-foreground"
                                      }`}>
                                        {step.label}
                                      </span>
                                    </div>
                                    {idx < submissionPipeline.length - 1 && (
                                      <div className={`h-0.5 flex-1 -mx-1 mt-[-14px] ${
                                        stepStatus === "completed" ? "bg-neon-green/50" : "bg-border"
                                      }`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Results grid */}
                          {(sub.isSharpe !== undefined || sub.osSharpe !== undefined) && (
                            <div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Results</div>
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                {sub.isSharpe !== undefined && (
                                  <div className="bg-secondary/30 rounded-md p-2.5">
                                    <div className="text-[10px] text-muted-foreground">IS Sharpe</div>
                                    <div className="font-mono text-sm mt-0.5">{sub.isSharpe.toFixed(2)}</div>
                                  </div>
                                )}
                                {sub.osSharpe !== undefined && (
                                  <div className="bg-secondary/30 rounded-md p-2.5">
                                    <div className="text-[10px] text-muted-foreground">OS Sharpe</div>
                                    <div className={`font-mono text-sm mt-0.5 ${sub.osSharpe >= 1 ? "text-neon-green" : sub.osSharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
                                      {sub.osSharpe.toFixed(2)}
                                    </div>
                                  </div>
                                )}
                                {sub.fitness !== undefined && (
                                  <div className="bg-secondary/30 rounded-md p-2.5">
                                    <div className="text-[10px] text-muted-foreground">Fitness</div>
                                    <div className="font-mono text-sm mt-0.5">{sub.fitness.toFixed(2)}</div>
                                  </div>
                                )}
                                {sub.returns && (
                                  <div className="bg-secondary/30 rounded-md p-2.5">
                                    <div className="text-[10px] text-muted-foreground">Returns</div>
                                    <div className="font-mono text-sm mt-0.5">{sub.returns}</div>
                                  </div>
                                )}
                                {sub.turnover && (
                                  <div className="bg-secondary/30 rounded-md p-2.5">
                                    <div className="text-[10px] text-muted-foreground">Turnover</div>
                                    <div className="font-mono text-sm mt-0.5">{sub.turnover}</div>
                                  </div>
                                )}
                                {sub.drawdown && (
                                  <div className="bg-secondary/30 rounded-md p-2.5">
                                    <div className="text-[10px] text-muted-foreground">Drawdown</div>
                                    <div className="font-mono text-sm mt-0.5 text-neon-red">{sub.drawdown}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Test results */}
                          {sub.testsPassed !== undefined && (
                            <div className="flex items-center gap-4 text-xs">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-neon-green" />
                                <span className="text-neon-green font-mono">{sub.testsPassed} PASS</span>
                              </div>
                              {sub.testsFailed !== undefined && sub.testsFailed > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <XCircle className="w-3.5 h-3.5 text-neon-red" />
                                  <span className="text-neon-red font-mono">{sub.testsFailed} FAIL</span>
                                </div>
                              )}
                              {sub.testsPending !== undefined && sub.testsPending > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground font-mono">{sub.testsPending} PENDING</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Fail reasons */}
                          {sub.failReasons && sub.failReasons.length > 0 && (
                            <div className="bg-neon-red/5 border border-neon-red/20 rounded-md p-3">
                              <div className="text-[10px] uppercase tracking-wider text-neon-red mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Failure Reasons
                              </div>
                              <ul className="space-y-1">
                                {sub.failReasons.map((reason, idx) => (
                                  <li key={idx} className="text-xs text-neon-red/80 flex items-start gap-1.5">
                                    <span className="text-neon-red mt-0.5">•</span>
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <Link href={`/alphas/${sub.factorId}`}>
                              <Button variant="outline" size="sm" className="border-border text-xs">
                                <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                                View Alpha Detail
                              </Button>
                            </Link>
                            {sub.status === "failed" && (
                              <Button variant="outline" size="sm" className="border-neon-amber/30 text-neon-amber text-xs hover:bg-neon-amber/10">
                                <Zap className="w-3.5 h-3.5 mr-1" />
                                Resubmit
                              </Button>
                            )}
                            {sub.epochQualified && (
                              <Link href="/leaderboard">
                                <Button variant="outline" size="sm" className="border-neon-amber/30 text-neon-amber text-xs hover:bg-neon-amber/10">
                                  <Trophy className="w-3.5 h-3.5 mr-1" />
                                  View in Leaderboard
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </motion.div>
              ))}
              {filteredSubs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No submissions match the current filter.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
