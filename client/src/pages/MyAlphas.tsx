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
import { useState, useMemo, useEffect, useRef, useId, type ReactNode } from "react";
import gsap from "gsap";
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown,
  Settings2,
  Star,
  ChevronLeft,
  ChevronRight,
  Coins,
  Search,
  Loader2,
  BarChart3,
  X,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  factors,
  submissions,
  leaderboardByFactorByEpoch,
  currentEpoch,
  type Factor,
  getAlphaGrade,
  type AlphaGrade,
  generatePnLData,
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
  { key: "grade", label: "Grade", defaultVisible: true, sortable: true, width: "72px", align: "center" },
  { key: "rewardAmount", label: "Bonus (USD)", defaultVisible: true, sortable: true, width: "118px", align: "right" },
  { key: "sharpe", label: "IS Sharpe", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "osSharpe", label: "OS Sharpe", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "pnl", label: "PnL", defaultVisible: true, sortable: false, width: "126px", align: "center" },
  { key: "returns", label: "Returns", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "drawdown", label: "Drawdown", defaultVisible: true, sortable: true, width: "90px", align: "right" },
  { key: "turnover", label: "Turnover", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "fitness", label: "Fitness", defaultVisible: true, sortable: true, width: "80px", align: "right" },
  { key: "createdAt", label: "Date Created", defaultVisible: true, sortable: true, width: "110px" },
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
const DELETED_FACTORS_STORAGE_KEY = "otterquant:myalphas:deleted-factors";
const MY_ALPHAS_PREFS_VERSION = 4;
const REVEALED_GRADE_STORAGE_PREFIX = "alphaforge_grade_reset_v5_";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown" ? stored : "greenUpRedDown";
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return true;
}

function getChartColorTokens(mode: ChartColorMode) {
  return mode === "redUpGreenDown"
    ? {
        upClass: "text-rose-500",
        downClass: "text-emerald-500",
        upHex: "#F43F5E",
        downHex: "#10B981",
      }
    : {
        upClass: "text-emerald-500",
        downClass: "text-rose-500",
        upHex: "#10B981",
        downHex: "#F43F5E",
      };
}

function parsePercentValue(value: string) {
  const parsed = Number.parseFloat(value.replace(/[,%]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSparklinePoints(values: number[], width: number, height: number, padding = 4) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y, value };
    });
}

function buildSparklineAreaRuns(
  points: Array<{ x: number; y: number; value: number }>,
  upColor: string,
  downColor: string,
  zeroY: number
) {
  if (points.length < 2) return [];

  const runs: Array<{ color: string; points: typeof points }> = [];
  const appendRun = (color: string, segmentPoints: typeof points) => {
    if (segmentPoints.length < 2) return;
    const previous = runs[runs.length - 1];
    if (previous?.color === color) {
      previous.points.push(...segmentPoints.slice(1));
      return;
    }
    runs.push({ color, points: segmentPoints });
  };

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const previousIsPositive = previous.value >= 0;
    const pointIsPositive = point.value >= 0;

    if (previousIsPositive === pointIsPositive || previous.value === 0 || point.value === 0) {
      appendRun(pointIsPositive ? upColor : downColor, [previous, point]);
      continue;
    }

    const ratio = (0 - previous.value) / (point.value - previous.value);
    const zeroPoint = {
      value: 0,
      x: previous.x + (point.x - previous.x) * ratio,
      y: zeroY,
    };
    appendRun(previousIsPositive ? upColor : downColor, [previous, zeroPoint]);
    appendRun(pointIsPositive ? upColor : downColor, [zeroPoint, point]);
  }

  return runs.filter((run) => run.points.length > 1);
}

function buildSparklineAreaPath(points: Array<{ x: number; y: number }>, zeroY: number) {
  if (points.length < 2) return "";

  const topPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return `${topPath} L ${last.x.toFixed(2)} ${zeroY.toFixed(2)} L ${first.x.toFixed(2)} ${zeroY.toFixed(2)} Z`;
}

function buildSparklineLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function TablePnlSparkline({ values, upColor, downColor }: { values: number[]; upColor: string; downColor: string }) {
  const svgId = useId().replace(/:/g, "");
  const width = 108;
  const height = 42;
  const points = buildSparklinePoints(values, width, height);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const zeroY = height - 4 - ((0 - min) / range) * (height - 8);
  const runs = buildSparklineAreaRuns(points, upColor, downColor, zeroY);

  return (
    <div className="flex h-full min-h-[42px] w-[108px] items-center" aria-label="PNL折线图">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => {
          const fillId = `${svgId}-table-pnl-fill-${index}`;
          return (
            <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}`}>
              <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${fillId})`} />
              <path
                d={buildSparklineLinePath(run.points)}
                stroke={run.color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
        <defs>
          {runs.map((run, index) => {
            const isPositiveRun = run.points.some((point) => point.value > 0);
            const lineEdgeY = isPositiveRun
              ? Math.min(...run.points.map((point) => point.y))
              : Math.max(...run.points.map((point) => point.y));
            return (
              <linearGradient
                key={`${svgId}-table-pnl-fill-${index}`}
                id={`${svgId}-table-pnl-fill-${index}`}
                x1="0"
                x2="0"
                y1={isPositiveRun ? lineEdgeY : zeroY}
                y2={isPositiveRun ? zeroY : lineEdgeY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={run.color} stopOpacity="0.58" />
                <stop offset="100%" stopColor={run.color} stopOpacity="0.12" />
              </linearGradient>
            );
          })}
        </defs>
      </svg>
    </div>
  );
}

function getDefaultVisibleColumnKeysForMode(mode: AlphaViewMode) {
  if (mode === "beginner") {
    return ["name", "grade", "rewardAmount", "pnl", "sharpe", "osSharpe", "fitness"];
  }
  return [
    "name",
    "grade",
    "rewardAmount",
    "sharpe",
    "osSharpe",
    "pnl",
    "returns",
    "drawdown",
    "turnover",
    "fitness",
    "createdAt",
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

function readDeletedFactorIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(DELETED_FACTORS_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
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

function getRowGrade(row: Pick<AlphaRow, "submissionStatus" | "osSharpe">): AlphaGrade {
  return row.submissionStatus === "passed" ? getAlphaGrade(row.osSharpe) : "F";
}

const REWARD_AMOUNT_BY_GRADE: Record<AlphaGrade, number> = {
  S: 1,
  A: 0.5,
  B: 0.3,
  C: 0.2,
  D: 0.1,
  F: 0,
};
const REWARD_TEXT_GRADIENT = {
  background: "linear-gradient(90deg, #FE9A00 0%, #FDC700 50%, #E17100 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};
const GRADE_DISTRIBUTION_TAG_STYLES: Record<AlphaGrade, { bar: string; text: string }> = {
  S: {
    bar: "linear-gradient(135deg,#F59E0B 0%,#FDE68A 48%,#F97316 100%)",
    text: "#B45309",
  },
  A: {
    bar: "linear-gradient(135deg,#EC4899 0%,#F9A8D4 52%,#DB2777 100%)",
    text: "#DB2777",
  },
  B: {
    bar: "linear-gradient(135deg,#7C3AED 0%,#C084FC 52%,#6D28D9 100%)",
    text: "#7C3AED",
  },
  C: {
    bar: "linear-gradient(135deg,#10B981 0%,#A7F3D0 52%,#059669 100%)",
    text: "#059669",
  },
  D: {
    bar: "linear-gradient(135deg,#38BDF8 0%,#BAE6FD 52%,#0284C7 100%)",
    text: "#0284C7",
  },
  F: {
    bar: "linear-gradient(135deg,#94A3B8 0%,#E2E8F0 52%,#64748B 100%)",
    text: "#64748B",
  },
};

function getRewardAmount(row: Pick<AlphaRow, "submissionStatus" | "osSharpe">) {
  return REWARD_AMOUNT_BY_GRADE[getRowGrade(row)];
}

function formatRewardAmount(amount: number) {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 1 });
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

const demoPendingArenaFactorIds = new Set(["AF-003"]);

/* Build epoch status lookup from leaderboard data — returns { display, epochId } */
function getEpochStatus(factorId: string): { display: string; epochId: string | null } {
  if (demoPendingArenaFactorIds.has(factorId)) {
    return { display: "Not Entered", epochId: null };
  }

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
      grade: tr("Grade", "等级"),
      rewardAmount: tr("Bonus (USD)", "奖金(USD)"),
      createdAt: tr("Date Created", "创建日期"),
      pnl: tr("PnL", "PNL"),
      sharpe: tr("IS Sharpe", "IS 夏普"),
      osSharpe: tr("OS Sharpe", "OS 夏普"),
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
  const [deletedFactorIds, setDeletedFactorIds] = useState<Set<string>>(() => readDeletedFactorIds());
  const [pendingDeleteFactor, setPendingDeleteFactor] = useState<AlphaRow | null>(null);
  const [gradeRevealTick, setGradeRevealTick] = useState(0);
  const [revealAllResults, setRevealAllResults] = useState<Array<{ id: string; name: string; grade: AlphaGrade }>>([]);
  const [showRevealAllModal, setShowRevealAllModal] = useState(false);
  const [showToolbarFilterMenu, setShowToolbarFilterMenu] = useState(false);
  const [showRewardDetails, setShowRewardDetails] = useState(false);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(readChartColorMode);
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const tablePnlValues = useMemo(() => {
    const pnlData = generatePnLData();
    const combined = [...pnlData.train, ...pnlData.test].map((item) => item.value);
    const sampleEvery = Math.max(1, Math.floor(combined.length / 28));
    return combined.filter((_, index) => index % sampleEvery === 0).slice(-28);
  }, []);
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const directionalTextClass = (value: number) => {
    if (value > 0) return chartColors.upClass;
    if (value < 0) return chartColors.downClass;
    return "text-foreground";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncPlainExplanation = () => setPlainExplainEnabled(readPlainExplanationEnabled());
    window.addEventListener("storage", syncPlainExplanation);
    window.addEventListener("focus", syncPlainExplanation);
    return () => {
      window.removeEventListener("storage", syncPlainExplanation);
      window.removeEventListener("focus", syncPlainExplanation);
    };
  }, []);

  useEffect(() => {
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DELETED_FACTORS_STORAGE_KEY, JSON.stringify(Array.from(deletedFactorIds)));
  }, [deletedFactorIds]);

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

  const activeAlphaRows = useMemo(
    () => alphaRows.filter((row) => !deletedFactorIds.has(row.id)),
    [alphaRows, deletedFactorIds]
  );

  const gradeOrder: AlphaGrade[] = ["S", "A", "B", "C", "D", "F"];
  const gradeDistribution = useMemo(() => {
    const distribution: Record<AlphaGrade, number> = {
      S: 0,
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    activeAlphaRows.forEach((row) => {
      distribution[getRowGrade(row)] += 1;
    });

    return distribution;
  }, [activeAlphaRows]);

  const totalRewardAmount = useMemo(
    () => activeAlphaRows.reduce((sum, row) => sum + getRewardAmount(row), 0),
    [activeAlphaRows]
  );

  const rewardBreakdown = useMemo(
    () =>
      gradeOrder.map((grade) => {
        const count = activeAlphaRows.filter((row) => getRowGrade(row) === grade).length;
        const unitReward = REWARD_AMOUNT_BY_GRADE[grade];
        return {
          grade,
          count,
          unitReward,
          totalReward: count * unitReward,
        };
      }),
    [activeAlphaRows, gradeOrder]
  );

  const filtered = useMemo(() => {
    return activeAlphaRows.filter((r) => {
      if (filterName && !r.name.toLowerCase().includes(filterName.toLowerCase()) && !r.id.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (cardFilter === "passed" && r.submissionStatus !== "passed") return false;
      if (cardFilter === "starred" && !starred.has(r.id)) return false;
      if (cardFilter === "failed" && r.submissionStatus !== "failed") return false;
      return true;
    });
  }, [activeAlphaRows, filterName, cardFilter, starred]);

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
        const gradeOrder: Record<AlphaGrade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
        av = gradeOrder[getRowGrade(a)];
        bv = gradeOrder[getRowGrade(b)];
      } else if (sortKey === "submissionStatus" || sortKey === "status_col") {
        const order = { passed: 0, failed: 1, os_testing: 2, is_testing: 3, backtesting: 4, queued: 5, rejected: 6 };
        av = order[a.submissionStatus] ?? 99;
        bv = order[b.submissionStatus] ?? 99;
      } else if (sortKey === "rewardAmount") {
        av = getRewardAmount(a);
        bv = getRewardAmount(b);
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
      const order: Record<AlphaGrade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
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

  const restoreDefaultColumns = () => {
    setVisibleColumns(new Set(getDefaultVisibleColumnKeysForMode(alphaViewMode)));
    setPage(1);
  };

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const requestDeleteFactor = (row: AlphaRow) => {
    setPendingDeleteFactor(row);
  };

  const confirmDeleteFactor = () => {
    if (!pendingDeleteFactor) return;
    setDeletedFactorIds((prev) => {
      const next = new Set(prev);
      next.add(pendingDeleteFactor.id);
      return next;
    });
    setPendingDeleteFactor(null);
    setPage(1);
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
      case "pnl":
        return <TablePnlSparkline values={tablePnlValues} upColor={chartColors.upHex} downColor={chartColors.downHex} />;
      case "sharpe":
        return <span className="font-mono text-xs tabular-nums text-foreground">{row.sharpe.toFixed(2)}</span>;
      case "osSharpe":
        return (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {row.osSharpe.toFixed(2)}
          </span>
        );
      case "fitness":
        return (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {row.fitness.toFixed(2)}
          </span>
        );
      case "rewardAmount": {
        const amount = getRewardAmount(row);
        return (
          <span
            className={`font-mono text-xs tabular-nums whitespace-nowrap ${amount > 0 ? "font-semibold" : "text-muted-foreground/60"}`}
            style={amount > 0 ? REWARD_TEXT_GRADIENT : undefined}
          >
            {formatRewardAmount(amount)}
          </span>
        );
      }
      case "returns":
        return <span className={`font-mono text-xs tabular-nums whitespace-nowrap ${directionalTextClass(parsePercentValue(row.returns))}`}>{row.returns}</span>;
      case "turnover":
        return <span className="font-mono text-xs tabular-nums text-foreground whitespace-nowrap">{row.turnover}</span>;
      case "drawdown":
        return (
          <span className={`font-mono text-xs tabular-nums whitespace-nowrap ${
            parsePercentValue(row.drawdown) === 0 ? "text-foreground" : chartColors.downClass
          }`}>
            {row.drawdown}
          </span>
        );
      case "grade": {
        if (row.submissionStatus !== "passed") {
          return (
            <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-[10px] font-semibold font-mono text-slate-700 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300">
              F
            </span>
          );
        }
        const revealedGrade = readRevealedGrade(row.id);
        if (!revealedGrade) {
          return (
            <span
              className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              title={tr("Unrevealed grade", "未揭示等级")}
              aria-label={tr("Unrevealed grade", "未揭示等级")}
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
        if (rawEpoch === "Not Entered") {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs font-mono whitespace-nowrap text-muted-foreground/50 cursor-default">
                  {tr("Pending Entry", "待参赛")}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs leading-5">
                {tr(
                  "Passed factors are automatically entered into Factor Arena. This factor will join when the next round starts.",
                  "通过状态的因子会自动参与因子竞技；当前轮次尚未开始，等待下一轮开始后自动参与。"
                )}
              </TooltipContent>
            </Tooltip>
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

  const sortDirectionLabel = (direction: SortDir) => {
    if (direction === "asc") return tr("Ascending", "升序");
    if (direction === "desc") return tr("Descending", "降序");
    return tr("Unsorted", "未排序");
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
      <col style={{ width: "92px" }} />
    </colgroup>
  );

  const withPlainExplanation = (content: string, child: ReactNode) => {
    if (alphaViewMode !== "beginner" || !plainExplainEnabled) return child;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{child}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs leading-5">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  };

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

      {/* Portfolio Stats — read-only overview */}
      <div ref={statsRef} className="grid grid-cols-1 gap-4 min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.55fr)]">
        <div className="fade-item surface-card min-h-[118px] border border-border/70 bg-white px-6 py-5 dark:bg-card">
          <div className="flex items-center gap-2 label-upper text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            {tr("Factor Total", "因子总数")}
          </div>
          <div className="mt-4 flex items-end gap-2">
            <div className="stat-value text-3xl font-bold text-foreground tabular-nums">{activeAlphaRows.length}</div>
            <div className="pb-1 text-xs text-muted-foreground">{tr("factors", "个因子")}</div>
          </div>
        </div>

        <div className="fade-item surface-card min-h-[118px] border border-border/70 bg-white px-6 py-5 dark:bg-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 label-upper text-muted-foreground">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              {tr("Cumulative Bonus", "累计奖金")}
            </div>
            <button
              type="button"
              className="text-xs font-medium text-primary transition-colors hover:text-primary/75"
              onClick={() => setShowRewardDetails(true)}
            >
              {tr("Details", "明细")}
            </button>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <div
              className="stat-value text-3xl font-bold tabular-nums"
              style={REWARD_TEXT_GRADIENT}
            >
              {formatRewardAmount(totalRewardAmount)}
            </div>
            <div className="pb-1 text-xs font-medium text-muted-foreground">USD</div>
          </div>
        </div>

        <div className="fade-item surface-card min-h-[118px] border border-border/70 bg-card px-6 py-5">
          <div className="flex items-start">
            <div className="label-upper text-muted-foreground">{tr("Factor Grade Distribution", "因子等级分布")}</div>
          </div>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-muted">
            {gradeOrder.map((grade) => {
              const count = gradeDistribution[grade];
              const color = GRADE_DISTRIBUTION_TAG_STYLES[grade].bar;
              const widthPercent = activeAlphaRows.length === 0 ? 0 : (count / activeAlphaRows.length) * 100;
              if (count === 0) return null;
              return (
                <Tooltip key={grade}>
                  <TooltipTrigger asChild>
                    <div
                      className="h-full transition-all duration-300 hover:brightness-95"
                      style={{ width: `${widthPercent}%`, background: color }}
                      aria-label={`${grade}: ${count}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {tr("Grade", "等级")} {grade}: {count} ({widthPercent.toFixed(1)}%)
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            {gradeOrder.map((grade) => (
              <div key={grade} className="inline-flex min-w-[46px] items-baseline gap-0.5 rounded-full bg-muted/40 px-2 py-1">
                <span className="text-xs font-semibold font-mono" style={{ color: GRADE_DISTRIBUTION_TAG_STYLES[grade].text }}>{grade}:</span>
                <span className="text-xs font-mono text-foreground tabular-nums">{gradeDistribution[grade]}</span>
              </div>
            ))}
          </div>
        </div>
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

          <Popover open={showToolbarFilterMenu} onOpenChange={setShowToolbarFilterMenu}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <span>{cardFilter === "starred" ? tr("My Favorites", "我的收藏") : tr("All", "全部")}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 rounded-2xl p-2" align="end">
              {([
                { key: "all", label: tr("All", "全部") },
                { key: "starred", label: tr("My Favorites", "我的收藏") },
              ] as Array<{ key: MyAlphasCardFilter; label: string }>).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    cardFilter === item.key
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                  onClick={() => {
                    setCardFilter(item.key);
                    setShowToolbarFilterMenu(false);
                    setPage(1);
                  }}
                >
                  <span>{item.label}</span>
                  <span
                    className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
                      cardFilter === item.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card"
                    }`}
                  >
                    {cardFilter === item.key ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {tr("Sort", "排序")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-2xl" align="end">
                <div className="space-y-2">
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
                            {active ? sortDirectionLabel(sortDir) : tr("Default", "默认")}
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
                    {tr("Display Items", "显示项")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 rounded-2xl" align="end">
              <div className="space-y-1">
                <p className="text-xs font-medium mb-2 text-muted-foreground">{tr("Toggle Display Items", "切换显示项")}</p>
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
                <div className="mt-2 border-t border-border/60 pt-2">
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={restoreDefaultColumns}
                  >
                    {tr("Restore defaults", "恢复默认")}
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* View Mode Toggle */}
          <div className="inline-flex h-[34px] items-center overflow-hidden rounded-xl border border-border bg-card p-px">
            <button
              onClick={() => setViewMode("table")}
              className={`inline-flex h-8 w-8 items-center justify-center transition-all duration-200 ease-in-out ${
                viewMode === "table"
                  ? "rounded-[10px] bg-primary/10 text-primary shadow-sm dark:bg-primary dark:text-primary-foreground"
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
                  ? "rounded-[10px] bg-primary/10 text-primary shadow-sm dark:bg-primary dark:text-primary-foreground"
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
            <AlphaCardView
              rows={sorted}
              visibleColumns={visibleColumns}
              starred={starred}
              onToggleStar={toggleStar}
              onRequestDelete={requestDeleteFactor}
              plainExplainEnabled={alphaViewMode === "beginner" && plainExplainEnabled}
            />
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
                {visibleCols.map((col) => {
                  const headerContent = (
                    <span className={`flex items-center gap-1.5 label-upper whitespace-nowrap select-none ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                      {columnLabelMap[col.key as keyof typeof columnLabelMap] ?? col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </span>
                  );

                  return (
                    <th
                      key={col.key}
                      className={`px-3 py-2.5 transition-all duration-200 ease-in-out ${col.key === "name" ? "pl-10" : ""} ${col.sortable ? "cursor-pointer hover:bg-accent/40" : ""} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${sortKey === col.key ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {headerContent}
                    </th>
                  );
                })}
                {/* Actions header — sticky right */}
                <th className="w-px whitespace-nowrap px-3 py-2.5 text-right sticky right-0 z-[2] bg-card border-l border-border shadow-[-6px_0_12px_rgba(0,0,0,0.04)] dark:shadow-[-6px_0_12px_rgba(0,0,0,0.3)]">
                  <span className="label-upper">{tr("Actions", "操作")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row, i) => (
                <tr
                  key={row.id}
                  className="transition-all duration-200 ease-in-out group border-t border-border/40 hover:bg-accent/30"
                >
                  {visibleCols.map((col) => (
                    <td key={col.key} className={`px-3 ${col.key === "pnl" ? "py-1.5" : "py-2.5"} ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}`}>
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                  {/* Actions — always visible, sticky right */}
                  <td className="w-px whitespace-nowrap px-3 py-2.5 text-right sticky right-0 z-[2] bg-card group-hover:bg-slate-50 dark:group-hover:bg-slate-800/30 border-l border-border shadow-[-6px_0_12px_rgba(0,0,0,0.04)] dark:shadow-[-6px_0_12px_rgba(0,0,0,0.3)] transition-colors duration-200 ease-in-out">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-accent/50 hover:text-foreground"
                            aria-label={tr("More actions", "更多操作")}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-32 rounded-xl p-1" align="end">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                            onClick={() => requestDeleteFactor(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {tr("Delete", "删除")}
                          </button>
                        </PopoverContent>
                      </Popover>
                      <Link href={`/alphas/${row.id}`}>
                        <button className="text-[10px] uppercase tracking-[0.15em] font-medium px-2.5 py-1 rounded-full transition-all duration-200 ease-in-out whitespace-nowrap text-muted-foreground border border-border hover:border-primary hover:text-primary hover:bg-primary/5">
                          {tr("View", "查看")}
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length + 1} className="text-center py-12 text-sm text-muted-foreground">
                    {tr("No factors match the current filters.", "没有符合当前筛选条件的因子。")}
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
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} {tr("of", "共")} {sorted.length}
            </span>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <span>{tr("Rows", "行数")}</span>
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
    <Dialog open={showRewardDetails} onOpenChange={setShowRewardDetails}>
      <DialogContent className="max-w-xl rounded-2xl border-border bg-card p-0 text-foreground">
        <div className="flex items-start justify-between gap-4 pb-3 pl-6 pr-12 pt-5">
          <div>
            <DialogTitle className="text-base font-semibold">{tr("Bonus Details", "奖金明细")}</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("Breakdown by factor grade", "按因子等级汇总")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Total", "总计")}</div>
            <div className="mt-1 flex items-end justify-end gap-1.5">
              <span className="text-2xl font-bold tabular-nums" style={REWARD_TEXT_GRADIENT}>
                {formatRewardAmount(totalRewardAmount)}
              </span>
              <span className="pb-1 text-xs font-medium text-muted-foreground">USD</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 pt-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] border-b border-border/60 pb-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <div>{tr("Grade", "等级")}</div>
              <div className="text-right">{tr("Count", "数量")}</div>
              <div className="text-right">{tr("Unit", "单个奖金")}</div>
              <div className="text-right">{tr("Subtotal", "小计")}</div>
            </div>
            {rewardBreakdown.map((item) => (
              <div
                key={item.grade}
                className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center border-b border-border/50 py-3 text-xs last:border-b-0"
              >
                <div>{renderRevealResultGrade(item.grade)}</div>
                <div className="text-right font-mono tabular-nums text-foreground">{item.count}</div>
                <div className="text-right font-mono tabular-nums text-muted-foreground">{formatRewardAmount(item.unitReward)}</div>
                <div className="text-right font-mono font-semibold tabular-nums" style={item.totalReward > 0 ? REWARD_TEXT_GRADIENT : undefined}>
                  {formatRewardAmount(item.totalReward)}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={showRevealAllModal} onOpenChange={setShowRevealAllModal}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !left-0 !top-0 !z-50 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 rounded-none border-none bg-[#050814]/92 p-0 shadow-none"
        style={{ transform: "none", inset: 0 }}
      >
        <DialogTitle className="sr-only">{tr("Reveal All Results", "揭示全部等级结果")}</DialogTitle>
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
                <h3 className="text-base font-semibold text-foreground">{tr("Revealed Grades", "已揭示等级")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {tr(
                    `${revealAllResults.length} newly revealed in this round`,
                    `本轮新揭示 ${revealAllResults.length} 个等级`
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full border-border"
                onClick={() => setShowRevealAllModal(false)}
              >
                {tr("Close", "关闭")}
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
                  {tr("No newly revealed grades.", "本轮没有新揭示的等级。")}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(pendingDeleteFactor)} onOpenChange={(open) => !open && setPendingDeleteFactor(null)}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 text-foreground">
        <div className="border-b border-border/60 px-5 py-4">
          <DialogTitle className="text-base font-semibold">{tr("Delete Factor", "删除因子")}</DialogTitle>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-foreground">
            {pendingDeleteFactor?.name
              ? tr(
                  `Confirm deleting ${pendingDeleteFactor.name} (${pendingDeleteFactor.id})? This action cannot be undone.`,
                  `确认删除 ${pendingDeleteFactor.name}（${pendingDeleteFactor.id}）？删除后无法恢复。`
                )
              : tr("Confirm deleting this factor? This action cannot be undone.", "确认删除该因子？删除后无法恢复。")}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
          <Button
            variant="outline"
            className="h-8 rounded-full border-border bg-card px-3 text-xs"
            onClick={() => setPendingDeleteFactor(null)}
          >
            {tr("Cancel", "取消")}
          </Button>
          <Button
            className="h-8 rounded-full bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90"
            onClick={confirmDeleteFactor}
          >
            {tr("Delete", "删除")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
