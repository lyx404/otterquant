/*
 * StrategyMarket - Strategy marketplace
 * Terminal Noir: card grid, neon accents, filter bar
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Store,
  Download,
  Zap,
  Users,
  TrendingUp,
  Shield,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { strategies, type Strategy } from "@/lib/mockData";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function StrategyMarket() {
  const [filterMarket, setFilterMarket] = useState<"all" | "CEX" | "DEX" | "Mixed">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "live" | "backtested" | "new">("all");

  const filtered = strategies
    .filter((s) => filterMarket === "all" || s.market === filterMarket)
    .filter((s) => filterStatus === "all" || s.status === filterStatus);

  const statusColor = (status: Strategy["status"]) => {
    const map = {
      live: "bg-neon-green/10 text-neon-green border-neon-green/20",
      backtested: "bg-neon-amber/10 text-neon-amber border-neon-amber/20",
      new: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20",
    };
    return map[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-neon-cyan" />
          Strategy Marketplace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Curated multi-factor strategies for automated crypto trading
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="w-3 h-3" /> Market:
        </div>
        {(["all", "CEX", "DEX", "Mixed"] as const).map((m) => (
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
        {(["all", "live", "backtested", "new"] as const).map((s) => (
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

      {/* Strategy Cards Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
          >
            <Card className="terminal-card hover:border-neon-cyan/30 transition-all duration-300 group h-full">
              <CardContent className="p-5 flex flex-col h-full">
                {/* Top Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-base truncate">{s.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusColor(s.status)}>
                        {s.status}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${s.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : s.market === "DEX" ? "border-neon-purple/30 text-neon-purple" : "border-border text-muted-foreground"}`}>
                        {s.market}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{s.factorCount} factors</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{s.description}</p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Annual Return</span>
                    <span className="text-sm font-mono font-semibold text-neon-green">{s.annualReturn}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sharpe</span>
                    <span className="text-sm font-mono font-semibold text-neon-cyan">{s.sharpe.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max DD</span>
                    <span className="text-sm font-mono text-neon-red">{s.maxDrawdown}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Win Rate</span>
                    <span className="text-sm font-mono">{s.winRate}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {s.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {s.subscribers} subscribers
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 border-border text-muted-foreground hover:text-foreground"
                      onClick={() => toast.success("Strategy file downloaded")}
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-primary text-primary-foreground"
                      onClick={() => toast.info("Feature coming soon — connect an exchange first")}
                    >
                      <Zap className="w-3 h-3" />
                      Deploy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
