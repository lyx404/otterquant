import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Code2,
  Copy,
  FlaskConical,
  Info,
  Key,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { factors, strategies, submissions, type Factor } from "@/lib/mockData";
import { toast } from "sonner";

type AgentMode = "platform" | "own" | null;
type StrategyType = "time-series" | "cross-sectional";
type SymbolGroupKey = "top1-20" | "top1-50" | "top1-100";
type SymbolPickerTab = "individual" | "group";
type OfficialPrimaryCategory = "favorites" | "technical" | "fundamental";
type MyAlphaCategory = "favorites" | "all";
type WeightMode = "equal" | "custom";
type PlatformInputMethod = "form" | "ai-chat";
type CrossDirection = "long" | "short" | "neutral";
type RankMode = "n" | "percent";
type AlphaSourceTab = "my" | "official";
type OwnStep = "api" | "first-run";

const MAX_FACTOR_COUNT = 5;
const SKILL_LATEST = "v2.4.1";
const SYMBOL_POOL = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT",
  "MATICUSDT", "LTCUSDT", "BCHUSDT", "ATOMUSDT", "UNIUSDT", "AAVEUSDT", "OPUSDT", "ARBUSDT", "NEARUSDT", "APTUSDT",
  "SUIUSDT", "FILUSDT", "ICPUSDT", "ETCUSDT", "XLMUSDT", "TRXUSDT", "TONUSDT", "INJUSDT", "PEPEUSDT", "WIFUSDT",
  "FETUSDT", "RNDRUSDT", "TIAUSDT", "SEIUSDT", "RUNEUSDT", "HBARUSDT", "ALGOUSDT", "MKRUSDT", "SNXUSDT", "DYDXUSDT",
  "IMXUSDT", "LDOUSDT", "CRVUSDT", "SUSHIUSDT", "COMPUSDT", "GRTUSDT", "GMXUSDT", "BLURUSDT", "JTOUSDT", "PYTHUSDT",
];

const SYMBOL_GROUPS: Array<{ key: SymbolGroupKey; label: string; size: number }> = [
  { key: "top1-20", label: "top1-20", size: 20 },
  { key: "top1-50", label: "top1-50", size: 50 },
  { key: "top1-100", label: "top1-100", size: 100 },
];

const FAVORITE_FACTOR_IDS = new Set(["AF-001", "AF-004", "AF-005", "AF-009", "AF-013", "AF-016"]);

const OFFICIAL_LIBRARY_GROUPS = {
  favorites: {
    label: "My Favorites",
    items: [{ id: "favorites", label: "My Favorites" }],
  },
  technical: {
    label: "Technical Factors",
    items: [
      { id: "all", label: "All" },
      { id: "momentum", label: "Momentum" },
      { id: "volatility", label: "Volatility" },
      { id: "trend", label: "Trend" },
      { id: "oscillator", label: "Oscillator" },
      { id: "volume_price", label: "Price-Volume" },
      { id: "microstructure", label: "Market Microstructure" },
      { id: "statistical", label: "Statistical" },
      { id: "pattern", label: "Pattern Signals" },
    ],
  },
  fundamental: {
    label: "Fundamental Factors",
    items: [
      { id: "all", label: "All" },
      { id: "capital_flow", label: "Capital Flows" },
      { id: "derivatives_leverage", label: "Derivatives Leverage" },
      { id: "onchain_valuation", label: "On-Chain Valuation" },
      { id: "pnl_structure", label: "PnL Structure" },
      { id: "holder_behavior", label: "Holder Behavior" },
      { id: "onchain_activity", label: "On-Chain Activity" },
      { id: "supply_dynamics", label: "Supply Dynamics" },
      { id: "miner_economics", label: "Miner Economics" },
      { id: "institutional_flow", label: "Institutional Flows" },
      { id: "network_fees", label: "Network & Fees" },
      { id: "sentiment_dev", label: "Sentiment & Dev Activity" },
      { id: "composite", label: "Composite" },
    ],
  },
} as const;

const MY_ALPHA_GROUPS = {
  mine: {
    label: "My Alphas",
    items: [
      { id: "favorites", label: "My Favorites" },
      { id: "all", label: "All" },
    ],
  },
} as const;

const FIRST_RUN_PROMPTS = [
  {
    category: "Time Series",
    prompt:
      "Create a time-series strategy on BTCUSDT with Momentum + Volatility factors, equal weight, stop loss 8%, cooldown 24 hours.",
    desc: "Test symbol-level timing strategy creation flow.",
  },
  {
    category: "Cross Section",
    prompt:
      "Create a neutral cross-sectional strategy with 5 factors. Use Top/Tail 10%, stop loss 8%, cooldown 1 day, and custom weights summing to 1.",
    desc: "Test ranking-based strategy creation flow.",
  },
];

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "ot_sk_";
  for (let i = 0; i < 32; i += 1) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function buildGuidePrompt(key: string) {
  return `# Otter Strategy Skill Configuration

## API Key
\`${key}\`

## Skill Version
v2.4.1

## Setup Instructions
Paste this prompt into your AI agent (ChatGPT / Claude / DeepSeek) to connect strategy generation with Otter.

The agent can:
- Create and refine strategy drafts
- Configure factor combinations and weights
- Run backtest requests
- Submit strategies to Strategy Arena`;
}

function numberOrZero(input: string) {
  const n = Number(input);
  return Number.isFinite(n) ? n : 0;
}

function buildDefaultCustomWeights(factorNames: string[]) {
  if (factorNames.length === 0) return {} as Record<string, string>;

  const totalHundredths = 100;
  const base = Math.floor(totalHundredths / factorNames.length);
  const remainder = totalHundredths - base * factorNames.length;

  return factorNames.reduce<Record<string, string>>((acc, factorName, index) => {
    const hundredths = base + (index < remainder ? 1 : 0);
    acc[factorName] = (hundredths / totalHundredths).toFixed(2);
    return acc;
  }, {});
}

