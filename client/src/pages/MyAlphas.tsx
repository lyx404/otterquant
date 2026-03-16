/*
 * MyAlphas — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent, white/10 borders, white/50 secondary
 * GSAP staggered reveal, Inter font, tracking-[0.2em] uppercase labels
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

export default function MyAlphas() {
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
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

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

  // GSAP fade-in for stat cards
  useEffect(() => {
    if (!statsRef.current) return;
    const items = statsRef.current.querySelectorAll(".fade-item");
    gsap.set(items, { y: 30, opacity: 0 });
    gsap.to(items, {
      y: 0, opacity: 1,
      duration: 0.6, stagger: 0.06, ease: "power3.out", delay: 0.3,
    });
  }, []);

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
    const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
      unsubmitted: { label: "UNSUBMITTED", bg: "rgba(255,200,50,0.08)", color: "rgb(255,200,50)", border: "rgba(255,200,50,0.20)" },
      queued: { label: "QUEUED", bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.50)", border: "rgba(255,255,255,0.10)" },
      backtesting: { label: "BACKTESTING", bg: "rgba(100,180,255,0.08)", color: "rgb(100,180,255)", border: "rgba(100,180,255,0.20)" },
      is_testing: { label: "IS TESTING", bg: "rgba(100,180,255,0.08)", color: "rgb(100,180,255)", border: "rgba(100,180,255,0.20)" },
      os_testing: { label: "OS TESTING", bg: "rgba(197,255,74,0.08)", color: "#C5FF4A", border: "rgba(197,255,74,0.20)" },
      passed: { label: "PASSED", bg: "rgba(74,222,128,0.08)", color: "rgb(74,222,128)", border: "rgba(74,222,128,0.20)" },
      failed: { label: "FAILED", bg: "rgba(248,113,113,0.08)", color: "rgb(248,113,113)", border: "rgba(248,113,113,0.20)" },
      rejected: { label: "REJECTED", bg: "rgba(248,113,113,0.08)", color: "rgb(248,113,113)", border: "rgba(248,113,113,0.20)" },
    };
    const s = map[status] || map.unsubmitted;
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em]"
        style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
      >
        {s.label}
      </span>
    );
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortDir === "desc") return <ArrowDown className="w-3 h-3" style={{ color: "#C5FF4A" }} />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3" style={{ color: "#C5FF4A" }} />;
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  };

  const visibleCols = allColumns.filter((c) => visibleColumns.has(c.key));

  const renderCell = (row: AlphaRow, colKey: string) => {
    switch (colKey) {
      case "id":
        return <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{row.id}</span>;
      case "name":
        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            <span className="truncate text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>{row.name}</span>
          </div>
        );
      case "market":
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em]"
            style={{
              backgroundColor: row.market === "CEX" ? "rgba(100,180,255,0.08)" : "rgba(197,255,74,0.08)",
              color: row.market === "CEX" ? "rgb(100,180,255)" : "#C5FF4A",
              border: `1px solid ${row.market === "CEX" ? "rgba(100,180,255,0.20)" : "rgba(197,255,74,0.20)"}`,
            }}
          >
            {row.market}
          </span>
        );
      case "type":
        return (
          <span className="text-xs capitalize" style={{
            color: row.status === "active" ? "rgb(74,222,128)" : row.status === "testing" ? "rgb(255,200,50)" : "rgba(255,255,255,0.40)"
          }}>
            {row.status === "active" ? "Regular" : row.status === "testing" ? "Testing" : "Archived"}
          </span>
        );
      case "submissionStatus":
        return statusBadge(row.submissionStatus);
      case "createdAt":
        return <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{row.createdAt}</span>;
      case "osSharpe":
        return (
          <span className="font-mono text-sm" style={{
            color: row.osSharpe >= 1 ? "#C5FF4A" : row.osSharpe >= 0.5 ? "rgb(255,200,50)" : "rgb(248,113,113)"
          }}>
            {row.osSharpe.toFixed(2)}
          </span>
        );
      case "sharpe":
        return <span className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.sharpe.toFixed(2)}</span>;
      case "fitness":
        return (
          <span className="font-mono text-sm" style={{
            color: row.fitness >= 1 ? "#C5FF4A" : row.fitness >= 0.5 ? "rgba(255,255,255,0.70)" : "rgba(255,255,255,0.40)"
          }}>
            {row.fitness.toFixed(2)}
          </span>
        );
      case "returns":
        return <span className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.returns}</span>;
      case "turnover":
        return <span className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{row.turnover}</span>;
      case "drawdown":
        return <span className="font-mono text-sm" style={{ color: "rgb(248,113,113)" }}>{row.drawdown}</span>;
      case "testsPassed":
        return (
          <div className="flex items-center gap-1 font-mono text-xs">
            <span style={{ color: "rgb(74,222,128)" }}>{row.testsPassed}</span>
            <span style={{ color: "rgba(255,255,255,0.30)" }}>/</span>
            <span style={{ color: "rgb(248,113,113)" }}>{row.testsFailed}</span>
            {row.testsPending > 0 && (
              <>
                <span style={{ color: "rgba(255,255,255,0.30)" }}>/</span>
                <span style={{ color: "rgba(255,255,255,0.40)" }}>{row.testsPending}</span>
              </>
            )}
          </div>
        );
      case "submittedAt":
        return <span className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>{row.submittedAt || "\u2014"}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header — GSAP staggered reveal */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none text-white">
            My Alphas
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
            {factors.length} alphas &middot; {submissions.filter((s) => s.status === "passed").length} passed &middot; {submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status)).length} in pipeline
          </p>
        </div>
      </div>

      {/* Pipeline Stats Overview */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="fade-item katana-card p-4">
          <div className="flex items-center gap-2 label-upper mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Total
          </div>
          <div className="stat-value text-2xl font-bold text-white">{submissionStats.total}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>submissions</div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2" style={{ color: "rgb(74,222,128)" }}>
            <CheckCircle className="w-3.5 h-3.5" /> Passed
          </div>
          <div className="stat-value text-2xl font-bold" style={{ color: "rgb(74,222,128)" }}>{submissionStats.passed}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>pass rate: {submissionStats.passRate}</div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2" style={{ color: "rgb(100,180,255)" }}>
            <Loader2 className="w-3.5 h-3.5" /> In Progress
          </div>
          <div className="stat-value text-2xl font-bold" style={{ color: "rgb(100,180,255)" }}>{submissionStats.inProgress}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>avg time: {submissionStats.avgProcessingTime}</div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2" style={{ color: "rgb(248,113,113)" }}>
            <XCircle className="w-3.5 h-3.5" /> Failed
          </div>
          <div className="stat-value text-2xl font-bold" style={{ color: "rgb(248,113,113)" }}>{submissionStats.failed + 1}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>{submissionStats.rejected} rejected</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="katana-card overflow-hidden">
        {/* Toolbar — search, filters, column toggle */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.02)" }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.30)" }} />
            <Input
              placeholder="Search by name or ID..."
              value={filterName}
              onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
              className="h-8 text-xs pl-8"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
            />
          </div>

          {/* Filter pills */}
          <Select value={filterMarket} onValueChange={(v) => { setFilterMarket(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-auto min-w-[80px] text-xs gap-1" style={{ backgroundColor: filterMarket !== "all" ? "rgba(197,255,74,0.08)" : "rgba(255,255,255,0.05)", borderColor: filterMarket !== "all" ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)", color: filterMarket !== "all" ? "#C5FF4A" : "rgba(255,255,255,0.60)" }}>
              <SelectValue placeholder="Market" />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "#151515", borderColor: "rgba(255,255,255,0.10)" }}>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="CEX">CEX</SelectItem>
              <SelectItem value="DEX">DEX</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs gap-1" style={{ backgroundColor: filterStatus !== "all" ? "rgba(197,255,74,0.08)" : "rgba(255,255,255,0.05)", borderColor: filterStatus !== "all" ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)", color: filterStatus !== "all" ? "#C5FF4A" : "rgba(255,255,255,0.60)" }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "#151515", borderColor: "rgba(255,255,255,0.10)" }}>
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
            <SelectTrigger className="h-8 w-auto min-w-[80px] text-xs gap-1" style={{ backgroundColor: filterType !== "all" ? "rgba(197,255,74,0.08)" : "rgba(255,255,255,0.05)", borderColor: filterType !== "all" ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)", color: filterType !== "all" ? "#C5FF4A" : "rgba(255,255,255,0.60)" }}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "#151515", borderColor: "rgba(255,255,255,0.10)" }}>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="active">Regular</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Numeric filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs transition-colors"
                style={{
                  backgroundColor: (filterSharpeMin || filterReturnsMin || filterTurnoverMin) ? "rgba(197,255,74,0.08)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${(filterSharpeMin || filterReturnsMin || filterTurnoverMin) ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)"}`,
                  color: (filterSharpeMin || filterReturnsMin || filterTurnoverMin) ? "#C5FF4A" : "rgba(255,255,255,0.60)",
                }}
              >
                <BarChart3 className="w-3 h-3" />
                Metrics
                {(filterSharpeMin || filterReturnsMin || filterTurnoverMin) && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#C5FF4A" }} />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60" align="start" style={{ backgroundColor: "#151515", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="space-y-3">
                <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>Minimum Thresholds</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] mb-1 block" style={{ color: "rgba(255,255,255,0.40)" }}>OS Sharpe</label>
                    <Input
                      placeholder="e.g. 1.0"
                      value={filterSharpeMin}
                      onChange={(e) => { setFilterSharpeMin(e.target.value); setPage(1); }}
                      className="h-7 text-xs font-mono"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] mb-1 block" style={{ color: "rgba(255,255,255,0.40)" }}>Returns</label>
                    <Input
                      placeholder="e.g. 5.0"
                      value={filterReturnsMin}
                      onChange={(e) => { setFilterReturnsMin(e.target.value); setPage(1); }}
                      className="h-7 text-xs font-mono"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.15em] mb-1 block" style={{ color: "rgba(255,255,255,0.40)" }}>Turnover</label>
                    <Input
                      placeholder="e.g. 30"
                      value={filterTurnoverMin}
                      onChange={(e) => { setFilterTurnoverMin(e.target.value); setPage(1); }}
                      className="h-7 text-xs font-mono"
                      style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
                    />
                  </div>
                </div>
                {(filterSharpeMin || filterReturnsMin || filterTurnoverMin) && (
                  <button
                    className="text-[10px] uppercase tracking-[0.15em] transition-colors"
                    style={{ color: "rgba(255,255,255,0.40)" }}
                    onClick={() => { setFilterSharpeMin(""); setFilterReturnsMin(""); setFilterTurnoverMin(""); setPage(1); }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#C5FF4A"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Active filter count + clear */}
          {(filterName || filterMarket !== "all" || filterStatus !== "all" || filterType !== "all" || filterSharpeMin || filterReturnsMin || filterTurnoverMin) && (
            <button
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs transition-colors"
              style={{ backgroundColor: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)", color: "rgb(248,113,113)" }}
              onClick={() => {
                setFilterName(""); setFilterMarket("all"); setFilterStatus("all"); setFilterType("all");
                setFilterSharpeMin(""); setFilterReturnsMin(""); setFilterTurnoverMin(""); setPage(1);
              }}
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}

          {/* Column toggle */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.60)" }}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Columns
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end" style={{ backgroundColor: "#151515", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="space-y-1">
                <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>Toggle Columns</p>
                {allColumns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded cursor-pointer">
                    <Checkbox
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-white">{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Table header row with inline sort */}
        <div className="overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                <th className="px-2 py-2.5 w-[40px]">
                  <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.20)" }}>#</span>
                </th>
                <th className="w-[28px]" />
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 text-left transition-colors ${col.sortable ? "cursor-pointer" : ""}`}
                    style={{
                      minWidth: col.width,
                      backgroundColor: sortKey === col.key ? "rgba(197,255,74,0.04)" : "transparent",
                    }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    onMouseEnter={(e) => { if (col.sortable) e.currentTarget.style.backgroundColor = sortKey === col.key ? "rgba(197,255,74,0.06)" : "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = sortKey === col.key ? "rgba(197,255,74,0.04)" : "transparent"; }}
                  >
                    <span className="flex items-center gap-1.5 label-upper whitespace-nowrap select-none">
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

        {/* Data rows */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              {paginated.map((row, i) => (
                <tr
                  key={row.id}
                  className="transition-colors group"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <td className="px-2 py-2.5 w-[40px]">
                    <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.20)" }}>
                      {(page - 1) * pageSize + i + 1}
                    </span>
                  </td>
                  <td className="w-[28px] py-2.5">
                    <button onClick={() => toggleStar(row.id)}>
                      <Star className={`w-3.5 h-3.5 ${starred.has(row.id) ? "fill-yellow-400 text-yellow-400" : ""}`} style={!starred.has(row.id) ? { color: "rgba(255,255,255,0.15)" } : {}} />
                    </button>
                  </td>
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-3 py-2.5" style={{ minWidth: col.width }}>
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                  <td className="w-[36px] py-2.5">
                    <Link href={`/alphas/${row.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#C5FF4A" }}>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 3} className="text-center py-12 text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
                    No alphas match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
            <span>Page size</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "#151515", borderColor: "rgba(255,255,255,0.10)" }}>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>out of {sorted.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" style={{ borderColor: "rgba(255,255,255,0.10)" }} disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-7 w-7 text-xs p-0"
                style={p !== page ? { borderColor: "rgba(255,255,255,0.10)" } : {}}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" className="h-7 text-xs" style={{ borderColor: "rgba(255,255,255,0.10)" }} disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
