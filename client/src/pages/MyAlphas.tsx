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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
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
  Trophy,
  Plus,
} from "lucide-react";
import {
  factors,
  submissions,
  submissionStats,
  leaderboardByFactorByEpoch,
  currentEpoch,
  type Factor,
  getAlphaGrade,
  GRADE_CONFIG,
  type AlphaGrade,
} from "@/lib/mockData";
import { GradeRevealBatch } from "@/components/GradeRevealModal";
import ShinyTag from "@/components/ui/shiny-tag";
import { StarButton } from "@/components/ui/star-button";
import AlphaCardView from "@/components/AlphaCardView";
import { LayoutGrid, Table2 } from "lucide-react";

type AlphaRow = Factor & {
  submissionStatus: "queued" | "backtesting" | "is_testing" | "os_testing" | "passed" | "failed" | "rejected";
  submittedAt?: string;
  osFitness?: number;
  compositeScore?: number;
  epochStatus?: string; // e.g. "Round 4 #1"
  epochId?: string; // e.g. "Round 4" for linking to leaderboard
};

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  width: string;
  align?: "left" | "right" | "center";
}

const dataColumns: ColumnDef[] = [
  { key: "name", label: "Name", defaultVisible: true, sortable: true, width: "200px" },
  { key: "status_col", label: "Status", defaultVisible: true, sortable: true, width: "90px" },
  { key: "grade", label: "Grade", defaultVisible: true, sortable: true, width: "72px", align: "center" },
  { key: "epochStatus", label: "Arena Round", defaultVisible: true, sortable: true, width: "120px" },
  { key: "createdAt", label: "Date Created", defaultVisible: true, sortable: true, width: "110px" },
  { key: "sharpe", label: "IS Sharpe", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "osSharpe", label: "OS Sharpe", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "fitness", label: "Fitness", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "returns", label: "Returns", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "turnover", label: "Turnover", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "drawdown", label: "Drawdown", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "id", label: "ID", defaultVisible: false, sortable: true, width: "80px" },
  { key: "testsPassed", label: "Tests", defaultVisible: false, sortable: true, width: "72px", align: "right" },

];

type SortDir = "asc" | "desc" | null;

/* Status badge config — only passed/failed shown as badges */
const statusConfig: Record<string, { label: string; colorClass: string; bgClass: string; borderClass: string }> = {
  passed: { label: "PASSED", colorClass: "text-success", bgClass: "bg-success/10", borderClass: "border-success/20" },
  failed: { label: "FAILED", colorClass: "text-destructive", bgClass: "bg-destructive/10", borderClass: "border-destructive/20" },
  rejected: { label: "FAILED", colorClass: "text-destructive", bgClass: "bg-destructive/10", borderClass: "border-destructive/20" },
};

/* Build epoch status lookup from leaderboard data — returns { display, epochId } */
function getEpochStatus(factorId: string): { display: string; epochId: string | null } {
  // Check current epoch first
  const currentEntries = leaderboardByFactorByEpoch[currentEpoch.id] || [];
  const currentEntry = currentEntries.find(e => e.factorId === factorId);
  if (currentEntry) {
    return { display: `${currentEpoch.id} #${currentEntry.rank}`, epochId: currentEpoch.id };
  }

  // Check historical epochs
  for (const [epochId, entries] of Object.entries(leaderboardByFactorByEpoch)) {
    if (epochId === currentEpoch.id) continue;
    const entry = entries.find(e => e.factorId === factorId);
    if (entry) {
      return { display: `${epochId} #${entry.rank}`, epochId };
    }
  }

  return { display: "Not Entered", epochId: null };
}