function normalizeWeightInput(input: string) {
  const sanitized = input.replace(/[^\d.]/g, "");
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex === -1) return sanitized;

  const integerPart = sanitized.slice(0, dotIndex);
  const decimalPart = sanitized
    .slice(dotIndex + 1)
    .replace(/\./g, "")
    .slice(0, 2);

  return `${integerPart}.${decimalPart}`;
}

function inferAiScaleFromPrompt(prompt: string): "single" | "batch" {
  const text = prompt.toLowerCase();
  if (/(batch|multiple|multi-strategy|multi strategy|several strategies)/.test(text)) return "batch";

  const lines = prompt.split(/\n+/).filter((line) => line.trim().length > 0);
  const bulletLikeCount = lines.filter((line) => /^(\d+\.|[-*])\s/.test(line.trim())).length;
  if (bulletLikeCount >= 2) return "batch";

  return "single";
}

function getGroupSymbols(group: SymbolGroupKey | null) {
  const groupConfig = SYMBOL_GROUPS.find((item) => item.key === group);
  if (!groupConfig) return [];
  return SYMBOL_POOL.slice(0, groupConfig.size);
}

function normalizeSymbols(selectedSymbols: string[]) {
  return selectedSymbols.length > 0 ? selectedSymbols.join(", ") : "BTCUSDT";
}

function getOfficialFactorCategory(factor: Factor): {
  primary: OfficialPrimaryCategory;
  subcategory: string;
  subcategoryLabel: string;
} {
  const byId: Record<string, { primary: OfficialPrimaryCategory; subcategory: string; subcategoryLabel: string }> = {
    "AF-001": { primary: "technical", subcategory: "momentum", subcategoryLabel: "Momentum" },
    "AF-002": { primary: "technical", subcategory: "volume_price", subcategoryLabel: "Price-Volume" },
    "AF-004": { primary: "technical", subcategory: "microstructure", subcategoryLabel: "Market Microstructure" },
    "AF-005": { primary: "fundamental", subcategory: "derivatives_leverage", subcategoryLabel: "Derivatives Leverage" },
    "AF-007": { primary: "fundamental", subcategory: "holder_behavior", subcategoryLabel: "Holder Behavior" },
    "AF-009": { primary: "fundamental", subcategory: "derivatives_leverage", subcategoryLabel: "Derivatives Leverage" },
    "AF-013": { primary: "fundamental", subcategory: "derivatives_leverage", subcategoryLabel: "Derivatives Leverage" },
    "AF-016": { primary: "fundamental", subcategory: "derivatives_leverage", subcategoryLabel: "Derivatives Leverage" },
  };

  if (byId[factor.id]) return byId[factor.id];

  if (factor.tag === "MOMENTUM") return { primary: "technical", subcategory: "momentum", subcategoryLabel: "Momentum" };
  if (factor.tag === "VOLUME") return { primary: "technical", subcategory: "volume_price", subcategoryLabel: "Price-Volume" };
  if (factor.tag === "ARBITRAGE") return { primary: "technical", subcategory: "microstructure", subcategoryLabel: "Market Microstructure" };
  if (factor.tag === "DERIVATIVES" || factor.tag === "RISK-ADJUSTED") {
    return { primary: "fundamental", subcategory: "derivatives_leverage", subcategoryLabel: "Derivatives Leverage" };
  }
  if (factor.tag === "ON-CHAIN") {
    return { primary: "fundamental", subcategory: "holder_behavior", subcategoryLabel: "Holder Behavior" };
  }

  return { primary: "technical", subcategory: "composite", subcategoryLabel: "Composite" };
}

function getSourceLabel(source: AlphaSourceTab, factor: Factor) {
  if (source === "my") return "My Alphas";
  if (factor.category === "graduated") return "Graduated";
  return "Official";
}

