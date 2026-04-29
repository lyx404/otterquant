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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import ShinyTag from "@/components/ui/shiny-tag";
import { StarButton } from "@/components/ui/star-button";
import ShinyText from "@/components/ui/shiny-text";
import AlphaCardView from "@/components/AlphaCardView";
import { LayoutGrid, Table2 } from "lucide-react";
import { useAlphaViewMode } from "@/contexts/AlphaViewModeContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";

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

type AlphaViewMode = "beginner" | "pro";

type MyAlphasViewMode = "table" | "card";

type MyAlphasCardFilter = "all" | "passed" | "starred" | "failed";

type MyAlphasPrefs = {
  prefsVersion: number;
  sortKey: string;
  sortDir: SortDir;
  filterName: string;
  cardFilter: MyAlphasCardFilter;
  viewMode: MyAlphasViewMode;
  pageSize: number;
  visibleColumns?: string[];
  visibleColumnsByMode?: Partial<Record<AlphaViewMode, string[]>>;
};

const MY_ALPHAS_PREFS_KEY = "otterquant:myalphas:view-prefs";
const MY_ALPHAS_PREFS_VERSION = 2;
const REVEALED_GRADE_STORAGE_PREFIX = "alphaforge_grade_reset_v5_";

function getDefaultVisibleColumnKeysForMode(mode: AlphaViewMode) {
  if (mode === "beginner") {
    return ["name", "grade", "epochStatus", "sharpe", "osSharpe", "fitness"];
  }
  return [
    "name",
    "status_col",
    "grade",
    "epochStatus",
    "createdAt",
    "sharpe",
    "osSharpe",
    "fitness",
    "returns",
    "turnover",
    "drawdown",
  ];
}

function sanitizeVisibleColumns(keys: unknown, mode: AlphaViewMode): Set<string> {
  const validKeys = new Set(dataColumns.map((c) => c.key));
  const fallback = getDefaultVisibleColumnKeysForMode(mode);

  if (!Array.isArray(keys) || keys.length === 0) {
    return new Set(fallback);
  }

  const sanitized = keys.filter((key): key is string => typeof key === "string" && validKeys.has(key));
  return new Set(sanitized.length > 0 ? sanitized : fallback);
}

function getInitialVisibleColumns(prefs: Partial<MyAlphasPrefs> | null, mode: AlphaViewMode): Set<string> {
  if (prefs?.prefsVersion !== MY_ALPHAS_PREFS_VERSION) {
    return sanitizeVisibleColumns(undefined, mode);
  }

  const modeColumns = prefs?.visibleColumnsByMode?.[mode];
  if (Array.isArray(modeColumns) && modeColumns.length > 0) {
    return sanitizeVisibleColumns(modeColumns, mode);
  }

  if (Array.isArray(prefs?.visibleColumns) && prefs.visibleColumns.length > 0) {
    return sanitizeVisibleColumns(prefs.visibleColumns, mode);
  }

  return sanitizeVisibleColumns(undefined, mode);
}

function getVisibleColumnsForMode(prefs: Partial<MyAlphasPrefs> | null, mode: AlphaViewMode): Set<string> {
  if (prefs?.prefsVersion !== MY_ALPHAS_PREFS_VERSION) {
    return sanitizeVisibleColumns(undefined, mode);
  }

  const modeColumns = prefs?.visibleColumnsByMode?.[mode];
  if (Array.isArray(modeColumns) && modeColumns.length > 0) {
    return sanitizeVisibleColumns(modeColumns, mode);
  }

  return sanitizeVisibleColumns(undefined, mode);
}

function sanitizeSortDir(value: unknown): SortDir {
  return value === "asc" || value === "desc" || value === null ? value : "desc";
}

function sanitizeSortKey(value: unknown): string {
  const allowed = new Set([
    "",
    ...dataColumns.map((c) => c.key),
    "submissionStatus",
  ]);
  return typeof value === "string" && allowed.has(value) ? value : "createdAt";
}

function sanitizeCardFilter(value: unknown): MyAlphasCardFilter {
  return value === "passed" || value === "starred" || value === "failed" ? value : "all";
}

function sanitizeViewMode(value: unknown): MyAlphasViewMode {
  return value === "card" ? "card" : "table";
}

function sanitizePageSize(value: unknown): number {
  const allowed = new Set([10, 25, 50]);
  const parsed = typeof value === "number" ? value : Number(value);
  return allowed.has(parsed) ? parsed : 10;
}

