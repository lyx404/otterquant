import { Suspense, lazy, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import AlphaDetail from "@/pages/AlphaDetail";
import { factors as detailFactors } from "@/lib/mockData";
import { useTheme } from "@/contexts/ThemeContext";

type AgentMode = "platform" | "own";
type StrategyType = "time-series" | "cross-sectional";
type ModelKey =
  | "chatgpt-5-5"
  | "chatgpt-5-4"
  | "chatgpt-5-3"
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "gemini-3-1-pro"
  | "deepseek-v3-2";
type GenerationStatus = "generating" | "paused" | "complete";

const OwnAgentPanel = lazy(() => import("@/components/alpha-edit/OwnAgentPanel"));

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
  models: ModelKey[];
  resultCount: number;
  estimatedCredit: number;
  results: RoundResult[];
};

const MODEL_OPTIONS: Array<{
  value: ModelKey;
  label: string;
  unitCost: number;
  provider: string;
  description: string;
  latency: string;
  brand: "openai" | "claude" | "gemini" | "deepseek";
}> = [
  {
    value: "chatgpt-5-5",
    label: "ChatGPT 5.5",
    unitCost: 0.42,
    provider: "OpenAI",
    description: "Flagship reasoning model for complex factor exploration.",
    latency: "35s",
    brand: "openai",
  },
  {
    value: "chatgpt-5-4",
    label: "ChatGPT 5.4",
    unitCost: 0.32,
    provider: "OpenAI",
    description: "Balanced model for most factor generation workflows.",
    latency: "28s",
    brand: "openai",
  },
  {
    value: "chatgpt-5-3",
    label: "ChatGPT 5.3",
    unitCost: 0.24,
    provider: "OpenAI",
    description: "Lightweight option for fast iteration and broad sampling.",
    latency: "22s",
    brand: "openai",
  },
  {
    value: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    unitCost: 0.46,
    provider: "Anthropic",
    description: "Strong long-chain reasoning for structured research tasks.",
    latency: "40s",
    brand: "claude",
  },
  {
    value: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    unitCost: 0.34,
    provider: "Anthropic",
    description: "Balanced speed and quality for frequent factor iteration.",
    latency: "30s",
    brand: "claude",
  },
  {
    value: "gemini-3-1-pro",
    label: "Gemini 3.1 Pro",
    unitCost: 0.36,
    provider: "Google",
    description: "Research-oriented model with strong multimodal context handling.",
    latency: "26s",
    brand: "gemini",
  },
  {
    value: "deepseek-v3-2",
    label: "Deepseek V3.2",
    unitCost: 0.22,
    provider: "DeepSeek",
    description: "Low-cost, high-throughput option for large initial sweeps.",
    latency: "18s",
    brand: "deepseek",
  },
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
  return value === "time-series" ? "Time-Series" : "Cross-Sectional";
}

function formatMinutesAgo(timestamp: string) {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000));
  return `${delta} minute${delta === 1 ? "" : "s"} ago`;
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

function getModelOption(model: ModelKey) {
  return MODEL_OPTIONS.find((item) => item.value === model) ?? MODEL_OPTIONS[0];
}

function formatModelSummary(models: ModelKey[]) {
  if (models.length === 1) return getModelOption(models[0]).label;
  return `${models.length} models`;
}

function orderModels(models: ModelKey[]) {
  return MODEL_OPTIONS.filter((item) => models.includes(item.value)).map((item) => item.value);
}

function OpenAILogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#F8FAFC]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4.3a4.5 4.5 0 0 1 4.36 3.39l2.08 1.2a4.5 4.5 0 0 1 .02 7.8l-.02.02a4.5 4.5 0 0 1-1.68 6.12 4.5 4.5 0 0 1-6.22-1.06h-2.4a4.5 4.5 0 0 1-4.54-4.54 4.5 4.5 0 0 1 .18-1.25L2.7 14.8a4.5 4.5 0 0 1 1.65-6.17l.04-.02A4.5 4.5 0 0 1 9.14 2.9L12 4.3Z" />
      <path d="M9.1 2.93 14.8 6.2M16.34 7.69v6.61M14.86 17.8l-5.72 3.27M7.65 16.31 4.32 10.6M7.64 7.72l8.7 5.03M7.67 16.3h8.64" />
    </svg>
  );
}

function ClaudeLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#FB923C]" fill="currentColor" aria-hidden="true">
      <path d="m12 2.8 1.83 5.03 4.9-2.18-2.18 4.9L21.2 12l-4.65 1.45 2.18 4.9-4.9-2.18L12 21.2l-1.83-5.03-4.9 2.18 2.18-4.9L2.8 12l4.65-1.45-2.18-4.9 4.9 2.18L12 2.8Z" />
    </svg>
  );
}

function GeminiLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gemini-gradient" x1="4" x2="20" y1="4" y2="20">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <path fill="url(#gemini-gradient)" d="M12 2.5c.56 4.54 4.46 8.44 9 9-.46.06-.92.1-1.38.12-4.07.22-7.25 3.4-7.47 7.47-.02.46-.06.92-.12 1.38-.56-4.54-4.46-8.44-9-9 4.54-.56 8.44-4.46 9-9Z" />
    </svg>
  );
}

function DeepSeekLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#60A5FA]" fill="currentColor" aria-hidden="true">
      <path d="M18.85 8.05c-1.55-1.85-3.97-3-6.66-3-4.67 0-8.45 3.45-8.45 7.7 0 2.4 1.2 4.54 3.08 5.95.53.4 1.17.66 1.83.75.58.08 1.18.04 1.74-.15.36-.12.67-.33.95-.58l1.55-1.42c.54-.5 1.38-.47 1.89.06l1.3 1.36c.28.29.66.47 1.07.49 2.26.12 4.11-1.68 4.11-4 0-1.84-1.18-3.41-2.85-4.01.34-.81.25-1.74-.56-2.15Z" />
      <path d="M8.2 12.1c.84.28 1.76.12 2.46-.44l1.25-1a2.8 2.8 0 0 1 3.16-.26l1.34.73c.4.22.88.26 1.31.11" fill="none" stroke="#DBEAFE" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ModelLogo({ model }: { model: ModelKey }) {
  const option = getModelOption(model);

  if (option.brand === "openai") return <OpenAILogo />;
  if (option.brand === "claude") return <ClaudeLogo />;
  if (option.brand === "gemini") return <GeminiLogo />;
  return <DeepSeekLogo />;
}