export default function MyAlphas() {
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(dataColumns.filter((c) => c.defaultVisible).map((c) => c.key))
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSharpeMin, setFilterSharpeMin] = useState("");
  const [filterReturnsMin, setFilterReturnsMin] = useState("");
  const [filterTurnoverMin, setFilterTurnoverMin] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set(["AF-004", "AF-009"]));
  const [cardFilter, setCardFilter] = useState<"all" | "passed" | "starred" | "failed">("all");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Batch grade reveal for own-agent mode (simulate new results since last visit)
  const [showBatchReveal, setShowBatchReveal] = useState(false);
  useEffect(() => {
    const lastVisit = localStorage.getItem("alphaforge_last_alphas_visit");
    const now = Date.now();
    // Show batch reveal if more than 30 seconds since last visit (simulating new results)
    if (!lastVisit || now - parseInt(lastVisit) > 30000) {
      // Compute grade summary from factors
      const gradeMap = new Map<AlphaGrade, number>();
      factors.forEach((f) => {
        const g = getAlphaGrade(f.osSharpe);
        gradeMap.set(g, (gradeMap.get(g) || 0) + 1);
      });
      if (gradeMap.size > 0) {
        setBatchGrades(Array.from(gradeMap.entries()).map(([grade, count]) => ({ grade, count })));
        setShowBatchReveal(true);
      }
    }
    localStorage.setItem("alphaforge_last_alphas_visit", now.toString());
  }, []);
  const [batchGrades, setBatchGrades] = useState<{ grade: AlphaGrade; count: number }[]>([]);

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
    gsap.set(items, { y: 16, opacity: 0, scale: 0.97 });
    gsap.to(items, {
      y: 0, opacity: 1, scale: 1,
      duration: 0.5, stagger: 0.08,
      ease: "back.out(1.4)",
      delay: 0.25,
    });
  }, []);

  /* ── Data — build rows, assign submission status, epoch status ── */
  const alphaRows: AlphaRow[] = useMemo(() => {
    return factors.map((f) => {
      const sub = submissions.find((s) => s.factorId === f.id);
      const submissionStatus = sub ? sub.status as AlphaRow["submissionStatus"] : "queued";
      return {
        ...f,
        submissionStatus,
        submittedAt: sub?.submittedAt,
        osFitness: sub?.fitness,
        compositeScore: sub?.osSharpe ? sub.osSharpe * 40 + (sub.fitness || 0) * 30 : undefined,
        epochStatus: getEpochStatus(f.id).display,
        epochId: getEpochStatus(f.id).epochId ?? undefined,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    return alphaRows.filter((r) => {
      if (filterName && !r.name.toLowerCase().includes(filterName.toLowerCase()) && !r.id.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterStatus !== "all" && r.submissionStatus !== filterStatus) return false;
      if (cardFilter === "passed" && r.submissionStatus !== "passed") return false;
      if (cardFilter === "starred" && !starred.has(r.id)) return false;
      if (cardFilter === "failed" && r.submissionStatus !== "failed" && r.submissionStatus !== "rejected") return false;
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
  }, [alphaRows, filterName, filterStatus, filterSharpeMin, filterReturnsMin, filterTurnoverMin, cardFilter, starred]);

  const sorted = useMemo(() => {
    if (!sortDir || !sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "createdAt") {
        av = a[sortKey as keyof AlphaRow] ? new Date(a[sortKey as keyof AlphaRow] as string).getTime() : 0;
        bv = b[sortKey as keyof AlphaRow] ? new Date(b[sortKey as keyof AlphaRow] as string).getTime() : 0;
      } else if (sortKey === "returns" || sortKey === "turnover" || sortKey === "drawdown") {
        av = parseFloat(String(a[sortKey as keyof AlphaRow])) || 0;
        bv = parseFloat(String(b[sortKey as keyof AlphaRow])) || 0;
      } else if (sortKey === "grade") {
        const gradeOrder: Record<AlphaGrade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
        av = gradeOrder[getAlphaGrade(a.osSharpe)];
        bv = gradeOrder[getAlphaGrade(b.osSharpe)];
      } else if (sortKey === "submissionStatus" || sortKey === "status_col") {
        const order = { passed: 0, os_testing: 1, is_testing: 2, backtesting: 3, queued: 4, failed: 5, rejected: 6 };
        av = order[a.submissionStatus] ?? 99;
        bv = order[b.submissionStatus] ?? 99;
      } else if (sortKey === "epochStatus") {
        // Sort by rank number, "Not Entered" last
        const extractRank = (s?: string) => {
          if (!s || s === "Not Entered") return 999;
          const m = s.match(/#(\d+)/);
          return m ? parseInt(m[1]) : 999;
        };
        av = extractRank(a.epochStatus);
        bv = extractRank(b.epochStatus);
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

  /* ── No more pinning starred to top — just use sorted order ── */
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

  const visibleCols = dataColumns.filter((c) => visibleColumns.has(c.key));
  const hasActiveFilters = filterName || filterStatus !== "all" || filterSharpeMin || filterReturnsMin || filterTurnoverMin;

  /* ── Status badge renderer — only passed/failed shown ── */
  const renderStatusBadge = (status: AlphaRow["submissionStatus"]) => {
    // Map all statuses to passed or failed
    const mappedStatus = (status === "passed") ? "passed" : "failed";
    const s = statusConfig[mappedStatus];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] whitespace-nowrap border ${s.bgClass} ${s.colorClass} ${s.borderClass}`}>
        {s.label}
      </span>
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
          <div className="flex items-center gap-2 min-w-0 max-w-[200px]">
            <button onClick={(e) => { e.stopPropagation(); toggleStar(row.id); }} className="shrink-0 transition-transform duration-200 hover:scale-125">
              <Star className={`w-3.5 h-3.5 transition-colors duration-200 ${starred.has(row.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`} />
            </button>
            <Link href={`/alphas/${row.id}`}>
              <span className="truncate text-xs text-foreground hover:text-primary hover:underline cursor-pointer transition-colors duration-200">{row.name}</span>
            </Link>
          </div>
        );
      case "createdAt":
        return <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{row.createdAt}</span>;
      case "sharpe":
        return <span className="font-mono text-xs tabular-nums text-foreground">{row.sharpe.toFixed(2)}</span>;
      case "osSharpe":
        return (
          <span className={`font-mono text-xs tabular-nums ${
            row.osSharpe >= 1 ? "text-success" : row.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
          }`}>
            {row.osSharpe.toFixed(2)}
          </span>
        );
      case "fitness":
        return (
          <span className={`font-mono text-xs tabular-nums ${
            row.fitness >= 1 ? "text-success" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground"
          }`}>
            {row.fitness.toFixed(2)}
          </span>
        );
      case "returns":
        return <span className="font-mono text-xs tabular-nums text-foreground whitespace-nowrap">{row.returns}</span>;
      case "turnover":
        return <span className="font-mono text-xs tabular-nums text-foreground whitespace-nowrap">{row.turnover}</span>;
      case "drawdown":
        return <span className="font-mono text-xs tabular-nums text-destructive whitespace-nowrap">{row.drawdown}</span>;
      case "grade": {
        // Only passed factors show grade; all others show "-"
        if (row.submissionStatus !== "passed") {
          return <span className="text-xs text-muted-foreground/50 font-mono">-</span>;
        }
        const grade = getAlphaGrade(row.osSharpe);
        if (grade === "S" || grade === "A") {
          return <ShinyTag tier={grade} />;
        }
        // B/C/D: plain text style
        const textColorMap: Record<string, string> = {
          B: "text-[#4B94F8]",
          C: "text-[#43AF6D]",
          D: "text-muted-foreground/60",
        };
        return <span className={`text-xs font-semibold ${textColorMap[grade] || "text-muted-foreground"}`}>{grade}</span>;
      }
      case "epochStatus": {
        // Only passed alphas can participate in arena; all others show Ineligible
        if (row.submissionStatus !== "passed") {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-mono whitespace-nowrap text-muted-foreground/50 cursor-default">
                  Ineligible
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                Only passed alphas are eligible to participate in the Arena
              </TooltipContent>
            </Tooltip>
          );
        }
        const es = row.epochStatus || "Not Entered";
        const isRanked = es !== "Not Entered";
        if (isRanked && row.epochId) {
          return (
            <Link href={`/leaderboard?epoch=${encodeURIComponent(row.epochId)}`}>
              <span className="text-xs font-mono whitespace-nowrap text-primary hover:underline cursor-pointer transition-colors duration-200 hover:text-primary/80">
                {es}
              </span>
            </Link>
          );
        }
        return (
          <span className="text-xs font-mono whitespace-nowrap text-muted-foreground">
            {es}
          </span>
        );
      }
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
          <div className="flex items-center justify-between">
            <h1 className="text-foreground">
              My Alphas
            </h1>
            <Link href="/alphas/new">
              <StarButton
                backgroundColor="#818cf8"
                className="shadow-2xl"
              >
                <Plus className="w-3.5 h-3.5" />
                New Alpha
              </StarButton>
            </Link>
          </div>
        </div>

      </div>

      {/* Pipeline Stats — Total / Starred / Passed / Failed */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
        <button
          onClick={() => { setCardFilter("all"); setPage(1); }}
          className="fade-item surface-card p-6 text-left cursor-pointer transition-bouncy hover:border-slate-300 dark:hover:border-slate-600 hover:scale-[1.03] active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 label-upper mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Total
          </div>
          <div className="stat-value text-2xl font-bold text-foreground truncate">{submissionStats.total}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">submissions</div>
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "starred" ? "all" : "starred"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left cursor-pointer transition-bouncy hover:scale-[1.03] active:scale-[0.98] ${
            cardFilter === "starred" ? "border-amber-400/40" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-amber-500 dark:text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Starred
          </div>
          <div className="stat-value text-2xl font-bold text-amber-500 dark:text-amber-400 truncate">{starred.size}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">favorites</div>
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "passed" ? "all" : "passed"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left cursor-pointer transition-bouncy hover:scale-[1.03] active:scale-[0.98] ${
            cardFilter === "passed" ? "border-success/40" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-success">
            <CheckCircle className="w-3.5 h-3.5" /> Passed
          </div>
          <div className="stat-value text-2xl font-bold text-success truncate">{submissionStats.passed}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">pass rate: {submissionStats.passRate}</div>
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "failed" ? "all" : "failed"); setPage(1); }}
          className={`fade-item surface-card p-6 text-left cursor-pointer transition-bouncy hover:scale-[1.03] active:scale-[0.98] ${
            cardFilter === "failed" ? "border-destructive/40" : "hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-destructive">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </div>
          <div className="stat-value text-2xl font-bold text-destructive truncate">{submissionStats.failed + submissionStats.rejected}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate">{submissionStats.rejected} rejected</div>
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          TOOLBAR + DATA TABLE / CARD VIEW
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

          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className={`h-8 w-auto min-w-[100px] text-xs gap-1 rounded-full border ${
              filterStatus !== "all" ? "bg-primary/10 border-primary/20 text-primary" : "bg-card border-border text-muted-foreground"
            }`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="backtesting">Backtesting</SelectItem>
              <SelectItem value="is_testing">IS Testing</SelectItem>
              <SelectItem value="os_testing">OS Testing</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
                setFilterName(""); setFilterStatus("all");
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

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 transition-all duration-200 ease-in-out ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              title="Table View"
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 transition-all duration-200 ease-in-out ${
                viewMode === "card"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === "card" && (
          <div className="p-6">
            <AlphaCardView visibleColumns={visibleColumns} />
          </div>
        )}

        {/* Table */}
        {viewMode === "table" && (<>
        <div className="overflow-x-auto relative">
          <table className="w-full" style={{ minWidth: "900px" }}>
            <ColGroup />
            <thead>
              <tr className="bg-accent dark:bg-slate-900/50">
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 transition-all duration-200 ease-in-out ${col.key === "name" ? "pl-10" : ""} ${col.sortable ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50" : ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${sortKey === col.key ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className={`flex items-center gap-1.5 label-upper whitespace-nowrap select-none ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
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
                  {visibleCols.map((col) => (
                    <td key={col.key} className={`px-3 py-2.5 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
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
                  <td colSpan={visibleCols.length + 1} className="text-center py-12 text-sm text-muted-foreground">
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
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
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
      </>)}
      </div>

      {/* Batch Grade Reveal Modal */}
      {showBatchReveal && batchGrades.length > 0 && (
        <GradeRevealBatch
          grades={batchGrades}
          onClose={() => setShowBatchReveal(false)}
        />
      )}
    </div>
  );
}
