/*
 * Leaderboard — Katana Network Style
 * Epoch info + factor/user ranking tables
 * Deep navy bg, lime accent, monospace data, minimal borders
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  Trophy,
  Clock,
  Award,
  Users,
  ChevronRight,
  Medal,
} from "lucide-react";
import {
  currentEpoch,
  previousEpochs,
  leaderboardByFactor,
  leaderboardByUser,
} from "@/lib/mockData";
import { motion } from "framer-motion";

type ViewMode = "factor" | "user";

const rankBadge = (rank: number) => {
  if (rank === 1) return <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center"><Medal className="w-3.5 h-3.5 text-warning" /></div>;
  if (rank === 2) return <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"><Medal className="w-3.5 h-3.5 text-muted-foreground" /></div>;
  if (rank === 3) return <div className="w-6 h-6 rounded-full bg-warning/8 flex items-center justify-center"><Medal className="w-3.5 h-3.5 text-warning/60" /></div>;
  return <span className="w-6 h-6 flex items-center justify-center text-xs font-mono text-muted-foreground">{rank}</span>;
};

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("factor");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Epoch rankings and reward distribution</p>
      </div>

      {/* Epoch Info Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="katana-card border-lime/10">
          <CardContent className="p-4">
            <div className="label-upper mb-2 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Current Epoch
            </div>
            <div className="stat-value text-xl font-bold text-lime">{currentEpoch.id}</div>
            <div className="text-xs text-muted-foreground mt-1">{currentEpoch.startDate} — {currentEpoch.endDate}</div>
          </CardContent>
        </Card>
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="label-upper mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Prize Pool
            </div>
            <div className="stat-value text-xl font-bold text-lime glow-lime">{currentEpoch.totalPool}</div>
            <div className="text-xs text-muted-foreground mt-1">distributed proportionally</div>
          </CardContent>
        </Card>
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="label-upper mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time Remaining
            </div>
            <div className="stat-value text-xl font-bold text-negative">{currentEpoch.timeRemaining}</div>
            <div className="text-xs text-muted-foreground mt-1">until epoch ends</div>
          </CardContent>
        </Card>
        <Card className="katana-card">
          <CardContent className="p-4">
            <div className="label-upper mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Submissions
            </div>
            <div className="stat-value text-xl font-bold">{currentEpoch.totalSubmissions}</div>
            <div className="text-xs text-muted-foreground mt-1">{currentEpoch.qualifiedFactors} qualified</div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-lg border border-border/50 w-fit">
        <Button
          variant={viewMode === "factor" ? "default" : "ghost"}
          size="sm"
          className={`h-8 text-xs px-4 ${viewMode !== "factor" ? "text-muted-foreground" : ""}`}
          onClick={() => setViewMode("factor")}
        >
          By Factor
        </Button>
        <Button
          variant={viewMode === "user" ? "default" : "ghost"}
          size="sm"
          className={`h-8 text-xs px-4 ${viewMode !== "user" ? "text-muted-foreground" : ""}`}
          onClick={() => setViewMode("user")}
        >
          By User
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card className="katana-card overflow-hidden">
        <CardContent className="p-0">
          {viewMode === "factor" ? (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
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
                {leaderboardByFactor.map((entry, i) => (
                  <motion.tr
                    key={entry.factorId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-border hover:bg-secondary/20 transition-colors ${entry.rank <= 3 ? "bg-lime/[0.02]" : ""}`}
                  >
                    <TableCell>{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground border border-border">
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium">{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground/80">{entry.factorName}</span>
                      <span className="text-[10px] font-mono text-muted-foreground ml-2">{entry.factorId}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] font-mono ${entry.market === "CEX" ? "border-info/25 text-info" : "border-lime/25 text-lime"}`}>
                        {entry.market}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${entry.osSharpe >= 1 ? "text-lime" : entry.osSharpe >= 0.5 ? "text-warning" : "text-negative"}`}>
                        {entry.osSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground/80">{entry.osFitness.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground/80">{entry.osReturns}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold text-lime">{entry.compositeScore.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-warning">{entry.reward}</span>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
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
                {leaderboardByUser.map((entry, i) => (
                  <motion.tr
                    key={entry.userId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-border hover:bg-secondary/20 transition-colors ${entry.rank <= 3 ? "bg-lime/[0.02]" : ""}`}
                  >
                    <TableCell>{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-mono text-muted-foreground border border-border">
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium">{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{entry.totalFactors}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-lime">{entry.qualifiedFactors}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${entry.avgOsSharpe >= 1 ? "text-lime" : entry.avgOsSharpe >= 0.5 ? "text-warning" : "text-negative"}`}>
                        {entry.avgOsSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80">{entry.topFactor}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm text-warning font-bold">{entry.totalReward}</span>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Previous Epochs */}
      <Card className="katana-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Previous Epochs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {previousEpochs.map((epoch) => (
              <div
                key={epoch.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/20 border border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-foreground">{epoch.id}</span>
                  <span className="text-xs text-muted-foreground">{epoch.startDate} — {epoch.endDate}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-lime">{epoch.totalPool}</span>
                  <Badge variant="outline" className="bg-positive/8 text-positive border-positive/20 text-[10px] font-mono">
                    {epoch.winners} WINNERS
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
