/*
 * Leaderboard — Indigo/Sky + Slate Design System
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald | Danger: Red
 * Top 1-3: Trophy icons (gold/silver/bronze) per reference image
 * Reward: rich gold gradient text | USDT in table header
 * Pure Tailwind classes — zero inline styles
 */
import { Badge } from "@/components/ui/badge";
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

/* ── Trophy SVG components matching reference image ── */
const GoldTrophy = () => (
  <div className="w-10 h-10 flex items-center justify-center relative">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Trophy cup */}
      <path d="M8 6h16v2c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" fill="url(#gold-grad)" />
      {/* Handles */}
      <path d="M8 8H5c0 3 1.5 5.5 3 6.5" stroke="url(#gold-grad)" strokeWidth="1.5" fill="none" />
      <path d="M24 8h3c0 3-1.5 5.5-3 6.5" stroke="url(#gold-grad)" strokeWidth="1.5" fill="none" />
      {/* Stem & base */}
      <rect x="14" y="18" width="4" height="4" fill="url(#gold-grad)" />
      <rect x="10" y="22" width="12" height="2" rx="1" fill="url(#gold-grad)" />
      {/* Number badge */}
      <circle cx="16" cy="12" r="5" fill="#1a1a2e" stroke="url(#gold-grad)" strokeWidth="1" />
      <text x="16" y="14.5" textAnchor="middle" fill="url(#gold-grad)" fontSize="7" fontWeight="bold" fontFamily="monospace">1</text>
      <defs>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#F6D365" />
          <stop offset="50%" stopColor="#D4A843" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const SilverTrophy = () => (
  <div className="w-10 h-10 flex items-center justify-center relative">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6h16v2c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" fill="url(#silver-grad)" />
      <path d="M8 8H5c0 3 1.5 5.5 3 6.5" stroke="url(#silver-grad)" strokeWidth="1.5" fill="none" />
      <path d="M24 8h3c0 3-1.5 5.5-3 6.5" stroke="url(#silver-grad)" strokeWidth="1.5" fill="none" />
      <rect x="14" y="18" width="4" height="4" fill="url(#silver-grad)" />
      <rect x="10" y="22" width="12" height="2" rx="1" fill="url(#silver-grad)" />
      <circle cx="16" cy="12" r="5" fill="#1a1a2e" stroke="url(#silver-grad)" strokeWidth="1" />
      <text x="16" y="14.5" textAnchor="middle" fill="url(#silver-grad)" fontSize="7" fontWeight="bold" fontFamily="monospace">2</text>
      <defs>
        <linearGradient id="silver-grad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#E8E8E8" />
          <stop offset="50%" stopColor="#B0B0B0" />
          <stop offset="100%" stopColor="#808080" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

const BronzeTrophy = () => (
  <div className="w-10 h-10 flex items-center justify-center relative">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 6h16v2c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" fill="url(#bronze-grad)" />
      <path d="M8 8H5c0 3 1.5 5.5 3 6.5" stroke="url(#bronze-grad)" strokeWidth="1.5" fill="none" />
      <path d="M24 8h3c0 3-1.5 5.5-3 6.5" stroke="url(#bronze-grad)" strokeWidth="1.5" fill="none" />
      <rect x="14" y="18" width="4" height="4" fill="url(#bronze-grad)" />
      <rect x="10" y="22" width="12" height="2" rx="1" fill="url(#bronze-grad)" />
      <circle cx="16" cy="12" r="5" fill="#1a1a2e" stroke="url(#bronze-grad)" strokeWidth="1" />
      <text x="16" y="14.5" textAnchor="middle" fill="url(#bronze-grad)" fontSize="7" fontWeight="bold" fontFamily="monospace">3</text>
      <defs>
        <linearGradient id="bronze-grad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="50%" stopColor="#B87333" />
          <stop offset="100%" stopColor="#8B5E3C" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

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

  /* Countdown — parse endDate to a real Date for the timer */
  const endDateForTimer = useMemo(() => {
    // endDate format is like "2025-04-15" — set to end of day
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

  /* ── Rank badge: Trophy SVGs for top 3, plain number for rest ── */
  const rankBadge = (rank: number) => {
    if (rank === 1) return <GoldTrophy />;
    if (rank === 2) return <SilverTrophy />;
    if (rank === 3) return <BronzeTrophy />;
    return <span className="w-10 h-10 flex items-center justify-center text-sm font-mono text-muted-foreground">{rank}</span>;
  };

  /* ── Gold reward text style (rich gradient in dark, solid gold in light) ── */
  const rewardStyle = "font-mono text-sm font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 dark:from-amber-400 dark:via-yellow-300 dark:to-amber-500";

  return (
    <div className="space-y-8">
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

      {/* Epoch Info Bar */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`fade-item surface-card p-6 ${isCurrent ? "border-primary/20 dark:border-primary/30" : ""}`}>
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            {isCurrent ? "Current Epoch" : "Epoch"}
          </div>
          <div className="stat-value text-xl font-bold text-primary">{selectedEpoch.id}</div>
          <div className="text-xs mt-1 text-muted-foreground">
            {selectedEpoch.startDate} — {selectedEpoch.endDate}
          </div>
        </div>
        <div className="fade-item surface-card p-6">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Prize Pool
          </div>
          <div className={`stat-value text-xl font-bold ${rewardStyle} !text-xl`}>
            {selectedEpoch.totalPool}
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            {isCurrent ? "distributed proportionally" : "fully distributed"}
          </div>
        </div>
        <div className="fade-item surface-card p-6">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isCurrent ? "Time Remaining" : "Status"}
          </div>
          {isCurrent ? (
            <div className="stat-value text-xl font-bold font-mono tabular-nums text-foreground">
              {countdown}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-success/10 text-success border border-success/20">
                COMPLETED
              </span>
            </div>
          )}
          <div className="text-xs mt-1 text-muted-foreground">
            {isCurrent ? "until epoch ends" : `${selectedEpoch.winners} winners`}
          </div>
        </div>
        <div className="fade-item surface-card p-6">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Submissions
          </div>
          <div className="stat-value text-xl font-bold text-foreground">{selectedEpoch.totalSubmissions}</div>
          <div className="text-xs mt-1 text-muted-foreground">{selectedEpoch.qualifiedFactors} qualified</div>
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
                  return (
                    <TableRow
                      key={entry.factorId}
                      className={`transition-all duration-200 ease-in-out border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                        isTop3 ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                      }`}
                    >
                      <TableCell className="pl-4">{rankBadge(entry.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono bg-accent border border-border text-muted-foreground">
                            {entry.avatar}
                          </div>
                          <span className={`text-sm ${isTop3 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${isTop3 ? "font-semibold text-foreground" : "text-foreground"}`}>{entry.factorName}</span>
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
                        <span className="font-mono text-sm font-bold text-success">{entry.compositeScore.toFixed(1)}</span>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <span className={rewardStyle}>
                          {entry.reward}
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
                  return (
                    <TableRow
                      key={entry.userId}
                      className={`transition-all duration-200 ease-in-out border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                        isTop3 ? "bg-primary/[0.03] dark:bg-primary/[0.04]" : ""
                      }`}
                    >
                      <TableCell className="pl-4">{rankBadge(entry.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono bg-accent border border-border text-muted-foreground">
                            {entry.avatar}
                          </div>
                          <span className={`text-sm ${isTop3 ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{entry.username}</span>
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
                      <TableCell className={`text-sm ${isTop3 ? "font-semibold text-foreground" : "text-foreground"}`}>{entry.topFactor}</TableCell>
                      <TableCell className="text-right pr-4">
                        <span className={rewardStyle}>
                          {entry.totalReward}
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