export default function StrategyCreate() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const templateId = searchParams.get("template");
  const template = strategies.find((item) => item.id === templateId) || strategies[0];
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<AgentMode>(
    searchParams.get("creationMode") === "platform" ? "platform" : searchParams.get("creationMode") === "own" ? "own" : null
  );

  const [strategyName, setStrategyName] = useState(template.name);
  const [strategyType, setStrategyType] = useState<StrategyType | null>(null);
  const [multipleSymbols, setMultipleSymbols] = useState<string[]>([]);
  const [selectedSymbolGroup, setSelectedSymbolGroup] = useState<SymbolGroupKey | null>(null);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const [dialogAnchorX, setDialogAnchorX] = useState<number | null>(null);
  const [symbolPickerTab, setSymbolPickerTab] = useState<SymbolPickerTab>("individual");
  const [symbolPickerQuery, setSymbolPickerQuery] = useState("");

  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [weightMode, setWeightMode] = useState<WeightMode | null>(null);
  const [customWeights, setCustomWeights] = useState<Record<string, string>>({});

  const [crossDirection, setCrossDirection] = useState<CrossDirection>("neutral");
  const [rankMode, setRankMode] = useState<RankMode>("percent");
  const [rankValue, setRankValue] = useState("10");

  const [stopLoss, setStopLoss] = useState("8");
  const [cooldownValue, setCooldownValue] = useState("24");
  const [platformInputMethod, setPlatformInputMethod] = useState<PlatformInputMethod>(
    searchParams.get("inputMethod") === "ai-chat" ? "ai-chat" : "form"
  );
  const [aiChatPrompt, setAiChatPrompt] = useState("");
  const [aiChatTouched, setAiChatTouched] = useState(false);

  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [description, setDescription] = useState(template.description);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidationFeedback, setShowValidationFeedback] = useState(false);
  const [showAlphaPicker, setShowAlphaPicker] = useState(false);
  const [alphaSourceTab, setAlphaSourceTab] = useState<AlphaSourceTab>("official");
  const [alphaPickerQuery, setAlphaPickerQuery] = useState("");
  const [myAlphaCategory, setMyAlphaCategory] = useState<MyAlphaCategory>("all");
  const [officialPrimaryCategory, setOfficialPrimaryCategory] = useState<OfficialPrimaryCategory>("favorites");
  const [officialSubcategory, setOfficialSubcategory] = useState("favorites");

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState([
    { id: "1", name: "My Strategy Bot", apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h", skillVersion: "v2.4.1", updatedAt: "2026-03-28" },
    { id: "2", name: "Research Agent", apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE", skillVersion: "v2.3.0", updatedAt: "2026-03-15" },
  ]);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [ownStep, setOwnStep] = useState<OwnStep>("api");

  useEffect(() => {
    if (!showSymbolPicker && !showAlphaPicker) return;

    const updateDialogAnchor = () => {
      const rect = formContainerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) {
        setDialogAnchorX(null);
        return;
      }
      setDialogAnchorX(Math.round(rect.left + rect.width / 2));
    };

    const raf = window.requestAnimationFrame(updateDialogAnchor);
    window.addEventListener("resize", updateDialogAnchor);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateDialogAnchor);
    };
  }, [showSymbolPicker, showAlphaPicker]);

  const myAlphaPool = useMemo(() => {
    const latestByFactorId = submissions.reduce<Record<string, (typeof submissions)[number]>>((acc, item) => {
      acc[item.factorId] = item;
      return acc;
    }, {});

    return factors
      .filter((factor) => Boolean(latestByFactorId[factor.id]))
      .map((factor) => ({ factor, submission: latestByFactorId[factor.id] }))
      .sort((a, b) => (b.submission?.submittedAt || "").localeCompare(a.submission?.submittedAt || ""))
      .map((item) => item.factor);
  }, []);

  const officialAlphaPool = useMemo(
    () => factors.filter((factor) => factor.category === "official" || factor.category === "graduated"),
    []
  );

  const sourcePool = useMemo(() => {
    if (alphaSourceTab === "my") {
      if (myAlphaCategory === "favorites") {
        return myAlphaPool.filter((factor) => FAVORITE_FACTOR_IDS.has(factor.id));
      }
      return myAlphaPool;
    }

    if (officialPrimaryCategory === "favorites") {
      return officialAlphaPool.filter((factor) => FAVORITE_FACTOR_IDS.has(factor.id));
    }

    return officialAlphaPool.filter((factor) => {
      const category = getOfficialFactorCategory(factor);
      if (category.primary !== officialPrimaryCategory) return false;
      if (officialSubcategory === "all") return true;
      return category.subcategory === officialSubcategory;
    });
  }, [
    alphaSourceTab,
    myAlphaPool,
    myAlphaCategory,
    officialAlphaPool,
    officialPrimaryCategory,
    officialSubcategory,
  ]);

  const filteredAlphaPool = useMemo(() => {
    const q = alphaPickerQuery.trim().toLowerCase();
    if (!q) return sourcePool;
    return sourcePool.filter((factor) => {
      return (
        factor.name.toLowerCase().includes(q) ||
        factor.id.toLowerCase().includes(q) ||
        (factor.tag || "").toLowerCase().includes(q)
      );
    });
  }, [alphaPickerQuery, sourcePool]);

  const filteredSymbolPool = useMemo(() => {
    const q = symbolPickerQuery.trim().toLowerCase();
    if (!q) return SYMBOL_POOL;
    return SYMBOL_POOL.filter((symbol) => symbol.toLowerCase().includes(q));
  }, [symbolPickerQuery]);

  const selectedSymbolList = useMemo(() => {
    return Array.from(new Set([...multipleSymbols, ...getGroupSymbols(selectedSymbolGroup)]));
  }, [multipleSymbols, selectedSymbolGroup]);

  const weightSum = useMemo(
    () =>
      selectedFactors.reduce((sum, factorName) => {
        if (weightMode !== "custom") return sum;
        return sum + numberOrZero(customWeights[factorName] ?? "");
      }, 0),
    [customWeights, selectedFactors, weightMode]
  );
  const isCustomWeightValid = weightMode === "equal" || Math.abs(weightSum - 1) <= 0.0001;
  const selectedOptionClass = "bg-primary/10 border-primary/30 text-primary shadow-[0_0_0_1px_rgba(79,70,229,0.15)]";
  const strategyTypeMissing = !strategyType;
  const symbolMissing = strategyType === "time-series" && selectedSymbolList.length === 0;
  const factorMissing = selectedFactors.length === 0;
  const weightModeMissing = !weightMode;
  const customWeightInvalid = weightMode === "custom" && !isCustomWeightValid;
  const rankMissing = strategyType === "cross-sectional" && !rankValue.trim();
  const aiChatPromptMissing = aiChatPrompt.trim().length === 0;
  const inferredAiScale = inferAiScaleFromPrompt(aiChatPrompt);

  useEffect(() => {
    if (weightMode !== "custom") return;
    setCustomWeights(buildDefaultCustomWeights(selectedFactors));
  }, [weightMode, selectedFactors]);

  const toggleFactor = (factorName: string) => {
    setSelectedFactors((prev) => {
      if (prev.includes(factorName)) {
        const next = prev.filter((item) => item !== factorName);
        setCustomWeights((weights) => {
          const clone = { ...weights };
          delete clone[factorName];
          return clone;
        });
        return next;
      }
      if (prev.length >= MAX_FACTOR_COUNT) {
        toast.error(`You can select up to ${MAX_FACTOR_COUNT} factors.`);
        return prev;
      }
      return [...prev, factorName];
    });
  };

  const setFactorWeight = (factorName: string, value: string) => {
    setCustomWeights((prev) => ({ ...prev, [factorName]: normalizeWeightInput(value) }));
  };

  const toggleMultipleSymbol = (symbol: string) => {
    setMultipleSymbols((prev) => {
      if (prev.includes(symbol)) {
        return prev.filter((item) => item !== symbol);
      }
      return [...prev, symbol];
    });
  };

  const removeSelectedSymbol = (symbol: string) => {
    if (symbol.startsWith("__GROUP__:")) {
      setSelectedSymbolGroup(null);
      return;
    }
    setMultipleSymbols((prev) => prev.filter((item) => item !== symbol));
  };

  const optimizeDescription = () => {
    const symbols = normalizeSymbols(selectedSymbolList);
    const strategyTypeText =
      strategyType === "time-series"
        ? "time-series"
        : strategyType === "cross-sectional"
          ? "cross-sectional"
          : "strategy";
    const weightingText =
      weightMode === "equal"
        ? "equal weights"
        : weightMode === "custom"
          ? "custom weights"
          : "pending weight mode";
    const rankText =
      strategyType === "cross-sectional" ? `Top/Tail ${rankValue || "10"}${rankMode === "percent" ? "%" : ""}` : "N/A";

    setDescription(
      `Build a ${strategyTypeText} strategy with ${selectedFactors.length || 3} factors (${weightingText}), symbols: ${symbols}, side: ${crossDirection}, ranking: ${rankText}, stop loss: ${stopLoss || "8"}%, cooldown: ${cooldownValue || "24"}h.`
    );
    toast.success("Prompt optimized");
  };

  const optimizeAiPrompt = () => {
    const trimmedPrompt = aiChatPrompt.trim();
    if (!trimmedPrompt) {
      setAiChatPrompt(
        "Create a batch of deployable strategies. For each strategy, return: strategy type, factor set (max 5), weight plan, stop-loss threshold, cooldown, and expected execution profile."
      );
    } else {
      setAiChatPrompt(
        `Refine and structure the following strategy request for execution. Keep quant terminology precise and include clear risk controls.\n\n${trimmedPrompt}`
      );
    }
    toast.success("Prompt optimized");
  };

  const handleCreateApiKey = () => {
    const newKey = {
      id: String(Date.now()),
      name: `Agent ${apiKeys.length + 1}`,
      apiKey: generateApiKey(),
      skillVersion: "v2.4.1",
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    setApiKeys((prev) => [...prev, newKey]);
    toast.success("New API key created");
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyApiKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    toast.success("API key copied");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const copyPrompt = (apiKey: string, id: string) => {
    navigator.clipboard.writeText(buildGuidePrompt(apiKey));
    setCopiedPrompt(id);
    toast.success("Prompt copied");
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const validateBeforeSubmit = () => {
    setShowValidationFeedback(true);

    if (platformInputMethod === "ai-chat") {
      setAiChatTouched(true);
      if (aiChatPromptMissing) {
        return false;
      }
      return true;
    }

    if (!strategyType) {
      return false;
    }
    if (!strategyName.trim()) {
      toast.error("Please enter a strategy name.");
      return false;
    }
    if (strategyType === "time-series" && selectedSymbolList.length === 0) {
      return false;
    }
    if (selectedFactors.length === 0) {
      return false;
    }
    if (!weightMode) {
      return false;
    }
    if (weightMode === "custom" && !isCustomWeightValid) {
      return false;
    }
    if (strategyType === "cross-sectional" && !rankValue.trim()) {
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateBeforeSubmit()) return;

    setShowValidationFeedback(false);
    setIsSubmitting(true);
    const isAiChatFlow = platformInputMethod === "ai-chat";
    const creationScale = isAiChatFlow ? inferredAiScale : "single";
    const newStrategyId = `STR-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`;
    const chosenStrategyType = strategyType as StrategyType;
    const chosenWeightMode = weightMode as WeightMode;
    const symbols = normalizeSymbols(selectedSymbolList);
    const factorText = selectedFactors.join("|");
    const customWeightText = selectedFactors
      .map((factorName) => `${factorName}:${customWeights[factorName] || "0"}`)
      .join("|");
    const aiPrompt = aiChatPrompt.trim();

    const queryParams = new URLSearchParams({
      draft: "true",
      name: strategyName.trim(),
      creationMode: "platform",
      scale: creationScale,
      inputMethod: platformInputMethod,
      type: isAiChatFlow ? "N/A" : chosenStrategyType,
      symbols: !isAiChatFlow && chosenStrategyType === "time-series" ? symbols : "N/A",
      factors: isAiChatFlow ? "N/A" : factorText,
      weightMode: isAiChatFlow ? "N/A" : chosenWeightMode,
      weights: isAiChatFlow ? "N/A" : chosenWeightMode === "equal" ? "equal" : customWeightText,
      risk: isAiChatFlow ? "N/A" : `${stopLoss || "8"}%`,
      cooldown: isAiChatFlow ? "N/A" : `${cooldownValue || "24"} hour`,
      sorting: !isAiChatFlow && chosenStrategyType === "cross-sectional" ? `Top/Tail ${rankValue}${rankMode === "percent" ? "%" : ""}` : "N/A",
      direction: !isAiChatFlow && chosenStrategyType === "cross-sectional" ? crossDirection : "N/A",
      objective: isAiChatFlow ? aiPrompt : description.trim() || template.description,
      description: isAiChatFlow ? aiPrompt : description.trim(),
      tags: isAiChatFlow
        ? `AIChat,${creationScale === "batch" ? "BatchCreate" : "SingleCreate"}`
        : [
            chosenStrategyType === "time-series" ? "Time series" : "Cross Section",
            chosenWeightMode === "equal" ? "EqualWeight" : "CustomWeight",
          ].join(","),
    });

    window.setTimeout(() => {
      setIsSubmitting(false);
      toast.success(isAiChatFlow && creationScale === "batch" ? "Batch strategy request created!" : "Strategy created!");
      navigate(`/strategies/${newStrategyId}?${queryParams.toString()}`);
    }, 900);
  };

  return (
    <div ref={formContainerRef} className="space-y-6 min-w-0 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/strategies">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-foreground text-xl font-bold">Create New Strategy</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how you want to create your strategy</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode("platform")}
          className={`relative px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ease-in-out border flex items-center gap-2.5 ${
            mode === "platform"
              ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${mode === "platform" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"}`}>
            <Bot className={`w-3.5 h-3.5 ${mode === "platform" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <span className="text-xs font-semibold text-foreground">Platform Agent</span>
          {mode === "platform" && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
        </button>

        <button
          onClick={() => {
            setMode("own");
            setOwnStep("api");
          }}
          className={`relative px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ease-in-out border flex items-center gap-2.5 ${
            mode === "own"
              ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.2)]"
              : "bg-card border-border hover:border-slate-300 dark:hover:border-slate-600"
          }`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${mode === "own" ? "bg-primary/20" : "bg-slate-200 dark:bg-slate-800"}`}>
            <Code2 className={`w-3.5 h-3.5 ${mode === "own" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <span className="text-xs font-semibold text-foreground">Your Own Agent</span>
          {mode === "own" && <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0" />}
        </button>
      </div>

      {mode === "platform" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-7">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Core Parameters</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">Required</span>
            </div>

            <div className="grid w-full max-w-[300px] grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatformInputMethod("form")}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  platformInputMethod === "form"
                    ? selectedOptionClass
                    : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                Form
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlatformInputMethod("ai-chat");
                  setAiChatTouched(false);
                }}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  platformInputMethod === "ai-chat"
                    ? selectedOptionClass
                    : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                AI Chat
              </button>
            </div>

            <div className={platformInputMethod === "form" ? "space-y-0" : "hidden"}>
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Strategy Type <span className="text-destructive">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStrategyType("time-series")}
                  className={`px-4 py-3 rounded-xl text-left transition-all duration-200 border ${
                    strategyType === "time-series"
                      ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.15)]"
                      : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">Time series</div>
                </button>
                <button
                  type="button"
                  onClick={() => setStrategyType("cross-sectional")}
                  className={`px-4 py-3 rounded-xl text-left transition-all duration-200 border ${
                    strategyType === "cross-sectional"
                      ? "bg-primary/10 border-primary/30 shadow-[0_0_0_1px_rgba(79,70,229,0.15)]"
                      : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">Cross Section</div>
                </button>
              </div>
              {showValidationFeedback && strategyTypeMissing && (
                <p className="text-[11px] text-destructive">Please select a strategy type.</p>
              )}
            </div>

            {strategyType ? (
              <>
                {strategyType === "time-series" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-medium text-muted-foreground">Symbol <span className="text-destructive">*</span></label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSymbolPicker(true)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        showValidationFeedback && symbolMissing
                          ? "border-destructive/70 bg-destructive/5 hover:border-destructive/70"
                          : "border-border bg-accent/50 hover:border-primary/30"
                      }`}
                    >
                      {selectedSymbolList.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              ...(selectedSymbolGroup ? [`__GROUP__:${selectedSymbolGroup}`] : []),
                              ...multipleSymbols,
                            ]
                              .slice(0, 6)
                              .map((symbol) => (
                              <span
                                key={symbol}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeSelectedSymbol(symbol);
                                }}
                                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                              >
                                <span className="truncate max-w-[150px]">
                                  {symbol.startsWith("__GROUP__:")
                                    ? `Group ${SYMBOL_GROUPS.find((item) => item.key === symbol.replace("__GROUP__:", ""))?.label || ""}`
                                    : symbol}
                                </span>
                                <span className="text-primary/70">×</span>
                              </span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Click to choose symbols or add a top group.
                        </div>
                      )}
                    </button>
                    {showValidationFeedback && symbolMissing && (
                      <p className="text-[11px] text-destructive">Please select at least one symbol.</p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground">Alpha Selection <span className="text-destructive">*</span></label>

                  <button
                    type="button"
                    onClick={() => setShowAlphaPicker(true)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                      showValidationFeedback && factorMissing
                        ? "border-destructive/70 bg-destructive/5 hover:border-destructive/70"
                        : "border-border bg-accent/50 hover:border-primary/30"
                    }`}
                  >
                    {selectedFactors.length === 0 ? (
                      <div className="text-xs text-muted-foreground">
                        Click to choose factors from Official Library or My Alphas.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedFactors.slice(0, 6).map((factorName) => (
                          <span
                            key={factorName}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleFactor(factorName);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                          >
                            <span className="truncate max-w-[220px]">{factorName}</span>
                            <span className="text-primary/70">×</span>
                          </span>
                        ))}
                        {selectedFactors.length > 6 && (
                          <span className="inline-flex items-center rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                            +{selectedFactors.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                  {showValidationFeedback && factorMissing && (
                    <p className="text-[11px] text-destructive">Please select at least one factor.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Factor Weights <span className="text-destructive">*</span></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWeightMode("equal")}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                        weightMode === "equal"
                          ? selectedOptionClass
                          : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      Equal Weight
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightMode("custom")}
                      className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                        weightMode === "custom"
                          ? selectedOptionClass
                          : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      Custom Weight
                    </button>
                  </div>
                  {showValidationFeedback && weightModeMissing && (
                    <p className="text-[11px] text-destructive">Please choose a factor weight mode.</p>
                  )}

                  {weightMode === "custom" && (
                    <div className="space-y-2">
                      {selectedFactors.map((factorName) => (
                        <div key={factorName} className="grid grid-cols-[1fr_120px] gap-2">
                          <div className="h-9 rounded-lg border border-border/60 bg-background/30 px-3 flex items-center text-xs text-muted-foreground truncate">
                            {factorName}
                          </div>
                          <Input
                            value={customWeights[factorName] ?? ""}
                            onChange={(e) => setFactorWeight(factorName, e.target.value)}
                            className="h-9 rounded-lg bg-accent border-border text-sm"
                            placeholder="0.20"
                          />
                        </div>
                      ))}
                      <p className={`text-[10px] ${isCustomWeightValid ? "text-emerald-400" : "text-destructive"}`}>
                        Weight sum: {weightSum.toFixed(2)} {isCustomWeightValid ? "(valid)" : "(must be 1.00)"}
                      </p>
                      {showValidationFeedback && customWeightInvalid && (
                        <p className="text-[11px] text-destructive">Custom weights must sum to 1.00.</p>
                      )}
                    </div>
                  )}
                </div>

                {strategyType === "cross-sectional" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Strategy Side <span className="text-destructive">*</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { value: "long", label: "Long Only" },
                          { value: "short", label: "Short Only" },
                          { value: "neutral", label: "Neutral" },
                        ] as const).map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setCrossDirection(item.value)}
                            className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                              crossDirection === item.value
                                ? selectedOptionClass
                                : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Top/Tail Rule <span className="text-destructive">*</span></label>
                      <div className="grid w-full max-w-[360px] grid-cols-[1fr_120px] gap-2">
                        <Input
                          value={rankValue}
                          onChange={(e) => setRankValue(e.target.value)}
                          className="h-9 rounded-lg bg-accent border-border text-sm"
                          placeholder={rankMode === "n" ? "5" : "10"}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setRankMode("n")}
                            className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                              rankMode === "n"
                                ? selectedOptionClass
                                : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            N
                          </button>
                          <button
                            type="button"
                            onClick={() => setRankMode("percent")}
                            className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                              rankMode === "percent"
                                ? selectedOptionClass
                                : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                            }`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                      {showValidationFeedback && rankMissing && (
                        <p className="text-[11px] text-destructive">Please enter a Top/Tail value.</p>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Stop Loss (%) <span className="text-destructive">*</span></label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Stop loss notes"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground hover:border-border"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="top" className="w-[340px] border-border bg-card p-3">
                          <div className="space-y-2.5 text-[11px] leading-5">
                            <p className="text-xs font-semibold text-foreground">Stop Loss Notes</p>
                            <p className="text-muted-foreground">
                              When unrealized portfolio drawdown reaches this threshold, all positions are force-closed and the strategy enters cooldown.
                            </p>
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-medium text-foreground/90">Parameter guide:</p>
                              <p className="text-muted-foreground">0%-10%: conservative risk cap</p>
                              <p className="text-muted-foreground">10%-20%: baseline default range</p>
                              <p className="text-muted-foreground">30%-100%: high-risk tolerance</p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="h-10 w-full max-w-[320px] rounded-lg bg-accent border-border text-sm"
                      placeholder="8"
                      inputMode="decimal"
                    />
                    <div className="flex flex-wrap gap-2">
                      {["5", "8", "10"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStopLoss(value)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            stopLoss === value
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {value}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">Cooldown (hours) <span className="text-destructive">*</span></label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label="Cooldown notes"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground hover:border-border"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="top" className="w-[340px] border-border bg-card p-3">
                          <div className="space-y-2.5 text-[11px] leading-5">
                            <p className="text-xs font-semibold text-foreground">Cooldown Notes</p>
                            <p className="text-muted-foreground">
                              After a stop-out is triggered, the strategy waits for the configured cooldown window before allowing re-entry.
                            </p>
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-medium text-foreground/90">Parameter guide:</p>
                              <p className="text-muted-foreground">1-2h: short cooldown, fast recovery (high-frequency strategies)</p>
                              <p className="text-muted-foreground">4-6h: balanced default for most intraday setups</p>
                              <p className="text-muted-foreground">12-24h: long cooldown for daily-timeframe strategies</p>
                              <p className="text-muted-foreground">48-72h: very long cooldown after major drawdown events</p>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Input
                      value={cooldownValue}
                      onChange={(e) => setCooldownValue(e.target.value)}
                      className="h-10 w-full max-w-[320px] rounded-lg bg-accent border-border text-sm"
                      placeholder="4"
                      inputMode="numeric"
                    />
                    <div className="flex flex-wrap gap-2">
                      {["1", "2", "4", "6", "12", "24", "48", "72"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCooldownValue(value)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            cooldownValue === value
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {value}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            </div>

            {platformInputMethod === "ai-chat" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-medium text-muted-foreground">AI Chat Prompt <span className="text-destructive">*</span></label>
                  <button
                    type="button"
                    onClick={optimizeAiPrompt}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/30"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Optimize Prompt
                  </button>
                </div>
                <Textarea
                  value={aiChatPrompt}
                  onChange={(e) => setAiChatPrompt(e.target.value)}
                  onBlur={() => setAiChatTouched(true)}
                  placeholder="Describe your strategy request in natural language. You can include multiple strategy blocks in one prompt for batch creation."
                  rows={8}
                  className="rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 resize-none"
                />
                {(showValidationFeedback || aiChatTouched) && aiChatPromptMissing && (
                  <p className="text-[11px] text-destructive">Please enter a prompt for AI chat strategy creation.</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  AI Chat mode supports batch strategy creation. Add multiple strategy instructions in one prompt to trigger batch output.
                </p>
              </div>
            )}
          </div>

          {platformInputMethod === "form" && strategyType && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptionalFields((prev) => !prev)}
              className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left transition-colors duration-200 hover:bg-accent/60"
            >
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Optional</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">Optional</span>
              </div>
              {showOptionalFields ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showOptionalFields && (
              <div className="px-6 pb-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Strategy Name</label>
                  <Input
                    placeholder="System default will be filled"
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    className="rounded-lg bg-accent border-border h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-medium text-muted-foreground">Supplementary Description</label>
                    <button
                      type="button"
                      onClick={optimizeDescription}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary transition-all duration-200 hover:bg-primary/15 hover:border-primary/30"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Optimize Prompt
                    </button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add extra constraints, interpretation notes, or any follow-up details here..."
                    rows={5}
                    className="rounded-xl bg-accent border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200 resize-none"
                  />
                </div>
                </div>
              )}
            </div>
          )}

          {(platformInputMethod === "ai-chat" || strategyType) && (
            <div className="flex items-center justify-between pt-2">
            <div />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out ${
                !isSubmitting
                  ? "bg-primary text-primary-foreground hover:brightness-110 hover:-translate-y-0.5 cursor-pointer"
                  : "bg-accent text-muted-foreground border border-border cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  {platformInputMethod === "ai-chat" && inferredAiScale === "batch" ? "Create Strategies" : "Create Strategy"}
                </>
              )}
            </button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={showSymbolPicker}
        onOpenChange={(open) => {
          setShowSymbolPicker(open);
          if (!open) setSymbolPickerQuery("");
        }}
      >
        <DialogContent
          className="sm:max-w-2xl border-border bg-card"
          style={dialogAnchorX ? { left: `${dialogAnchorX}px` } : undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Symbol Selector</DialogTitle>
            <DialogDescription>
              Individual selection and group selection are organized in tabs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              value={symbolPickerQuery}
              onChange={(e) => setSymbolPickerQuery(e.target.value)}
              placeholder="Search symbol..."
              className="h-8 rounded-md border-border/70 bg-background/30 text-xs placeholder:text-[11px]"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSymbolPickerTab("individual")}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  symbolPickerTab === "individual"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setSymbolPickerTab("group")}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  symbolPickerTab === "group"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                Group
              </button>
            </div>

            {symbolPickerTab === "individual" && (
              <>
                <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
                  {filteredSymbolPool.map((symbol) => {
                    const selected = multipleSymbols.includes(symbol);
                    return (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => toggleMultipleSymbol(symbol)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-left transition-all ${
                          selected
                            ? "border-primary/30 bg-primary/10"
                            : "border-border bg-background/30 hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{symbol}</span>
                          <span className={`text-xs ${selected ? "text-primary" : "text-muted-foreground"}`}>
                            {selected ? "Selected" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {symbolPickerTab === "group" && (
              <div className="space-y-2">
                {SYMBOL_GROUPS.map((group) => {
                  const selected = selectedSymbolGroup === group.key;
                  const groupSymbols = getGroupSymbols(group.key);
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setSelectedSymbolGroup((prev) => (prev === group.key ? null : group.key))}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                        selected
                          ? "border-primary/30 bg-primary/10"
                          : "border-border bg-background/30 hover:border-primary/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{group.label}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {groupSymbols.length} symbols · {groupSymbols.slice(0, 4).join(", ")}
                          </div>
                        </div>
                        <span className={`text-xs ${selected ? "text-primary" : "text-muted-foreground"}`}>
                          {selected ? "Selected" : "Select"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowSymbolPicker(false)}
              className="h-9 rounded-full border border-border bg-transparent px-4 text-xs font-medium text-foreground hover:bg-accent"
            >
              Done ({selectedSymbolList.length})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAlphaPicker}
        onOpenChange={(open) => {
          setShowAlphaPicker(open);
          if (!open) setAlphaPickerQuery("");
        }}
      >
        <DialogContent
          className="sm:max-w-2xl border-border bg-card"
          style={dialogAnchorX ? { left: `${dialogAnchorX}px` } : undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Alpha Selection</DialogTitle>
            <DialogDescription>
              Select up to {MAX_FACTOR_COUNT} factors from Official Library or My Alphas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              value={alphaPickerQuery}
              onChange={(e) => setAlphaPickerQuery(e.target.value)}
              placeholder="Search by name / id / tag..."
              className="h-8 rounded-md border-border/70 bg-background/30 text-xs placeholder:text-[11px]"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAlphaSourceTab("official");
                  setOfficialPrimaryCategory("favorites");
                  setOfficialSubcategory("favorites");
                }}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  alphaSourceTab === "official"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                Official Library ({officialAlphaPool.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setAlphaSourceTab("my");
                  setMyAlphaCategory("all");
                }}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  alphaSourceTab === "my"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-accent text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                My Alphas ({myAlphaPool.length})
              </button>
            </div>
            {alphaSourceTab === "official" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[230px_1fr]">
                <div className="max-h-[360px] overflow-auto rounded-xl border border-border/70 bg-background/35 p-3">
                  <div className="space-y-3">
                    {(
                      Object.entries(OFFICIAL_LIBRARY_GROUPS) as Array<
                        [OfficialPrimaryCategory, (typeof OFFICIAL_LIBRARY_GROUPS)[OfficialPrimaryCategory]]
                      >
                    ).map(([key, group]) => (
                      <div key={key} className="space-y-1.5">
                        <div className="px-1 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
                          {group.label}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => {
                            const isActive =
                              officialPrimaryCategory === key && officialSubcategory === item.id;
                            return (
                              <button
                                key={`${key}-${item.id}`}
                                type="button"
                                onClick={() => {
                                  setOfficialPrimaryCategory(key);
                                  setOfficialSubcategory(item.id);
                                }}
                                className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                                  isActive
                                    ? "bg-primary/12 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto space-y-2 pr-1">
                  {filteredAlphaPool.length === 0 && (
                    <div className="rounded-xl border border-border/70 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                      No factors found.
                    </div>
                  )}

                  {filteredAlphaPool.map((factor) => {
                    const selected = selectedFactors.includes(factor.name);
                    const reachedLimit = selectedFactors.length >= MAX_FACTOR_COUNT && !selected;
                    const officialCategory = getOfficialFactorCategory(factor);

                    return (
                      <button
                        key={`${alphaSourceTab}-${factor.id}`}
                        type="button"
                        disabled={reachedLimit}
                        onClick={() => toggleFactor(factor.name)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                          selected
                            ? "border-primary/30 bg-primary/10"
                            : reachedLimit
                              ? "cursor-not-allowed border-border/50 bg-background/20 opacity-55"
                              : "border-border bg-background/30 hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">{factor.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">{factor.id}</span>
                              <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                {getSourceLabel(alphaSourceTab, factor)}
                              </span>
                              <span className="rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-[10px] text-primary/90">
                                {officialCategory.subcategoryLabel}
                              </span>
                              <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                OS Sharpe {factor.osSharpe.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <span className={`mt-0.5 text-xs font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}>
                            {selected ? "Selected" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[230px_1fr]">
                <div className="max-h-[360px] overflow-auto rounded-xl border border-border/70 bg-background/35 p-3">
                  <div className="space-y-3">
                    {(
                      Object.entries(MY_ALPHA_GROUPS) as Array<
                        [keyof typeof MY_ALPHA_GROUPS, (typeof MY_ALPHA_GROUPS)[keyof typeof MY_ALPHA_GROUPS]]
                      >
                    ).map(([key, group]) => (
                      <div key={key} className="space-y-1.5">
                        <div className="px-1 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
                          {group.label}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setMyAlphaCategory(item.id as MyAlphaCategory)}
                              className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                                myAlphaCategory === item.id
                                  ? "bg-primary/12 text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="max-h-[360px] overflow-auto space-y-2 pr-1">
                  {filteredAlphaPool.length === 0 && (
                    <div className="rounded-xl border border-border/70 bg-background/40 px-4 py-8 text-center text-sm text-muted-foreground">
                      No factors found.
                    </div>
                  )}

                  {filteredAlphaPool.map((factor) => {
                    const selected = selectedFactors.includes(factor.name);
                    const reachedLimit = selectedFactors.length >= MAX_FACTOR_COUNT && !selected;

                    return (
                      <button
                        key={`${alphaSourceTab}-${factor.id}`}
                        type="button"
                        disabled={reachedLimit}
                        onClick={() => toggleFactor(factor.name)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                          selected
                            ? "border-primary/30 bg-primary/10"
                            : reachedLimit
                              ? "cursor-not-allowed border-border/50 bg-background/20 opacity-55"
                              : "border-border bg-background/30 hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">{factor.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono text-muted-foreground">{factor.id}</span>
                              <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                {getSourceLabel(alphaSourceTab, factor)}
                              </span>
                              <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                OS Sharpe {factor.osSharpe.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <span className={`mt-0.5 text-xs font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}>
                            {selected ? "Selected" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowAlphaPicker(false)}
              className="h-9 rounded-full border border-border bg-transparent px-4 text-xs font-medium text-foreground hover:bg-accent"
            >
              Done ({selectedFactors.length}/{MAX_FACTOR_COUNT})
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mode === "own" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-1 p-1 rounded-2xl w-fit bg-accent border border-border">
            <button
              onClick={() => setOwnStep("api")}
              className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
                ownStep === "api"
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Agent API & Skill
              </div>
            </button>
            <button
              onClick={() => setOwnStep("first-run")}
              className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
                ownStep === "first-run"
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5" />
                First Run
              </div>
            </button>
          </div>

          {ownStep === "api" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-6 py-4 pb-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      <span className="text-base font-semibold text-foreground">Agent API</span>
                      <span className="text-xs text-muted-foreground ml-1">({apiKeys.length})</span>
                    </div>
                    <button
                      className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 font-medium"
                      onClick={handleCreateApiKey}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      New API Key
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {apiKeys.length === 0 ? (
                    <div className="text-center py-12">
                      <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No API keys yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Create your first API key to connect your AI agent</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border border-border bg-accent/50 hover:border-primary/20 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                            <button
                              onClick={() => copyPrompt(item.apiKey, item.id)}
                              className={`h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border ${
                                item.skillVersion !== SKILL_LATEST
                                  ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                  : "border-primary/20 text-primary hover:bg-primary/10"
                              }`}
                            >
                              {copiedPrompt === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedPrompt === item.id ? "Copied" : item.skillVersion !== SKILL_LATEST ? "Copy Latest Prompt" : "Copy Prompt"}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-14 shrink-0">API Key</span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/60 flex-1 min-w-0">
                              <code className="font-mono text-xs text-primary truncate flex-1">
                                {visibleKeys.has(item.id) ? item.apiKey : item.apiKey.slice(0, 6) + "\u2022".repeat(16) + "..."}
                              </code>
                              <button onClick={() => toggleKeyVisibility(item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                {visibleKeys.has(item.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              <button onClick={() => copyApiKey(item.apiKey, item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                {copiedKey === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <span className="uppercase tracking-wider font-medium">Skill</span>
                              <span className="text-primary font-semibold">{item.skillVersion}</span>
                              {item.skillVersion !== SKILL_LATEST && (
                                <span className="text-amber-500 ml-0.5">(update available: {SKILL_LATEST})</span>
                              )}
                            </span>
                            <span className="border-l border-border pl-4">Updated {item.updatedAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {ownStep === "first-run" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">First Run</h2>
                  <p className="text-xs text-muted-foreground">
                    Try these example prompts in your AI coding agent to test the Otter skill.
                  </p>
                </div>

                <div className="space-y-4">
                  {FIRST_RUN_PROMPTS.map((item) => (
                    <div key={item.category} className="p-5 rounded-xl border border-border bg-accent hover:border-primary/30 transition-all duration-200 ease-in-out">
                      <div className="flex items-center gap-2 mb-3">
                        <Rocket className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 mb-3">
                        <pre className="p-4 pr-12 text-xs font-mono leading-relaxed overflow-x-auto text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {item.prompt}
                        </pre>
                        <button
                          onClick={() => copyCode(item.prompt, item.category)}
                          className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg border transition-all duration-200 ease-in-out ${
                            copiedCode === item.category
                              ? "border-emerald-500/30 text-emerald-500 bg-slate-200 dark:bg-slate-800"
                              : "border-slate-300 dark:border-slate-700 text-slate-500 bg-slate-200 dark:bg-slate-800 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {copiedCode === item.category ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-primary/5 text-primary border border-primary/20">
                  <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Tip: You can modify these prompts or create your own. The skill supports natural language instructions for all Otter platform operations.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === null && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-2xl bg-accent border border-border flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Select a mode above to get started</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Platform Agent for guided creation, or Your Own Agent for API integration</p>
        </div>
      )}
    </div>
  );
}
