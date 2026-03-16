/*
 * Leaderboard — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent, white/10 borders, white/50 secondary
 * GSAP staggered reveal, epoch selector, factor/user ranking tables
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
import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  Trophy,
  Clock,
  Award,
  Users,
  Medal,
  CheckCircle2,
  Timer,
} from "lucide-react";
import {
  allEpochs,
  leaderboardByFactorByEpoch,
  leaderboardByUserByEpoch,
} from "@/lib/mockData";

type ViewMode = "factor" | "user";

const rankBadge = (rank: number) => {
  if (rank === 1) return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,200,50,0.15)" }}><Medal className="w-3.5 h-3.5" style={{ color: "rgb(255,200,50)" }} /></div>;
  if (rank === 2) return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><Medal className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.50)" }} /></div>;
  if (rank === 3) return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,200,50,0.08)" }}><Medal className="w-3.5 h-3.5" style={{ color: "rgba(255,200,50,0.60)" }} /></div>;
  return <span className="w-6 h-6 flex items-center justify-center text-xs font-mono" style={{ color: "rgba(255,255,255,0.40)" }}>{rank}</span>;
};

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("factor");
  const [selectedEpochId, setSelectedEpochId] = useState(allEpochs[0].id);
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

  const selectedEpoch = useMemo(
    () => allEpochs.find((e) => e.id === selectedEpochId) ?? allEpochs[0],
    [selectedEpochId]
  );

  const isCurrent = !selectedEpoch.distributed;

  const factorData = useMemo(
    () => leaderboardByFactorByEpoch[selectedEpochId] ?? [],
    [selectedEpochId]
  );

  const userData = useMemo(
    () => leaderboardByUserByEpoch[selectedEpochId] ?? [],
    [selectedEpochId]
  );

  return (
    <div className="space-y-6">
      {/* Header with Epoch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div ref={headerRef} className="reveal-clip">
          <div className="reveal-line">
            <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none text-white">
              Leaderboard
            </h1>
          </div>
          <div className="reveal-line mt-2">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
              Epoch rankings and reward distribution
            </p>
          </div>
        </div>

        {/* Epoch Selector */}
        <div className="flex items-center gap-3">
          <span className="label-upper shrink-0">Epoch</span>
          <Select value={selectedEpochId} onValueChange={setSelectedEpochId}>
            <SelectTrigger
              className="w-[260px] h-9 text-sm font-mono"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: "#151515", borderColor: "rgba(255,255,255,0.10)" }}>
              {allEpochs.map((epoch) => (
                <SelectItem key={epoch.id} value={epoch.id} className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    {!epoch.distributed ? (
                      <Timer className="w-3.5 h-3.5 shrink-0" style={{ color: "#C5FF4A" }} />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "rgb(74,222,128)" }} />
                    )}
                    <span className="text-white">{epoch.id}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.40)" }}>
                      {epoch.startDate} — {epoch.endDate}
                    </span>
                    {!epoch.distributed && (
                      <span
                        className="text-[9px] px-1.5 py-0 h-4 inline-flex items-center rounded font-mono ml-1"
                        style={{ backgroundColor: "rgba(197,255,74,0.10)", color: "#C5FF4A", border: "1px solid rgba(197,255,74,0.20)" }}
                      >
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
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="fade-item katana-card p-4" style={isCurrent ? { borderColor: "rgba(197,255,74,0.12)" } : {}}>
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            {isCurrent ? "Current Epoch" : "Epoch"}
          </div>
          <div className="stat-value text-xl font-bold" style={{ color: "#C5FF4A" }}>{selectedEpoch.id}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>
            {selectedEpoch.startDate} — {selectedEpoch.endDate}
          </div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Prize Pool
          </div>
          <div className="stat-value text-xl font-bold" style={{ color: "#C5FF4A" }}>{selectedEpoch.totalPool}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>
            {isCurrent ? "distributed proportionally" : "fully distributed"}
          </div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isCurrent ? "Time Remaining" : "Status"}
          </div>
          {isCurrent ? (
            <div className="stat-value text-xl font-bold" style={{ color: "rgb(248,113,113)" }}>{selectedEpoch.timeRemaining}</div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: "rgba(74,222,128,0.08)", color: "rgb(74,222,128)", border: "1px solid rgba(74,222,128,0.20)" }}
              >
                COMPLETED
              </span>
            </div>
          )}
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>
            {isCurrent ? "until epoch ends" : `${selectedEpoch.winners} winners`}
          </div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Submissions
          </div>
          <div className="stat-value text-xl font-bold text-white">{selectedEpoch.totalSubmissions}</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>{selectedEpoch.qualifiedFactors} qualified</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <button
          className="h-8 text-xs px-4 rounded-md font-medium transition-all"
          style={{
            backgroundColor: viewMode === "factor" ? "rgba(197,255,74,0.10)" : "transparent",
            color: viewMode === "factor" ? "#C5FF4A" : "rgba(255,255,255,0.50)",
            border: viewMode === "factor" ? "1px solid rgba(197,255,74,0.20)" : "1px solid transparent",
          }}
          onClick={() => setViewMode("factor")}
        >
          By Factor
        </button>
        <button
          className="h-8 text-xs px-4 rounded-md font-medium transition-all"
          style={{
            backgroundColor: viewMode === "user" ? "rgba(197,255,74,0.10)" : "transparent",
            color: viewMode === "user" ? "#C5FF4A" : "rgba(255,255,255,0.50)",
            border: viewMode === "user" ? "1px solid rgba(197,255,74,0.20)" : "1px solid transparent",
          }}
          onClick={() => setViewMode("user")}
        >
          By User
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="katana-card overflow-hidden">
        {viewMode === "factor" ? (
          <div key={`factor-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                  <TableHead className="label-upper w-[60px]">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper">Factor</TableHead>
                  <TableHead className="label-upper">Market</TableHead>
                  <TableHead className="label-upper text-right">OS Sharpe</TableHead>
                  <TableHead className="label-upper text-right">OS Fitness</TableHead>
                  <TableHead className="label-upper text-right">Returns</TableHead>
                  <TableHead className="label-upper text-right">Score</TableHead>
                  <TableHead className="label-upper text-right">Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factorData.map((entry) => (
                  <TableRow
                    key={entry.factorId}
                    className="transition-colors"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      backgroundColor: entry.rank <= 3 ? "rgba(197,255,74,0.02)" : "transparent",
                    }}
                  >
                    <TableCell>{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
                          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)" }}
                        >
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium text-white">{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.80)" }}>{entry.factorName}</span>
                      <span className="text-[10px] font-mono ml-2" style={{ color: "rgba(255,255,255,0.30)" }}>{entry.factorId}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em]"
                        style={{
                          backgroundColor: entry.market === "CEX" ? "rgba(100,180,255,0.08)" : "rgba(197,255,74,0.08)",
                          color: entry.market === "CEX" ? "rgb(100,180,255)" : "#C5FF4A",
                          border: `1px solid ${entry.market === "CEX" ? "rgba(100,180,255,0.20)" : "rgba(197,255,74,0.20)"}`,
                        }}
                      >
                        {entry.market}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm" style={{
                        color: entry.osSharpe >= 1 ? "#C5FF4A" : entry.osSharpe >= 0.5 ? "rgb(255,200,50)" : "rgb(248,113,113)"
                      }}>
                        {entry.osSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{entry.osFitness.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{entry.osReturns}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold" style={{ color: "#C5FF4A" }}>{entry.compositeScore.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm" style={{ color: "rgb(255,200,50)" }}>{entry.reward}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div key={`user-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "rgba(255,255,255,0.10)" }}>
                  <TableHead className="label-upper w-[60px]">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper text-right">Total Factors</TableHead>
                  <TableHead className="label-upper text-right">Qualified</TableHead>
                  <TableHead className="label-upper text-right">Avg OS Sharpe</TableHead>
                  <TableHead className="label-upper">Top Factor</TableHead>
                  <TableHead className="label-upper text-right">Total Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userData.map((entry) => (
                  <TableRow
                    key={entry.userId}
                    className="transition-colors"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      backgroundColor: entry.rank <= 3 ? "rgba(197,255,74,0.02)" : "transparent",
                    }}
                  >
                    <TableCell>{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
                          style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)" }}
                        >
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium text-white">{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-white">{entry.totalFactors}</TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: "#C5FF4A" }}>{entry.qualifiedFactors}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm" style={{
                        color: entry.avgOsSharpe >= 1 ? "#C5FF4A" : entry.avgOsSharpe >= 0.5 ? "rgb(255,200,50)" : "rgb(248,113,113)"
                      }}>
                        {entry.avgOsSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{entry.topFactor}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold" style={{ color: "rgb(255,200,50)" }}>{entry.totalReward}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