function readMyAlphasPrefs(): Partial<MyAlphasPrefs> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(MY_ALPHAS_PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MyAlphasPrefs>;
    return parsed ?? null;
  } catch {
    return null;
  }
}

function readRevealedGrade(factorId: string): AlphaGrade | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(`${REVEALED_GRADE_STORAGE_PREFIX}${factorId}`);
    return value === "S" || value === "A" || value === "B" || value === "C" || value === "D" ? value : null;
  } catch {
    return null;
  }
}

function getSubmissionStatusFromFactorStatus(status: string): AlphaRow["submissionStatus"] {
  return status === "active" || status === "testing" ? "passed" : "failed";
}

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
  const { uiLang } = useAppLanguage();
  const storedPrefs = useMemo(() => readMyAlphasPrefs(), []);
  const { alphaViewMode } = useAlphaViewMode();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const columnLabelMap = useMemo(
    () => ({
      name: tr("Name", "名称"),
      status_col: tr("Status", "状态"),
      grade: tr("Grade", "等级"),
      epochStatus: tr("Arena Round", "竞技场轮次"),
      createdAt: tr("Date Created", "创建日期"),
      sharpe: tr("IS Sharpe", "样本内夏普比率"),
      osSharpe: tr("OS Sharpe", "样本外夏普比率"),
      fitness: tr("Fitness", "适应度"),
      returns: tr("Returns", "收益率"),
      turnover: tr("Turnover", "换手率"),
      drawdown: tr("Drawdown", "回撤"),
      id: tr("ID", "ID"),
      testsPassed: tr("Tests", "测试"),
    }),
    [uiLang]
  );
  const [sortKey, setSortKey] = useState<string>(() => sanitizeSortKey(storedPrefs?.sortKey));
  const [sortDir, setSortDir] = useState<SortDir>(() => sanitizeSortDir(storedPrefs?.sortDir));
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => getInitialVisibleColumns(storedPrefs, alphaViewMode)
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => sanitizePageSize(storedPrefs?.pageSize));
  const [filterName, setFilterName] = useState(() => storedPrefs?.filterName ?? "");
  const [starred, setStarred] = useState<Set<string>>(new Set(["AF-004", "AF-009"]));
  const [cardFilter, setCardFilter] = useState<MyAlphasCardFilter>(() => sanitizeCardFilter(storedPrefs?.cardFilter));
  const [viewMode, setViewMode] = useState<MyAlphasViewMode>(() => sanitizeViewMode(storedPrefs?.viewMode));
  const [gradeRevealTick, setGradeRevealTick] = useState(0);
  const [revealAllResults, setRevealAllResults] = useState<Array<{ id: string; name: string; grade: AlphaGrade }>>([]);
  const [showRevealAllModal, setShowRevealAllModal] = useState(false);
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
    gsap.set(items, { y: 16, opacity: 0, scale: 0.97 });
    gsap.to(items, {
      y: 0, opacity: 1, scale: 1,
      duration: 0.5, stagger: 0.08,
      ease: "back.out(1.4)",
      delay: 0.25,
    });
  }, []);

  useEffect(() => {
    setVisibleColumns(getVisibleColumnsForMode(readMyAlphasPrefs(), alphaViewMode));
    setPage(1);
  }, [alphaViewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existingPrefs = readMyAlphasPrefs() ?? {};
    const visibleColumnsByMode = {
      ...(existingPrefs.visibleColumnsByMode ?? {}),
      [alphaViewMode]: Array.from(visibleColumns),
    };

    const prefs: MyAlphasPrefs = {
      prefsVersion: MY_ALPHAS_PREFS_VERSION,
      sortKey,
      sortDir,
      filterName,
      cardFilter,
      viewMode,
      pageSize,
      visibleColumns: Array.from(visibleColumns),
      visibleColumnsByMode,
    };

    window.localStorage.setItem(MY_ALPHAS_PREFS_KEY, JSON.stringify(prefs));
  }, [
    sortKey,
    sortDir,
    filterName,
    cardFilter,
    viewMode,
    pageSize,
    visibleColumns,
    alphaViewMode,
  ]);

  /* ── Data — build rows, assign submission status, epoch status ── */
  const alphaRows: AlphaRow[] = useMemo(() => {
    return factors.map((f) => {
      const sub = submissions.find((s) => s.factorId === f.id);
      const submissionStatus = getSubmissionStatusFromFactorStatus(f.status);
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
      if (cardFilter === "passed" && r.submissionStatus !== "passed") return false;
      if (cardFilter === "starred" && !starred.has(r.id)) return false;
      if (cardFilter === "failed" && r.submissionStatus !== "failed") return false;
      return true;
    });
  }, [alphaRows, filterName, cardFilter, starred]);

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
        const order = { passed: 0, failed: 1, os_testing: 2, is_testing: 3, backtesting: 4, queued: 5, rejected: 6 };
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

  const unrevealedPassedCount = useMemo(() => {
    // tick 变化时重新统计，确保一键刮开后计数即时刷新
    void gradeRevealTick;
    return alphaRows.reduce((count, row) => {
      if (row.submissionStatus !== "passed") return count;
      return readRevealedGrade(row.id) ? count : count + 1;
    }, 0);
  }, [alphaRows, gradeRevealTick]);

  const handleRevealAllUnrevealedGrades = () => {
    if (typeof window === "undefined") return;

    let updated = 0;
    const revealedThisRound: Array<{ id: string; name: string; grade: AlphaGrade }> = [];
    for (const row of alphaRows) {
      if (row.submissionStatus !== "passed") continue;
      if (readRevealedGrade(row.id)) continue;

      const nextGrade = getAlphaGrade(row.osSharpe);
      window.localStorage.setItem(`${REVEALED_GRADE_STORAGE_PREFIX}${row.id}`, nextGrade);
      revealedThisRound.push({
        id: row.id,
        name: row.name,
        grade: nextGrade,
      });
      updated += 1;
    }

    if (updated > 0) {
      setGradeRevealTick((v) => v + 1);
      const order: Record<AlphaGrade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
      revealedThisRound.sort((a, b) => {
        const rankDelta = order[a.grade] - order[b.grade];
        if (rankDelta !== 0) return rankDelta;
        return a.name.localeCompare(b.name);
      });
      setRevealAllResults(revealedThisRound);
      setShowRevealAllModal(true);
    }
  };

  const renderRevealResultGrade = (grade: AlphaGrade) => {
    if (grade === "S" || grade === "A") {
      return <ShinyTag tier={grade} />;
    }
    return (
      <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-[10px] font-semibold font-mono text-slate-900 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
        {grade}
      </span>
    );
  };

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
  const cardSortColumns = dataColumns.filter((c) => c.sortable && c.key !== "id" && c.key !== "testsPassed");
  const hasActiveFilters = Boolean(filterName);

  /* ── Status badge renderer — only passed/failed shown ── */
  const renderStatusBadge = (status: AlphaRow["submissionStatus"]) => {
    const s = statusConfig[status] ?? statusConfig.failed;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] whitespace-nowrap border ${s.bgClass} ${s.colorClass} ${s.borderClass}`}>
        {s.label === "PASSED" ? tr("PASSED", "通过") : tr("FAILED", "失败")}
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
        if (row.submissionStatus !== "passed") {
          return (
            <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-[10px] font-semibold font-mono text-slate-700 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300">
              -
            </span>
          );
        }
        const revealedGrade = readRevealedGrade(row.id);
        if (!revealedGrade) {
          return (
            <span
              className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              title="Unrevealed grade"
              aria-label="Unrevealed grade"
            >
              <span className="text-[11px] leading-none font-black text-slate-500 dark:text-slate-300 select-none">?</span>
            </span>
          );
        }
        if (revealedGrade === "S" || revealedGrade === "A") {
          return <ShinyTag tier={revealedGrade} />;
        }
        return (
          <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-[10px] font-semibold font-mono text-slate-900 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
            {revealedGrade}
          </span>
        );
      }
      case "epochStatus": {
        // Only passed alphas can participate in arena; all others show Ineligible
        if (row.submissionStatus !== "passed") {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-mono whitespace-nowrap text-muted-foreground/50 cursor-default">
                  {tr("Ineligible", "不可参赛")}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {tr("Only passed factors are eligible to participate in the Arena", "只有通过的因子才可进入竞技场")}
              </TooltipContent>
            </Tooltip>
          );
        }
        const rawEpoch = row.epochStatus || "Not Entered";
        const isRanked = rawEpoch !== "Not Entered";
        const es = rawEpoch === "Not Entered" ? tr("Not Entered", "未参赛") : rawEpoch;
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
    <>
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <div className="flex items-center justify-between">
            <h1 className="text-foreground">
              {tr("My Factors", "我的因子")}
            </h1>
            <Link href="/alphas/new">
              <StarButton
                style={{
                  backgroundColor: "transparent",
                  backgroundImage: "linear-gradient(rgb(79, 70, 229), rgb(79, 70, 229))",
                }}
                className="shadow-2xl text-[rgb(0,0,0)]"
              >
                <Plus className="w-3.5 h-3.5 text-white fill-white" />
                <ShinyText
                  text={tr("New Factor", "新建因子")}
                  speed={2}
                  delay={0.1}
                  spread={120}
                  direction="left"
                  yoyo={false}
                  pauseOnHover={false}
                  color="var(--new-alpha-text-base)"
                  shineColor="var(--new-alpha-text-shine)"
                  className="[--new-alpha-text-base:rgb(255,255,255)] [--new-alpha-text-shine:rgba(255,255,255,0.98)] dark:[--new-alpha-text-base:rgb(255,255,255)] dark:[--new-alpha-text-shine:rgba(255,255,255,0.98)]"
                />
              </StarButton>
            </Link>
          </div>
        </div>

      </div>

      {/* Pipeline Stats — Total / My Favorites / Passed / Failed */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
        <button
          onClick={() => { setCardFilter("all"); setPage(1); }}
          className={`fade-item surface-card h-[105px] border px-6 py-5 text-left cursor-pointer transition-colors ${
            cardFilter === "all"
              ? "border-primary/30 bg-primary/[0.06]"
              : "border-border hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 label-upper mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> {tr("Total", "总数")}
          </div>
          <div className="stat-value text-2xl font-bold text-foreground truncate">{submissionStats.total}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate" />
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "starred" ? "all" : "starred"); setPage(1); }}
          className={`fade-item surface-card h-[105px] border px-6 py-5 text-left cursor-pointer transition-colors ${
            cardFilter === "starred"
              ? "border-amber-400/40 bg-amber-400/[0.06]"
              : "border-border hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 label-upper mb-2 text-amber-400">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {tr("My Favorites", "我的收藏")}
          </div>
          <div className="stat-value text-2xl font-bold text-amber-500 dark:text-amber-400 truncate">{starred.size}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate" />
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "passed" ? "all" : "passed"); setPage(1); }}
          className={`fade-item surface-card h-[105px] border px-6 py-5 text-left cursor-pointer transition-colors ${
            cardFilter === "passed"
              ? "border-success/40 bg-success/[0.06]"
              : "border-border hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 label-upper mb-2 text-success">
            <CheckCircle className="w-3.5 h-3.5" /> {tr("Passed", "通过")}
          </div>
          <div className="stat-value text-2xl font-bold text-success truncate">{submissionStats.passed}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate" />
        </button>
        <button
          onClick={() => { setCardFilter(cardFilter === "failed" ? "all" : "failed"); setPage(1); }}
          className={`fade-item surface-card h-[105px] border px-6 py-5 text-left cursor-pointer transition-colors ${
            cardFilter === "failed"
              ? "border-destructive/40 bg-destructive/[0.06]"
              : "border-border hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 label-upper mb-2 text-destructive">
            <XCircle className="w-3.5 h-3.5" /> {tr("Failed", "失败")}
          </div>
          <div className="stat-value text-2xl font-bold text-destructive truncate">{submissionStats.failed + submissionStats.rejected}</div>
          <div className="text-sm mt-1 text-muted-foreground truncate" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          TOOLBAR + DATA TABLE / CARD VIEW
          ═══════════════════════════════════════════ */}
      <div className="overflow-visible space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-0 py-1">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
              value={filterName}
              onChange={(e) => { setFilterName(e.target.value); setPage(1); }}
              className="h-8 w-full rounded-xl border border-border bg-accent/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            />
          </div>
          <div className="flex-1" />

          {hasActiveFilters && (
            <button
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/15"
              onClick={() => {
                setFilterName("");
                setPage(1);
              }}
            >
              <X className="w-3 h-3" />
              {tr("Clear filters", "清除筛选")}
            </button>
          )}

          {unrevealedPassedCount > 0 && (
            <button
              className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600"
              onClick={handleRevealAllUnrevealedGrades}
              title={tr(`Reveal ${unrevealedPassedCount} unrevealed grades`, `揭示 ${unrevealedPassedCount} 个未揭示等级`)}
            >
              {tr("Reveal all grades", "揭示全部等级")}
            </button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {tr("Sort", "排序")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-2xl" align="end">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {viewMode === "card" ? tr("Sort Cards", "卡片排序") : tr("Sort Rows", "表格排序")}
                  </p>
                  <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {cardSortColumns.map((col) => {
                      const active = sortKey === col.key;
                      return (
                        <button
                          key={col.key}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                            active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                          }`}
                          onClick={() => {
                            if (active) {
                              setSortDir(sortDir === "asc" ? "desc" : "asc");
                            } else {
                              handleSort(col.key);
                            }
                          }}
                        >
                          <span>{columnLabelMap[col.key as keyof typeof columnLabelMap] ?? col.label}</span>
                          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            {active ? (sortDir === "asc" ? "ASC" : "DESC") : tr("DEFAULT", "默认")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {sortKey && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => {
                          setSortDir(sortDir === "asc" ? "desc" : "asc");
                        }}
                      >
                        {tr("Toggle direction", "切换方向")}
                      </button>
                      <button
                        className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => {
                          setSortKey("");
                          setSortDir(null);
                        }}
                      >
                        {tr("Clear", "清除")}
                      </button>
                    </div>
                  )}
                </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <Settings2 className="w-3.5 h-3.5" />
                {tr("Columns", "列")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 rounded-2xl" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium mb-2 text-muted-foreground">{tr("Toggle Columns", "切换显示列")}</p>
                {dataColumns.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 px-1 rounded-lg cursor-pointer">
                    <Checkbox
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs text-foreground">{columnLabelMap[col.key as keyof typeof columnLabelMap] ?? col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* View Mode Toggle */}
          <div className="inline-flex h-[34px] items-center overflow-hidden rounded-xl border border-border bg-card p-px">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex h-8 w-8 items-center justify-center transition-all duration-200 ease-in-out ${
                viewMode === "table"
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={tr("Table View", "表格视图")}
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`inline-flex h-8 w-8 items-center justify-center transition-all duration-200 ease-in-out ${
                viewMode === "card"
                  ? "bg-primary text-[#020617]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={tr("Card View", "卡片视图")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === "card" && (
          <div className="pt-4">
            <AlphaCardView rows={sorted} visibleColumns={visibleColumns} starred={starred} onToggleStar={toggleStar} />
          </div>
        )}

        {/* Table */}
        {viewMode === "table" && (
        <div className="surface-card border border-border/70 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full" style={{ minWidth: "900px" }}>
            <ColGroup />
            <thead>
              <tr className="border-b border-border/60">
                {visibleCols.map((col) => (
                  <th
                    key={col.key}
                    className={`px-3 py-2.5 transition-all duration-200 ease-in-out ${col.key === "name" ? "pl-10" : ""} ${col.sortable ? "cursor-pointer hover:bg-accent/40" : ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${sortKey === col.key ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className={`flex items-center gap-1.5 label-upper whitespace-nowrap select-none ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                      {columnLabelMap[col.key as keyof typeof columnLabelMap] ?? col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </span>
                  </th>
                ))}
                {/* Actions header — sticky right */}
                <th className="px-3 py-2.5 text-right sticky right-0 z-[2] bg-card border-l border-border shadow-[-6px_0_12px_rgba(0,0,0,0.04)] dark:shadow-[-6px_0_12px_rgba(0,0,0,0.3)]">
                  <span className="label-upper">{tr("Actions", "操作")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr
                  key={row.id}
                  className={`transition-all duration-200 ease-in-out group border-t border-border/40 hover:bg-accent/30 ${starred.has(row.id) ? "bg-amber-500/[0.03] dark:bg-amber-500/[0.04]" : ""}`}
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
                        {tr("View", "查看")}
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-card/40">
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
      </div>)}
      </div>

    </div>
    <Dialog open={showRevealAllModal} onOpenChange={setShowRevealAllModal}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !left-0 !top-0 !z-50 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none border-none bg-[#050814]/92 p-0 shadow-none"
        style={{ transform: "none", inset: 0 }}
      >
        <DialogTitle className="sr-only">Reveal All Results</DialogTitle>
        <div
          className="absolute inset-0 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setShowRevealAllModal(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_20px_60px_rgba(2,6,23,0.6)] backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-6">
              <div>
                <h3 className="text-base font-semibold text-foreground">Revealed Grades</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {revealAllResults.length} newly revealed in this round
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full border-border"
                onClick={() => setShowRevealAllModal(false)}
              >
                Close
              </Button>
            </div>

            <div className="max-h-[66vh] overflow-y-auto p-4 sm:p-6">
              {revealAllResults.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {revealAllResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-accent/20 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
                        <div className="mt-1 text-xs font-mono text-muted-foreground">{item.id}</div>
                      </div>
                      <div className="ml-3 shrink-0">{renderRevealResultGrade(item.grade)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border/60 bg-accent/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  No newly revealed grades.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
