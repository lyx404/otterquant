/*
 * MyAlphas - Factor list with sortable table
 * Terminal Noir: data-dense table, mono numbers, status badges
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
import { Link } from "wouter";
import { useState } from "react";
import {
  FlaskConical,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import { factors, type Factor } from "@/lib/mockData";
import { motion } from "framer-motion";

type SortKey = "osSharpe" | "sharpe" | "fitness" | "createdAt";

export default function MyAlphas() {
  const [sortKey, setSortKey] = useState<SortKey>("osSharpe");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterMarket, setFilterMarket] = useState<"all" | "CEX" | "DEX">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "testing" | "archived">("all");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const filtered = factors
    .filter((f) => filterMarket === "all" || f.market === filterMarket)
    .filter((f) => filterStatus === "all" || f.status === filterStatus)
    .sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "createdAt") {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      return sortAsc ? av - bv : bv - av;
    });

  const statusBadge = (status: Factor["status"]) => {
    const map = {
      active: { label: "Active", className: "bg-neon-green/10 text-neon-green border-neon-green/20" },
      testing: { label: "Testing", className: "bg-neon-amber/10 text-neon-amber border-neon-amber/20" },
      archived: { label: "Archived", className: "bg-muted text-muted-foreground border-border" },
    };
    const s = map[status];
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">My Alphas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {factors.length} factors mined by AI Agent
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="w-3 h-3" /> Market:
        </div>
        {(["all", "CEX", "DEX"] as const).map((m) => (
          <Button
            key={m}
            variant={filterMarket === m ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs ${filterMarket === m ? "" : "border-border text-muted-foreground"}`}
            onClick={() => setFilterMarket(m)}
          >
            {m === "all" ? "All" : m}
          </Button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">Status:</div>
        {(["all", "active", "testing", "archived"] as const).map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs capitalize ${filterStatus === s ? "" : "border-border text-muted-foreground"}`}
            onClick={() => setFilterStatus(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card className="terminal-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Name</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Market</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead
                  className="text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("osSharpe")}
                >
                  <span className="flex items-center gap-1">
                    OS Sharpe <ArrowUpDown className="w-3 h-3" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("sharpe")}
                >
                  <span className="flex items-center gap-1">
                    IS Sharpe <ArrowUpDown className="w-3 h-3" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-xs uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("fitness")}
                >
                  <span className="flex items-center gap-1">
                    Fitness <ArrowUpDown className="w-3 h-3" />
                  </span>
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Returns</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Tests</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f, i) => (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-border hover:bg-secondary/30 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">{f.id}</TableCell>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{f.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${f.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : "border-neon-purple/30 text-neon-purple"}`}>
                      {f.market}
                    </Badge>
                  </TableCell>
                  <TableCell>{statusBadge(f.status)}</TableCell>
                  <TableCell className={`font-mono text-sm ${f.osSharpe >= 1 ? "text-neon-green" : f.osSharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
                    {f.osSharpe.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{f.sharpe.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm">{f.fitness.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm">{f.returns}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-neon-green text-xs">{f.testsPassed}</span>
                      <CheckCircle className="w-3 h-3 text-neon-green" />
                      <span className="text-neon-red text-xs ml-1">{f.testsFailed}</span>
                      <XCircle className="w-3 h-3 text-neon-red" />
                      {f.testsPending > 0 && (
                        <>
                          <span className="text-muted-foreground text-xs ml-1">{f.testsPending}</span>
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/alphas/${f.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
