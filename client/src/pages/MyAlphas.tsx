/*
 * MyAlphas — Indigo/Sky + Slate Design System
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Table: Status+Actions pinned right, unlimited height, aligned colgroup
 * Animation: 200ms ease-in-out
 * Pure Tailwind classes — zero inline styles
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Settings2,
  Star,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  factors,
  submissions,
  submissionStats,
  type Factor,
} from "@/lib/mockData";

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
  width: string;
  align?: "left" | "right";
}

const dataColumns: ColumnDef[] = [
  { key: "id", label: "ID", defaultVisible: true, sortable: true, width: "80px" },
  { key: "name", label: "Name", defaultVisible: true, sortable: true, width: "180px" },
  { key: "status_col", label: "Status", defaultVisible: true, sortable: true, width: "120px" },
  { key: "market", label: "Market", defaultVisible: true, sortable: true, width: "72px" },
  { key: "type", label: "Type", defaultVisible: true, sortable: true, width: "80px" },
  { key: "createdAt", label: "Date Created", defaultVisible: true, sortable: true, width: "110px" },
  { key: "osSharpe", label: "OS Sharpe", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "sharpe", label: "IS Sharpe", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "fitness", label: "Fitness", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "returns", label: "Returns", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "turnover", label: "Turnover", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "drawdown", label: "Drawdown", defaultVisible: false, sortable: true, width: "90px", align: "right" },
  { key: "testsPassed", label: "Tests", defaultVisible: true, sortable: true, width: "72px", align: "right" },
  { key: "submittedAt", label: "Date Submitted", defaultVisible: false, sortable: true, width: "120px" },
];

type SortDir = "asc" | "desc" | null;

/* Status badge config */
const statusConfig: Record<string, { label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  unsubmitted: { label: "UNSUBMITTED", colorClass: "text-amber-500 dark:text-amber-400", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/25" },
  queued: { label: "IN PROGRESS", colorClass: "text-secondary", bgClass: "bg-secondary/10", borderClass: "border-secondary/25" },
  backtesting: { label: "IN PROGRESS", colorClass: "text-secondary", bgClass: "bg-secondary/10", borderClass: "border-secondary/25" },
  is_testing: { label: "IN PROGRESS", colorClass: "text-secondary", bgClass: "bg-secondary/10", borderClass: "border-secondary/25" },
  os_testing: { label: "IN PROGRESS", colorClass: "text-secondary", bgClass: "bg-secondary/10", borderClass: "border-secondary/25" },
  passed: { label: "PASSED", colorClass: "text-success", bgClass: "bg-success/10", borderClass: "border-success/20" },
  failed: { label: "FAILED", colorClass: "text-destructive", bgClass: "bg-destructive/10", borderClass: "border-destructive/20" },
  rejected: { label: "FAILED", colorClass: "text-destructive", bgClass: "bg-destructive/10", borderClass: "border-destructive/20" },
};

export default function MyAlphas() {
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(dataColumns.filter((c) => c.defaultVisible).map((c) => c.key))
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
  const [cardFilter, setCardFilter] = useState<"all" | "passed" | "in_progress" | "failed">("all");
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const items = statsRef.current.querySelectorAll(".fade-item");
    gsap.set(items, { y: 30, opacity: 0 });
    gsap.to(items, {
      y: 0, opacity: 1,
      duration: 0.6, stagger: 0.06, ease: "power3.out", delay: 0.3,
    });
  }, []);

  /* ── Data ── */
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
      if (cardFilter === "passed" && r.submissionStatus !== "passed") return false;
      if (cardFilter === "in_progress" && !["queued", "backtesting", "is_testing", "os_testing"].includes(r.submissionStatus)) return false;
      if (cardFilter === "failed" && r.submissionStatus !== "failed" && r.submissionStatus !== "rejected") return false;
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
  }, [alphaRows, filterName, filterMarket, filterStatus, filterType, filterSharpeMin, filterReturnsMin, filterTurnoverMin, cardFilter]);

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
      } else if (sortKey === "submissionStatus" || sortKey === "status_col") {
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

  /* ── Starred items pinned to top ── */
  const starSorted = useMemo(() => {
    const starredItems = sorted.filter((r) => starred.has(r.id));
    const unstarredItems = sorted.filter((r) => !starred.has(r.id));
    return [...starredItems, ...unstarredItems];
  }, [sorted, starred]);

  const totalPages = Math.max(1, Math.ceil(starSorted.length / pageSize));
  const paginated = starSorted.slice((page - 1) * pageSize, page * pageSize);

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

  const visibleCols = dataColumns.filter((c) => visibleColumns.has(c.key));
  const hasActiveFilters = filterName || filterMarket !== "all" || filterStatus !== "all" || filterType !== "all" || filterSharpeMin || filterReturnsMin || filterTurnoverMin;

  /* ── Status badge renderer ── */
  const renderStatusBadge = (status: AlphaRow["submissionStatus"]) => {
    const s = statusConfig[status] || statusConfig.unsubmitted;
    let detail = "";
    if (["queued", "backtesting", "is_testing", "os_testing"].includes(status)) {
      const detailMap: Record<string, string> = { queued: "Queued", backtesting: "Backtest", is_testing: "IS Test", os_testing: "OS Test" };
      detail = detailMap[status] || "";
    }
    return (
      <div className="flex flex-col items-start gap-0.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] whitespace-nowrap border ${s.bgClass} ${s.colorClass} ${s.borderClass}`}>
          {s.label}
        </span>
        {detail && (
          <span className="text-[9px] font-mono pl-2 text-muted-foreground">{detail}</span>
        )}
      </div>
    );
  };

  /* ── Cell renderer ── */
  const renderCell = (row: AlphaRow, colKey: string) => {
    switch (colKey) {
      case "id":
        return <span className="font-mono text-xs text-muted-foreground">{row.id}</span>;
      case "status_col":
        return renderStatusBadge(row.submissionStatus);
      case "name":
        return (
          <div className="flex items-center gap-2 min-w-0 max-w-[180px]">
            <span className="truncate text-sm text-foreground">{row.name}</span>
          </div>
        );
      case "market":
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] border ${
            row.market === "CEX"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/25"
          }`}>
            {row.market}
          </span>
        );
      case "type":
        return (
          <span className={`text-xs capitalize ${
            row.status === "active" ? "text-success" : row.status === "testing" ? "text-amber-500 dark:text-amber-400" : "text-muted-foreground"
          }`}>
            {row.status === "active" ? "Regular" : row.status === "testing" ? "Testing" : "Archived"}
          </span>
        );
      case "createdAt":
        return <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{row.createdAt}</span>;
      case "osSharpe":
        return (
          <span className={`font-mono text-sm tabular-nums ${
            row.osSharpe >= 1 ? "text-success" : row.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
          }`}>
            {row.osSharpe.toFixed(2)}
          </span>
        );
      case "sharpe":
        return <span className="font-mono text-sm tabular-nums text-foreground">{row.sharpe.toFixed(2)}</span>;
      case "fitness":
        return (
          <span className={`font-mono text-sm tabular-nums ${
            row.fitness >= 1 ? "text-success" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground"
          }`}>
            {row.fitness.toFixed(2)}
          </span>
        );
      case "returns":
        return <span className="font-mono text-sm tabular-nums text-foreground whitespace-nowrap">{row.returns}</span>;
      case "turnover":
        return <span className="font-mono text-sm tabular-nums text-foreground whitespace-nowrap">{row.turnover}</span>;
      case "drawdown":
        return <span className="font-mono text-sm tabular-nums text-destructive whitespace-nowrap">{row.drawdown}</span>;
      case "testsPassed":
        return (
          <div className="flex items-center gap-1 font-mono text-xs tabular-nums justify-end">
            <span className="text-success">{row.testsPassed}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-destructive">{row.testsFailed}</span>
            {row.testsPending > 0 && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{row.testsPending}</span>
              </>
            )}
          </div>
        );
      case "submittedAt":
        return <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{row.submittedAt || "\u2014"}</span>;
      default:
        return null;
    }
  };

  /* ── Sort icon ── */
  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortDir === "desc") return <ArrowDown className="w-3 h-3 text-primary" />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 text-primary" />;
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  };

  /* ── Pagination range ── */
  const getPageRange = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const ColGroup = () => (
    <colgroup>
      <col style={{ width: "36px" }} />
      {visibleCols.map((col) => (
        <col key={col.key} style={{ width: col.width }} />
      ))}
      <col style={{ width: "100px" }} />
    </colgroup>
  );

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-foreground">
            My Alphas
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-base text-muted-foreground">
            {factors.length} alphas &middot; {submissions.filter((s) => s.status === "passed").length} passed &middot; {submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status)).length} in pipeline
          </p>
        </div>
      </div>

      {/* Pipeline Stats — clickable filter cards */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
        <button
          onClick={() => { setCardFilter(cardFilter === "all" ? "all" : "all"); setCardFilter("all"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left transition-all duration-200 ease-in-out cursor-pointer ${
            cardFilter === "all" ? "ring-2 ring-primary border-primary/30" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 label-upper mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Total
          </div>
          <div className="stat-value text-2xl font-bold text-foreground truncate">{submissionStats.total}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">submissions</div>
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "passed" ? "all" : "passed"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left transition-all duration-200 ease-in-out cursor-pointer ${
            cardFilter === "passed" ? "ring-2 ring-success border-success/30" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-success">
            <CheckCircle className="w-3.5 h-3.5" /> Passed
          </div>
          <div className="stat-value text-2xl font-bold text-success truncate">{submissionStats.passed}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">pass rate: {submissionStats.passRate}</div>
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "in_progress" ? "all" : "in_progress"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left transition-all duration-200 ease-in-out cursor-pointer ${
            cardFilter === "in_progress" ? "ring-2 ring-secondary border-secondary/30" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-secondary">
            <Loader2 className="w-3.5 h-3.5" /> In Progress
          </div>
          <div className="stat-value text-2xl font-bold text-secondary truncate">{submissionStats.inProgress}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">avg time: {submissionStats.avgProcessingTime}</div>
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "failed" ? "all" : "failed"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left transition-all duration-200 ease-in-out cursor-pointer ${
            cardFilter === "failed" ? "ring-2 ring-destructive border-destructive/30" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-destructive">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </div>
          <div className="stat-value text-2xl font-bold text-destructive truncate">{submissionStats.failed + 1}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">{submissionStats.rejected} rejected</div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          DATA TABLE
          ═══════════════════════════════════════════ */}
      <div className="surface-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-b border-border bg-card">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={filterName}
              onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
              className="h-8 text-xs pl-8 rounded-lg bg-card border-border"
            />
          </div>

          <Select value={filterMarket} onValueChange={(v) => { setFilterMarket(v); setPage(1); }}>
            <SelectTrigger className={`h-8 w-auto min-w-[80px] text-xs gap-1 rounded-full border ${
              filterMarket !== "all" ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border text-muted-foreground"
            }`}>
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="CEX">CEX</SelectItem>
              <SelectItem value="DEX">DEX</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className={`h-8 w-auto min-w-[100px] text-xs gap-1 rounded-full border ${
              filterStatus !== "all" ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border text-muted-foreground"
            }`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
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

          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className={`h-8 w-auto min-w-[80px] text-xs gap-1 rounded-full border ${
              filterType !== "all" ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border text-muted-foreground"
            }`}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="active">Regular</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Numeric filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out border ${
                (filterSharpeMin || filterReturnsMin || filterTurnoverMin)
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}>
                <BarChart3 className="w-3 h-3" />
                Metrics
                {(filterSharpeMin || filterReturnsMin || filterTurnoverMin) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 rounded-2xl" align="start">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Minimum Thresholds</p>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] mb-1 block text-muted-foreground">OS Sharpe</label>
                  <Input placeholder="e.g. 1.0" value={filterSharpeMin} onChange={(e) => { setFilterSharpeMin(e.target.value); setPage(1); }} className="h-7 text-xs font-mono rounded-lg bg-card border-border" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] mb-1 block text-muted-foreground">Returns</label>
                  <Input placeholder="e.g. 5.0" value={filterReturnsMin} onChange={(e) => { setFilterReturnsMin(e.target.value); setPage(1); }} className="h-7 text-xs font-mono rounded-lg bg-card border-border" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.15em] mb-1 block text-muted-foreground">Turnover</label>
                  <Input placeholder="e.g. 30" value={filterTurnoverMin} onChange={(e) => { setFilterTurnoverMin(e.target.value); setPage(1); }} className="h-7 text-xs font-mono rounded-lg bg-card border-border" />
                </div>
                {(filterSharpeMin || filterReturnsMin || filterTurnoverMin) && (
                  <button
                    className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => { setFilterSharpeMin(""); setFilterReturnsMin(""); setFilterTurnoverMin(""); setPage(1); }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex-1" />

          {hasActiveFilters && (
            <button
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15"
              onClick={() => {
                setFilterName(""); setFilterMarket("all"); setFilterStatus("all"); setFilterType("all");
                setFilterSharpeMin(""); setFilterReturnsMin(""); setFilterTurnoverMin(""); setPage(1);
              }}
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <Settings2 className="w-3.5 h-3.5" />
                Columns
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 rounded-2xl" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium mb-2 text-muted-foreground">Toggle Columns</p>
                {dataColumns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded-lg cursor-pointer">
                    <Checkbox
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-foreground">{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative">
          <table className="w-full" style={{ minWidth: "900px" }}>
            <ColGroup />
            <thead>
              <tr className="bg-accent dark:bg-slate-900/50">
                <th className="px-2 py-2.5 text-center">
                  <Star className="w-3 h-3 text-muted-foreground mx-auto" />
                </th>
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 transition-all duration-200 ease-in-out ${col.sortable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50" : ""} ${col.align === "right" ? "text-right" : "text-left"} ${sortKey === col.key ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className={`flex items-center gap-1.5 label-upper whitespace-nowrap select-none ${col.align === "right" ? "justify-end" : ""}`}>
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </span>
                  </th>
                ))}
                {/* Actions header — sticky right */}
                <th className="px-3 py-2.5 text-right sticky right-0 z-[2] bg-accent dark:bg-slate-900/50 border-l border-border shadow-[-6px_0_12px_rgba(0,0,0,0.04)] dark:shadow-[-6px_0_12px_rgba(0,0,0,0.3)]">
                  <span className="label-upper">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr
                  key={row.id}
                  className={`transition-all duration-200 ease-in-out group border-b border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 ${starred.has(row.id) ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.04]" : ""}`}
                >
                  <td className="px-2 py-2.5 text-center">
                    <button onClick={() => toggleStar(row.id)} className="transition-transform duration-200 hover:scale-125">
                      <Star className={`w-3.5 h-3.5 transition-colors duration-200 ${starred.has(row.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`} />
                    </button>
                  </td>
                  {visibleCols.map((col) => (
                    <td key={col.key} className={`px-3 py-2.5 ${col.align === "right" ? "text-right" : ""}`}>
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                  {/* Actions — always visible, sticky right */}
                  <td className="px-3 py-2.5 text-right sticky right-0 z-[2] bg-card group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 border-l border-border shadow-[-6px_0_12px_rgba(0,0,0,0.04)] dark:shadow-[-6px_0_12px_rgba(0,0,0,0.3)] transition-colors duration-200 ease-in-out">
                    <Link href={`/alphas/${row.id}`}>
                      <button className="text-[10px] uppercase tracking-[0.15em] font-medium px-2.5 py-1 rounded-full transition-all duration-200 ease-in-out whitespace-nowrap text-muted-foreground border border-border hover:border-primary hover:text-primary hover:bg-primary/5">
                        View
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 2} className="text-center py-12 text-sm text-muted-foreground">
                    No alphas match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, starSorted.length)} of {starSorted.length}
            </span>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <span>Rows</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-6 w-16 text-xs rounded-lg bg-transparent border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg border-border" disabled={page <= 1} onClick={() => setPage(1)}>
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg border-border" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {getPageRange().map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className={`h-7 w-7 text-xs p-0 rounded-lg font-mono tabular-nums ${p === page ? "bg-primary text-primary-foreground" : "border-border"}`}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg border-border" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg border-border" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
