import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Bot, Check, Code2, Play, Pause, Coins, RefreshCw, Trash2, ChevronDown, ChevronUp, X, Sparkles, Undo2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AlphaDetail from "@/pages/AlphaDetail";
import { factors as detailFactors } from "@/lib/mockData";

type AgentMode = "platform" | "own";
type StrategyType = "time-series" | "cross-sectional";
type ModelKey = "otter-quant-fast" | "otter-quant-pro" | "otter-quant-research";
type GenerationStatus = "generating" | "paused" | "complete";

type RoundResult = {
  id: string;
  factorName: string;
  factorId: string;
  model: string;
  fitness: number;
  returns: number;
  drawdown: number;
  pnlSeries: number[];
};

type GenerationRound = {
  id: string;
  createdAt: string;
  status: GenerationStatus;
  strategyType: StrategyType;
  prompt: string;
  model: ModelKey;
  resultCount: number;
  estimatedCredit: number;
  results: RoundResult[];
};

const MODEL_OPTIONS: Array<{ value: ModelKey; label: string; unitCost: number }> = [
  { value: "otter-quant-fast", label: "Otter Quant Fast", unitCost: 0.15 },
  { value: "otter-quant-pro", label: "Otter Quant Pro", unitCost: 0.32 },
  { value: "otter-quant-research", label: "Otter Quant Research", unitCost: 0.5 },
];

const TIME_SERIES_FACTOR_NAMES = [
  "Funding Rate Mean Rev",
  "Volatility Breakout Pulse",
  "Cross-Exchange Spread Edge",
  "Momentum Regime Switch",
  "Liquidity Drift Capture",
  "Trend Persistence Signal",
  "Market Microstructure Imbalance",
  "Orderflow Momentum Core",
  "Mean-Reversion Velocity",
  "Drawdown Recovery Timing",
];

const CROSS_SECTION_FACTOR_NAMES = [
  "Relative Strength Rotation",
  "Cross-Asset Quality Rank",
  "Funding Pressure Basket",
  "Liquidity-Weighted Momentum",
  "Multi-Symbol Spread Ranking",
  "Factor Neutral Selection",
  "Tail Risk Dispersion",
  "Ranking Stability Filter",
  "Correlation-Aware Selection",
  "Volatility-Adjusted Alpha Rank",
];

function formatStrategyLabel(value: StrategyType) {
  return value === "time-series" ? "Time series" : "Cross Section";
}

function formatMinutesAgo(timestamp: string) {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  return `${delta} minutes ago`;
}

function buildPnlSeries(seed: number) {
  let value = 100;
  const points: number[] = [];
  for (let i = 0; i < 18; i++) {
    const drift = Math.sin((i + 1 + seed) / 2.7) * 1.35 + 0.6;
    const noise = (Math.cos((i + seed) * 1.7) + 1) * 0.35;
    value = Math.max(70, value + drift - noise);
    points.push(Number(value.toFixed(2)));
  }
  return points;
}

function buildFactorName(strategyType: StrategyType, index: number) {
  const bank = strategyType === "time-series" ? TIME_SERIES_FACTOR_NAMES : CROSS_SECTION_FACTOR_NAMES;
  return bank[index % bank.length];
}

function optimizePromptText(value: string, strategyType: StrategyType) {
  const base = value.trim();
  const scope =
    strategyType === "time-series"
      ? "time-series factor for perpetual futures"
      : "cross-sectional factor for multi-symbol ranking";

  return [
    `Generate a robust ${scope} based on: ${base}`,
    "Focus on clear signal logic, stable market intuition, risk-aware filtering, and deployable parameter ranges.",
    "Return concise factor definitions with expected behavior, required inputs, normalization method, and failure conditions.",
  ].join("\n");
}

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-32 w-full">
      <defs>
        <linearGradient id="pnl-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(52,211,153,0.36)" />
          <stop offset="100%" stopColor="rgba(52,211,153,0.02)" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="rgba(59,130,246,0.7)" strokeWidth="1.2" points={points} />
      <polyline
        fill="url(#pnl-gradient)"
        stroke="none"
        points={`${points} 100,100 0,100`}
      />
    </svg>
  );
}

