/*
 * OfficialLibrary — Browse official and graduated factors
 * Design: Card-based view with category filtering
 * Reuses FactorCard pattern from AlphaCardView
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "wouter";
import gsap from "gsap";
import {
  Search,
  Star,
  Crown,
  Users,
  ChevronRight,
  Zap,
  Sparkles,
  Info,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { factors, type Factor } from "@/lib/mockData";
import { toast } from "sonner";

type CategoryFilter = "all" | "official" | "graduated";

/* ── Factor Flywheel Banner ── */
function FlywheelBanner() {
  return (
    <div className="surface-card overflow-hidden border-l-4 border-l-primary">
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">Factor Flywheel</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Develop factors
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Submit to competition
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Top factors graduate to official library
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Others use them in strategies
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            You earn rewards
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Single Factor Card ── */
function FactorCard({ factor, expanded, onToggle }: {
  factor: Factor;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isOfficial = factor.category === "official";
  const isGraduated = factor.category === "graduated";

  const borderAccent = isOfficial
    ? "border-l-4 border-l-success"
    : isGraduated
    ? "border-l-4 border-l-purple-500"
    : "border-l-4 border-l-transparent";

  const Icon = isGraduated ? Crown : Star;
  const iconClass = isGraduated
    ? "text-purple-500 dark:text-purple-400"
    : isOfficial
    ? "text-amber-500 dark:text-amber-400"
    : "text-muted-foreground";

  const sharpeColor = factor.osSharpe >= 1.0
    ? "text-success"
    : factor.osSharpe >= 0.5
    ? "text-amber-500 dark:text-amber-400"
    : "text-foreground";

  return (
    <div
      className={`surface-card overflow-hidden transition-all duration-200 ease-in-out hover:border-slate-300 dark:hover:border-slate-600 ${borderAccent}`}
    >
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
            <Link href={`/alphas/${factor.id}`}>
              <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200 cursor-pointer">
                {factor.name}
              </span>
            </Link>
            {factor.tag && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.12em] font-medium border border-border text-muted-foreground bg-accent">
                {factor.tag}
              </span>
            )}
          </div>
          {factor.userCount && (
            <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span className="font-mono tabular-nums">{factor.userCount}</span>
            </div>
          )}
        </div>

        {factor.description && (
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {factor.description}
          </p>
        )}

        <div className="flex items-end justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">Sharpe</div>
              <div className={`text-base font-bold font-mono tabular-nums ${sharpeColor}`}>
                {factor.osSharpe.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">Fitness</div>
              <div className="text-base font-bold font-mono tabular-nums text-foreground">
                {factor.fitness.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGraduated && factor.author && (
              <span className="text-[10px] text-purple-500 dark:text-purple-400 font-medium">
                by {factor.author}
              </span>
            )}
            <button
              onClick={onToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 ease-in-out"
            >
              {expanded ? "Less" : "Use in Strategy"}
              <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 border-t border-border bg-accent/30">
          <p className="text-xs text-muted-foreground mb-3">
            This factor can be used as a building block in your strategy. Click below to add it to a new strategy.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.success("Added to Time-Series Strategy")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-success/15 text-success border border-success/20 hover:bg-success/25 transition-all duration-200 ease-in-out"
            >
              <Zap className="w-3 h-3" />
              Add to Time-Series Strategy
            </button>
            <button
              onClick={() => toast.success("Added to Cross-Sectional Strategy")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 ease-in-out"
            >
              Add to Cross-Sectional Strategy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main OfficialLibrary Page ── */
export default function OfficialLibrary() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFlywheelInfo, setShowFlywheelInfo] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Only show official and graduated factors
  const libraryFactors = useMemo(() => {
    return factors.filter((f) => f.category === "official" || f.category === "graduated");
  }, []);

  const filtered = useMemo(() => {
    return libraryFactors.filter((f) => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !f.name.toLowerCase().includes(q) &&
          !(f.tag || "").toLowerCase().includes(q) &&
          !(f.description || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [libraryFactors, categoryFilter, searchQuery]);

  // Entrance animation
  useEffect(() => {
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll(".factor-card-item");
    gsap.set(cards, { y: 20, opacity: 0 });
    gsap.to(cards, {
      y: 0, opacity: 1,
      duration: 0.4, stagger: 0.05, ease: "power3.out",
    });
  }, [categoryFilter, searchQuery]);

  const tabs: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "official", label: "Official" },
    { key: "graduated", label: "Graduated" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Official Library</h1>
          <button
            onClick={() => setShowFlywheelInfo(true)}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title="Factor Flywheel"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse proven trading signals. Use them as building blocks for your strategies.
        </p>
      </div>

      {/* Flywheel Info Modal */}
      {showFlywheelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowFlywheelInfo(false)}>
          <div className="relative w-full max-w-lg mx-4 surface-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFlywheelInfo(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Factor Flywheel</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Develop factors
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              Submit to competition
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              Top factors graduate to official library
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              Others use them in strategies
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              You earn rewards
            </p>
          </div>
        </div>
      )}

      {/* Search + Category Tabs */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search factors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs pl-9 rounded-lg bg-card border-border"
          />
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-4 py-2 text-xs font-medium transition-all duration-200 ease-in-out ${
                categoryFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{filtered.length} factors</span>
        <span className="w-px h-3 bg-border" />
        <span>{libraryFactors.filter(f => f.category === "official").length} official</span>
        <span className="w-px h-3 bg-border" />
        <span>{libraryFactors.filter(f => f.category === "graduated").length} graduated</span>
      </div>

      {/* Factor Cards */}
      <div ref={listRef} className="space-y-3">
        {filtered.map((factor) => (
          <div key={factor.id} className="factor-card-item">
            <FactorCard
              factor={factor}
              expanded={expandedId === factor.id}
              onToggle={() => setExpandedId(expandedId === factor.id ? null : factor.id)}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="surface-card px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No factors match the current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
