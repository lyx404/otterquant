/*
 * Leaderboard — Amber/Orange + Warm Beige Design System
 * Top 1-3: Refined trophy SVGs with metallic sheen (gold/silver/bronze)
 * Top 1-3 text: username & factor in matching gold/silver/bronze colors
 * Reward: rich gold gradient text, USDT only in table header
 * Pure Tailwind classes — zero inline styles
 */
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import {
  Trophy,
  Clock,
  Award,
  Users,
  CheckCircle2,
  Timer,
} from "lucide-react";
import {
  allEpochs,
  leaderboardByFactorByEpoch,
  leaderboardByUserByEpoch,
} from "@/lib/mockData";

type ViewMode = "factor" | "user";

/* ── Countdown hook ── */
function useCountdown(endDateStr: string, isActive: boolean) {
  const [timeLeft, setTimeLeft] = useState("");

  const calcTimeLeft = useCallback(() => {
    const end = new Date(endDateStr).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    if (diff === 0) return "Ended";
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [endDateStr]);

  useEffect(() => {
    if (!isActive) return;
    setTimeLeft(calcTimeLeft());
    const id = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [isActive, calcTimeLeft]);

  return timeLeft;
}

/* ── Strip " USDT" from reward strings ── */
function stripUSDT(reward: string) {
  return reward.replace(/\s*USDT$/i, "");
}

/* ── Refined Trophy SVGs with metallic sheen & highlights ── */
const GoldTrophy = () => (
  <div className="w-10 h-10 flex items-center justify-center">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gold-body" x1="8" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="25%" stopColor="#F6D365" />
          <stop offset="50%" stopColor="#D4A843" />
          <stop offset="75%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#92700A" />
        </linearGradient>
        <linearGradient id="gold-shine" x1="12" y1="4" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFDE7" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFFDE7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gold-base" x1="10" y1="24" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4A843" />
          <stop offset="50%" stopColor="#F6D365" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      {/* Cup body */}
      <path d="M10 6h16v3c0 5.5-3.2 9.5-8 11-4.8-1.5-8-5.5-8-11V6z" fill="url(#gold-body)" />
      {/* Sheen highlight */}
      <path d="M12 6h5v2c0 4-1.5 7-3 8.5C12.5 14 11 11 11 8V6z" fill="url(#gold-shine)" />
      {/* Left handle */}
      <path d="M10 8H6.5c0 3.5 1.8 6 3.5 7" stroke="url(#gold-body)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Right handle */}
      <path d="M26 8h3.5c0 3.5-1.8 6-3.5 7" stroke="url(#gold-body)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Stem */}
      <rect x="16" y="20" width="4" height="4" rx="0.5" fill="url(#gold-body)" />
      {/* Base */}
      <rect x="12" y="24" width="12" height="2.5" rx="1.25" fill="url(#gold-base)" />
      {/* Number circle */}
      <circle cx="18" cy="13" r="5" fill="#1E1B3A" stroke="#D4A843" strokeWidth="0.8" />
      <text x="18" y="15.5" textAnchor="middle" fill="#F6D365" fontSize="7" fontWeight="700" fontFamily="ui-monospace, monospace">1</text>
    </svg>
  </div>
);

const SilverTrophy = () => (
  <div className="w-10 h-10 flex items-center justify-center">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="silver-body" x1="8" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="25%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="75%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="silver-shine" x1="12" y1="4" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="silver-base" x1="10" y1="24" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>
      <path d="M10 6h16v3c0 5.5-3.2 9.5-8 11-4.8-1.5-8-5.5-8-11V6z" fill="url(#silver-body)" />
      <path d="M12 6h5v2c0 4-1.5 7-3 8.5C12.5 14 11 11 11 8V6z" fill="url(#silver-shine)" />
      <path d="M10 8H6.5c0 3.5 1.8 6 3.5 7" stroke="url(#silver-body)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M26 8h3.5c0 3.5-1.8 6-3.5 7" stroke="url(#silver-body)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="16" y="20" width="4" height="4" rx="0.5" fill="url(#silver-body)" />
      <rect x="12" y="24" width="12" height="2.5" rx="1.25" fill="url(#silver-base)" />
      <circle cx="18" cy="13" r="5" fill="#1E1B3A" stroke="#94A3B8" strokeWidth="0.8" />
      <text x="18" y="15.5" textAnchor="middle" fill="#CBD5E1" fontSize="7" fontWeight="700" fontFamily="ui-monospace, monospace">2</text>
    </svg>
  </div>
);

const BronzeTrophy = () => (
  <div className="w-10 h-10 flex items-center justify-center">
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bronze-body" x1="8" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E8C9A0" />
          <stop offset="25%" stopColor="#D4A574" />
          <stop offset="50%" stopColor="#B87333" />
          <stop offset="75%" stopColor="#9A6229" />
          <stop offset="100%" stopColor="#7A4E20" />
        </linearGradient>
        <linearGradient id="bronze-shine" x1="12" y1="4" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF3E0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFF3E0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bronze-base" x1="10" y1="24" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9A6229" />
          <stop offset="50%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#7A4E20" />
        </linearGradient>
      </defs>
      <path d="M10 6h16v3c0 5.5-3.2 9.5-8 11-4.8-1.5-8-5.5-8-11V6z" fill="url(#bronze-body)" />
      <path d="M12 6h5v2c0 4-1.5 7-3 8.5C12.5 14 11 11 11 8V6z" fill="url(#bronze-shine)" />
      <path d="M10 8H6.5c0 3.5 1.8 6 3.5 7" stroke="url(#bronze-body)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M26 8h3.5c0 3.5-1.8 6-3.5 7" stroke="url(#bronze-body)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <rect x="16" y="20" width="4" height="4" rx="0.5" fill="url(#bronze-body)" />
      <rect x="12" y="24" width="12" height="2.5" rx="1.25" fill="url(#bronze-base)" />
      <circle cx="18" cy="13" r="5" fill="#1E1B3A" stroke="#B87333" strokeWidth="0.8" />
      <text x="18" y="15.5" textAnchor="middle" fill="#D4A574" fontSize="7" fontWeight="700" fontFamily="ui-monospace, monospace">3</text>
    </svg>
  </div>
);

/* ── Rank-based text color classes ── */
const rankTextColor = (rank: number): string => {
  if (rank === 1) return "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500";
  if (rank === 2) return "text-transparent bg-clip-text bg-gradient-to-r from-slate-500 via-slate-400 to-slate-600 dark:from-slate-300 dark:via-slate-200 dark:to-slate-400";
  if (rank === 3) return "text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700";
  return "text-foreground";
};

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("factor");
  const [selectedEpochId, setSelectedEpochId] = useState(allEpochs[0].id);
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

  const selectedEpoch = useMemo(
    () => allEpochs.find((e) => e.id === selectedEpochId) ?? allEpochs[0],
    [selectedEpochId]
  );

  const isCurrent = !selectedEpoch.distributed;

  const endDateForTimer = useMemo(() => {
    return selectedEpoch.endDate + "T23:59:59";
  }, [selectedEpoch.endDate]);

  const countdown = useCountdown(endDateForTimer, isCurrent);

  const factorData = useMemo(
    () => leaderboardByFactorByEpoch[selectedEpochId] ?? [],
    [selectedEpochId]
  );

  const userData = useMemo(
    () => leaderboardByUserByEpoch[selectedEpochId] ?? [],
    [selectedEpochId]
  );

  const rankBadge = (rank: number) => {
    if (rank === 1) return <GoldTrophy />;
    if (rank === 2) return <SilverTrophy />;
    if (rank === 3) return <BronzeTrophy />;
    return <span className="w-10 h-10 flex items-center justify-center text-sm font-mono text-muted-foreground">{rank}</span>;
  };

  /* ── Reward text style: rich gold gradient ── */
  const rewardStyle = "font-mono text-sm font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500";

  /* ── Prize Pool display: strip USDT from data, show gold style ── */
  const prizePoolDisplay = stripUSDT(selectedEpoch.totalPool);

  return (
    <div className="space-y-6">
      {/* Header with Epoch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div ref={headerRef} className="reveal-clip">
          <div className="reveal-line">
            <h1 className="text-foreground">
              Leaderboard
            </h1>
          </div>
          <div className="reveal-line mt-2">
            <p className="text-base text-muted-foreground">
              Epoch rankings and reward distribution
            </p>
          </div>
        </div>

        {/* Epoch Selector */}
        <div className="flex items-center gap-3">
          <span className="label-upper shrink-0">Epoch</span>
          <Select value={selectedEpochId} onValueChange={setSelectedEpochId}>
            <SelectTrigger className="w-[260px] h-9 text-sm font-mono rounded-lg bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allEpochs.map((epoch) => (
                <SelectItem key={epoch.id} value={epoch.id} className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    {!epoch.distributed ? (
                      <Timer className="w-3.5 h-3.5 shrink-0 text-primary" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
                    )}
                    <span className="text-foreground">{epoch.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {epoch.startDate} — {epoch.endDate}
                    </span>
                    {!epoch.distributed && (
                      <span className="text-[9px] px-1.5 py-0 h-4 inline-flex items-center rounded-full font-mono ml-1 bg-primary/10 text-primary border border-primary/20">
                        LIVE
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          Epoch Overview — Unified operational banner
          ═══════════════════════════════════════════ */}
      <div ref={statsRef} className="relative overflow-hidden rounded-2xl border border-primary/20 dark:border-primary/30 bg-gradient-to-br from-primary/5 via-card to-secondary/5 dark:from-primary/10 dark:via-card dark:to-secondary/10">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-secondary/5 dark:bg-secondary/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-gradient-to-r from-amber-500/3 via-yellow-400/5 to-amber-500/3 dark:from-amber-400/5 dark:via-yellow-300/8 dark:to-amber-400/5 blur-2xl rotate-12" />
          {/* Grid pattern overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lb-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lb-grid)" />
          </svg>
        </div>

        {/* Main content */}
        <div className="relative z-10 p-6">
          {/* Top row: Epoch ID + Status + Timer */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{selectedEpoch.id}</span>
                  {isCurrent && (
                    <span className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono tracking-[0.15em] uppercase bg-primary/10 text-primary border border-primary/20">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                      </span>
                      LIVE
                    </span>
                  )}
                  {!isCurrent && selectedEpoch.distributed && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono tracking-[0.15em] uppercase bg-success/10 text-success border border-success/20">
                      COMPLETED
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedEpoch.startDate} — {selectedEpoch.endDate}
                </span>
              </div>
            </div>

            {/* Timer / Status */}
            {isCurrent ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 border border-border">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Time Remaining</span>
                <span className="font-mono text-base font-bold tabular-nums text-foreground">{countdown}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/80 border border-border">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">{selectedEpoch.winners} winners rewarded</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6">
            <div className="fade-item">
              <div className="label-upper mb-1.5 flex items-center gap-1.5">
                <Award className="w-3 h-3" /> Prize Pool
              </div>
              <div className={`stat-value text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500`}>
                {prizePoolDisplay}
                <span className="text-sm font-medium ml-1">USDT</span>
              </div>
              <div className="text-xs mt-0.5 text-muted-foreground">
                {isCurrent ? "distributed proportionally" : "fully distributed"}
              </div>
            </div>
            <div className="fade-item">
              <div className="label-upper mb-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Submissions
              </div>
              <div className="stat-value text-2xl font-bold text-foreground">{selectedEpoch.totalSubmissions}</div>
              <div className="text-xs mt-0.5 text-muted-foreground">{selectedEpoch.qualifiedFactors} qualified factors</div>
            </div>
            <div className="fade-item">
              <div className="label-upper mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Qualification Rate
              </div>
              <div className="stat-value text-2xl font-bold text-success">
                {selectedEpoch.totalSubmissions > 0 ? Math.round((selectedEpoch.qualifiedFactors / selectedEpoch.totalSubmissions) * 100) : 0}%
              </div>
              <div className="text-xs mt-0.5 text-muted-foreground">{selectedEpoch.qualifiedFactors} of {selectedEpoch.totalSubmissions} passed</div>
            </div>
          </div>
        </div>

        {/* ── Your Ranking ── */}
        <div className="relative z-10 px-6 py-4 border-t border-border/50 bg-card/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-mono text-primary font-bold">
                OU
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Your Ranking</div>
                <span className="text-xs text-muted-foreground">Otter User</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="label-upper mb-0.5">Rank</div>
                <div className="text-sm font-bold font-mono text-primary">#4</div>
              </div>
              <div className="text-center">
                <div className="label-upper mb-0.5">Score</div>
                <div className="text-sm font-bold font-mono text-foreground">75.1</div>
              </div>
              <div className="text-center">
                <div className="label-upper mb-0.5">Reward</div>
                <div className={`text-sm font-bold font-mono tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500`}>540</div>
              </div>
              <div className="text-center">
                <div className="label-upper mb-0.5">Best Factor</div>
                <div className="text-sm font-semibold text-foreground">BTC Momentum RSI</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit bg-accent border border-border">
        <button
          className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
            viewMode === "factor"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
          onClick={() => setViewMode("factor")}
        >
          By Factor
        </button>
        <button
          className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
            viewMode === "user"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
          onClick={() => setViewMode("user")}
        >
          By User
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="surface-card overflow-hidden px-2 sm:px-4">
        {viewMode === "factor" ? (
          <div key={`factor-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="label-upper w-[70px] pl-4">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper">Factor</TableHead>
                  <TableHead className="label-upper">Market</TableHead>
                  <TableHead className="label-upper text-right">OS Sharpe</TableHead>
                  <TableHead className="label-upper text-right">OS Fitness</TableHead>
                  <TableHead className="label-upper text-right">Returns</TableHead>
                  <TableHead className="label-upper text-right">Score</TableHead>
                  <TableHead className="label-upper text-right pr-4">
                    Reward <span className="text-muted-foreground font-normal">(USDT)</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factorData.map((entry) => {
                  const isTop3 = entry.rank <= 3;
                  const nameColor = isTop3 ? rankTextColor(entry.rank) : "text-foreground";
                  return (
                    <TableRow
                      key={entry.factorId}
                      className="transition-all duration-200 ease-in-out border-border hover:bg-amber-50 dark:hover:bg-slate-800/30"
                    >
                      <TableCell className="pl-4">{rankBadge(entry.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono bg-accent border border-border text-muted-foreground">
                            {entry.avatar}
                          </div>
                          <span className={`text-sm font-semibold ${nameColor}`}>{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-semibold ${nameColor}`}>{entry.factorName}</span>
                        <span className="text-[10px] font-mono ml-2 text-muted-foreground">{entry.factorId}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] border ${
                          entry.market === "CEX"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/25"
                        }`}>
                          {entry.market}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-sm ${
                          entry.osSharpe >= 1 ? "text-success" : entry.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                        }`}>
                          {entry.osSharpe.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-foreground">{entry.osFitness.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-foreground">{entry.osReturns}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-bold text-foreground">{entry.compositeScore.toFixed(1)}</span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <span className={rewardStyle}>
                          {stripUSDT(entry.reward)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div key={`user-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="label-upper w-[70px] pl-4">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper text-right">Total Factors</TableHead>
                  <TableHead className="label-upper text-right">Qualified</TableHead>
                  <TableHead className="label-upper text-right">Avg OS Sharpe</TableHead>
                  <TableHead className="label-upper">Top Factor</TableHead>
                  <TableHead className="label-upper text-right pr-4">
                    Total Reward <span className="text-muted-foreground font-normal">(USDT)</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userData.map((entry) => {
                  const isTop3 = entry.rank <= 3;
                  const nameColor = isTop3 ? rankTextColor(entry.rank) : "text-foreground";
                  return (
                    <TableRow
                      key={entry.userId}
                      className="transition-all duration-200 ease-in-out border-border hover:bg-amber-50 dark:hover:bg-slate-800/30"
                    >
                      <TableCell className="pl-4">{rankBadge(entry.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono bg-accent border border-border text-muted-foreground">
                            {entry.avatar}
                          </div>
                          <span className={`text-sm font-semibold ${nameColor}`}>{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-foreground">{entry.totalFactors}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-success">{entry.qualifiedFactors}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-sm ${
                          entry.avgOsSharpe >= 1 ? "text-success" : entry.avgOsSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                        }`}>
                          {entry.avgOsSharpe.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className={`text-sm font-semibold ${nameColor}`}>{entry.topFactor}</TableCell>
                      <TableCell className="text-right pr-4">
                        <span className={rewardStyle}>
                          {stripUSDT(entry.totalReward)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