function ResultCard({
  result,
  onSelect,
  className = "",
  active = false,
  status = "complete",
}: {
  result: RoundResult;
  onSelect?: () => void;
  className?: string;
  active?: boolean;
  status?: GenerationStatus;
}) {
  const isGenerating = status === "generating";
  const clickable = Boolean(onSelect) && !isGenerating;

  return (
    <article
      className={`surface-card relative overflow-hidden rounded-2xl border border-border p-4 ${
        clickable ? "cursor-pointer transition hover:border-primary/35 hover:bg-primary/5" : ""
      } ${active ? "border-primary/45 ring-1 ring-primary/35" : ""} ${className}`}
      onClick={clickable ? onSelect : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
    >
      {isGenerating ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            生成中
          </span>
        </div>
      ) : null}

      <div className="mb-3 flex items-center">
        <p className="text-sm font-semibold text-foreground">{result.factorName}</p>
      </div>

      <div className="rounded-xl border border-border/70 bg-accent/40 px-2 py-1">
        <Sparkline data={result.pnlSeries} />
        <p className="text-xs text-muted-foreground">PNL Curve</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-accent/50 p-2">
          <p className="text-[11px] text-muted-foreground">Fitness</p>
          <p className="font-semibold text-foreground">{result.fitness}</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-2">
          <p className="text-[11px] text-muted-foreground">Returns</p>
          <p className="font-semibold text-emerald-400">+{result.returns}%</p>
        </div>
        <div className="rounded-lg bg-accent/50 p-2">
          <p className="text-[11px] text-muted-foreground">Drawdown</p>
          <p className="font-semibold text-rose-400">-{result.drawdown}%</p>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] text-muted-foreground">{result.model}</span>
      </div>
    </article>
  );
}

function buildRound(input: {
  strategyType: StrategyType;
  prompt: string;
  model: ModelKey;
  resultCount: number;
  estimatedCredit: number;
  status?: GenerationStatus;
}) {
  const modelLabel = MODEL_OPTIONS.find((item) => item.value === input.model)?.label ?? input.model;
  const results: RoundResult[] = Array.from({ length: input.resultCount }).map((_, index) => {
    const seed = Date.now() + index;
    const pnlSeries = buildPnlSeries(seed % 17);
    const fitness = Number((1.2 + (index + 1) * 0.18).toFixed(2));
    const returns = Number((8 + index * 3.4 + (seed % 9) * 0.3).toFixed(2));
    const drawdown = Number((4.2 + index * 1.1 + (seed % 5) * 0.5).toFixed(2));

    return {
      id: `${seed}-${index}`,
      factorName: buildFactorName(input.strategyType, index),
      factorId: detailFactors[(seed + index) % detailFactors.length]?.id ?? detailFactors[0].id,
      model: modelLabel,
      fitness,
      returns,
      drawdown,
      pnlSeries,
    };
  });

  return {
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    status: input.status ?? "complete",
    strategyType: input.strategyType,
    prompt: input.prompt,
    model: input.model,
    resultCount: input.resultCount,
    estimatedCredit: input.estimatedCredit,
    results,
  } satisfies GenerationRound;
}