function Sparkline({ data }: { data: number[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const gradientId = useId().replace(/:/g, "");
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * 100;
    const y = 84 - ((value - min) / range) * 68;
    return { x, y };
  });
  const allPoints = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const testStartIndex = Math.max(1, data.length - Math.max(4, Math.round(data.length * 0.28)));
  const trainPoints = points.slice(0, testStartIndex + 1).map(({ x, y }) => `${x},${y}`).join(" ");
  const testPoints = points.slice(testStartIndex).map(({ x, y }) => `${x},${y}`).join(" ");
  const lastPoint = points[points.length - 1];
  const trainColor = isDark ? "#818CF8" : "#4F46E5";
  const testColor = isDark ? "#34D399" : "#10B981";
  const areaBaseY = 90;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={`${gradientId}-pnl-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={isDark ? "rgba(129,140,248,0.32)" : "rgba(79,70,229,0.26)"} />
          <stop offset="68%" stopColor={isDark ? "rgba(52,211,153,0.12)" : "rgba(16,185,129,0.08)"} />
          <stop offset="100%" stopColor="rgba(15,23,42,0.02)" />
        </linearGradient>
      </defs>
      <polyline
        fill={`url(#${gradientId}-pnl-fill)`}
        stroke="none"
        points={`${allPoints} 100,${areaBaseY} 0,${areaBaseY}`}
      />
      <polyline
        fill="none"
        stroke={trainColor}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={trainPoints}
      />
      <polyline
        fill="none"
        stroke={testColor}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={testPoints}
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2.3" fill={testColor} />
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
  const detailFactor = detailFactors.find((item) => item.id === result.factorId);
  const isPassed = detailFactor?.status === "active" || detailFactor?.status === "testing";

  return (
    <article
      className={`surface-card relative flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-2xl border border-border px-[8px] py-[12px] ${
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
            Generating
          </span>
        </div>
      ) : null}

      <div className="mb-3 min-w-0">
        <p className="line-clamp-2 break-words pl-2 text-[12px] font-semibold leading-[1.25] tracking-[-0.01em] text-foreground">
          {result.factorName}
        </p>
      </div>

      <div className="flex flex-none flex-col rounded-[1.1rem] border border-border/70 bg-[linear-gradient(180deg,rgba(99,102,241,0.08),rgba(15,23,42,0.02))] px-3 py-3">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/90">PnL Curve</p>
        </div>
        <div className="aspect-video w-full min-h-0">
          <Sparkline data={result.pnlSeries} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-[6px] text-[12px]">
        <div className="min-w-0 rounded-xl border border-border/50 bg-accent/55 px-2.5 py-2.5">
          <p className="text-[10px] font-medium uppercase leading-[10px] tracking-[0.08em] text-muted-foreground/85">Fitness</p>
          <p className="mt-2 truncate font-mono text-[12px] font-semibold leading-none tabular-nums text-foreground">
            {result.fitness.toFixed(2)}
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-border/50 bg-accent/55 px-2.5 py-2.5">
          <p className="text-[10px] font-medium uppercase leading-[10px] tracking-[0.08em] text-muted-foreground/85">Returns</p>
          <p className="mt-2 truncate font-mono text-[12px] font-semibold leading-none tabular-nums text-emerald-400">
            +{result.returns.toFixed(1)}%
          </p>
        </div>
        <div className="min-w-0 rounded-xl border border-border/50 bg-accent/55 px-2.5 py-2.5">
          <p className="text-[10px] font-medium uppercase leading-[10px] tracking-[0.08em] text-muted-foreground/85">DD</p>
          <p className="mt-2 truncate font-mono text-[12px] font-semibold leading-none tabular-nums text-rose-400">
            -{result.drawdown.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-2">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-mono tracking-[0.15em] ${
            isPassed
              ? "border-success/20 bg-success/10 text-success"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {isPassed ? "PASSED" : "FAILED"}
        </span>
        <span className="max-w-full truncate rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {result.model}
        </span>
      </div>
    </article>
  );
}

function buildRound(input: {
  strategyType: StrategyType;
  prompt: string;
  models: ModelKey[];
  resultCount: number;
  estimatedCredit: number;
  status?: GenerationStatus;
}) {
  const totalResultCount = input.resultCount * input.models.length;
  const results: RoundResult[] = Array.from({ length: totalResultCount }).map((_, index) => {
    const seed = Date.now() + index;
    const modelKey = input.models[Math.floor(index / input.resultCount)] ?? input.models[0];
    const modelLabel = getModelOption(modelKey).label;
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
    models: input.models,
    resultCount: totalResultCount,
    estimatedCredit: input.estimatedCredit,
    results,
  } satisfies GenerationRound;
}

export default function AlphaEdit() {
  const { uiLang } = useAppLanguage();
  const latestRoundRef = useRef<HTMLElement | null>(null);
  const generationTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const [mode, setMode] = useState<AgentMode>("platform");
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [resultCountMenuOpen, setResultCountMenuOpen] = useState(false);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<RoundResult | null>(null);
  const [pendingDeleteRoundId, setPendingDeleteRoundId] = useState<string | null>(null);
  const [activeGeneratingRoundId, setActiveGeneratingRoundId] = useState<string | null>(null);
  const [latestRoundId, setLatestRoundId] = useState<string | null>(null);

  const [strategyType, setStrategyType] = useState<StrategyType>("time-series");
  const [prompt, setPrompt] = useState("");
  const [promptBeforeOptimization, setPromptBeforeOptimization] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<ModelKey[]>(["chatgpt-5-4"]);
  const [resultCount, setResultCount] = useState(4);
  const [rounds, setRounds] = useState<GenerationRound[]>([
    buildRound({
      strategyType: "time-series",
      prompt: "Generate robust mean-reversion factors for BTC perpetual futures.",
      models: ["chatgpt-5-4"],
      resultCount: 3,
      estimatedCredit: 0.96,
    }),
  ]);

  const estimatedCredit = useMemo(() => {
    const modelCost = selectedModels.reduce((sum, item) => sum + getModelOption(item).unitCost, 0);
    const promptCost = prompt.trim().length > 0 ? Math.min(0.22, prompt.trim().length * 0.0015) : 0;
    return Number((modelCost * resultCount + promptCost).toFixed(2));
  }, [prompt, resultCount, selectedModels]);

  const totalResultCount = resultCount * selectedModels.length;
  const selectedModelSummary = useMemo(() => formatModelSummary(selectedModels), [selectedModels]);
  const selectedLogoModels = useMemo(() => {
    const seenBrands = new Set<string>();
    return selectedModels.filter((item) => {
      const brand = getModelOption(item).brand;
      if (seenBrands.has(brand)) return false;
      seenBrands.add(brand);
      return true;
    });
  }, [selectedModels]);

  const promptOptimized = promptBeforeOptimization !== null;
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

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
      models: selectedModels,
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

  const toggleModelSelection = (nextModel: ModelKey) => {
    setSelectedModels((prev) => {
      if (prev.includes(nextModel)) {
        return prev.length === 1 ? prev : prev.filter((item) => item !== nextModel);
      }

      return orderModels([...prev, nextModel]);
    });
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
              <h1
                className="text-[20px] font-semibold leading-none tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {tr("Create New Factor", "创建新因子")}
              </h1>
              <p
                className="mt-1 text-[12px] leading-[1.4] text-muted-foreground"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {tr("Choose a workflow for factor generation", "选择因子生成方式")}
              </p>
            </div>
          </div>

          <div className="inline-flex self-auto h-10 items-center justify-start rounded-[50px] border border-border bg-card p-0">
            <button
              onClick={() => setMode("platform")}
              className={`inline-flex h-10 items-center gap-2 rounded-[50px] px-4 text-[12px] font-semibold transition ${
                mode === "platform"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-4 w-4" />
              {tr("Platform Agent", "平台 Agent")}
              {mode === "platform" ? <Check className="h-4 w-4" /> : null}
            </button>

            <button
              onClick={() => setMode("own")}
              className={`inline-flex h-10 items-center gap-2 rounded-[50px] px-4 text-[12px] font-semibold transition ${
                mode === "own"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="h-4 w-4" />
              {tr("Your Own Agent", "自有 Agent")}
              {mode === "own" ? <Check className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      </div>

      {mode === "own" ? (
        <Suspense
          fallback={
            <div className="surface-card flex min-h-[240px] items-center justify-center rounded-3xl border border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">{tr("Loading own-agent workspace...", "正在加载自有 Agent 工作区...")}</p>
            </div>
          }
        >
          <OwnAgentPanel />
        </Suspense>
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
                      {round.status === "generating" ? tr("Generating", "生成中") : `${round.resultCount} ${tr("candidates", "候选项")}`}
                    </span>
                    <span>{formatMinutesAgo(round.createdAt)}</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">{tr("Factor Type", "因子类型")}</p>
                      <p className="text-[12px] font-medium text-foreground">
                        {round.strategyType === "time-series" ? tr("Time-Series", "时序因子") : tr("Cross-Sectional", "截面因子")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{tr("Factor Prompt", "因子提示词")}</p>
                      <p className="line-clamp-3 text-[12px] text-foreground/90">{round.prompt.trim() || "--"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">{tr("Model", "模型")}</p>
                      <p className="text-[12px] font-medium text-foreground">{formatModelSummary(round.models)}</p>
                      {round.models.length > 1 ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {round.models.map((item) => getModelOption(item).label).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{tr("Candidates", "候选数量")}</p>
                        <p className="text-[12px] font-medium text-foreground">{round.resultCount}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{tr("Credits", "积分")}</p>
                        <p className="text-[12px] font-medium text-emerald-400">{round.estimatedCredit.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1.5 text-muted-foreground">
                      <button
                        className="transition hover:text-foreground"
                        aria-label={tr("Regenerate", "重新生成")}
                        title={tr("Regenerate", "重新生成")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="transition hover:text-destructive"
                        aria-label={tr("Delete", "删除")}
                        title={tr("Delete", "删除")}
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

          <div className="sticky bottom-0 z-10 mx-auto self-auto w-[800px] max-w-full rounded-xl border border-border bg-card/95 p-2.5 shadow-[0_-14px_24px_rgba(2,6,23,0.3)] backdrop-blur md:p-3">
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
                    {tr("Factor Type", "因子类型")} <span className="text-destructive">*</span>
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
                          {tr("Time-Series", "时序因子")}
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
                          {tr("Cross-Sectional", "截面因子")}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label className="block text-xs font-medium text-muted-foreground">{tr("Factor Prompt", "因子提示词")}</label>
                        <button
                          type="button"
                          onClick={promptOptimized ? undoPromptOptimization : optimizePrompt}
                          disabled={!promptOptimized && !prompt.trim()}
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-accent px-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {promptOptimized ? <Undo2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {promptOptimized ? tr("Revert", "撤回") : tr("Optimize Prompt", "优化提示词")}
                        </button>
                      </div>
                      <Textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder={tr(
                          "Describe the factor hypothesis, market intuition, and required inputs...",
                          "描述因子假设、市场逻辑和所需输入..."
                        )}
                        rows={2}
                        className="h-[64px] resize-none rounded-md border-border bg-accent px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <Popover open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-accent px-2.5 text-left text-sm text-foreground transition hover:border-primary/30 hover:bg-accent/90"
                          >
                            <span className="shrink-0 text-xs text-muted-foreground">{tr("Model", "模型")}</span>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="flex items-center gap-1.5 shrink-0">
                                {selectedLogoModels.slice(0, 2).map((item) => (
                                  <span key={item} className="inline-flex h-4 w-4 items-center justify-center">
                                    <ModelLogo model={item} />
                                  </span>
                                ))}
                                {selectedLogoModels.length > 2 ? (
                                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-card px-1 text-[9px] font-semibold text-muted-foreground">
                                    +{selectedLogoModels.length - 2}
                                  </span>
                                ) : null}
                              </div>
                              <span className="truncate font-medium text-foreground">{selectedModelSummary}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${modelMenuOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          side="top"
                          sideOffset={10}
                          className="w-[min(520px,calc(100vw-4rem))] rounded-[24px] border border-border bg-popover/95 p-0 text-popover-foreground shadow-[0_24px_60px_rgba(2,6,23,0.5)] backdrop-blur-xl"
                        >
                          <div className="border-b border-border px-5 py-4">
                            <div className="flex items-center justify-between gap-4">
                              <div className="text-[15px] font-semibold text-foreground">{tr("Model Selection", "模型选择")}</div>
                              <div className="text-[12px] text-muted-foreground">{selectedModels.length} {tr("selected", "已选")}</div>
                            </div>
                          </div>

                          <div className="max-h-[340px] space-y-1.5 overflow-y-auto px-3 py-3">
                            {MODEL_OPTIONS.map((item) => {
                              const selected = selectedModels.includes(item.value);

                              return (
                                <div
                                  key={item.value}
                                  onClick={() => toggleModelSelection(item.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      toggleModelSelection(item.value);
                                    }
                                  }}
                                  role="checkbox"
                                  aria-checked={selected}
                                  aria-label={item.label}
                                  tabIndex={0}
                                  className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition ${
                                    selected
                                      ? "bg-accent/80 ring-1 ring-primary/25"
                                      : "bg-transparent hover:bg-accent/50"
                                  }`}
                                >
                                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/70">
                                    <ModelLogo model={item.value} />
                                  </span>

                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                      <span className="truncate text-[14px] font-semibold text-foreground">{item.label}</span>
                                      <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {item.provider}
                                      </span>
                                    </span>
                                    <span className="mt-1 block text-[12px] leading-[1.45] text-muted-foreground">{item.description}</span>
                                    <span className="mt-2 inline-flex rounded-md bg-background/70 px-2 py-1 text-[10px] font-medium text-muted-foreground">
                                      {item.latency}
                                    </span>
                                  </span>

                                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center">
                                    <Checkbox
                                      checked={selected}
                                      aria-hidden="true"
                                      tabIndex={-1}
                                      className="h-6 w-6 rounded-[8px] border-border bg-background/70 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                    />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="w-[188px]">
                      <Popover open={resultCountMenuOpen} onOpenChange={setResultCountMenuOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-accent px-2.5 text-left text-sm text-foreground transition hover:border-primary/30 hover:bg-accent/90"
                          >
                            <span className="shrink-0 text-xs text-muted-foreground">{tr("Candidate Count", "候选数量")}</span>
                            <span className="ml-auto font-medium text-foreground">{resultCount}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${resultCountMenuOpen ? "rotate-180" : ""}`} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          side="top"
                          sideOffset={10}
                          className="w-[188px] rounded-[18px] border border-white/10 bg-[#111827]/98 p-2 shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-xl"
                        >
                          <div className="space-y-1">
                            {[1, 2, 3, 4, 8, 10].map((count) => {
                              const selected = resultCount === count;

                              return (
                                <button
                                  key={count}
                                  type="button"
                                  onClick={() => {
                                    setResultCount(count);
                                    setResultCountMenuOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                                    selected
                                      ? "bg-white/[0.06] text-[#F8FAFC] ring-1 ring-primary/25"
                                      : "text-[#CBD5E1] hover:bg-white/[0.04]"
                                  }`}
                                >
                                  <span>{count}</span>
                                  {selected ? <Check className="h-4 w-4 text-primary" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {tr("Composer collapsed. Current setup:", "面板已折叠。当前配置：")} {strategyType === "time-series" ? tr("Time-Series", "时序因子") : tr("Cross-Sectional", "截面因子")}, {selectedModels.length} {tr(`model${selectedModels.length > 1 ? "s" : ""}`, "个模型")}, {resultCount} {tr(`candidate${resultCount > 1 ? "s" : ""} per model`, "个候选/模型")}.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <div className="inline-flex items-center gap-2 text-sm text-foreground">
                  <span className="text-xs text-muted-foreground">
                    {tr("Will run", "将运行")} {selectedModels.length} {tr(`model${selectedModels.length > 1 ? "s" : ""}`, "个模型")} · {totalResultCount} {tr(`candidate${totalResultCount > 1 ? "s" : ""}`, "个候选")}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/12 px-2 py-0.5 text-sm font-semibold text-emerald-300">
                    <Coins className="h-3.5 w-3.5" />
                    {tr("Est.", "预计")} ${estimatedCredit.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={runGeneration}
                  className="inline-flex h-9 min-w-[120px] items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  {activeGeneratingRoundId ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {activeGeneratingRoundId ? tr("Pause", "暂停") : tr("Generate", "生成")}
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
            <AlertDialogTitle>{tr("Delete this result set?", "删除这组结果？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr("This action cannot be undone.", "此操作不可撤销。")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRound}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tr("Delete", "删除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
