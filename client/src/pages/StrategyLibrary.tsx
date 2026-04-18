/*
 * StrategyLibrary — Official strategy template library
 * Aligned with My Alphas / My Strategy page layout and toolbar style
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { strategies } from "@/lib/mockData";
import { ArrowUpRight, Search } from "lucide-react";

const filterOptions = ["all", "official", "graduated"] as const;
type FilterKey = (typeof filterOptions)[number];

const filterLabels: Record<FilterKey, string> = {
  all: "All",
  official: "Official",
  graduated: "Graduated",
};

function getStrategyTier(strategy: (typeof strategies)[number]): Exclude<FilterKey, "all"> {
  return strategy.author.toLowerCase().includes("otter") ? "official" : "graduated";
}

function MetricPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/35 p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-sm font-semibold font-mono tabular-nums ${
          tone === "positive"
            ? "text-[#00d492]"
            : tone === "negative"
              ? "text-[#ff637e]"
              : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function StrategyLibrary() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filteredStrategies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return strategies.filter((strategy) => {
      const matchQuery =
        !q ||
        strategy.name.toLowerCase().includes(q) ||
        strategy.description.toLowerCase().includes(q) ||
        strategy.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        strategy.author.toLowerCase().includes(q);
      const tier = getStrategyTier(strategy);
      const matchFilter = filter === "all" ? true : tier === filter;
      return matchQuery && matchFilter;
    });
  }, [filter, query]);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground">Official Strategy Library</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse deployable strategy templates and use them as a starting point.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="relative w-full max-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className="h-8 rounded-xl border-border bg-accent/30 pl-9 pr-3 text-xs placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
                filter === option
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {filterLabels[option]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filteredStrategies.map((strategy) => {
          const tier = getStrategyTier(strategy);
          const statusClass =
            tier === "official"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-sky-500/10 text-sky-400 border-sky-500/20";
          const statusLabel = tier === "official" ? "Official" : "Graduated";

          return (
            <div
              key={strategy.id}
              className="surface-card overflow-hidden border border-border/70"
            >
              <div className="border-b border-border/50 px-5 py-4">
                <Link href={`/strategies/${strategy.id}?source=official&tier=${tier}`}>
                  <h3 className="cursor-pointer truncate text-lg font-semibold leading-7 text-foreground transition-colors hover:text-primary">
                    {strategy.name}
                  </h3>
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className={`inline-flex h-[25px] items-center rounded-full border px-[11px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.18em] ${statusClass}`}>
                    {statusLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">Updated:{strategy.updatedAt}</span>
                  <span className="text-xs text-muted-foreground">ID:{strategy.id}</span>
                </div>
              </div>

              <div className="px-5 pb-4 pt-3">
                <p className="line-clamp-2 text-sm leading-7 text-muted-foreground">{strategy.description}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
                  <MetricPill label="ROI" value={strategy.annualReturn} tone="positive" />
                  <MetricPill label="Win Rate" value={strategy.winRate} tone="positive" />
                  <MetricPill label="Sharpe" value={strategy.sharpe.toFixed(2)} tone="positive" />
                  <MetricPill label="Max Drawdown" value={strategy.maxDrawdown} tone="negative" />
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  <Link href={`/strategies/new?template=${strategy.id}&creationMode=platform&scale=single`}>
                    <Button
                      variant="outline"
                      className="h-8 rounded-full border-border/60 bg-background/30 px-4 text-xs font-medium text-foreground hover:border-primary/20 hover:text-primary"
                    >
                      Use Template
                    </Button>
                  </Link>
                  <Link href={`/strategies/${strategy.id}?source=official&tier=${tier}`}>
                    <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-[#020617] hover:bg-primary/90">
                      View
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStrategies.length === 0 && (
          <div className="surface-card border border-border/70 px-6 py-12 text-center text-sm text-muted-foreground">
            No strategies match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