export default function AlphaEdit() {
  const latestRoundRef = useRef<HTMLElement | null>(null);
  const generationTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [mode, setMode] = useState<AgentMode>("platform");
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<RoundResult | null>(null);
  const [pendingDeleteRoundId, setPendingDeleteRoundId] = useState<string | null>(null);
  const [activeGeneratingRoundId, setActiveGeneratingRoundId] = useState<string | null>(null);
  const [latestRoundId, setLatestRoundId] = useState<string | null>(null);

  const [strategyType, setStrategyType] = useState<StrategyType>("time-series");
  const [prompt, setPrompt] = useState("");
  const [promptBeforeOptimization, setPromptBeforeOptimization] = useState<string | null>(null);
  const [model, setModel] = useState<ModelKey>("otter-quant-pro");
  const [resultCount, setResultCount] = useState(4);
  const [rounds, setRounds] = useState<GenerationRound[]>([
    buildRound({
      strategyType: "time-series",
      prompt: "Generate robust mean-reversion factors for BTC perpetual futures.",
      model: "otter-quant-fast",
      resultCount: 3,
      estimatedCredit: 0.45,
    }),
  ]);

  const estimatedCredit = useMemo(() => {
    const modelCost = MODEL_OPTIONS.find((item) => item.value === model)?.unitCost ?? 0.2;
    const promptCost = prompt.trim().length > 0 ? Math.min(0.22, prompt.trim().length * 0.0015) : 0;
    return Number((modelCost * resultCount + promptCost).toFixed(2));
  }, [model, prompt, resultCount]);

  const promptOptimized = promptBeforeOptimization !== null;

  const optimizePrompt = () => {
    if (!prompt.trim()) return;
    setPromptBeforeOptimization(prompt);
    setPrompt(optimizePromptText(prompt, strategyType));
  };

  const undoPromptOptimization = () => {
    if (promptBeforeOptimization === null) return;
    setPrompt(promptBeforeOptimization);
    setPromptBeforeOptimization(null);
  };

  const finishGeneration = (roundId: string) => {
    setRounds((prev) => prev.map((round) => (round.id === roundId ? { ...round, status: "complete" } : round)));
    setActiveGeneratingRoundId((current) => (current === roundId ? null : current));
    generationTimerRef.current = null;
  };

  const pauseGeneration = () => {
    if (!activeGeneratingRoundId) return;
    if (generationTimerRef.current) {
      window.clearTimeout(generationTimerRef.current);
      generationTimerRef.current = null;
    }
    setRounds((prev) =>
      prev.map((round) => (round.id === activeGeneratingRoundId ? { ...round, status: "paused" } : round)),
    );
    setActiveGeneratingRoundId(null);
  };

  const runGeneration = () => {
    if (activeGeneratingRoundId) {
      pauseGeneration();
      return;
    }

    const nextRound = buildRound({
      strategyType,
      prompt,
      model,
      resultCount,
      estimatedCredit,
      status: "generating",
    });
    setRounds((prev) => [nextRound, ...prev]);
    setActiveGeneratingRoundId(nextRound.id);
    setLatestRoundId(nextRound.id);

    if (generationTimerRef.current) window.clearTimeout(generationTimerRef.current);
    generationTimerRef.current = window.setTimeout(() => finishGeneration(nextRound.id), 2400);
  };

  const confirmDeleteRound = () => {
    if (!pendingDeleteRoundId) return;
    if (pendingDeleteRoundId === activeGeneratingRoundId) {
      if (generationTimerRef.current) {
        window.clearTimeout(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setActiveGeneratingRoundId(null);
    }
    setRounds((prev) => prev.filter((round) => round.id !== pendingDeleteRoundId));
    setPendingDeleteRoundId(null);
  };

  useEffect(() => {
    return () => {
      if (generationTimerRef.current) window.clearTimeout(generationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!latestRoundId) return;
    const frame = window.requestAnimationFrame(() => {
      latestRoundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestRoundId, rounds.length]);

  useEffect(() => {
    if (!selectedFactorId) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedFactorId(null);
        setSelectedPreview(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [selectedFactorId]);

  useEffect(() => {
    if (!selectedFactorId) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [selectedFactorId]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6.5rem)] max-w-[1180px] flex-col gap-5">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/alphas">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div>
              <h1 className="text-foreground text-4xl font-semibold tracking-tight">Create New Factor</h1>
              <p className="mt-1 text-muted-foreground">Choose how you want to create your factor</p>
            </div>
          </div>

          <div className="inline-flex self-end rounded-xl border border-border bg-card p-1">
            <button
              onClick={() => setMode("platform")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                mode === "platform"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-4 w-4" />
              Platform Agent
              {mode === "platform" ? <Check className="h-4 w-4" /> : null}
            </button>

            <button
              onClick={() => setMode("own")}
              className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                mode === "own"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="h-4 w-4" />
              Your Own Agent
              {mode === "own" ? <Check className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      </div>

      {mode === "own" ? (
        <div className="surface-card flex min-h-[360px] items-center justify-center rounded-3xl border border-dashed border-border p-10 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">Your Own Agent</p>
            <p className="mt-2 text-sm text-muted-foreground">此模式暂保持原有逻辑入口，可按后续需求继续扩展。</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-5 overflow-y-auto pb-72">
            {rounds.map((round) => (
              <section
                key={round.id}
                ref={round.id === latestRoundId ? latestRoundRef : null}
                className="scroll-mt-4 grid items-start gap-4 md:grid-cols-3 xl:grid-cols-4"
              >
                <article className="surface-card h-fit rounded-2xl border border-border p-4 text-sm">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {round.status === "generating" ? "生成中" : `${round.resultCount} results`}
                    </span>
                    <span>{formatMinutesAgo(round.createdAt)}</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Strategy Type</p>
                      <p className="text-[12px] font-medium text-foreground">{formatStrategyLabel(round.strategyType)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Prompt</p>
                      <p className="line-clamp-3 text-[12px] text-foreground/90">{round.prompt.trim() || "--"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Model</p>
                      <p className="text-[12px] font-medium text-foreground">{MODEL_OPTIONS.find((item) => item.value === round.model)?.label}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">Result Count</p>
                        <p className="text-[12px] font-medium text-foreground">{round.resultCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">Credit</p>
                        <p className="text-[12px] font-medium text-emerald-400">{round.estimatedCredit.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1.5 text-muted-foreground">
                      <button
                        className="transition hover:text-foreground"
                        aria-label="Regenerate"
                        title="Regenerate"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="transition hover:text-destructive"
                        aria-label="Delete"
                        title="Delete"
                        onClick={() => setPendingDeleteRoundId(round.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>

                <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-3 xl:grid-cols-3">
                  {round.results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      status={round.status}
                      className="sm:min-h-[300px]"
                      active={selectedFactorId === result.factorId}
                      onSelect={() => {
                        setSelectedFactorId(result.factorId);
                        setSelectedPreview(result);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="sticky bottom-0 z-10 rounded-xl border border-border bg-card/95 p-2.5 shadow-[0_-14px_24px_rgba(2,6,23,0.3)] backdrop-blur md:p-3">
            <div className={`relative ${composerCollapsed ? "space-y-2 pt-0.5" : "space-y-3 pt-6"}`}>
              <button
                type="button"
                onClick={() => setComposerCollapsed((prev) => !prev)}
                className="absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-accent text-muted-foreground transition hover:text-foreground"
                aria-label={composerCollapsed ? "Expand composer" : "Collapse composer"}
              >
                {composerCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {!composerCollapsed ? (
                <>
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Strategy Type <span className="text-destructive">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStrategyType("time-series")}
                          className={`h-9 rounded-md border px-2.5 text-left text-sm font-semibold transition ${
                            strategyType === "time-series"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-accent text-foreground"
                          }`}
                        >
                          Time series
                        </button>
                        <button
                          type="button"
                          onClick={() => setStrategyType("cross-sectional")}
                          className={`h-9 rounded-md border px-2.5 text-left text-sm font-semibold transition ${
                            strategyType === "cross-sectional"
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-accent text-foreground"
                          }`}
                        >
                          Cross Section
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label className="block text-xs font-medium text-muted-foreground">Description</label>
                        <button
                          type="button"
                          onClick={promptOptimized ? undoPromptOptimization : optimizePrompt}
                          disabled={!promptOptimized && !prompt.trim()}
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-accent px-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {promptOptimized ? <Undo2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {promptOptimized ? "撤回" : "优化提示词"}
                        </button>
                      </div>
                      <Textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="Describe what you want to generate..."
                        rows={2}
                        className="h-[64px] resize-none rounded-md border-border bg-accent px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-accent px-2.5">
                      <span className="text-xs text-muted-foreground">Model</span>
                      <select
                        value={model}
                        onChange={(event) => setModel(event.target.value as ModelKey)}
                        className="bg-transparent text-sm font-medium text-foreground outline-none"
                      >
                        {MODEL_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-accent px-2.5">
                      <span className="text-xs text-muted-foreground">Result Count</span>
                      <select
                        value={resultCount}
                        onChange={(event) => setResultCount(Number(event.target.value))}
                        className="bg-transparent text-sm font-medium text-foreground outline-none"
                      >
                        {[1, 2, 3, 4, 8, 10].map((count) => (
                          <option key={count} value={count}>
                            {count}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Composer collapsed. Current: {formatStrategyLabel(strategyType)}, {resultCount} result{resultCount > 1 ? "s" : ""}.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <div className="inline-flex items-center gap-2 text-sm text-foreground">
                  <span className="text-xs text-muted-foreground">Will run {resultCount} model{resultCount > 1 ? "s" : ""}</span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/12 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                    <Coins className="h-3.5 w-3.5" />
                    Est. ${estimatedCredit.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={runGeneration}
                  className="inline-flex h-9 min-w-[120px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  {activeGeneratingRoundId ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {activeGeneratingRoundId ? "暂停" : "Run"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedFactorId ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => {
              setSelectedFactorId(null);
              setSelectedPreview(null);
            }}
            aria-label="Close factor detail panel"
          />

          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 items-center justify-center p-4 xl:flex">
            {selectedPreview ? (
              <div className="w-full max-w-[360px]">
                <ResultCard result={selectedPreview} />
              </div>
            ) : null}
          </div>

          <aside className="absolute inset-y-0 right-0 w-full border-l border-border bg-background shadow-[0_10px_40px_rgba(2,6,23,0.45)] sm:w-2/3">
            <button
              type="button"
              onClick={() => {
                setSelectedFactorId(null);
                setSelectedPreview(null);
              }}
              className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:text-foreground"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-full overflow-y-auto p-5 sm:p-6">
              <AlphaDetail embedded factorIdOverride={selectedFactorId} />
            </div>
          </aside>
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(pendingDeleteRoundId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRoundId(null);
        }}
      >
        <AlertDialogContent className="border-border bg-card text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除这组结果？</AlertDialogTitle>
            <AlertDialogDescription>
              删除不可撤销，无法找回已删除内容。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRound}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
