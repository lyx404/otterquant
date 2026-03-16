/*
 * MyAlphas — Katana Network Style
 * Pipeline stats overview + WQ-style data table
 * Deep navy bg, lime accent, monospace data, minimal borders
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  factors,
  submissions,
  submissionStats,
  type Factor,
} from "@/lib/mockData";
import { motion } from "framer-motion";

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
      unsubmitted: { label: "UNSUBMITTED", className: "bg-warning/10 text-warning border-warning/20 font-mono text-[10px]" },
      queued: { label: "QUEUED", className: "bg-muted text-muted-foreground border-border font-mono text-[10px]" },
      backtesting: { label: "BACKTESTING", className: "bg-info/10 text-info border-info/20 font-mono text-[10px]" },
      is_testing: { label: "IS TESTING", className: "bg-info/10 text-info border-info/20 font-mono text-[10px]" },
      os_testing: { label: "OS TESTING", className: "bg-lime/8 text-lime border-lime/20 font-mono text-[10px]" },
      passed: { label: "PASSED", className: "bg-positive/10 text-positive border-positive/20 font-mono text-[10px]" },
      failed: { label: "FAILED", className: "bg-negative/10 text-negative border-negative/20 font-mono text-[10px]" },
      rejected: { label: "REJECTED", className: "bg-negative/10 text-negative border-negative/20 font-mono text-[10px]" },
    };
    const s = map[status] || map.unsubmitted;
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortDir === "desc") return <ArrowDown className="w-3 h-3 text-lime" />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 text-lime" />;
    return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  };

  const visibleCols = allColumns.filter((c) => visibleColumns.has(c.key));

  const renderCell = (row: AlphaRow, colKey: string) => {
    switch (colKey) {
      case "id":
        return <span className="font-mono text-xs text-muted-foreground">{row.id}</span>;
      case "name":
        return (
          <div className="flex items-center gap-2 max-w-[200px]">
            <span className="truncate text-sm text-foreground/90">{row.name}</span>
          </div>
        );
      case "market":
        return (
          <Badge variant="outline" className={`text-[10px] font-mono ${row.market === "CEX" ? "border-info/25 text-info" : "border-lime/25 text-lime"}`}>
            {row.market}
          </Badge>
        );
      case "type":
        return (
          <span className={`text-xs capitalize ${row.status === "active" ? "text-positive" : row.status === "testing" ? "text-warning" : "text-muted-foreground"}`}>
            {row.status === "active" ? "Regular" : row.status === "testing" ? "Testing" : "Archived"}
          </span>
        );
      case "submissionStatus":
        return statusBadge(row.submissionStatus);
      case "createdAt":
        return <span className="font-mono text-xs text-muted-foreground">{row.createdAt}</span>;
      case "osSharpe":
        return (
          <span className={`font-mono text-sm ${row.osSharpe >= 1 ? "text-lime" : row.osSharpe >= 0.5 ? "text-warning" : "text-negative"}`}>
            {row.osSharpe.toFixed(2)}
          </span>
        );
      case "sharpe":
        return <span className="font-mono text-sm text-foreground/80">{row.sharpe.toFixed(2)}</span>;
      case "fitness":
        return (
          <span className={`font-mono text-sm ${row.fitness >= 1 ? "text-lime" : row.fitness >= 0.5 ? "text-foreground/80" : "text-muted-foreground"}`}>
            {row.fitness.toFixed(2)}
          </span>
        );
      case "returns":
        return <span className="font-mono text-sm text-foreground/80">{row.returns}</span>;
      case "turnover":
        return <span className="font-mono text-sm text-foreground/80">{row.turnover}</span>;
      case "drawdown":
        return <span className="font-mono text-sm text-negative">{row.drawdown}</span>;
      case "testsPassed":
        return (
          <div className="flex items-center gap-1 font-mono text-xs">
            <span className="text-positive">{row.testsPassed}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-negative">{row.testsFailed}</span>
            {row.testsPending > 0 && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{row.testsPending}</span>
              </>
            )}
          </div>
        );
      case "submittedAt":
        return <span className="font-mono text-xs text-muted-foreground">{row.submittedAt || "\u2014"}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">My Alphas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {factors.length} alphas &middot; {submissions.filter((s) => s.status === "passed").length} passed &middot; {submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status)).length} in pipeline
        </p>
      </div>

      {/* Pipeline Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 label-upper mb-2">
              <BarChart3 className="w-3.5 h-3.5" /> Total
            </div>
            <div className="stat-value text-2xl font-bold">{submissionStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">submissions</div>
          </CardContent>
        </Card>
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-positive uppercase tracking-wider font-medium mb-2">
              <CheckCircle className="w-3.5 h-3.5" /> Passed
            </div>
            <div className="stat-value text-2xl font-bold text-positive">{submissionStats.passed}</div>
            <div className="text-xs text-muted-foreground mt-1">pass rate: {submissionStats.passRate}</div>
          </CardContent>
        </Card>
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-info uppercase tracking-wider font-medium mb-2">
              <Loader2 className="w-3.5 h-3.5" /> In Progress
            </div>
            <div className="stat-value text-2xl font-bold text-info">{submissionStats.inProgress}</div>
            <div className="text-xs text-muted-foreground mt-1">avg time: {submissionStats.avgProcessingTime}</div>
          </CardContent>
        </Card>
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-negative uppercase tracking-wider font-medium mb-2">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </div>
            <div className="stat-value text-2xl font-bold text-negative">{submissionStats.failed + 1}</div>
            <div className="text-xs text-muted-foreground mt-1">{submissionStats.rejected} rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <div className="katana-card overflow-hidden">
        {/* Column selector + header row */}
        <div className="border-b border-border bg-secondary/20">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-2.5 w-[40px]">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 text-lime text-xs hover:text-lime/80 transition-colors whitespace-nowrap">
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
                      className={`px-3 py-2.5 text-left ${col.sortable ? "cursor-pointer hover:bg-secondary/30" : ""}`}
                      style={{ minWidth: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="flex items-center gap-1 label-upper whitespace-nowrap select-none">
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
                <tr className="bg-secondary/10">
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
                  className="border-b border-border/40 hover:bg-secondary/20 transition-colors group"
                >
                  <td className="px-2 py-2.5 w-[40px]">
                    <span className="text-[10px] font-mono text-muted-foreground/40">
                      {(page - 1) * pageSize + i + 1}
                    </span>
                  </td>
                  <td className="w-[28px] py-2.5">
                    <button onClick={() => toggleStar(row.id)}>
                      <Star className={`w-3.5 h-3.5 ${starred.has(row.id) ? "fill-warning text-warning" : "text-muted-foreground/25 hover:text-muted-foreground"}`} />
                    </button>
                  </td>
                  {visibleCols.map((col) => (
                    <td key={col.key} className="px-3 py-2.5" style={{ minWidth: col.width }}>
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                  <td className="w-[36px] py-2.5">
                    <Link href={`/alphas/${row.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-lime opacity-0 group-hover:opacity-100 transition-opacity">
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
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
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
    </div>
  );
}
