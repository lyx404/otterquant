import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Claude, Codex, OpenAI, OpenClaw, OpenRouter } from "@lobehub/icons";
import { Link, useLocation } from "wouter";
import { Select } from "animal-island-ui";
import "animal-island-ui/style";
import type { SelectOption } from "animal-island-ui";
import AlphaDetail from "@/pages/AlphaDetail";
import BorderGlow from "@/components/ui/border-glow-card";
import { GameHudStats } from "@/components/GameHudStats";
import { useGameWalletModal } from "@/components/GameWalletModalHost";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  ClipboardList,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Key,
  Languages,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Trash2,
  User,
  Users,
  Wallet,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { factors, getAlphaGrade, strategies, type AlphaGrade, type Factor } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { AlphaViewModeProvider } from "@/contexts/AlphaViewModeContext";
import { useGameEconomy } from "@/contexts/GameEconomyContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import disconnectedBasketUrl from "@/assets/disconnected-basket.svg";
import noticeIconUrl from "@/assets/notice.svg";
import {
  BALANCE_PER_USD,
  HUD_ASSETS,
} from "@/lib/gameWallet";

const filterOptions = ["all", "starred"] as const;
type FilterKey = (typeof filterOptions)[number];
type StrategySortKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type SortDir = "asc" | "desc" | null;
const curveRanges = ["7D", "30D", "90D", "365D"] as const;
type CurveRange = (typeof curveRanges)[number];
const factorFilterOptions = ["all", "starred"] as const;
type FactorFilterKey = (typeof factorFilterOptions)[number];
const inventoryGradeFilterOptions = ["all", "SSS", "SS", "S", "A", "B", "C", "D", "misc"] as const;
type InventoryGradeFilter = (typeof inventoryGradeFilterOptions)[number];
type FactorSortKey =
  | "createdAt"
  | "grade"
  | "rewardAmount"
  | "sharpe"
  | "osSharpe"
  | "returns"
  | "drawdown"
  | "turnover"
  | "fitness";
type FactorRow = Factor & {
  submissionStatus: "passed" | "failed";
  grade: AlphaGrade;
  rewardAmount: number;
};
type InventoryVisualGrade = "SSS" | "SS" | "S" | "A" | "B" | "C" | "D";
type InventorySpecialType = "prop" | "misc";
type AgentInstallIde = "claude-code" | "vs-code" | "cursor" | "windsurf" | "cline";
type InventorySpecialCard = {
  id: string;
  type: InventorySpecialType;
  nameEn: string;
  nameZh: string;
  tagEn: string;
  tagZh: string;
  metricOneLabelEn: string;
  metricOneLabel: string;
  metricOneValueEn?: string;
  metricOneValue: string;
  metricTwoLabelEn?: string;
  metricTwoLabel: string;
  metricTwoValueEn?: string;
  metricTwoValue: string;
  imageSrc?: string;
  statsLayout?: "inline";
};
type PendingInventoryDelete =
  | { kind: "factor"; id: string; label: string }
  | { kind: "item"; id: string; label: string }
  | null;
type InventoryToast = {
  id: number;
  title: string;
  message: string;
} | null;
type BasketEmptyToast = {
  id: number;
  message: string;
} | null;
type LeaderboardPeriod = "week" | "month";
type LeaderboardEntry = {
  id: string;
  nickname: string;
  weekBalance: number;
  monthBalance: number;
  weekCasts: number;
  monthCasts: number;
};
type GameVersionMode = "normal" | "mvp";
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
] as const;
type BasketBadgeMode = "hidden" | "one" | "five" | "eight" | "ten" | "thirteen" | "overflow";
const BASKET_BADGE_MODES: BasketBadgeMode[] = ["hidden", "one", "five", "eight", "ten", "thirteen", "overflow"];
const BASKET_BADGE_VALUES: Record<BasketBadgeMode, number> = {
  hidden: 0,
  one: 1,
  five: 5,
  eight: 8,
  ten: 10,
  thirteen: 13,
  overflow: 100,
};
const BASKET_BADGE_LABELS: Record<BasketBadgeMode, string> = {
  hidden: "hidden",
  one: "1",
  five: "5",
  eight: "8",
  ten: "10",
  thirteen: "13",
  overflow: "99+",
};
const BASKET_BADGE_LABELS_ZH: Record<BasketBadgeMode, string> = {
  ...BASKET_BADGE_LABELS,
  hidden: "隐藏",
};
type BasketRewardModalPage = "first" | "last";
type BasketRewardCardKind = "sss" | "a" | "b";
type BasketRewardCard = {
  kind: BasketRewardCardKind;
  image: string;
};
const BASKET_REWARD_ASSETS = {
  titleStarLeft: "/assets/basket-reward/title-star-left.svg",
  titleStarRight: "/assets/basket-reward/title-star-right.svg",
  cardArtBg: "/assets/basket-reward/sss-card-shape.svg",
  cardArtMask: "/assets/basket-reward/sss-card-mask.svg",
  cardRays: "/assets/basket-reward/sss-card-rays.svg",
  seahorse: "/assets/basket-reward/sss-seahorse.svg",
  backgroundOneRow: "/assets/basket-reward/background-one-row.svg",
  backgroundTwoRow: "/assets/basket-reward/background-two-row.svg",
  pagePrev: "/assets/basket-reward/page-prev.svg",
  pageNext: "/assets/basket-reward/page-next.svg",
};
const BASKET_REWARD_CARD_IMAGES: Record<BasketRewardCardKind, string[]> = {
  sss: ["/assets/basket-reward/card-sss.svg"],
  a: [
    "/assets/basket-reward/card-a.svg",
    "/assets/basket-reward/card-a-1.svg",
    "/assets/basket-reward/card-a-2.svg",
    "/assets/basket-reward/card-a-3.svg",
    "/assets/basket-reward/card-a-4.svg",
    "/assets/basket-reward/card-a-5.svg",
  ],
  b: [
    "/assets/basket-reward/card-b.svg",
    "/assets/basket-reward/card-b-1.svg",
    "/assets/basket-reward/card-b-2.svg",
    "/assets/basket-reward/card-b-3.svg",
    "/assets/basket-reward/card-b-4.svg",
    "/assets/basket-reward/card-b-5.svg",
  ],
};
const BASKET_REWARD_CARD_COPY: Record<
  BasketRewardCardKind,
  { tier: string; serial: string; name: string; sharp: string; roi: string }
> = {
  sss: { tier: "SSS", serial: "NO.3789", name: "粉色海马", sharp: "1.78", roi: "+22.9%" },
  a: { tier: "A", serial: "NO.2716", name: "鎏金鱼", sharp: "1.42", roi: "+16.8%" },
  b: { tier: "B", serial: "NO.1035", name: "七彩神仙鱼", sharp: "1.16", roi: "+8.6%" },
};

function getBasketRewardCardImage(kind: BasketRewardCardKind, occurrence: number) {
  const images = BASKET_REWARD_CARD_IMAGES[kind];
  return images[occurrence % images.length];
}

function makeBasketRewardCards(
  kinds: BasketRewardCardKind[],
  startOccurrences: Partial<Record<BasketRewardCardKind, number>> = {}
) {
  const occurrences: Record<BasketRewardCardKind, number> = {
    sss: startOccurrences.sss ?? 0,
    a: startOccurrences.a ?? 0,
    b: startOccurrences.b ?? 0,
  };
  return kinds.map((kind) => {
    const image = getBasketRewardCardImage(kind, occurrences[kind]);
    occurrences[kind] += 1;
    return { kind, image };
  });
}

function getBasketRewardCards(count: number, page: BasketRewardModalPage, isMobileLayout = false): BasketRewardCard[] {
  if (count <= 1) return makeBasketRewardCards(["sss"]);
  if (count === 5) return makeBasketRewardCards(["sss", "a", "b", "b", "b"]);
  if (count === 8) return makeBasketRewardCards(["sss", "a", "a", "a", "a", "b", "b", "b"]);
  if (isMobileLayout && count > 9) {
    if (page === "first") return makeBasketRewardCards(["sss", "a", "a", "a", "a", "a", "a", "b", "b"]);

    const remainingCount = Math.min(9, count - 9);
    return makeBasketRewardCards(Array.from({ length: remainingCount }, () => "b"), { b: 2 });
  }
  if (count === 10 || page === "first") {
    return makeBasketRewardCards(["sss", "a", "a", "a", "a", "a", "a", "b", "b", "b"]);
  }
  return makeBasketRewardCards(["b", "b", "b"], { b: 3 });
}

type TestScenarioPanelState = "expanded" | "collapsed";
type InventoryScenarioMode = "multiple" | "empty" | "single";
type WalletDataScenarioMode = "empty" | "filled";
const DEFAULT_TEST_COIN_BALANCE = 100000;
const MAX_TEST_COIN_BALANCE = 999999999;
const DEFAULT_TEST_CASH_BALANCE = 99.9;
const MAX_TEST_CASH_BALANCE = 9999999.9;
type TestScenarioPanelPosition = {
  left: number;
  top: number;
};
type TestScenarioPanelDragState = TestScenarioPanelPosition & {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  panelWidth: number;
  panelHeight: number;
};

const MIN_AUTO_CAST_COUNT = 1;
const MAX_AUTO_CAST_COUNT = 100;
const GAME_STAGE_WIDTH = 1902;
const GAME_STAGE_HEIGHT = 1080;
const GAME_STAGE_ASPECT = GAME_STAGE_WIDTH / GAME_STAGE_HEIGHT;
const TEST_SCENARIO_PANEL_DEFAULT_POSITION: TestScenarioPanelPosition = { left: 34, top: 124 };
const FREE_TRIAL_CAST_LIMIT = 5;
const AUTO_CAST_SINGLE_MIN_SECONDS = 10;
const AUTO_CAST_SINGLE_MAX_SECONDS = 30;
const RANKING_MODAL_ASSETS = {
  watermark: "/assets/ranking-modal/watermark-full.png",
  coin: "/assets/ranking-modal/coin.svg",
  mascotWeek: "/assets/ranking-modal/mascot.png",
  mascotMonth: "/assets/ranking-modal/mascot-month.png",
  rank1: "/assets/ranking-modal/rank-1.svg",
  rank2: "/assets/ranking-modal/rank-2.svg",
  rank3: "/assets/ranking-modal/rank-3.svg",
} as const;

const CURRENT_LEADERBOARD_USER_ID = "current-user";
const leaderboardSeedEntries: LeaderboardEntry[] = [
  { id: "angler-01", nickname: "LakeQuant", weekBalance: 182.45, monthBalance: 738.2, weekCasts: 42, monthCasts: 168 },
  { id: "angler-02", nickname: "鲸鱼信号", weekBalance: 245.8, monthBalance: 612.75, weekCasts: 37, monthCasts: 146 },
  { id: "angler-03", nickname: "AlphaCat", weekBalance: 156.3, monthBalance: 881.9, weekCasts: 31, monthCasts: 174 },
  { id: "angler-04", nickname: "Moon Fisher", weekBalance: 118.6, monthBalance: 502.4, weekCasts: 29, monthCasts: 132 },
  { id: "angler-05", nickname: "因子猎手", weekBalance: 96.25, monthBalance: 455.1, weekCasts: 24, monthCasts: 109 },
  { id: "angler-06", nickname: "CEX Otter", weekBalance: 82.5, monthBalance: 390.3, weekCasts: 21, monthCasts: 96 },
  { id: "angler-07", nickname: "River Bot", weekBalance: 75.15, monthBalance: 318.65, weekCasts: 19, monthCasts: 82 },
  { id: "angler-08", nickname: "小满仓", weekBalance: 61.9, monthBalance: 286.45, weekCasts: 17, monthCasts: 77 },
  { id: CURRENT_LEADERBOARD_USER_ID, nickname: "捕鱼大师", weekBalance: 38.5, monthBalance: 900, weekCasts: 12, monthCasts: 188 },
];
const leaderboardGeneratedNames = [
  "QuantNami", "River Alpha", "蓝鲸策略", "Beta Fisher", "Coral Signal", "星潮猎手", "Delta Hook", "WaveBot",
  "Pixel Trader", "海盐因子", "North Lake", "K线水手", "Signal Bay", "Otter Desk", "潮汐量化", "Sunny Cast",
];
const leaderboardEntries: LeaderboardEntry[] = [
  ...leaderboardSeedEntries,
  ...Array.from({ length: 56 }, (_, index) => {
    const name = leaderboardGeneratedNames[index % leaderboardGeneratedNames.length];
    const weekBalance = Math.max(42, 224 - index * 3.18 + (index % 5) * 0.42);
    const monthBalance = Math.max(245, 910 - index * 11.6 + (index % 7) * 2.15);
    return {
      id: `angler-auto-${index + 1}`,
      nickname: `${name}${index + 1}`,
      weekBalance: Number(weekBalance.toFixed(2)),
      monthBalance: Number(monthBalance.toFixed(2)),
      weekCasts: Math.max(14, 54 - Math.floor(index * 0.7)),
      monthCasts: Math.max(62, 210 - Math.floor(index * 2.4)),
    };
  }),
];
type AgentProviderIcon = "codex" | "claude" | "openclaw" | "openrouter";
type AgentProviderAvailability = "available" | "unavailable" | "outdated";
type AgentAuthPreviewProviderId = "codex" | "claude-code" | "openclaw";
type AgentConnectableProvider = {
  id: "codex" | "openrouter" | "claude-code" | "openclaw";
  name: string;
  mark: string;
  icon?: AgentProviderIcon;
  modes: ("web" | "agent")[];
};
type AgentProviderId = AgentConnectableProvider["id"];
const agentConnectableProviders: readonly AgentConnectableProvider[] = [
  { id: "codex",      name: "Codex",       mark: "C",  icon: "codex",    modes: ["web", "agent"] },
  { id: "openrouter", name: "OpenRouter",  mark: "OR", icon: "openrouter", modes: ["web"] },
  { id: "claude-code",name: "Claude Code", mark: "C",  icon: "claude",   modes: ["agent"] },
  { id: "openclaw",   name: "OpenClaw",    mark: "O",  icon: "openclaw", modes: ["agent"] },
];
const agentAuthPreviewProviderIds: readonly AgentAuthPreviewProviderId[] = ["codex", "claude-code", "openclaw"];
const initialAgentProviderAvailabilityById: Partial<Record<AgentProviderId, AgentProviderAvailability>> = {
  "claude-code": "outdated",
  openclaw: "unavailable",
};
type AgentApiKeyItem = {
  id: string;
  name: string;
  apiKey: string;
  skillVersion: string;
  createdAt: string;
  updatedAt: string;
};
type GameStageLayout = {
  scale: number;
  mode: "contain" | "cover";
  safeLeft: number;
  safeTop: number;
  visibleWidth: number;
  visibleHeight: number;
};
const isMobileViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;
const AGENT_SKILL_LATEST = "v2.4.1";
const AGENT_MANUAL_SOURCE = "varsity-tech-product/factor-mining-demo";
const AGENT_MANUAL_GIT_REF = "main";
const AGENT_MANUAL_PROMPT =
  "Use the Factor Mining Demo plugin. Verify Factor Mining status, then show me the Factor Mining public task list. Do not create a session until I choose a public task or provide a custom idea. Then write a valid plugin.py locally, upload it, wait for the backtest, fetch the default factor card if available, and summarize the result.";
const initialAgentApiKeys: AgentApiKeyItem[] = [
  {
    id: "1",
    name: "My Trading Bot",
    apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h",
    skillVersion: "v2.4.1",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-28",
  },
  {
    id: "2",
    name: "Research Agent",
    apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE",
    skillVersion: "v2.3.0",
    createdAt: "2026-02-15",
    updatedAt: "2026-03-15",
  },
];
const agentInstallIdeOptions: {
  id: AgentInstallIde;
  label: string;
  command: (apiKey: string) => string;
  verifyCommand: string;
}[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    command: (apiKey) => `claude mcp add quandora --scope user --env API_KEY="${apiKey}" -- https://api.quandora.trade/v1/mcp`,
    verifyCommand: "claude mcp list",
  },
  {
    id: "vs-code",
    label: "VS Code",
    command: (apiKey) => `code --add-mcp '{"name":"quandora","url":"https://api.quandora.trade/v1/mcp","env":{"API_KEY":"${apiKey}"}}'`,
    verifyCommand: "code --list-extensions",
  },
  {
    id: "cursor",
    label: "Cursor",
    command: (apiKey) => `cursor --add-mcp '{"name":"quandora","url":"https://api.quandora.trade/v1/mcp","env":{"API_KEY":"${apiKey}"}}'`,
    verifyCommand: "cursor --version",
  },
  {
    id: "windsurf",
    label: "Windsurf",
    command: (apiKey) => `windsurf --add-mcp '{"name":"quandora","url":"https://api.quandora.trade/v1/mcp","env":{"API_KEY":"${apiKey}"}}'`,
    verifyCommand: "windsurf --version",
  },
  {
    id: "cline",
    label: "Cline",
    command: (apiKey) => `cline mcp add quandora --env API_KEY="${apiKey}" --url https://api.quandora.trade/v1/mcp`,
    verifyCommand: "cline mcp list",
  },
];

const createAgentApiSecret = () => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return `ot_sk_${Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")}`;
};

const buildAgentSkillPrompt = (apiKey: string, skillVersion: string) => `# Quandora Trading Skill Configuration

## API Key
\`${apiKey}\`

## Skill Version
${skillVersion}

## Setup Instructions
Paste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Quandora Trading capabilities.

Your agent will be able to:
- Mine and backtest alpha factors automatically
- Access real-time market data (CEX & DEX)
- Submit strategies to the Quandora Arena
- Monitor portfolio performance

## Connection Endpoint
https://api.quandora.trade/v1/agent

## Authentication
Include the API key in your agent's system prompt or environment configuration. The agent will automatically authenticate when making requests.`;

const inventorySpecialCards: InventorySpecialCard[] = [
  {
    id: "ITEM-MISC-001",
    type: "misc",
    nameEn: "Lake Shell",
    nameZh: "湖畔贝壳",
    tagEn: "Misc",
    tagZh: "特朗普的假发",
    metricOneLabelEn: "Average wind resistance",
    metricOneLabel: "防风性能一般",
    metricOneValueEn: "",
    metricOneValue: "",
    metricTwoLabelEn: "",
    metricTwoLabel: "",
    metricTwoValueEn: "",
    metricTwoValue: "",
    imageSrc: "/assets/trump-wig.svg",
    statsLayout: "inline",
  },
];

function parseMetricValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsed = Number(value.replace(/[%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDefaultStrategySortDir(key: StrategySortKey): Exclude<SortDir, null> {
  return key === "maxDrawdown" ? "asc" : "desc";
}

function getStrategyTier(strategy: (typeof strategies)[number]): "official" | "graduated" {
  return strategy.author.toLowerCase().includes("quandora") ? "official" : "graduated";
}

const factorGradeOrder: Record<InventoryVisualGrade, number> = {
  SSS: 7,
  SS: 6,
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};
const factorRewardByGrade: Record<AlphaGrade, number> = {
  SS: 1,
  S: 1,
  A: 0.5,
  B: 0.3,
  C: 0.2,
  D: 0.1,
  F: 0,
};

function getInventoryVisualGrade(factor: FactorRow): InventoryVisualGrade {
  const legacyVisualGrade: AlphaGrade = factor.grade;
  const visualGradeMap: Record<AlphaGrade, InventoryVisualGrade> = {
    SS: "SSS",
    S: "SS",
    A: "S",
    B: "A",
    C: "B",
    D: "C",
    F: "D",
  };
  return visualGradeMap[legacyVisualGrade];
}

function getFactorSubmissionStatus(factor: Factor): FactorRow["submissionStatus"] {
  return factor.status === "archived" ? "failed" : "passed";
}


function clampAutoCastCount(value: number) {
  if (!Number.isFinite(value)) return MIN_AUTO_CAST_COUNT;
  return Math.min(MAX_AUTO_CAST_COUNT, Math.max(MIN_AUTO_CAST_COUNT, Math.round(value)));
}

function formatLeaderboardBalance(amount: number) {
  return `+${Math.round(Number(amount) || 0).toLocaleString()}`;
}

function getFactorDefaultSortDir(key: FactorSortKey): Exclude<SortDir, null> {
  return "desc";
}

function getLeaderboardRankIcon(rank: number) {
  if (rank === 1) return RANKING_MODAL_ASSETS.rank1;
  if (rank === 2) return RANKING_MODAL_ASSETS.rank2;
  if (rank === 3) return RANKING_MODAL_ASSETS.rank3;
  return null;
}

function buildFactorCurve(factor: Factor) {
  const returns = parseMetricValue(factor.returns);
  const fitness = Math.max(factor.fitness, 0.05);
  const base = 42 + returns * 1.4;
  const values = Array.from({ length: 20 }, (_, index) => {
    const progress = index / 19;
    const wave = Math.sin(index * 0.82 + factor.id.length) * (6 + fitness * 7);
    const wobble = Math.cos(index * 0.37 + factor.osSharpe) * 4;
    return base + progress * returns * 2.6 + wave + wobble;
  });
  return buildLinePath(values, 180, 58, 6);
}

function fmtSigned(value: number, fractionDigits = 2) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

function formatElapsedTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function getRandomAutoCastSingleDurationSeconds() {
  return (
    AUTO_CAST_SINGLE_MIN_SECONDS +
    Math.floor(Math.random() * (AUTO_CAST_SINGLE_MAX_SECONDS - AUTO_CAST_SINGLE_MIN_SECONDS + 1))
  );
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildDetailSeries(points: number, start: number, slope: number, volatility: number) {
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index * 0.42) * volatility;
    const wobble = Math.cos(index * 0.18) * volatility * 0.45;
    return Number((start + index * slope + wave + wobble).toFixed(2));
  });
}

function buildLinePath(values: number[], width: number, height: number, padding = 16) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

type MobilePageTransitionPhase = "opening" | "open" | "closing";

function useLocalPrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useMobilePageTransition(isOpen: boolean, exitDurationMs = 220, enterDurationMs = 320) {
  const prefersReducedMotion = useLocalPrefersReducedMotion();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [phase, setPhase] = useState<MobilePageTransitionPhase>(isOpen ? "open" : "closing");

  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldRender(isOpen);
      setPhase(isOpen ? "open" : "closing");
      return undefined;
    }

    let timeoutId = 0;

    if (isOpen) {
      setShouldRender(true);
      setPhase("opening");
      timeoutId = window.setTimeout(() => {
        setPhase("open");
      }, enterDurationMs);
    } else if (shouldRender) {
      setPhase("closing");
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, exitDurationMs);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enterDurationMs, exitDurationMs, isOpen, prefersReducedMotion, shouldRender]);

  return { shouldRender, phase };
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { uiLang, setUiLang, t } = useAppLanguage();
  const { user, login, logout, updateUser } = useAuth();
  const { cashCents, fishBalance } = useGameEconomy();
  const { navigateWithTransition } = usePageTransition();
  const walletController = useGameWalletModal();
  const setWalletDisplayOverrides = walletController.setWalletDisplayOverrides;
  const tr = (en: string, zh: string) => t(en, zh);
  const openStandaloneGameRoute = useCallback((route: string) => {
    if (typeof window !== "undefined" && window.innerWidth <= 700) {
      setLocation(route);
      return;
    }

    void navigateWithTransition(route);
  }, [navigateWithTransition, setLocation]);
  const cashBalanceUsd = cashCents / BALANCE_PER_USD;
  const shouldForceShowTestScenarioPanel = true;
  const shouldShowTestScenarioPanel =
    shouldForceShowTestScenarioPanel ||
    (typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      Boolean((window as Window & { __MANUS_HOST_DEV__?: boolean }).__MANUS_HOST_DEV__)));
  const [stageLayout, setStageLayout] = useState<GameStageLayout>({
    scale: 1,
    mode: "contain",
    safeLeft: 0,
    safeTop: 0,
    visibleWidth: GAME_STAGE_WIDTH,
    visibleHeight: GAME_STAGE_HEIGHT,
  });
  const [gameVersionMode, setGameVersionMode] = useState<GameVersionMode>("normal");
  const [basketBadgeMode, setBasketBadgeMode] = useState<BasketBadgeMode>("hidden");
  const [basketRewardModalOpen, setBasketRewardModalOpen] = useState(false);
  const [basketRewardModalPage, setBasketRewardModalPage] = useState<BasketRewardModalPage>("first");
  const [basketRewardHaloVisible, setBasketRewardHaloVisible] = useState(false);
  const [testScenarioPanelState, setTestScenarioPanelState] = useState<TestScenarioPanelState>("expanded");
  const [inventoryScenarioMode, setInventoryScenarioMode] = useState<InventoryScenarioMode>("multiple");
  const [coinDataScenarioMode, setCoinDataScenarioMode] = useState<WalletDataScenarioMode>("filled");
  const [testCoinBalanceDraft, setTestCoinBalanceDraft] = useState(() => (
    walletController.hasWalletDisplayOverrides
      ? walletController.coinBalanceValue.toLocaleString()
      : DEFAULT_TEST_COIN_BALANCE.toLocaleString()
  ));
  const [cashDataScenarioMode, setCashDataScenarioMode] = useState<WalletDataScenarioMode>("filled");
  const [testCashBalanceDraft, setTestCashBalanceDraft] = useState(() => (
    walletController.hasWalletDisplayOverrides
      ? walletController.cashBalanceValue.toFixed(walletController.cashDecimals)
      : DEFAULT_TEST_CASH_BALANCE.toFixed(1)
  ));
  const [testScenarioPanelPosition, setTestScenarioPanelPosition] = useState<TestScenarioPanelPosition>(TEST_SCENARIO_PANEL_DEFAULT_POSITION);
  const [testScenarioPanelMoved, setTestScenarioPanelMoved] = useState(false);
  const testScenarioPanelDragRef = useRef<TestScenarioPanelDragState | null>(null);
  const testScenarioPanelDragCleanupRef = useRef<(() => void) | null>(null);
  const [autoCastCount, setAutoCastCount] = useState(10);
  const [autoCastDraftCount, setAutoCastDraftCount] = useState(10);
  const [autoCastSettingsOpen, setAutoCastSettingsOpen] = useState(false);
  const [autoCastRunning, setAutoCastRunning] = useState(false);
  const [autoCastProgress, setAutoCastProgress] = useState(0);
  const [autoCastSingleStartedAt, setAutoCastSingleStartedAt] = useState<number | null>(null);
  const [autoCastSingleDuration, setAutoCastSingleDuration] = useState(getRandomAutoCastSingleDurationSeconds);
  const [autoCastElapsed, setAutoCastElapsed] = useState(0);
  const [manualCastStartedAt, setManualCastStartedAt] = useState<number | null>(null);
  const [manualCastElapsed, setManualCastElapsed] = useState(0);
  const [freeTrialRemaining, setFreeTrialRemaining] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryDetailOpen, setInventoryDetailOpen] = useState(false);
  const inventoryPageTransition = useMobilePageTransition(inventoryOpen, 260);
  const inventoryDetailPageTransition = useMobilePageTransition(inventoryDetailOpen, 260);
  const inventoryClosingFactorRef = useRef<FactorRow | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<"general" | "agent">("general");
  const [settingsAgentSection, setSettingsAgentSection] = useState<"web" | "client">("web");
  const [agentInstallIde, setAgentInstallIde] = useState<AgentInstallIde>("claude-code");
  const [settingsNickname, setSettingsNickname] = useState(user?.displayName || "AlphaTrader");
  const [settingsOriginalNickname, setSettingsOriginalNickname] = useState(user?.displayName || "AlphaTrader");
  const [settingsEmail, setSettingsEmail] = useState(user?.email || "alpha@example.com");
  const [settingsEditingProfile, setSettingsEditingProfile] = useState(false);
  const [settingsEditingEmail, setSettingsEditingEmail] = useState(false);
  const [settingsEditingPassword, setSettingsEditingPassword] = useState(false);
  const [settingsEmailVerCode, setSettingsEmailVerCode] = useState("");
  const [settingsEmailCodeSent, setSettingsEmailCodeSent] = useState(false);
  const [settingsNewEmail, setSettingsNewEmail] = useState("");
  const [settingsPasswordVerCode, setSettingsPasswordVerCode] = useState("");
  const [settingsPasswordCodeSent, setSettingsPasswordCodeSent] = useState(false);
  const [settingsNewPassword, setSettingsNewPassword] = useState("");
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState("");
  const [settingsLogoutConfirmOpen, setSettingsLogoutConfirmOpen] = useState(false);
  const settingsPageTransition = useMobilePageTransition(settingsOpen, 260);
  const [agentSelectedProviderId, setAgentSelectedProviderId] = useState<AgentProviderId>("codex");
  const [agentConnectedProviderIds, setAgentConnectedProviderIds] = useState<Set<AgentProviderId>>(() => new Set<AgentProviderId>(["codex"]));
  const [agentConnectedDeviceNames, setAgentConnectedDeviceNames] = useState<Partial<Record<AgentProviderId, string>>>({ codex: "MacBook Pro" });
  const [agentProviderAvailabilityById, setAgentProviderAvailabilityById] = useState<Partial<Record<AgentProviderId, AgentProviderAvailability>>>(() => ({ ...initialAgentProviderAvailabilityById }));
  const [agentGlobalConnectMode, setAgentGlobalConnectMode] = useState<"web" | "agent" | null>("web");
  const [agentModeSwitchWarning, setAgentModeSwitchWarning] = useState(false);
  const [agentConnectionWarningType, setAgentConnectionWarningType] = useState<"mode" | "provider">("mode");
  // Inline flow view: "mode" = step1 choose mode, "manage" = provider list, "config" = step2, "success" = step3
  const [agentInlineStep, setAgentInlineStep] = useState<"mode" | "manage" | "config" | "success">("manage");
  const [agentDisconnectConfirmProviderId, setAgentDisconnectConfirmProviderId] = useState<AgentProviderId | null>(null);
  const [agentStatusTestingProviderId, setAgentStatusTestingProviderId] = useState<AgentProviderId | null>(null);
  const [agentConnectMode, setAgentConnectMode] = useState<"web" | "agent">("web");
  const [agentConnectOpt, setAgentConnectOpt] = useState<"auth" | "api">("api");
  const [agentConnectPlugin, setAgentConnectPlugin] = useState<"auto" | "manual">("auto");
  const [agentGuidePreviewImageSrc, setAgentGuidePreviewImageSrc] = useState<string | null>(null);
  const [agentGuidePreviewScale, setAgentGuidePreviewScale] = useState(1);
  const [agentByokKey, setAgentByokKey] = useState("");
  const [agentByokTestStatus, setAgentByokTestStatus] = useState<"idle" | "testing" | "invalid" | "valid">("idle");
  const [agentByokTestMessage, setAgentByokTestMessage] = useState("");
  const [agentApiKeys, setAgentApiKeys] = useState<AgentApiKeyItem[]>(initialAgentApiKeys);
  const [agentApiVisibleKeyIds, setAgentApiVisibleKeyIds] = useState<Set<string>>(() => new Set());
  const [agentAuthPreviewOpen, setAgentAuthPreviewOpen] = useState(false);
  const [agentAuthPreviewSuccessOpen, setAgentAuthPreviewSuccessOpen] = useState(false);
  const [agentAuthPreviewProviderId, setAgentAuthPreviewProviderId] = useState<AgentAuthPreviewProviderId>("openclaw");
  const [agentTimeoutPreviewOpen, setAgentTimeoutPreviewOpen] = useState(false);
  const [agentTimeoutPreviewProviderId, setAgentTimeoutPreviewProviderId] = useState<AgentAuthPreviewProviderId>("openclaw");
  const [agentApiEditingNameId, setAgentApiEditingNameId] = useState<string | null>(null);
  const [agentApiEditNameValue, setAgentApiEditNameValue] = useState("");
  const [agentApiMoreMenuId, setAgentApiMoreMenuId] = useState<string | null>(null);
  const agentApiMoreMenuRef = useRef<HTMLDivElement | null>(null);
  const [agentApiDeleteConfirmId, setAgentApiDeleteConfirmId] = useState<string | null>(null);
  const [agentApiCreateModalOpen, setAgentApiCreateModalOpen] = useState(false);
  const [agentApiCreateStep, setAgentApiCreateStep] = useState<1 | 2>(1);
  const [agentApiNewName, setAgentApiNewName] = useState("");
  const [agentApiCreatedSecret, setAgentApiCreatedSecret] = useState("");
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const leaderboardPageTransition = useMobilePageTransition(leaderboardOpen, 260);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("week");
  const [leaderboardScrolling, setLeaderboardScrolling] = useState(false);
  const leaderboardScrollTimerRef = useRef<number | null>(null);
  const topActionsRef = useRef<HTMLDivElement | null>(null);
  const hudBottomBarRef = useRef<HTMLDivElement | null>(null);
  const [factorQuery, setFactorQuery] = useState("");
  const [factorFilter, setFactorFilter] = useState<FactorFilterKey>("all");
  const [inventoryGradeFilter, setInventoryGradeFilter] = useState<InventoryGradeFilter>("all");
  const [factorSortKey, setFactorSortKey] = useState<FactorSortKey | null>("grade");
  const [factorSortDir, setFactorSortDir] = useState<SortDir>("desc");
  const [factorSortOpen, setFactorSortOpen] = useState(false);
  const [inventoryControlsHidden, setInventoryControlsHidden] = useState(false);
  const inventoryScrollTopRef = useRef(0);
  const inventoryGridRef = useRef<HTMLDivElement | null>(null);
  const [openInventoryMenuId, setOpenInventoryMenuId] = useState<string | null>(null);
  const [starredFactors, setStarredFactors] = useState<Set<string>>(() => new Set(["AF-004", "AF-009"]));
  const [starredInventoryItems, setStarredInventoryItems] = useState<Set<string>>(() => new Set());
  const [deletedFactorIds, setDeletedFactorIds] = useState<Set<string>>(() => new Set());
  const [deletedInventoryItemIds, setDeletedInventoryItemIds] = useState<Set<string>>(() => new Set());
  const [pendingInventoryDelete, setPendingInventoryDelete] = useState<PendingInventoryDelete>(null);
  const [inventoryToast, setInventoryToast] = useState<InventoryToast>(null);
  const [basketEmptyToast, setBasketEmptyToast] = useState<BasketEmptyToast>(null);
  const [selectedInventoryFactor, setSelectedInventoryFactor] = useState<FactorRow | null>(null);
  const inventoryDetailClosingFactorRef = useRef<FactorRow | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<StrategySortKey | null>("roi");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [strategySortOpen, setStrategySortOpen] = useState(false);
  const [starredStrategies, setStarredStrategies] = useState<Set<string>>(() => new Set());
  const [selectedStrategy, setSelectedStrategy] = useState<(typeof strategies)[number] | null>(null);
  const [curveRange, setCurveRange] = useState<CurveRange>("365D");

  useEffect(() => {
    if (inventoryOpen) {
      inventoryClosingFactorRef.current = selectedInventoryFactor;
      return;
    }

    if (!inventoryPageTransition.shouldRender) {
      inventoryClosingFactorRef.current = null;
    }
  }, [inventoryOpen, inventoryPageTransition.shouldRender, selectedInventoryFactor]);

  const activeInventoryFactor = inventoryOpen
    ? selectedInventoryFactor
    : inventoryPageTransition.shouldRender
      ? inventoryClosingFactorRef.current
      : null;

  useEffect(() => {
    if (inventoryDetailOpen) {
      inventoryDetailClosingFactorRef.current = selectedInventoryFactor;
      return;
    }

    if (!inventoryDetailPageTransition.shouldRender) {
      inventoryDetailClosingFactorRef.current = null;
    }
  }, [inventoryDetailOpen, inventoryDetailPageTransition.shouldRender, selectedInventoryFactor]);

  const visibleInventoryDetailFactor = inventoryDetailOpen
    ? selectedInventoryFactor
    : inventoryDetailPageTransition.shouldRender
      ? inventoryDetailClosingFactorRef.current
      : null;

  useEffect(() => {
    const fitGameStage = () => {
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const widthScale = viewportWidth / GAME_STAGE_WIDTH;
      const heightScale = viewportHeight / GAME_STAGE_HEIGHT;
      const viewportAspect = viewportWidth / Math.max(1, viewportHeight);
      const shouldCoverMobile =
        viewportWidth < 700 && viewportAspect < GAME_STAGE_ASPECT * 0.52;
      const nextScale = Math.min(
        1,
        shouldCoverMobile
          ? Math.max(widthScale, heightScale)
          : Math.min(widthScale, heightScale)
      );
      const visibleWidth = viewportWidth / Math.max(nextScale, 0.001);
      const visibleHeight = viewportHeight / Math.max(nextScale, 0.001);

      setStageLayout({
        scale: nextScale,
        mode: shouldCoverMobile ? "cover" : "contain",
        safeLeft: Math.max(0, (GAME_STAGE_WIDTH - visibleWidth) / 2),
        safeTop: Math.max(0, (GAME_STAGE_HEIGHT - visibleHeight) / 2),
        visibleWidth: Math.min(GAME_STAGE_WIDTH, visibleWidth),
        visibleHeight: Math.min(GAME_STAGE_HEIGHT, visibleHeight),
      });
    };

    fitGameStage();
    window.addEventListener("resize", fitGameStage, { passive: true });
    window.visualViewport?.addEventListener("resize", fitGameStage, { passive: true });
    return () => {
      window.removeEventListener("resize", fitGameStage);
      window.visualViewport?.removeEventListener("resize", fitGameStage);
    };
  }, []);

  const getDefaultTestScenarioPanelPosition = useCallback((): TestScenarioPanelPosition => {
    if (stageLayout.mode !== "cover") return TEST_SCENARIO_PANEL_DEFAULT_POSITION;

    return {
      left: stageLayout.safeLeft + 12,
      top: stageLayout.safeTop + 142,
    };
  }, [stageLayout.mode, stageLayout.safeLeft, stageLayout.safeTop]);

  const fitNavigationLabels = useCallback(() => {
    const container = topActionsRef.current;
    if (!container) return;

    const labels = Array.from(container.querySelectorAll<HTMLElement>(".menu-label"));
    const baseSize = container.classList.contains("top-actions--en") ? 16 : 20;
    const minSize = 12;
    const fitsAll = (fontSize: number) =>
      labels.every((label) => {
        label.style.setProperty("--menu-label-font-size", `${fontSize}px`);
        return label.scrollWidth <= (label.parentElement?.clientWidth ?? 0);
      });

    let nextSize = baseSize;
    while (nextSize > minSize && !fitsAll(nextSize)) {
      nextSize -= 1;
    }

    container.style.setProperty("--menu-label-font-size", `${Math.max(minSize, nextSize)}px`);
  }, []);

  const fitTextToWidth = useCallback((label: HTMLElement | null, maxWidth: number, baseSize: number, minSize = 12) => {
    if (!label || maxWidth <= 0) return;

    let nextSize = baseSize;
    label.style.fontSize = `${nextSize}px`;
    while (nextSize > minSize && label.scrollWidth > maxWidth) {
      nextSize -= 1;
      label.style.fontSize = `${nextSize}px`;
    }
    if (label.scrollWidth > maxWidth) label.style.fontSize = `${minSize}px`;
  }, []);

  const fitBottomActionLabels = useCallback(() => {
    const root = hudBottomBarRef.current;
    if (!root) return;

    const tip = root.querySelector<HTMLElement>(".hud-disconnected-actions__tip");
    const tipLabel = tip?.querySelector<HTMLElement>(".hud-disconnected-actions__tip-label") ?? null;
    const tipIconWidth = tip?.querySelector<HTMLElement>(".hud-disconnected-actions__tip-icon")?.offsetWidth ?? 0;
    if (tip && tipLabel) {
      const tipStyle = window.getComputedStyle(tip);
      const tipPadding =
        parseFloat(tipStyle.paddingLeft) +
        parseFloat(tipStyle.paddingRight) +
        parseFloat(tipStyle.columnGap || tipStyle.gap || "0");
      const baseSize = tip.classList.contains("is-en") ? 26 : 30;
      fitTextToWidth(tipLabel, tip.clientWidth - tipPadding - tipIconWidth, baseSize);
    }

    root.querySelectorAll<HTMLElement>(".hud-disconnected-actions__cast, .hud-main-action").forEach((button) => {
      const label = button.querySelector<HTMLElement>(".hud-disconnected-actions__cast-label, .hud-main-action__label");
      const tool = button.querySelector<HTMLElement>(".hud-disconnected-actions__cast-tool, .hud-main-action__tool");
      if (!label) return;

      const style = window.getComputedStyle(button);
      const isNoticeAction = label.classList.contains("hud-main-action__label") && button.classList.contains("hud-main-action--notice");
      const noticeIconSafeWidth = isNoticeAction
        ? Math.max(0, (button.querySelector<HTMLElement>(".hud-main-action__notice-icon")?.offsetWidth ?? 0) - parseFloat(style.paddingRight))
        : 0;
      const availableWidth =
        button.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        parseFloat(style.columnGap || style.gap || "0") -
        (tool?.offsetWidth ?? 0) -
        noticeIconSafeWidth;
      const baseSize = isNoticeAction ? 24 : 50;
      if (isNoticeAction) {
        label.style.setProperty("--hud-notice-label-width", `${Math.max(0, availableWidth)}px`);
      }
      fitTextToWidth(label, availableWidth, baseSize);
    });
  }, [fitTextToWidth]);

  useEffect(() => {
    if (testScenarioPanelMoved) return;

    setTestScenarioPanelPosition(getDefaultTestScenarioPanelPosition());
  }, [getDefaultTestScenarioPanelPosition, testScenarioPanelMoved]);

  useEffect(() => {
    fitNavigationLabels();
    window.addEventListener("resize", fitNavigationLabels, { passive: true });
    return () => window.removeEventListener("resize", fitNavigationLabels);
  }, [fitNavigationLabels, gameVersionMode, stageLayout.scale, uiLang]);

  useEffect(() => {
    return () => {
      testScenarioPanelDragCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!inventoryToast) return undefined;
    const toastTimer = window.setTimeout(() => setInventoryToast(null), 2600);
    return () => window.clearTimeout(toastTimer);
  }, [inventoryToast]);

  useEffect(() => {
    if (!basketEmptyToast) return undefined;
    const toastTimer = window.setTimeout(() => setBasketEmptyToast(null), 1600);
    return () => window.clearTimeout(toastTimer);
  }, [basketEmptyToast]);

  useEffect(() => {
    if (!user) return;
    if (!settingsEditingProfile) {
      setSettingsNickname(user.displayName || "AlphaTrader");
      setSettingsOriginalNickname(user.displayName || "AlphaTrader");
    }
    if (!settingsEditingEmail) {
      setSettingsEmail(user.email || "alpha@example.com");
    }
  }, [settingsEditingEmail, settingsEditingProfile, user]);

  useEffect(() => {
    if (!agentApiMoreMenuId) return undefined;
    const closeAgentApiMenu = (event: MouseEvent) => {
      if (agentApiMoreMenuRef.current && !agentApiMoreMenuRef.current.contains(event.target as Node)) {
        setAgentApiMoreMenuId(null);
      }
    };
    document.addEventListener("mousedown", closeAgentApiMenu);
    return () => document.removeEventListener("mousedown", closeAgentApiMenu);
  }, [agentApiMoreMenuId]);


  const filterLabels: Record<FilterKey, string> = {
    all: tr("All", "全部"),
    starred: tr("My Favorites", "我的收藏"),
  };

  const filterSelectOptions: SelectOption[] = filterOptions.map((option) => ({
    key: option,
    label: filterLabels[option],
  }));
  const languageSelectOptions: SelectOption[] = LANGUAGE_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label,
  }));

  const sortLabels: Record<StrategySortKey, string> = {
    roi: "ROI",
    winRate: tr("Win Rate", "胜率"),
    sharpe: tr("Sharpe Ratio", "夏普比率"),
    maxDrawdown: tr("Max Drawdown", "最大回撤"),
  };

  const strategySortKeys = Object.keys(sortLabels) as StrategySortKey[];

  const factorFilterLabels: Record<FactorFilterKey, string> = {
    all: tr("All", "全部"),
    starred: tr("My Favorites", "我的收藏"),
  };

  const factorFilterSelectOptions: SelectOption[] = factorFilterOptions.map((option) => ({
    key: option,
    label: factorFilterLabels[option],
  }));
  const selectedAgentInstallIde = agentInstallIdeOptions.find((option) => option.id === agentInstallIde) ?? agentInstallIdeOptions[0];
  const agentInstallApiKey = agentApiKeys[0]?.apiKey ?? "YOUR_API_KEY";
  const agentInstallCommand = selectedAgentInstallIde.command(agentInstallApiKey);
  const agentVisibleProviderMode = agentGlobalConnectMode ?? agentConnectMode;
  const agentVisibleProviders = agentConnectableProviders.filter((provider) =>
    provider.id !== "openrouter" &&
    provider.modes.includes(agentVisibleProviderMode)
  );
  const getAgentProviderDisplayName = (provider: AgentConnectableProvider) =>
    provider.id === "codex" && agentVisibleProviderMode === "web" ? "ChatGPT" : provider.name;
  const renderAgentProviderIcon = (provider: AgentConnectableProvider) => {
    if (provider.icon === "codex") {
      return agentVisibleProviderMode === "web"
        ? <OpenAI.Avatar className="settings-agent-provider-icon" size={44} />
        : <Codex.Avatar className="settings-agent-provider-icon" size={44} />;
    }
    if (provider.icon === "claude") return <Claude.Avatar className="settings-agent-provider-icon" size={44} />;
    if (provider.icon === "openclaw") return <OpenClaw.Avatar className="settings-agent-provider-icon" size={44} />;
    if (provider.icon === "openrouter") return <OpenRouter.Avatar className="settings-agent-provider-icon" size={44} />;
    return provider.mark;
  };
  const shouldShowAgentAuthPreviewTrigger = agentInlineStep === "manage" && agentVisibleProviderMode === "agent";
  const selectedAgentProvider = agentConnectableProviders.find((provider) => provider.id === agentSelectedProviderId);
  const isSelectedOpenRouter = selectedAgentProvider?.name === "OpenRouter";

  const factorSortLabels: Record<FactorSortKey, string> = {
    createdAt: tr("Created At", "创建时间"),
    grade: tr("Grade", "等级"),
    rewardAmount: tr("Bonus (USD)", "奖金(USD)"),
    sharpe: "Sharpe",
    osSharpe: tr("OS Sharpe", "OS 夏普"),
    returns: "ROI",
    drawdown: tr("Drawdown", "回撤"),
    turnover: tr("Turnover", "换手率"),
    fitness: tr("Fitness", "适应度"),
  };

  const factorSortKeys: FactorSortKey[] = ["createdAt", "grade", "sharpe", "returns"];

  const factorRows = useMemo<FactorRow[]>(() => {
    return factors.map((factor) => {
      const submissionStatus = getFactorSubmissionStatus(factor);
      const grade = submissionStatus === "passed" ? getAlphaGrade(factor.osSharpe) : "F";
      return {
        ...factor,
        submissionStatus,
        grade,
        rewardAmount: factorRewardByGrade[grade],
      };
    });
  }, []);

  const inventoryFactorNoById = useMemo(() => {
    return new Map(
      [...factorRows]
        .sort((a, b) => {
          const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return createdDiff || a.id.localeCompare(b.id);
        })
        .map((factor, index) => [factor.id, index + 1])
    );
  }, [factorRows]);

  const inventorySpecialNoById = useMemo(() => {
    return new Map(inventorySpecialCards.map((item, index) => [item.id, factorRows.length + index + 1]));
  }, [factorRows.length]);

  const filteredFactors = useMemo(() => {
    const q = factorQuery.trim().toLowerCase();
    const sortValue = (factor: FactorRow) => {
      switch (factorSortKey) {
        case "createdAt":
          return new Date(factor.createdAt).getTime();
        case "grade":
          return factorGradeOrder[getInventoryVisualGrade(factor)];
        case "rewardAmount":
          return factor.rewardAmount;
        case "sharpe":
          return factor.sharpe;
        case "osSharpe":
          return factor.osSharpe;
        case "returns":
          return parseMetricValue(factor.returns);
        case "drawdown":
          return parseMetricValue(factor.drawdown);
        case "turnover":
          return parseMetricValue(factor.turnover);
        case "fitness":
          return factor.fitness;
        default:
          return 0;
      }
    };

    const filtered = factorRows.filter((factor) => {
      if (deletedFactorIds.has(factor.id)) return false;
      const matchQuery =
        !q ||
        factor.name.toLowerCase().includes(q) ||
        factor.id.toLowerCase().includes(q) ||
        factor.expression.toLowerCase().includes(q) ||
        factor.market.toLowerCase().includes(q) ||
        factor.tag?.toLowerCase().includes(q) ||
        factor.description?.toLowerCase().includes(q);
      const matchFilter = factorFilter === "all" ? true : starredFactors.has(factor.id);
      const matchGrade =
        inventoryGradeFilter === "all" ? true : getInventoryVisualGrade(factor) === inventoryGradeFilter;
      return matchQuery && matchFilter && matchGrade;
    });

    if (!factorSortKey || !factorSortDir) return filtered;

    const direction = factorSortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [deletedFactorIds, factorFilter, factorQuery, factorRows, factorSortDir, factorSortKey, inventoryGradeFilter, starredFactors]);

  const filteredSpecialCards = useMemo(() => {
    const q = factorQuery.trim().toLowerCase();
    return inventorySpecialCards.filter((item) => {
      if (deletedInventoryItemIds.has(item.id)) return false;
      const matchQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.nameZh.toLowerCase().includes(q) ||
        item.tagEn.toLowerCase().includes(q) ||
        item.tagZh.toLowerCase().includes(q);
      const matchFilter = factorFilter === "all" ? true : starredInventoryItems.has(item.id);
      const matchType = inventoryGradeFilter === "all" || inventoryGradeFilter === item.type;
      return matchQuery && matchFilter && matchType;
    });
  }, [deletedInventoryItemIds, factorFilter, factorQuery, inventoryGradeFilter, starredInventoryItems]);

  const displayedInventoryFactors =
    inventoryScenarioMode === "empty"
      ? []
      : inventoryScenarioMode === "single"
        ? filteredFactors.slice(0, 1)
        : filteredFactors;
  const displayedInventorySpecialCards = inventoryScenarioMode === "multiple" ? filteredSpecialCards : [];
  const inventoryTotalCount = useMemo(() => {
    if (inventoryScenarioMode === "empty") return 0;
    const factorCount = factorRows.filter((factor) => !deletedFactorIds.has(factor.id)).length;
    if (inventoryScenarioMode === "single") return Math.min(1, factorCount);
    const specialCount = inventorySpecialCards.filter((item) => !deletedInventoryItemIds.has(item.id)).length;
    return factorCount + specialCount;
  }, [deletedFactorIds, deletedInventoryItemIds, factorRows, inventoryScenarioMode]);
  const shouldShowInventoryGradeFilter = inventoryTotalCount > 0;

  const leaderboardRows = useMemo(() => {
    const balanceKey = leaderboardPeriod === "week" ? "weekBalance" : "monthBalance";
    const castsKey = leaderboardPeriod === "week" ? "weekCasts" : "monthCasts";
    return leaderboardEntries
      .map((entry) => ({
        ...entry,
        balance: entry[balanceKey],
        casts: entry[castsKey],
      }))
      .sort((a, b) => b.balance - a.balance)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }, [leaderboardPeriod]);

  const leaderboardTopRows = leaderboardRows.slice(0, 50);
  const leaderboardListRows = leaderboardTopRows;
  const currentLeaderboardRow = leaderboardRows.find((row) => row.id === CURRENT_LEADERBOARD_USER_ID);
  const currentLeaderboardInVisibleList = Boolean(currentLeaderboardRow && currentLeaderboardRow.rank <= leaderboardListRows.length);
  const leaderboardBalanceLabel = tr("New balance", "新增余额");
  const leaderboardCastsLabel = tr("Casts", "抛竿数");
  const handleLeaderboardScroll = useCallback(() => {
    setLeaderboardScrolling(true);
    if (leaderboardScrollTimerRef.current !== null) window.clearTimeout(leaderboardScrollTimerRef.current);
    leaderboardScrollTimerRef.current = window.setTimeout(() => {
      setLeaderboardScrolling(false);
      leaderboardScrollTimerRef.current = null;
    }, 700);
  }, []);
  useEffect(() => {
    if (leaderboardOpen) return undefined;
    setLeaderboardScrolling(false);
    if (leaderboardScrollTimerRef.current !== null) {
      window.clearTimeout(leaderboardScrollTimerRef.current);
      leaderboardScrollTimerRef.current = null;
    }
    return undefined;
  }, [leaderboardOpen]);
  const manualCastWaiting = manualCastStartedAt !== null;
  const mainCastActive = autoCastRunning || manualCastWaiting;
  const isFreeTrialAvailable = Boolean(user) && agentConnectedProviderIds.size === 0 && freeTrialRemaining > 0;
  const showAutoCastControl = !mainCastActive && !isFreeTrialAvailable;
  const manualCastElapsedLabel = formatElapsedTime(manualCastElapsed);
  const autoCastElapsedLabel = formatElapsedTime(autoCastElapsed);
  const autoCastCurrentStep = autoCastRunning ? Math.min(autoCastProgress + 1, autoCastCount) : autoCastProgress;
  const autoCastProgressLabel = `${autoCastCurrentStep}/${autoCastCount}`;
  const mainCastStatusTitle = autoCastRunning ? autoCastProgressLabel : tr("Waiting", "等待中");
  const mainCastElapsedLabel = autoCastRunning ? autoCastElapsedLabel : manualCastElapsedLabel;
  const mainCastAriaLabel = autoCastRunning
    ? tr(
        `Auto cast in progress ${autoCastProgressLabel} ${autoCastElapsedLabel}`,
        `自动抛竿进行中 ${autoCastProgressLabel} ${autoCastElapsedLabel}`
      )
    : tr(`Cast waiting ${manualCastElapsedLabel}`, `抛竿等待中 ${manualCastElapsedLabel}`);
  const isAgentDisconnected = Boolean(user) && agentConnectedProviderIds.size === 0;
  const shouldBlockCastForAgent = isAgentDisconnected && !isFreeTrialAvailable;
  const isClientAgentConnected = agentGlobalConnectMode === "agent" && agentConnectedProviderIds.size > 0;
  const castButtonLabel = tr("Cast", "抛竿");
  const castActionLabel = tr("Cast", "抛竿");
  const agentRequiredLabel = tr("Connect an agent to use", "连接agent后使用");
  const clientAgentOnlyLabel = tr("Use the connected local agent", "请到已连接的本地agent上操作");
  const freeTrialRemainingLabel = tr(
    `Free trials remaining: ${freeTrialRemaining}`,
    `剩余试用次数：${freeTrialRemaining}`
  );
  useEffect(() => {
    const root = hudBottomBarRef.current;
    let frameIds: number[] = [];

    const scheduleFit = () => {
      fitBottomActionLabels();
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      frameIds = [];

      const runFrame = (remainingFrames: number) => {
        const frameId = window.requestAnimationFrame(() => {
          fitBottomActionLabels();
          if (remainingFrames > 1) runFrame(remainingFrames - 1);
        });
        frameIds.push(frameId);
      };

      runFrame(4);
    };

    scheduleFit();
    window.addEventListener("resize", scheduleFit, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleFit, { passive: true });

    const resizeObserver = typeof ResizeObserver === "undefined" || !root
      ? null
      : new ResizeObserver(scheduleFit);
    if (resizeObserver && root) {
      resizeObserver.observe(root);
      root.querySelectorAll<HTMLElement>(".hud-disconnected-actions__tip, .hud-disconnected-actions__cast, .hud-main-action")
        .forEach((element) => resizeObserver.observe(element));
    }

    const mutationObserver = typeof MutationObserver === "undefined" || !root
      ? null
      : new MutationObserver(scheduleFit);
    if (mutationObserver && root) {
      mutationObserver.observe(root, { childList: true, subtree: true, characterData: true });
    }

    return () => {
      frameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
      window.removeEventListener("resize", scheduleFit);
      window.visualViewport?.removeEventListener("resize", scheduleFit);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [
    agentConnectedProviderIds.size,
    agentGlobalConnectMode,
    agentRequiredLabel,
    castButtonLabel,
    clientAgentOnlyLabel,
    fitBottomActionLabels,
    gameVersionMode,
    isAgentDisconnected,
    isClientAgentConnected,
    mainCastActive,
    mainCastStatusTitle,
    shouldBlockCastForAgent,
    stageLayout.scale,
    uiLang,
  ]);
  const testCoinBalanceDigits = testCoinBalanceDraft.replace(/[^\d]/g, "");
  const parsedTestCoinBalance = testCoinBalanceDigits ? Number(testCoinBalanceDigits) : DEFAULT_TEST_COIN_BALANCE;
  const customCoinBalance = Math.min(MAX_TEST_COIN_BALANCE, parsedTestCoinBalance);
  const displayedCoinBalance = coinDataScenarioMode === "empty" ? 0 : customCoinBalance;
  const parsedTestCashBalance = Number(testCashBalanceDraft.replace(/[^\d.]/g, ""));
  const customCashBalanceUsd = Number.isFinite(parsedTestCashBalance)
    ? Math.min(MAX_TEST_CASH_BALANCE, parsedTestCashBalance)
    : DEFAULT_TEST_CASH_BALANCE;
  const displayedCashBalanceUsd = cashDataScenarioMode === "empty" ? 0 : customCashBalanceUsd;
  useEffect(() => {
    setWalletDisplayOverrides({
      coinBalance: displayedCoinBalance,
      cashBalanceUsd: displayedCashBalanceUsd,
      coinActivities: coinDataScenarioMode === "empty" ? [] : undefined,
      cashActivities: cashDataScenarioMode === "empty" ? [] : undefined,
    });
  }, [cashDataScenarioMode, coinDataScenarioMode, displayedCashBalanceUsd, displayedCoinBalance, setWalletDisplayOverrides]);

  const basketItemCount = BASKET_BADGE_VALUES[basketBadgeMode];
  const basketBadgeLabel = basketItemCount > 99 ? "99+" : basketItemCount > 0 ? String(basketItemCount) : "";
  const isBasketRewardMobileLayout = stageLayout.mode === "cover";
  const isBasketRewardMultiPage = basketItemCount > (isBasketRewardMobileLayout ? 9 : 10);
  const basketRewardCards = getBasketRewardCards(basketItemCount, basketRewardModalPage, isBasketRewardMobileLayout);
  const basketRewardDisplayCount = basketRewardCards.length;
  const basketRewardMobileRowClass =
    basketRewardDisplayCount <= 3
      ? "is-mobile-one-row"
      : basketRewardDisplayCount <= 6
        ? "is-mobile-two-row"
        : "is-mobile-three-row";
  const basketRewardBackgroundImage = basketItemCount <= 5
    ? BASKET_REWARD_ASSETS.backgroundOneRow
    : BASKET_REWARD_ASSETS.backgroundTwoRow;
  const basketRewardStageClass = [
    "basket-reward-modal__stage",
    basketItemCount <= 5 ? "is-compact" : "",
    isBasketRewardMultiPage ? "is-paged" : "",
    `is-count-${basketRewardDisplayCount}`,
    basketRewardMobileRowClass,
    basketRewardDisplayCount === 1 ? "is-single" : basketRewardModalPage === "last" ? "is-last-page" : basketRewardDisplayCount <= 5 ? "is-row" : "is-grid",
  ].filter(Boolean).join(" ");
  const updateAutoCastCount = (value: number) => {
    setAutoCastDraftCount(clampAutoCastCount(value));
  };

  const openAutoCastSettings = () => {
    if (autoCastRunning || manualCastWaiting || shouldBlockCastForAgent) return;
    setAutoCastDraftCount(autoCastCount);
    setAutoCastSettingsOpen(true);
  };

  const closeAutoCastSettings = () => {
    setAutoCastSettingsOpen(false);
  };

  const handleStartAutoCast = () => {
    const nextCount = clampAutoCastCount(autoCastDraftCount);
    setManualCastStartedAt(null);
    setManualCastElapsed(0);
    setAutoCastCount(nextCount);
    setAutoCastProgress(0);
    setAutoCastRunning(true);
    setAutoCastElapsed(0);
    setAutoCastSingleDuration(getRandomAutoCastSingleDurationSeconds());
    setAutoCastSingleStartedAt(Date.now());
    setAutoCastSettingsOpen(false);
    setInventoryToast({
      id: Date.now(),
      title: tr("Auto cast started", "自动抛竿已开始"),
      message: tr(`This run will cast ${nextCount} times.`, `本次将自动抛竿 ${nextCount} 次。`),
    });
  };

  const handleStopAutoCast = () => {
    if (!autoCastRunning) return;
    setAutoCastRunning(false);
    setAutoCastSingleStartedAt(null);
    setAutoCastElapsed(0);
    setInventoryToast({
      id: Date.now(),
      title: tr("Auto cast stopped", "自动抛竿已停止"),
      message: tr(
        `Stopped at ${autoCastProgress} of ${autoCastCount}.`,
        `已在 ${autoCastProgress}/${autoCastCount} 次时终止。`
      ),
    });
  };

  const handleMainCastClick = () => {
    if (autoCastRunning || manualCastWaiting || shouldBlockCastForAgent) return;
    if (isFreeTrialAvailable) {
      setFreeTrialRemaining((current) => Math.max(0, current - 1));
    }
    setManualCastElapsed(0);
    setManualCastStartedAt(Date.now());
  };

  const closeBasketRewardModal = () => {
    setBasketRewardHaloVisible(false);
    setBasketRewardModalOpen(false);
  };

  const handleBasketClick = () => {
    if (basketBadgeMode === "hidden") {
      setBasketEmptyToast({
        id: Date.now(),
        message: tr("Empty", "空空如也"),
      });
      return;
    }

    setBasketRewardModalPage("first");
    setBasketRewardHaloVisible(true);
    setBasketRewardModalOpen(true);
  };

  const handleStopManualCast = () => {
    setManualCastStartedAt(null);
    setManualCastElapsed(0);
  };

  const openAgentSettingsForScenario = (nextInlineStep: "mode" | "manage" = "manage") => {
    setSettingsOpen(true);
    setSettingsActiveTab("agent");
    setSettingsAgentSection("web");
    setAgentModeSwitchWarning(false);
    setAgentDisconnectConfirmProviderId(null);
    setAgentInlineStep(nextInlineStep);
  };

  const openAgentRequiredSettings = () => {
    setSettingsOpen(true);
    setSettingsActiveTab("agent");
    setSettingsAgentSection("web");
    setAgentGlobalConnectMode(null);
    setAgentConnectMode("web");
    setAgentInlineStep("mode");
    setAgentModeSwitchWarning(false);
    setAgentDisconnectConfirmProviderId(null);
  };

  const openClientAgentSettings = () => {
    setSettingsOpen(true);
    setSettingsActiveTab("agent");
    setSettingsAgentSection("web");
    setAgentGlobalConnectMode("agent");
    setAgentConnectMode("agent");
    setAgentInlineStep("manage");
    setAgentModeSwitchWarning(false);
    setAgentDisconnectConfirmProviderId(null);
  };

  const setDisconnectedAgentScenario = () => {
    setAutoCastRunning(false);
    setAutoCastSingleStartedAt(null);
    setManualCastStartedAt(null);
    setManualCastElapsed(0);
    setFreeTrialRemaining(0);
    setAgentConnectedProviderIds(new Set<AgentProviderId>());
    setAgentConnectedDeviceNames({});
    setAgentProviderAvailabilityById({});
    setAgentGlobalConnectMode(null);
    setAgentConnectMode("web");
    setAgentInlineStep("mode");
    setSettingsOpen(false);
  };

  const applyTestScenario = (scenario: "logged-out" | "free-trial" | "agent-disconnected" | "web-agent-connected" | "client-agent-connected") => {
    setInventoryToast(null);
    setAgentStatusTestingProviderId(null);
    setAgentAuthPreviewOpen(false);
    setAgentTimeoutPreviewOpen(false);

    if (scenario === "logged-out") {
      logout();
      setDisconnectedAgentScenario();
      setSettingsOpen(false);
      navigateWithTransition("/auth");
      return;
    }

    if (!user) {
      login("alpha@example.com");
    }

    if (scenario === "agent-disconnected") {
      setDisconnectedAgentScenario();
      setSettingsOpen(false);
      return;
    }

    if (scenario === "free-trial") {
      setDisconnectedAgentScenario();
      setFreeTrialRemaining(FREE_TRIAL_CAST_LIMIT);
      setSettingsOpen(false);
      return;
    }

    if (scenario === "web-agent-connected") {
      setFreeTrialRemaining(0);
      setAgentConnectedProviderIds(new Set<AgentProviderId>(["codex"]));
      setAgentConnectedDeviceNames({ codex: "Web" });
      setAgentProviderAvailabilityById({});
      setAgentGlobalConnectMode("web");
      setAgentConnectMode("web");
      setSettingsOpen(false);
      setSettingsActiveTab("agent");
      setSettingsAgentSection("web");
      setAgentModeSwitchWarning(false);
      setAgentDisconnectConfirmProviderId(null);
      setAgentInlineStep("manage");
      return;
    }

    setFreeTrialRemaining(0);
    setAgentConnectedProviderIds(new Set<AgentProviderId>(["codex"]));
    setAgentConnectedDeviceNames({ codex: "MacBook Pro" });
    setAgentProviderAvailabilityById({ ...initialAgentProviderAvailabilityById });
    setAgentGlobalConnectMode("agent");
    setAgentConnectMode("agent");
    setSettingsOpen(false);
    setSettingsActiveTab("agent");
    setSettingsAgentSection("web");
    setAgentModeSwitchWarning(false);
    setAgentDisconnectConfirmProviderId(null);
    setAgentInlineStep("mode");
  };

  const toggleBasketBadgeScenario = () => {
    setBasketBadgeMode((current) => {
      const currentIndex = BASKET_BADGE_MODES.indexOf(current);
      return BASKET_BADGE_MODES[(currentIndex + 1) % BASKET_BADGE_MODES.length];
    });
  };

  const toggleInventoryScenario = () => {
    const nextMode: InventoryScenarioMode =
      inventoryScenarioMode === "multiple"
        ? "empty"
        : inventoryScenarioMode === "empty"
          ? "single"
          : "multiple";

    setInventoryScenarioMode(nextMode);
    setFactorQuery("");
    setFactorFilter("all");
    setInventoryGradeFilter("all");
    setOpenInventoryMenuId(null);
    setSelectedInventoryFactor(null);
    setPendingInventoryDelete(null);
    setInventoryControlsHidden(isMobileViewport());
    inventoryScrollTopRef.current = 0;
    setInventoryOpen(true);
  };

  const toggleCoinDataScenario = () => {
    setCoinDataScenarioMode((current) => (current === "empty" ? "filled" : "empty"));
  };

  const updateTestCoinBalanceDraft = (value: string) => {
    const nextDigits = value.replace(/[^\d]/g, "");
    if (!nextDigits) {
      setTestCoinBalanceDraft("");
      return;
    }

    const nextValue = Math.min(MAX_TEST_COIN_BALANCE, Number(nextDigits));
    setTestCoinBalanceDraft(nextValue.toLocaleString());
  };

  const updateTestCashBalanceDraft = (value: string) => {
    const normalizedValue = value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    if (!normalizedValue) {
      setTestCashBalanceDraft("");
      return;
    }

    const nextValue = Math.min(MAX_TEST_CASH_BALANCE, Number(normalizedValue || 0));
    const hasTrailingDecimal = normalizedValue.endsWith(".");
    const decimalPart = normalizedValue.split(".")[1] ?? "";
    const fractionDigits = Math.min(1, decimalPart.length);
    setTestCashBalanceDraft(hasTrailingDecimal ? `${Math.floor(nextValue)}.` : nextValue.toFixed(fractionDigits));
  };

  const toggleCashDataScenario = () => {
    setCashDataScenarioMode((current) => (current === "empty" ? "filled" : "empty"));
  };

  const openInventoryFactorDetail = useCallback((factor: FactorRow) => {
    inventoryScrollTopRef.current = inventoryGridRef.current?.scrollTop ?? inventoryScrollTopRef.current;
    setSelectedInventoryFactor(factor);
    setInventoryDetailOpen(true);
  }, []);

  const closeInventoryFactorDetail = useCallback(() => {
    setInventoryControlsHidden(false);
    setInventoryDetailOpen(false);
    if (!isMobileViewport()) {
      setSelectedInventoryFactor(null);
    }
  }, []);

  const closeInventoryModal = useCallback(() => {
    setInventoryControlsHidden(false);
    setInventoryOpen(false);
    setInventoryDetailOpen(false);
    setSelectedInventoryFactor(null);
  }, []);

  const clampTestScenarioPanelPosition = (
    position: TestScenarioPanelPosition,
    panelWidth: number,
    panelHeight: number
  ): TestScenarioPanelPosition => {
    const isMobileCover = stageLayout.mode === "cover";
    const edgeGap = isMobileCover ? 8 : 0;
    const minLeft = isMobileCover ? stageLayout.safeLeft + edgeGap : 0;
    const minTop = isMobileCover ? stageLayout.safeTop + edgeGap : 0;
    const maxLeft = isMobileCover
      ? stageLayout.safeLeft + stageLayout.visibleWidth - panelWidth - edgeGap
      : GAME_STAGE_WIDTH - panelWidth;
    const maxTop = isMobileCover
      ? stageLayout.safeTop + stageLayout.visibleHeight - panelHeight - edgeGap
      : GAME_STAGE_HEIGHT - panelHeight;

    return {
      left: Math.max(minLeft, Math.min(Math.max(minLeft, maxLeft), position.left)),
      top: Math.max(minTop, Math.min(Math.max(minTop, maxTop), position.top)),
    };
  };

  const beginTestScenarioPanelDrag = (
    element: HTMLDivElement,
    pointerId: number,
    clientX: number,
    clientY: number
  ) => {
    const rect = element.getBoundingClientRect();
    const panelWidth = rect.width / stageLayout.scale;
    const panelHeight = rect.height / stageLayout.scale;
    const startPosition = clampTestScenarioPanelPosition(testScenarioPanelPosition, panelWidth, panelHeight);

    testScenarioPanelDragRef.current = {
      ...startPosition,
      pointerId,
      startClientX: clientX,
      startClientY: clientY,
      panelWidth,
      panelHeight,
    };
    setTestScenarioPanelMoved(true);
    setTestScenarioPanelPosition(startPosition);
  };

  const moveTestScenarioPanelDrag = (pointerId: number, clientX: number, clientY: number) => {
    const dragState = testScenarioPanelDragRef.current;
    if (!dragState || dragState.pointerId !== pointerId) return;

    const scale = stageLayout.scale || 1;
    setTestScenarioPanelPosition(
      clampTestScenarioPanelPosition(
        {
          left: dragState.left + (clientX - dragState.startClientX) / scale,
          top: dragState.top + (clientY - dragState.startClientY) / scale,
        },
        dragState.panelWidth,
        dragState.panelHeight
      )
    );
  };

  const endTestScenarioPanelDrag = (pointerId: number) => {
    const dragState = testScenarioPanelDragRef.current;
    if (!dragState || dragState.pointerId !== pointerId) return;

    testScenarioPanelDragRef.current = null;
    testScenarioPanelDragCleanupRef.current?.();
    testScenarioPanelDragCleanupRef.current = null;
  };

  const handleTestScenarioPanelPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;

    beginTestScenarioPanelDrag(event.currentTarget, event.pointerId, event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleTestScenarioPanelPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    moveTestScenarioPanelDrag(event.pointerId, event.clientX, event.clientY);
  };

  const handleTestScenarioPanelPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = testScenarioPanelDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    endTestScenarioPanelDrag(event.pointerId);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleTestScenarioPanelMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const mousePointerId = -1;
    beginTestScenarioPanelDrag(event.currentTarget, mousePointerId, event.clientX, event.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveTestScenarioPanelDrag(mousePointerId, moveEvent.clientX, moveEvent.clientY);
    };
    const handleMouseUp = () => {
      endTestScenarioPanelDrag(mousePointerId);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });
    testScenarioPanelDragCleanupRef.current = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  };

  const toggleFactorStar = (id: string) => {
    setStarredFactors((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleInventoryItemStar = (id: string) => {
    setStarredInventoryItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRequestInventoryDelete = (pendingDelete: NonNullable<PendingInventoryDelete>) => {
    setOpenInventoryMenuId(null);
    setPendingInventoryDelete(pendingDelete);
  };

  const handleConfirmInventoryDelete = () => {
    if (!pendingInventoryDelete) return;
    const deletedItem = pendingInventoryDelete;

      if (deletedItem.kind === "factor") {
        setDeletedFactorIds((current) => new Set(current).add(deletedItem.id));
        setStarredFactors((current) => {
          const next = new Set(current);
          next.delete(deletedItem.id);
          return next;
        });
        if (selectedInventoryFactor?.id === deletedItem.id) {
          setInventoryDetailOpen(false);
          setSelectedInventoryFactor(null);
        }
      } else {
      setDeletedInventoryItemIds((current) => new Set(current).add(deletedItem.id));
      setStarredInventoryItems((current) => {
        const next = new Set(current);
        next.delete(deletedItem.id);
        return next;
      });
    }

    setPendingInventoryDelete(null);
    setInventoryToast({
      id: Date.now(),
      title: tr("Deleted", "删除成功"),
      message: tr(
        `${deletedItem.label} has been removed from your inventory.`,
        `已从图鉴中移除：${deletedItem.label}`
      ),
    });
  };

  const handleInventoryCardMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const eventTarget = event.target instanceof Element ? event.target : null;
    if (eventTarget?.closest(".inv-actions")) {
      event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
      event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
      event.currentTarget.style.setProperty("--card-shine-angle", "135deg");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = (x / rect.width - 0.5) * 18;
    const rotateX = (0.5 - y / rect.height) * 18;
    event.currentTarget.style.setProperty("--card-tilt-x", `${rotateY.toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--card-tilt-y", `${rotateX.toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--card-shine-x", `${x.toFixed(1)}px`);
    event.currentTarget.style.setProperty("--card-shine-y", `${y.toFixed(1)}px`);
    event.currentTarget.style.setProperty("--card-shine-angle", `${(rotateY + 135).toFixed(1)}deg`);
  }, []);

  const handleInventoryCardLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
    event.currentTarget.style.setProperty("--card-shine-angle", "135deg");
  }, []);

  const handleInventoryGridScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const nextTop = event.currentTarget.scrollTop;
    const previousTop = inventoryScrollTopRef.current;
    const delta = nextTop - previousTop;

    inventoryScrollTopRef.current = nextTop;

    if (window.matchMedia("(max-width: 700px)").matches) {
      return;
    }

    if (Math.abs(delta) > 4) {
      setInventoryControlsHidden(delta > 0);
    }
  }, []);

  useEffect(() => {
    if (!inventoryOpen) {
      setInventoryControlsHidden(false);
      inventoryScrollTopRef.current = 0;
      setPendingInventoryDelete(null);
    }
  }, [inventoryOpen]);

  useEffect(() => {
    if (!inventoryOpen || selectedInventoryFactor) return undefined;
    const scrollTop = inventoryScrollTopRef.current;
    if (scrollTop <= 0) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      if (inventoryGridRef.current) {
        inventoryGridRef.current.scrollTop = scrollTop;
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [inventoryOpen, selectedInventoryFactor]);

  useEffect(() => {
    if (inventoryDetailOpen || inventoryDetailPageTransition.shouldRender) return;
    if (!isMobileViewport()) return;
    setSelectedInventoryFactor(null);
  }, [inventoryDetailOpen, inventoryDetailPageTransition.shouldRender]);

  useEffect(() => {
    if (!autoCastRunning || autoCastProgress >= autoCastCount) return undefined;

    const timer = window.setTimeout(() => {
      const nextProgress = Math.min(autoCastCount, autoCastProgress + 1);
      setAutoCastProgress(nextProgress);

      if (nextProgress < autoCastCount) {
        setAutoCastElapsed(0);
        setAutoCastSingleDuration(getRandomAutoCastSingleDurationSeconds());
        setAutoCastSingleStartedAt(Date.now());
      }
    }, autoCastSingleDuration * 1000);

    return () => window.clearTimeout(timer);
  }, [autoCastCount, autoCastProgress, autoCastRunning, autoCastSingleDuration]);

  useEffect(() => {
    if (autoCastRunning && autoCastProgress >= autoCastCount) {
      setAutoCastRunning(false);
      setAutoCastSingleStartedAt(null);
      setAutoCastElapsed(0);
    }
  }, [autoCastCount, autoCastProgress, autoCastRunning]);

  useEffect(() => {
    if (autoCastSingleStartedAt === null || !autoCastRunning) return undefined;

    const updateElapsed = () => {
      setAutoCastElapsed(Math.max(0, Math.floor((Date.now() - autoCastSingleStartedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [autoCastRunning, autoCastSingleStartedAt]);

  useEffect(() => {
    if (manualCastStartedAt === null) return undefined;

    const updateElapsed = () => {
      setManualCastElapsed(Math.max(0, Math.floor((Date.now() - manualCastStartedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [manualCastStartedAt]);

  const handleFactorSortChange = (key: string) => {
    const nextKey = key as FactorSortKey;
    if (factorSortKey === nextKey) {
      setFactorSortDir((current) => (current === "asc" ? "desc" : "asc"));
      setFactorSortOpen(false);
      return;
    }
    setFactorSortKey(nextKey);
    setFactorSortDir(getFactorDefaultSortDir(nextKey));
    setFactorSortOpen(false);
  };

  const translateDescription = (strategy: (typeof strategies)[number]) => {
    if (uiLang !== "zh") return strategy.description;
    switch (strategy.id) {
      case "STR-001":
        return "结合 RSI 交叉、成交量背离与资金费率信号的多因子动量策略，适用于 BTC 永续合约。";
      case "STR-002":
        return "从 TVL 资金流、LP 行为和 Gas 费模式中提取信号，覆盖主要 DeFi 协议。";
      case "STR-003":
        return "利用主流 CEX 平台间的价格偏差，结合价差分析与订单簿深度进行套利。";
      case "STR-004":
        return "基于动量、巨鲸跟踪与链上指标，在前 50 大山寨币之间进行系统化轮动。";
      case "STR-005":
        return "聚焦资金费率套利与基差交易的低风险策略，并通过受控敞口提升收益稳定性。";
      case "STR-006":
        return "通过识别并规避 MEV 攻击，同时捕捉具备抗 Sandwich 特征的机会来生成 Alpha。";
      default:
        return strategy.description;
    }
  };

  const filteredStrategies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sortValue = (strategy: (typeof strategies)[number]) => {
      switch (sortKey) {
        case "roi":
          return parseMetricValue(strategy.annualReturn);
        case "winRate":
          return parseMetricValue(strategy.winRate);
        case "sharpe":
          return strategy.sharpe;
        case "maxDrawdown":
          return parseMetricValue(strategy.maxDrawdown);
        default:
          return 0;
      }
    };

    const filtered = strategies.filter((strategy) => {
      const matchQuery =
        !q ||
        strategy.name.toLowerCase().includes(q) ||
        strategy.id.toLowerCase().includes(q) ||
        strategy.description.toLowerCase().includes(q) ||
        strategy.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        strategy.author.toLowerCase().includes(q);
      const matchFilter = filter === "all" ? true : starredStrategies.has(strategy.id);
      return matchQuery && matchFilter;
    });

    if (!sortKey || !sortDir) return filtered;

    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [filter, query, sortDir, sortKey, starredStrategies]);

  const toggleStar = (id: string) => {
    setStarredStrategies((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStrategySortChange = (key: StrategySortKey) => {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      setStrategySortOpen(false);
      return;
    }
    setSortKey(key);
    setSortDir(getDefaultStrategySortDir(key));
    setStrategySortOpen(false);
  };

  const showSettingsFeedback = (title: string, message: string) => {
    setInventoryToast({ id: Date.now(), title, message });
  };

  const getAgentProviderName = (providerId: AgentProviderId) => {
    return agentConnectableProviders.find((provider) => provider.id === providerId)?.name || "Agent";
  };

  const getAgentProviderNameForMode = (providerId: AgentProviderId, mode: "web" | "agent") => {
    if (providerId === "codex" && mode === "web") return "ChatGPT";
    return getAgentProviderName(providerId);
  };

  const getNextAgentAuthPreviewProviderId = (currentProviderId: AgentAuthPreviewProviderId) => {
    const currentIndex = agentAuthPreviewProviderIds.indexOf(currentProviderId);
    return agentAuthPreviewProviderIds[(currentIndex + 1) % agentAuthPreviewProviderIds.length];
  };

  const openNextAgentAuthPreview = () => {
    const nextProviderId = getNextAgentAuthPreviewProviderId(agentAuthPreviewProviderId);
    setAgentAuthPreviewProviderId(nextProviderId);
    setAgentAuthPreviewSuccessOpen(false);
    setAgentAuthPreviewOpen(true);
  };

  const openNextAgentTimeoutPreview = () => {
    const nextProviderId = getNextAgentAuthPreviewProviderId(agentTimeoutPreviewProviderId);
    setAgentTimeoutPreviewProviderId(nextProviderId);
    setAgentTimeoutPreviewOpen(true);
  };

  const renderAgentAuthPreviewIcon = (providerId: AgentAuthPreviewProviderId) => {
    if (providerId === "codex") return <Codex.Avatar size={64} />;
    if (providerId === "openclaw") return <OpenClaw.Avatar size={64} />;
    return <Claude.Avatar size={64} />;
  };

  // Enter the inline connect config view for a specific provider (from manage view)
  const openAgentConnectModal = (providerId: AgentProviderId) => {
    setAgentSelectedProviderId(providerId);
    setAgentDisconnectConfirmProviderId(null);
    setAgentConnectPlugin("auto");
    setAgentConnectOpt("api");
    setAgentModeSwitchWarning(false);
    setAgentConnectMode(agentGlobalConnectMode ?? "web");
    setAgentInlineStep("config");
  };

  // Step 1: choose connection mode, then proceed
  const proceedFromModeStep = () => {
    setAgentGlobalConnectMode(agentConnectMode);
    setAgentModeSwitchWarning(false);
    setAgentInlineStep("manage");
  };

  // Request switching the global connection mode (from manage view)
  const requestSwitchConnectMode = () => {
    setAgentModeSwitchWarning(false);
    setAgentConnectionWarningType("mode");
    const connectedWebAgentCount = agentGlobalConnectMode === "web" ? agentConnectedProviderIds.size : 0;
    const connectedClientAgentCount = agentGlobalConnectMode === "agent" ? agentConnectedProviderIds.size : 0;
    if (connectedWebAgentCount > 0 || connectedClientAgentCount > 0) {
      setAgentModeSwitchWarning(true);
      return;
    }
    setAgentGlobalConnectMode(null);
    setAgentInlineStep("mode");
  };

  const requestDisconnectAgentProvider = (providerId: AgentProviderId) => {
    setAgentDisconnectConfirmProviderId(providerId);
  };

  const resetUnavailableAgentProvider = (providerId: AgentProviderId) => {
    setAgentProviderAvailabilityById((current) => {
      const next = { ...current };
      delete next[providerId];
      return next;
    });
    setAgentConnectedProviderIds((current) => {
      const next = new Set(current);
      next.delete(providerId);
      return next;
    });
    showSettingsFeedback(
      tr("Disconnected", "已断连"),
      tr(`${getAgentProviderName(providerId)} reset to disconnected.`, `${getAgentProviderName(providerId)} 已恢复为未连接状态。`)
    );
  };

  const showAgentProviderBlockedWarning = () => {
    setAgentConnectionWarningType("provider");
    setAgentModeSwitchWarning(true);
  };

  const disconnectAgentProvider = (providerId: AgentProviderId) => {
    setAgentConnectedProviderIds((current) => {
      const next = new Set(current);
      next.delete(providerId);
      return next;
    });
    setAgentProviderAvailabilityById((current) => {
      const next = { ...current };
      delete next[providerId];
      return next;
    });
    setAgentDisconnectConfirmProviderId(null);
    showSettingsFeedback(
      tr("Disconnected", "已断连"),
      tr(`${getAgentProviderName(providerId)} disconnected.`, `${getAgentProviderName(providerId)} 已断开连接。`)
    );
  };

  const disconnectAllAgentProviders = () => {
    setAgentConnectedProviderIds(new Set<AgentProviderId>());
    setAgentConnectedDeviceNames({});
    setAgentProviderAvailabilityById({});
    setAgentGlobalConnectMode(null);
    setAgentInlineStep("mode");
    showSettingsFeedback(tr("All disconnected", "已全部断连"), tr("All agents disconnected.", "所有 Agent 已断开连接。"));
  };

  const testAgentProviderStatus = (providerId: AgentProviderId) => {
    if (agentStatusTestingProviderId) return;

    setAgentStatusTestingProviderId(providerId);

    window.setTimeout(() => {
      setAgentStatusTestingProviderId(null);
      const nextAvailability: AgentProviderAvailability =
        providerId === "claude-code" ? "outdated" : "available";
      const nextConnected = providerId === "codex";

      setAgentProviderAvailabilityById((current) => {
        const next = { ...current };
        if (nextAvailability === "available") {
          delete next[providerId];
        } else {
          next[providerId] = nextAvailability;
        }
        return next;
      });
      setAgentConnectedProviderIds((current) => {
        const next = new Set(current);
        if (nextConnected) {
          next.add(providerId);
        } else {
          next.delete(providerId);
        }
        return next;
      });
    }, 900);
  };

  const pauseAgentProvider = (providerId: AgentProviderId) => {
    showSettingsFeedback(
      tr("Paused", "已暂停"),
      tr(`${getAgentProviderName(providerId)} paused.`, `${getAgentProviderName(providerId)} 已暂停。`)
    );
  };

  const finishAgentProviderConnection = (nextStep: "manage" | "success") => {
    setAgentConnectedProviderIds((current) => new Set(current).add(agentSelectedProviderId));
    setAgentConnectedDeviceNames((prev) => ({ ...prev, [agentSelectedProviderId]: "MacBook Pro" }));
    setAgentGlobalConnectMode(agentConnectMode);
    setAgentInlineStep(nextStep);
    showSettingsFeedback(
      tr("Connected", "已连接"),
      tr(`${getAgentProviderName(agentSelectedProviderId)} connected.`, `${getAgentProviderName(agentSelectedProviderId)} 已连接。`)
    );
  };

  const confirmAgentProviderConnection = () => {
    finishAgentProviderConnection("success");
  };

  const confirmAgentProviderConnectionAndClose = () => {
    finishAgentProviderConnection("manage");
  };

  const allowAgentAuthPreviewAccess = () => {
    setAgentAuthPreviewOpen(false);
    setAgentSelectedProviderId(agentAuthPreviewProviderId);
    setAgentConnectedProviderIds((current) => new Set(current).add(agentAuthPreviewProviderId));
    setAgentConnectedDeviceNames((prev) => ({ ...prev, [agentAuthPreviewProviderId]: "MacBook Pro" }));
    setAgentGlobalConnectMode("agent");
    setAgentAuthPreviewSuccessOpen(true);
  };

  const testAgentByok = () => {
    const trimmedKey = agentByokKey.trim();

    if (agentByokTestStatus === "valid") {
      confirmAgentProviderConnection();
      return;
    }

    if (!trimmedKey) {
      setAgentByokTestStatus("invalid");
      setAgentByokTestMessage(tr("Enter API Key", "请输入API Key"));
      return;
    }

    setAgentByokTestStatus("testing");
    setAgentByokTestMessage("");

    window.setTimeout(() => {
      const looksUsable = /^sk-[A-Za-z0-9_-]{8,}$/.test(trimmedKey);

      if (!looksUsable) {
        setAgentByokTestStatus("invalid");
        setAgentByokTestMessage(tr(
          "This API Key is unavailable. Check that it starts with sk- and is complete.",
          "API 不可用：请确认 Key 以 sk- 开头且内容完整。"
        ));
        return;
      }

      setAgentByokTestStatus("valid");
      setAgentByokTestMessage(tr("API Key is available.", "API Key 可用。"));
    }, 900);
  };

  const copyAgentText = (text: string, successTitle: string, successMessage: string) => {
    if (!navigator.clipboard?.writeText) {
      showSettingsFeedback(tr("Copy manually", "请手动复制"), text);
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      showSettingsFeedback(successTitle, successMessage);
    }).catch(() => {
      showSettingsFeedback(tr("Copy failed", "复制失败"), tr("Please copy it manually.", "请手动复制。"));
    });
  };

  const copyAgentManualField = (text: string, label: string) => {
    copyAgentText(text, tr("Copied", "已复制"), tr(`${label} copied.`, `${label} 已复制。`));
  };

  const openAgentGuidePreview = (src: string) => {
    setAgentGuidePreviewImageSrc(src);
    setAgentGuidePreviewScale(1);
  };

  const closeAgentGuidePreview = () => {
    setAgentGuidePreviewImageSrc(null);
    setAgentGuidePreviewScale(1);
  };

  const zoomAgentGuidePreview = (direction: "in" | "out") => {
    setAgentGuidePreviewScale((current) => {
      const next = direction === "in" ? current + 0.25 : current - 0.25;
      return Math.min(3, Math.max(0.5, Number(next.toFixed(2))));
    });
  };

  const openAgentApiCreateModal = () => {
    setAgentApiCreateStep(1);
    setAgentApiNewName("");
    setAgentApiCreatedSecret("");
    setAgentApiCreateModalOpen(true);
  };

  const createAgentApiKey = () => {
    if (!agentApiNewName.trim()) {
      showSettingsFeedback(tr("Cannot create", "无法创建"), tr("Please enter an API name.", "请输入 API 名称。"));
      return;
    }
    setAgentApiCreatedSecret(createAgentApiSecret());
    setAgentApiCreateStep(2);
  };

  const finishAgentApiCreate = () => {
    if (!agentApiCreatedSecret || !agentApiNewName.trim()) {
      setAgentApiCreateModalOpen(false);
      return;
    }

    const now = new Date().toISOString().split("T")[0];
    const nextKey: AgentApiKeyItem = {
      id: Date.now().toString(),
      name: agentApiNewName.trim(),
      apiKey: agentApiCreatedSecret,
      skillVersion: AGENT_SKILL_LATEST,
      createdAt: now,
      updatedAt: now,
    };

    setAgentApiKeys((current) => [nextKey, ...current]);
    setAgentApiCreateModalOpen(false);
    setAgentApiCreateStep(1);
    setAgentApiNewName("");
    setAgentApiCreatedSecret("");
    showSettingsFeedback(tr("API key created", "API 密钥已创建"), tr("Paste the prompt into your AI agent to continue.", "将提示词粘贴到你的 AI Agent 中继续。"));
  };

  const toggleAgentApiKeyVisibility = (id: string) => {
    setAgentApiVisibleKeyIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveAgentApiName = (id: string) => {
    if (!agentApiEditNameValue.trim()) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("Name cannot be empty.", "名称不能为空。"));
      return;
    }

    const now = new Date().toISOString().split("T")[0];
    setAgentApiKeys((current) =>
      current.map((item) =>
        item.id === id ? { ...item, name: agentApiEditNameValue.trim(), updatedAt: now } : item
      )
    );
    setAgentApiEditingNameId(null);
    setAgentApiEditNameValue("");
    showSettingsFeedback(tr("API name updated", "API 名称已更新"), tr("The agent label has been saved.", "Agent 标签已保存。"));
  };

  const refreshAgentApiSkill = (id: string) => {
    const now = new Date().toISOString().split("T")[0];
    let alreadyLatest = false;

    setAgentApiKeys((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (item.skillVersion === AGENT_SKILL_LATEST) {
          alreadyLatest = true;
          return item;
        }
        return { ...item, skillVersion: AGENT_SKILL_LATEST, updatedAt: now };
      })
    );

    showSettingsFeedback(
      alreadyLatest ? tr("Already latest", "当前已是最新") : tr("Skill updated", "Skill 已更新"),
      alreadyLatest ? tr("This API key is already using the latest Skill.", "此 API 密钥已使用最新版 Skill。") : tr(`Skill updated to ${AGENT_SKILL_LATEST}.`, `Skill 已更新到 ${AGENT_SKILL_LATEST}。`)
    );
  };

  const deleteAgentApiKey = (id: string) => {
    setAgentApiKeys((current) => current.filter((item) => item.id !== id));
    setAgentApiDeleteConfirmId(null);
    showSettingsFeedback(tr("API key deleted", "API 密钥已删除"), tr("Agents using this key will lose access.", "使用此密钥的 Agent 将失去访问权限。"));
  };

  const copyAgentApiPrompt = (item: AgentApiKeyItem) => {
    const usesLatest = item.skillVersion === AGENT_SKILL_LATEST;
    copyAgentText(
      buildAgentSkillPrompt(item.apiKey, AGENT_SKILL_LATEST),
      usesLatest ? tr("Prompt copied", "提示词已复制") : tr("Latest prompt copied", "最新版提示词已复制"),
      usesLatest ? tr("Paste it into your AI agent.", "请粘贴到你的 AI Agent 中。") : tr(`Prompt uses Skill ${AGENT_SKILL_LATEST}.`, `提示词已使用 Skill ${AGENT_SKILL_LATEST}。`)
    );
  };

  const getAgentDefaultInlineStep = () => (agentConnectedProviderIds.size > 0 ? "manage" : "mode");

  const openAgentSettingsTab = () => {
    setSettingsActiveTab("agent");
    setSettingsAgentSection("web");
    setAgentInlineStep(getAgentDefaultInlineStep());
    setAgentModeSwitchWarning(false);
  };

  const openSettingsModal = () => {
    setSettingsActiveTab("general");
    setSettingsAgentSection("web");
    setAgentInlineStep(getAgentDefaultInlineStep());
    setAgentModeSwitchWarning(false);
    setSettingsOpen(true);
  };

  const closeSettingsModal = () => {
    setSettingsOpen(false);
    setSettingsActiveTab("general");
    setSettingsAgentSection("web");
    setAgentInlineStep(getAgentDefaultInlineStep());
    setAgentModeSwitchWarning(false);
    setSettingsEditingProfile(false);
    setSettingsEditingEmail(false);
    setSettingsEditingPassword(false);
    setSettingsEmailVerCode("");
    setSettingsEmailCodeSent(false);
    setSettingsNewEmail("");
    setSettingsPasswordVerCode("");
    setSettingsPasswordCodeSent(false);
    setSettingsNewPassword("");
    setSettingsConfirmPassword("");
    setSettingsLogoutConfirmOpen(false);
  };

  const handleCancelSettingsProfile = () => {
    setSettingsNickname(settingsOriginalNickname);
    setSettingsEditingProfile(false);
  };

  const handleSaveSettingsProfile = () => {
    if (!settingsNickname.trim()) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("Nickname cannot be empty.", "昵称不能为空。"));
      return;
    }

    const trimmedNickname = settingsNickname.trim();
    updateUser({
      displayName: trimmedNickname,
    });
    setSettingsNickname(trimmedNickname);
    setSettingsOriginalNickname(trimmedNickname);
    setSettingsEditingProfile(false);
    showSettingsFeedback(tr("Profile updated", "资料已更新"), tr("Nickname saved.", "昵称已保存。"));
  };

  const handleCancelSettingsEmail = () => {
    setSettingsEmailVerCode("");
    setSettingsEmailCodeSent(false);
    setSettingsNewEmail("");
    setSettingsEditingEmail(false);
  };

  const handleSaveSettingsEmail = () => {
    const nextEmail = settingsNewEmail.trim();
    if (!settingsEmailVerCode.trim()) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("Enter the verification code.", "请输入验证码。"));
      return;
    }
    if (!nextEmail) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("Enter the new email address.", "请输入新邮箱地址。"));
      return;
    }
    if (!isValidEmailAddress(nextEmail)) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("Enter a valid email address.", "请输入有效的邮箱地址。"));
      return;
    }

    setSettingsEmail(nextEmail);
    updateUser({ email: nextEmail });
    setSettingsEmailVerCode("");
    setSettingsEmailCodeSent(false);
    setSettingsNewEmail("");
    setSettingsEditingEmail(false);
    showSettingsFeedback(tr("Email updated", "邮箱已更新"), tr("New email address saved.", "新邮箱地址已保存。"));
  };

  const handleCancelSettingsPassword = () => {
    setSettingsPasswordVerCode("");
    setSettingsPasswordCodeSent(false);
    setSettingsNewPassword("");
    setSettingsConfirmPassword("");
    setSettingsEditingPassword(false);
  };

  const handleSaveSettingsPassword = () => {
    if (!settingsPasswordVerCode.trim()) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("Enter the verification code.", "请输入验证码。"));
      return;
    }
    if (settingsNewPassword.length < 8) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("New password must be at least 8 characters.", "新密码至少需要 8 位。"));
      return;
    }
    if (settingsNewPassword !== settingsConfirmPassword) {
      showSettingsFeedback(tr("Cannot save", "无法保存"), tr("The two passwords do not match.", "两次输入的密码不一致。"));
      return;
    }

    setSettingsPasswordVerCode("");
    setSettingsPasswordCodeSent(false);
    setSettingsNewPassword("");
    setSettingsConfirmPassword("");
    setSettingsEditingPassword(false);
    showSettingsFeedback(tr("Password updated", "密码已更新"), tr("Use the new password on your next login.", "下次登录请使用新密码。"));
  };

  const handleConfirmLogout = () => {
    setSettingsLogoutConfirmOpen(false);
    setSettingsOpen(false);
    logout();
    navigateWithTransition("/auth");
  };

  const openStrategyDetail = (strategy: (typeof strategies)[number]) => {
    setSelectedStrategy(strategy);
    setCurveRange("365D");
  };

  const detailModel = useMemo(() => {
    if (!selectedStrategy) return null;
    const roi = parseMetricValue(selectedStrategy.annualReturn);
    const drawdown = parseMetricValue(selectedStrategy.maxDrawdown);
    const winRate = parseMetricValue(selectedStrategy.winRate);
    const initialEquity = 438000;
    const totalReturn = (initialEquity * roi) / 100;
    const currentEquity = initialEquity + totalReturn;
    const realizedPnl = totalReturn * 0.995;
    const unrealizedPnl = totalReturn - realizedPnl;
    const calmar = selectedStrategy.sharpe > 0 ? selectedStrategy.sharpe * 1.89 : 0;
    const profitLossRatio = winRate > 0 ? (winRate / Math.max(100 - winRate, 1)) * 2.1 : 0;
    const totalFees = Math.abs(totalReturn) * 0.1268;
    const pointsByRange: Record<CurveRange, number> = { "7D": 18, "30D": 30, "90D": 45, "365D": 64 };
    const series = buildDetailSeries(pointsByRange[curveRange], 99100, roi * 2.1, Math.max(46, Math.abs(roi) * 3.2));
    const benchmark = buildDetailSeries(pointsByRange[curveRange], 98980, Math.max(12, roi * 0.45), 52);

    return {
      roi,
      drawdown,
      winRate,
      currentEquity,
      totalReturn,
      realizedPnl,
      unrealizedPnl,
      calmar,
      profitLossRatio,
      totalFees,
      equityPath: buildLinePath(series, 640, 210),
      benchmarkPath: buildLinePath(benchmark, 640, 210),
      fundRows: [
        [tr("Peak Equity", "最高权益"), `${(currentEquity * 1.11).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`],
        [tr("Min Equity", "最低权益"), `${Math.max(initialEquity * (1 - drawdown / 100), initialEquity * 0.5).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`],
        [tr("Realized PnL", "已实现盈亏"), `${fmtSigned(realizedPnl)} USDT`],
        [tr("Unrealized PnL", "未实现盈亏"), `${fmtSigned(unrealizedPnl)} USDT`],
      ],
      perfRows: [
        [tr("Sharpe Ratio", "夏普比率"), selectedStrategy.sharpe.toFixed(2)],
        [tr("Calmar Ratio", "Calmar比率"), calmar.toFixed(2)],
        [tr("Win Rate", "胜率"), `${winRate.toFixed(2)}%`],
        [tr("Profit/Loss Ratio", "盈亏比"), profitLossRatio.toFixed(2)],
      ],
      tradeRows: [
        [tr("Trading Days", "交易天数"), "1097"],
        [tr("Total Trades", "总交易次数"), "286"],
        [tr("Max Exposure", "最大敞口"), "99.73%"],
        [tr("Total Fees", "总手续费"), `${totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`],
      ],
      configRows: [
        [tr("Strategy ID", "策略 ID"), selectedStrategy.id],
        [tr("Created Date", "创建时间"), `${selectedStrategy.updatedAt} 00:00`],
        [tr("Strategy Type", "策略类型"), selectedStrategy.market === "Mixed" ? tr("Cross Section", "截面策略") : tr("Time Series", "时序策略")],
        [tr("Symbol", "交易对"), selectedStrategy.tags.includes("BTC") ? "BTCUSDT" : selectedStrategy.market === "DEX" ? "ETHUSDT, DeFi Basket" : "Top 50 Crypto"],
        [tr("Signal", "因子"), selectedStrategy.tags.join(", ")],
        [tr("Factor Weights", "因子权重"), tr("Equal Weight", "等权")],
        [tr("Stop Loss", "止损"), `${Math.max(3, Math.min(18, drawdown * 0.65)).toFixed(1)}%`],
        [tr("Cooldown", "冷却时间"), tr("6 hours", "6 小时")],
        [tr("Strategy Side", "策略方向"), selectedStrategy.market === "DEX" ? tr("Long-Only", "仅做多") : tr("Market-Neutral", "市场中性")],
        [tr("Top/Tail Rule", "头尾分层规则"), selectedStrategy.market === "Mixed" ? tr("Top/Tail 20%", "头部/尾部 20%") : tr("N/A", "未设置")],
      ],
    };
  }, [curveRange, selectedStrategy, tr]);

  return (
    <main className="game-landing" aria-label="Pixel lakeside game landing">
      <style>{`
        @font-face {
          font-family: "阿里妈妈方圆体 VF Regular";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        @font-face {
          font-family: "Alimama FangYuanTi VF";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        @font-face {
          font-family: "Alimama Fang YuanTi VF";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        .game-landing {
          --ink: #5a321d;
          --ink-dark: #2f1a12;
          --ac-primary: #19c8b9;
          --ac-primary-bg: #e6f9f6;
          --ac-text: #794f27;
          --ac-text-body: #725d42;
          --ac-border: #c4b89e;
          --ac-border-hover: #a89878;
          --ac-cream: rgb(247, 243, 223);
          --ac-cream-light: #f8f8f0;
          --ac-shadow: #bdaea0;
          --ac-shadow-input: #d4c9b4;
          --ac-focus-yellow: #ffcc00;
          --radius-xs: 4px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 10px;
          --BEVL: 1;
          --modal-title-font: var(--font-rounded-current);
          position: relative;
          min-height: 100svh;
          height: 100dvh;
          overflow: hidden;
          background: #5DBFF6;
          font-family: var(--font-rounded-current);
          font-variation-settings: "BEVL" var(--BEVL);
          image-rendering: pixelated;
          isolation: isolate;
        }

        .game-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          image-rendering: pixelated;
          user-select: none;
          pointer-events: none;
        }

        .game-landing::after {
          content: none;
        }

        .game-stage {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 1902px;
          height: 1080px;
          transform: translate(-50%, -50%) scale(var(--stage-scale));
          transform-origin: center center;
        }

        .game-stage--mobile-cover .hud-top-stats {
          left: calc(var(--mobile-safe-left) + 14px);
          top: calc(var(--mobile-safe-top) + 12px);
          --hud-stats-gap: calc(4.8px / var(--stage-scale));
          --hud-stat-height: calc(40px / var(--stage-scale));
          --hud-stat-padding: calc(6px / var(--stage-scale));
          --hud-stat-border-width: 2px;
          --hud-stat-radius: calc(8px / var(--stage-scale));
          --hud-stat-font-size: calc(13.6px / var(--stage-scale));
          --hud-stat-balance-width: calc(60.8px / var(--stage-scale));
          --hud-stat-compact-width: calc(41.6px / var(--stage-scale));
          --hud-stat-icon-scale: calc(.576 / var(--stage-scale));
        }

        .game-stage--mobile-cover .top-actions {
          left: calc(var(--mobile-safe-left) + var(--mobile-visible-width) - ((54px + 10px) / var(--stage-scale)));
          right: auto;
          top: calc(var(--mobile-safe-top) + 88px);
          width: calc(54px / var(--stage-scale));
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          align-content: center;
          flex-wrap: nowrap;
          gap: 10px;
          max-height: none;
          transform: none;
          transform-origin: top right;
        }

        .game-stage--mobile-cover .top-actions--mvp {
          top: calc(var(--mobile-safe-top) + 12px);
        }

        .game-stage--mobile-cover .menu-item {
          width: calc(54px / var(--stage-scale));
          height: calc(64px / var(--stage-scale));
        }

        .game-stage--mobile-cover .menu-label {
          bottom: 0;
          font-size: calc(14px / var(--stage-scale));
          letter-spacing: 0;
        }

        .game-stage--mobile-cover.top-actions--en .menu-label,
        .game-stage--mobile-cover .top-actions--en .menu-label {
          --menu-label-font-size: 14px;
          font-size: 14px;
        }

        .game-stage--mobile-cover .test-scenario-panel {
          width: min(calc(260px / var(--stage-scale)), calc(var(--mobile-visible-width) - 116px));
          max-height: min(calc(420px / var(--stage-scale)), calc(var(--mobile-visible-height) - 330px));
          overflow: hidden;
          touch-action: auto;
          gap: calc(10px / var(--stage-scale));
          padding: calc(12px / var(--stage-scale));
          background: rgba(255, 253, 244, .68);
          border: 2px solid rgba(196, 184, 158, .48);
          border-radius: calc(10px / var(--stage-scale));
          box-shadow: 0 calc(5px / var(--stage-scale)) 0 rgba(78, 67, 60, .18);
          overscroll-behavior: contain;
          transform: none;
          transform-origin: top left;
          backdrop-filter: blur(8px);
        }

        .game-stage--mobile-cover .test-scenario-panel__body {
          flex: 1 1 auto;
          min-height: 0;
          max-height: calc(340px / var(--stage-scale));
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          gap: calc(12px / var(--stage-scale));
          touch-action: pan-y;
        }

        .game-stage--mobile-cover .test-scenario-group {
          gap: calc(8px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-group + .test-scenario-group {
          padding-top: calc(10px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-panel__header {
          min-height: calc(48px / var(--stage-scale));
          cursor: grab;
        }

        .game-stage--mobile-cover .test-scenario-panel__title {
          font-size: calc(16px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-panel__toggle {
          min-width: calc(64px / var(--stage-scale));
          height: calc(44px / var(--stage-scale));
          padding-inline: calc(14px / var(--stage-scale));
          font-size: calc(13px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-version-segment {
          height: calc(44px / var(--stage-scale));
          font-size: calc(14px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-button {
          min-width: 0;
          width: 100%;
          min-height: calc(50px / var(--stage-scale));
          height: auto;
          padding: 0 calc(14px / var(--stage-scale));
          font-size: calc(15px / var(--stage-scale));
          line-height: 1.2;
          white-space: normal;
        }

        .game-stage--mobile-cover .test-scenario-button-group {
          gap: calc(8px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-field {
          min-width: 0;
          padding: calc(8px / var(--stage-scale)) calc(10px / var(--stage-scale)) calc(10px / var(--stage-scale));
          gap: calc(6px / var(--stage-scale));
          border-radius: calc(6px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-field__label {
          font-size: calc(12px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-field__input {
          height: calc(36px / var(--stage-scale));
          padding-inline: calc(10px / var(--stage-scale));
          font-size: calc(14px / var(--stage-scale));
          border-radius: calc(6px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-panel.is-collapsed {
          width: calc(184px / var(--stage-scale));
          height: 36px;
          max-height: none;
          justify-content: center;
          overflow: visible;
          gap: 0;
          padding: 0 calc(9px / var(--stage-scale));
          border-radius: 8px;
        }

        .game-stage--mobile-cover .test-scenario-panel.is-collapsed .test-scenario-panel__header {
          width: calc(166px / var(--stage-scale));
          min-height: 36px;
          height: 36px;
          margin: 0 auto;
          gap: calc(6px / var(--stage-scale));
          padding: 0;
        }

        .game-stage--mobile-cover .test-scenario-panel.is-collapsed .test-scenario-panel__title {
          font-size: calc(14px / var(--stage-scale));
        }

        .game-stage--mobile-cover .test-scenario-panel.is-collapsed .test-scenario-panel__toggle {
          width: calc(56px / var(--stage-scale));
          min-width: calc(56px / var(--stage-scale));
          height: 30px;
          padding-inline: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: calc(14px / var(--stage-scale));
        }

        .game-stage--mobile-cover .hud-bottom-bar {
          bottom: calc(20px / var(--stage-scale));
          gap: calc(12px / var(--stage-scale));
          transform: translateX(-50%);
          transform-origin: bottom center;
          overscroll-behavior: none;
          touch-action: manipulation;
        }

        .game-stage--mobile-cover .cast-auto-button {
          width: calc(248px / var(--stage-scale));
          height: calc(60px / var(--stage-scale));
          margin-bottom: calc(-14px / var(--stage-scale));
          padding-inline: calc(18px / var(--stage-scale));
          border-radius: calc(18px / var(--stage-scale)) calc(18px / var(--stage-scale)) 0 0;
          touch-action: manipulation;
          transform: translateY(calc(10px / var(--stage-scale)));
        }

        .game-stage--mobile-cover .hud-main-action {
          width: calc(248px / var(--stage-scale));
          touch-action: manipulation;
        }

        .game-stage--mobile-cover .hud-main-action--waiting {
          padding: calc(14px / var(--stage-scale)) calc(16px / var(--stage-scale));
          column-gap: calc(8px / var(--stage-scale));
        }

        .game-stage--mobile-cover .hud-main-action--waiting .hud-main-action__tool {
          width: calc(56px / var(--stage-scale));
          height: calc(56px / var(--stage-scale));
        }

        .game-stage--mobile-cover .hud-main-action__waiting {
          gap: calc(7px / var(--stage-scale));
        }

        .game-stage--mobile-cover .hud-main-action--waiting .hud-main-action__waiting-title {
          font-size: 20px;
          line-height: 1.12;
          padding-bottom: 0;
        }

        .game-stage--mobile-cover .hud-main-action--waiting .hud-main-action__timer {
          font-size: 30px;
        }

        .game-stage--mobile-cover .hud-main-action--waiting .hud-main-action__stop {
          height: calc(44px / var(--stage-scale));
          min-width: calc(64px / var(--stage-scale));
          padding-inline: calc(12px / var(--stage-scale));
          font-size: 20px;
        }

        .game-stage--mobile-cover .hud-basket {
          width: calc(80px / var(--stage-scale));
          height: calc(88px / var(--stage-scale));
          flex-basis: calc(80px / var(--stage-scale));
          border-radius: calc(12px / var(--stage-scale));
          touch-action: manipulation;
        }

        .game-stage--mobile-cover .hud-basket__shell {
          inset: 0 0 calc(-8px / var(--stage-scale));
          border-radius: calc(12px / var(--stage-scale));
          overflow: hidden;
          clip-path: inset(0 0 0 0 round calc(12px / var(--stage-scale)));
          backface-visibility: hidden;
        }

        .game-stage--mobile-cover .hud-basket__icon {
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          image-rendering: auto;
        }

        .game-stage--mobile-cover .hud-basket:not(:disabled):active .hud-basket__shell {
          clip-path: inset(0 0 calc(8px / var(--stage-scale)) 0 round calc(12px / var(--stage-scale)));
        }

        .game-stage--mobile-cover .cast-auto-title {
          font-size: calc(15px / var(--stage-scale));
          transform: translateY(calc(-12px / var(--stage-scale)));
        }

        .game-stage--mobile-cover .cast-auto-status,
        .game-stage--mobile-cover .cast-auto-stop {
          font-size: calc(13px / var(--stage-scale));
        }

        .game-stage--mobile-cover .cast-auto-stop {
          min-width: calc(64px / var(--stage-scale));
          height: calc(44px / var(--stage-scale));
        }

        .game-landing:has(.game-stage--mobile-cover) .cast-count-stepper,
        .game-landing:has(.game-stage--mobile-cover) .auto-cast-modal__button {
          box-shadow: none;
          transform: none;
        }

        .game-landing:has(.game-stage--mobile-cover) .cast-count-stepper:hover,
        .game-landing:has(.game-stage--mobile-cover) .cast-count-stepper:active,
        .game-landing:has(.game-stage--mobile-cover) .auto-cast-modal__button:hover,
        .game-landing:has(.game-stage--mobile-cover) .auto-cast-modal__button:active {
          box-shadow: none;
          transform: none;
          filter: none;
        }

        .game-stage--mobile-cover .hud-basket-empty-toast {
          min-width: calc(112px / var(--stage-scale));
          padding: calc(10px / var(--stage-scale)) calc(16px / var(--stage-scale));
          font-size: calc(16px / var(--stage-scale));
        }

        .test-scenario-panel {
          position: absolute;
          left: 34px;
          top: 124px;
          z-index: 8;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 253, 244, .6);
          border: 0;
          border-radius: 10px;
          box-shadow: 0 4px 0 rgba(189, 174, 160, .35);
          image-rendering: auto;
          touch-action: auto;
          user-select: none;
        }

        .test-scenario-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 2px;
          cursor: grab;
          touch-action: none;
        }

        .test-scenario-panel__header:active {
          cursor: grabbing;
        }

        .test-scenario-panel__title {
          color: var(--ac-text);
          font-size: 16px;
          font-weight: 1000;
          line-height: 1;
          white-space: nowrap;
        }

        .test-scenario-panel__toggle {
          appearance: none;
          min-width: 0;
          height: 28px;
          padding: 0 10px;
          color: #7c5a2b;
          background: rgba(255, 255, 255, .72);
          border: 1px solid rgba(196, 184, 158, .88);
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
          white-space: nowrap;
        }

        .test-scenario-panel__toggle:hover,
        .test-scenario-panel__toggle:focus-visible {
          color: var(--ac-text);
          background: #fff;
          outline: none;
        }

        .test-scenario-panel__body {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }

        .test-scenario-group {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }

        .test-scenario-group + .test-scenario-group {
          padding-top: 12px;
          border-top: 1.5px dashed rgba(196, 184, 158, .54);
        }

        .test-scenario-group__title {
          color: rgba(121, 79, 39, .42);
          font-size: 12px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .test-version-segmented {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px;
          padding: 4px;
          background: rgba(255, 247, 227, .82);
          border-radius: 8px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .62);
        }

        .test-version-segment {
          appearance: none;
          min-width: 0;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          color: rgba(121, 79, 39, .66);
          background: transparent;
          border: 0;
          border-radius: 6px;
          cursor: pointer;
          font: inherit;
          font-size: 16px;
          font-weight: 1000;
          line-height: 1;
          white-space: nowrap;
          transition: background .15s ease, color .15s ease, transform .15s ease;
        }

        .test-version-segment:hover,
        .test-version-segment:focus-visible {
          color: var(--ac-text);
          background: rgba(255, 213, 87, .2);
          outline: none;
        }

        .test-version-segment.is-active {
          color: #5a3e00;
          background: #ffd557;
          box-shadow: 0 2px 0 rgba(189, 174, 160, .4);
        }

        .test-scenario-button {
          appearance: none;
          min-width: 182px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          color: rgba(121, 79, 39, .68);
          background: rgba(255, 253, 244, .72);
          border: 3px dashed rgba(196, 184, 158, .74);
          border-radius: 6px;
          box-shadow: none;
          cursor: pointer;
          font: inherit;
          font-size: 18px;
          font-weight: 900;
          line-height: 1;
          white-space: nowrap;
          transition: background .15s ease, border-color .15s ease, color .15s ease, transform .15s ease;
        }

        .test-scenario-button:hover,
        .test-scenario-button:focus-visible {
          color: var(--ac-text);
          background: rgba(255, 213, 87, .12);
          border-color: rgba(168, 152, 120, .9);
          outline: none;
          transform: translateY(-1px);
        }

        .test-scenario-button-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .test-scenario-field {
          min-width: 182px;
          display: grid;
          gap: 6px;
          padding: 8px 10px 10px;
          color: rgba(121, 79, 39, .72);
          background: rgba(255, 253, 244, .72);
          border: 2px solid rgba(196, 184, 158, .58);
          border-radius: 6px;
        }

        .test-scenario-field__label {
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
        }

        .test-scenario-field__input {
          width: 100%;
          min-width: 0;
          height: 34px;
          padding: 0 10px;
          color: var(--ac-text);
          background: rgba(255, 255, 255, .76);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: 6px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .72);
          font: inherit;
          font-family: var(--font-rounded-numeric);
          font-size: 15px;
          font-weight: var(--font-rounded-numeric-weight, 500);
          font-variant-numeric: tabular-nums;
          line-height: 1;
          outline: none;
        }

        .test-scenario-field__input:focus {
          border-color: rgba(255, 213, 87, .96);
          background: #fff;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, .9),
            0 0 0 2px rgba(255, 213, 87, .3);
        }

        .test-scenario-button--preview {
          height: 44px;
          font-size: 16px;
          border-style: solid;
        }

        .top-actions {
          --menu-label-font-size: 20px;
          position: absolute;
          right: 40px;
          top: 36px;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
          z-index: 2;
        }

        .top-actions--en .menu-label {
          letter-spacing: 0;
        }

        .top-actions--en .menu-label::before {
          -webkit-text-stroke-width: 3px;
        }

        .menu-item {
          position: relative;
          width: 90px;
          height: 90px;
          border: 0;
          border-radius: 16px;
          background: transparent;
          padding: 0;
          display: block;
          cursor: pointer;
          font: inherit;
        }

        .menu-icon {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          object-fit: contain;
          image-rendering: pixelated;
        }

        .menu-label {
          position: absolute;
          left: 50%;
          bottom: 4px;
          max-width: 100%;
          transform: translateX(-50%);
          color: #FFF;
          text-align: center;
          -webkit-text-stroke-width: 0;
          -webkit-text-stroke-color: transparent;
          font-size: var(--menu-label-font-size);
          font-weight: 900;
          letter-spacing: .08em;
          white-space: nowrap;
          text-shadow: 0 2px 0 rgba(0, 0, 0, .15);
        }

        .menu-label::before {
          content: attr(data-label);
          position: absolute;
          inset: 0;
          z-index: -1;
          color: #FFF;
          text-align: center;
          -webkit-text-stroke-width: 4px;
          -webkit-text-stroke-color: #4E433C;
          text-shadow: none;
        }

        .hud-bottom-bar {
          position: absolute;
          left: 50%;
          bottom: 40px;
          transform: translateX(-50%);
          display: flex;
          align-items: flex-end;
          gap: 30px;
          z-index: 2;
        }

        .hud-cast-stack {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
        }

        .cast-auto-inline {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          justify-content: center;
          margin-bottom: -6px;
          position: relative;
          z-index: 1;
          transition: transform 80ms ease;
        }

        .hud-cast-stack:has(.hud-main-action:active) .cast-auto-inline {
          transform: translateY(8px);
        }

        .hud-disconnected-actions {
          position: relative;
          width: 456px;
          height: 232px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
        }

        .hud-disconnected-actions__tip {
          position: relative;
          width: 456px;
          height: 92px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 22px;
          padding: 16px 12px;
          color: #fd5f5a;
          background: #ffedb7;
          border: 0;
          border-radius: 16px;
          box-shadow: 0 8px 0 #4e433c;
          cursor: pointer;
          font: inherit;
          font-size: 30px;
          font-weight: 700;
          line-height: normal;
          white-space: nowrap;
          transition: transform 80ms ease, filter 120ms ease, box-shadow 80ms ease;
        }

        .hud-disconnected-actions__tip:hover {
          filter: brightness(1.02);
        }

        .hud-disconnected-actions__tip.is-en {
          font-size: 26px;
        }

        .hud-disconnected-actions__tip:active {
          transform: translateY(6px);
          box-shadow: none;
        }

        .hud-disconnected-actions__tip:active::after {
          opacity: 0;
        }

        .hud-disconnected-actions__tip::before,
        .hud-disconnected-actions__tip::after {
          content: "";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .hud-disconnected-actions__tip::after {
          bottom: -17px;
          width: 34px;
          height: 17px;
          background: #4e433c;
          clip-path: path("M 0 0 H 34 L 19.828 14.172 Q 17 17 14.172 14.172 Z");
        }

        .hud-disconnected-actions__tip::before {
          bottom: -9px;
          z-index: 1;
          width: 26px;
          height: 13px;
          background: #ffedb7;
          clip-path: path("M 0 0 H 26 L 15.828 10.172 Q 13 13 10.172 10.172 Z");
        }

        .hud-disconnected-actions__tip-icon {
          flex: 0 0 auto;
          width: 60px;
          height: 60px;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }

        .hud-disconnected-actions__tip-label {
          position: relative;
          z-index: 2;
          max-width: 100%;
          display: inline-block;
          white-space: nowrap;
        }

        .hud-disconnected-actions__main {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          transition: transform 80ms ease;
        }

        @media (prefers-reduced-motion: reduce) {
          .hud-disconnected-actions__tip,
          .hud-disconnected-actions__main {
            transition: none;
          }
        }

        .hud-disconnected-actions__cast {
          flex: 0 0 auto;
          height: 120px;
          display: flex;
          align-items: center;
          gap: 36px;
          padding: 20px 40px;
          color: inherit;
          background: #eeece8;
          border: 0;
          border-radius: 16px;
          box-shadow: none;
          cursor: not-allowed;
          font: inherit;
        }

        .hud-disconnected-actions__cast-tool {
          flex: 0 0 auto;
          width: 80px;
          height: 79px;
          object-fit: contain;
          image-rendering: pixelated;
          opacity: .3;
          filter: grayscale(1) saturate(0);
        }

        .hud-disconnected-actions__cast-label {
          position: relative;
          z-index: 0;
          display: inline-block;
          max-width: 100%;
          color: #fff;
          -webkit-text-fill-color: #fff;
          text-align: center;
          font-family: var(--font-rounded-current);
          font-size: 50px;
          font-style: normal;
          font-weight: 700;
          font-synthesis: none;
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 100%;
          letter-spacing: 5px;
          opacity: .3;
          paint-order: stroke fill;
          stroke-linecap: round;
          stroke-linejoin: round;
          white-space: nowrap;
        }

        .hud-disconnected-actions__cast-label::before {
          content: attr(data-label);
          position: absolute;
          inset: 0;
          z-index: -1;
          color: #fff;
          text-align: center;
          -webkit-text-fill-color: #fff;
          -webkit-text-stroke-width: 10px;
          -webkit-text-stroke-color: #4e433c;
          paint-order: stroke fill;
          stroke-linecap: round;
          stroke-linejoin: round;
          text-shadow:
            0 1px 0 #4e433c,
            1px 0 0 #4e433c,
            0 -1px 0 #4e433c,
            -1px 0 0 #4e433c,
            1px 1px 0 #4e433c,
            -1px 1px 0 #4e433c,
            1px -1px 0 #4e433c,
            -1px -1px 0 #4e433c;
        }

        .hud-disconnected-actions__basket {
          position: relative;
          flex: 0 0 120px;
          width: 120px;
          height: 120px;
          padding: 0;
          background: transparent;
          border: 0;
          border-radius: 16px;
          box-shadow: none;
          cursor: not-allowed;
          font: inherit;
          overflow: visible;
        }

        .hud-disconnected-actions__basket-icon {
          position: absolute;
          inset: 0;
          width: 120px;
          height: 120px;
          object-fit: fill;
          pointer-events: none;
          user-select: none;
          opacity: 1;
        }

        .hud-basket-empty-toast {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 12px);
          transform: translateX(-50%);
          z-index: 3;
          min-width: 94px;
          padding: 8px 14px;
          color: #6f431f;
          background: #fff7df;
          border: 2px solid rgba(196, 184, 158, .92);
          border-radius: 999px;
          box-shadow: 0 4px 0 rgba(78, 67, 60, .28), inset 0 2px 0 rgba(255, 255, 255, .72);
          font-size: 14px;
          font-weight: 950;
          line-height: 1.2;
          text-align: center;
          white-space: nowrap;
          pointer-events: none;
          animation: hud-basket-toast-pop 160ms ease-out;
        }

        .hud-basket-empty-toast::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -8px;
          width: 12px;
          height: 12px;
          background: #fff7df;
          border-right: 2px solid rgba(196, 184, 158, .92);
          border-bottom: 2px solid rgba(196, 184, 158, .92);
          transform: translateX(-50%) rotate(45deg);
        }

        @keyframes hud-basket-toast-pop {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(6px) scale(.96);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .cast-auto-button,
        .cast-auto-stop {
          appearance: none;
          border: 0;
	          color: #4e433c;
	          cursor: pointer;
	          font: inherit;
	          line-height: 1;
	        }

	        .cast-auto-button {
	          display: inline-flex;
	          align-items: center;
		          justify-content: center;
	          gap: 12px;
	          width: 270px;
	          height: 34px;
	          margin-bottom: 2px;
	          padding: 0 14px;
	          background: rgb(255, 247, 227);
	          border: 0;
	          border-radius: 12px 12px 0 0;
	          box-shadow: inset 0 2px 0 rgba(255, 255, 255, .54);
	          transition: transform 80ms ease, box-shadow 80ms ease, background 120ms ease, color 120ms ease;
	        }

        .cast-auto-button:disabled {
          cursor: not-allowed;
        }

        button.cast-auto-button:not(:disabled):hover {
          transform: translateY(-2px);
        }

        .cast-auto-button.is-disabled {
          color: rgba(78, 67, 60, .46);
          background: rgba(255, 247, 227, .64);
          cursor: not-allowed;
          filter: grayscale(.25);
        }

        .cast-auto-button.is-running {
          background: #ebf3e7;
          cursor: default;
          box-shadow: inset 0 2px 0 rgba(255, 255, 255, .54);
        }

	        .cast-auto-button:not(:disabled):active,
	        .cast-auto-stop:active {
	          transform: translateY(1px);
	          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .4);
	        }

	        .cast-auto-title {
	          color: rgba(78, 67, 60, .74);
	          font-size: 16px;
	          font-weight: 1000;
	          line-height: 1;
	          white-space: nowrap;
	        }

	        .cast-auto-button.is-running .cast-auto-title {
	          color: #4e433c;
	        }

	        .cast-auto-status {
	          margin-left: auto;
	          color: rgba(78, 67, 60, .58);
	          font-size: 12px;
	          font-weight: 950;
	          white-space: nowrap;
	        }

	        .cast-auto-status.is-running {
	          color: #0f8a65;
	        }

	        .cast-auto-stop {
	          height: 24px;
	          padding: 0 10px;
	          background: #fff8e6;
	          border-radius: 6px;
	          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .55);
	          color: #7f2f24;
	          font-size: 12px;
	          font-weight: 1000;
	          transition: transform 80ms ease, box-shadow 80ms ease, filter 80ms ease;
	        }

	        .cast-count-stepper {
	          appearance: none;
	          border: 0;
	          color: #4e433c;
	          background: transparent;
	          cursor: pointer;
	          font: inherit;
	          font-size: 18px;
	          font-weight: 900;
	          line-height: 1;
	        }

	        .cast-count-control {
	          display: inline-flex;
	          align-items: center;
	          gap: 8px;
	          color: #4e433c;
	          font-size: 17px;
	          font-weight: 900;
	          white-space: nowrap;
	        }

	        .cast-count-control--modal {
	          justify-content: center;
	        }

	        .cast-count-stepper {
	          width: 34px;
	          height: 34px;
	          display: grid;
	          place-items: center;
	          background: #fffdf4;
	          border: 2px solid rgba(78, 67, 60, .56);
	          border-radius: 8px;
	          box-shadow: 0 3px 0 rgba(78, 67, 60, .38);
	        }

	        .cast-count-stepper:disabled {
	          opacity: .45;
	          cursor: not-allowed;
	          box-shadow: none;
	        }

	        .cast-count-input {
	          width: 72px;
	          height: 36px;
	          color: #1f180f;
	          background: #fffdf4;
	          border: 2px solid rgba(78, 67, 60, .62);
	          border-radius: 8px;
	          font: inherit;
	          font-size: 18px;
	          font-weight: 1000;
	          line-height: 1;
	          text-align: center;
	          box-shadow: inset 0 2px 0 rgba(78, 67, 60, .12);
	        }

	        .cast-count-input::-webkit-outer-spin-button,
	        .cast-count-input::-webkit-inner-spin-button {
	          margin: 0;
	          appearance: none;
	        }

	        .auto-cast-modal {
	          width: min(420px, calc(100vw - 36px));
	          color: var(--ac-text);
	          background: linear-gradient(180deg, #fff9ea 0%, #f8edcf 100%);
	          border: 3px solid var(--ac-border);
	          border-radius: 12px;
	          box-shadow:
	            inset 0 2px 0 rgba(255,255,255,.62),
	            0 7px 0 rgba(78, 67, 60, .34),
	            0 24px 50px rgba(61, 52, 40, .26);
	          overflow: hidden;
	        }

	        .auto-cast-modal__body {
	          display: grid;
	          gap: 8px;
	          padding: 22px 24px 16px;
	        }

	        .auto-cast-field {
	          display: grid;
	          gap: 12px;
	          color: var(--ac-text);
	          font-size: 14px;
	          font-weight: 950;
	        }

	        .auto-cast-field > span {
	          text-align: center;
	        }

	        .auto-cast-modal__hint {
	          margin: 0;
	          color: #725d42;
	          font-size: 12px;
	          font-weight: 850;
	          text-align: center;
	        }

	        .auto-cast-modal__actions {
	          display: flex;
	          justify-content: center;
	          gap: 12px;
	          padding: 16px 24px 22px;
        }

	        .auto-cast-modal__button {
	          min-width: 92px;
	          height: 40px;
	          color: var(--ac-text);
	          border: 2px solid rgba(78, 67, 60, .64);
	          border-radius: 8px;
	          box-shadow: 0 3px 0 rgba(78, 67, 60, .36);
	          cursor: pointer;
	          font: inherit;
	          font-size: 14px;
	          font-weight: 1000;
        }

	        .auto-cast-modal__button--ghost {
	          background: #fffdf4;
        }

	        .auto-cast-modal__button--primary {
	          background: #9bdc5c;
        }

        .basket-reward-modal {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: rgba(0, 0, 0, .65);
          backdrop-filter: blur(40px);
          isolation: isolate;
          animation: basketRewardOverlayIn 320ms cubic-bezier(.22, 1, .36, 1) both;
        }

        .basket-reward-modal__coin-halo {
          position: fixed;
          z-index: 0;
          top: 50%;
          left: 50%;
          width: 115vmax;
          height: 115vmax;
          pointer-events: none;
          user-select: none;
          background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 236, .95) 0 7%, rgba(255, 221, 94, .74) 12%, rgba(255, 177, 26, .28) 25%, transparent 45%),
            repeating-conic-gradient(from -8deg at 50% 50%, rgba(255, 246, 171, .58) 0deg 6deg, rgba(255, 199, 47, .22) 6deg 11deg, transparent 11deg 23deg),
            radial-gradient(circle at 50% 50%, rgba(255, 197, 54, .32) 0 32%, transparent 70%);
          mix-blend-mode: screen;
          opacity: 0;
          transform: translate(-50%, -50%) scale(.54);
          will-change: opacity, transform;
          -webkit-mask: radial-gradient(circle at 50% 50%, #000 0 63%, transparent 75%);
          mask: radial-gradient(circle at 50% 50%, #000 0 63%, transparent 75%);
          animation: basketRewardCoinHaloIn 760ms cubic-bezier(.25, 1, .5, 1) 80ms both;
        }

        .basket-reward-modal__stage {
          position: relative;
          z-index: 1;
          --basket-reward-band-top: 22.716%;
          --basket-reward-band-height: 49.383%;
          width: min(100vw, calc(100vh * 16 / 9));
          aspect-ratio: 16 / 9;
          overflow: hidden;
          container-type: size;
          isolation: isolate;
          transform-origin: 50% 56%;
          animation: basketRewardStageIn 680ms cubic-bezier(.16, 1, .3, 1) both;
        }

        .basket-reward-modal__stage::after {
          content: "";
          position: absolute;
          pointer-events: none;
          user-select: none;
        }

        .basket-reward-modal__stage::after {
          z-index: 7;
          top: var(--basket-reward-band-top);
          right: -18%;
          left: -18%;
          height: var(--basket-reward-band-height);
          background: linear-gradient(112deg, transparent 31%, rgba(255, 255, 255, .46) 47%, rgba(255, 223, 122, .28) 51%, transparent 67%);
          opacity: 0;
          transform: translateX(-32%);
          mix-blend-mode: screen;
          animation: basketRewardShineSweep 860ms cubic-bezier(.25, 1, .5, 1) 130ms both;
        }

        .basket-reward-modal__stage:not(.is-compact) {
          --basket-reward-band-top: 10.833%;
          --basket-reward-band-height: 74.074%;
        }

        .basket-reward-modal__band {
          position: absolute;
          z-index: 1;
          top: var(--basket-reward-band-top);
          left: 0;
          width: 100%;
          height: var(--basket-reward-band-height);
          overflow: hidden;
          transform-origin: 50% 50%;
          animation: basketRewardBandIn 620ms cubic-bezier(.22, 1, .36, 1) 70ms both;
        }

        .basket-reward-modal__stage:not(.is-compact) .basket-reward-modal__band {
          top: var(--basket-reward-band-top);
          height: var(--basket-reward-band-height);
        }

        .basket-reward-modal__background {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }

        .basket-reward-modal__title {
          position: absolute;
          z-index: 6;
          top: 17.222%;
          left: 50%;
          display: flex;
          align-items: flex-start;
          gap: .868cqw;
          height: auto;
          margin-top: 20px;
          transform: translateX(-50%);
          color: #fff;
          pointer-events: auto;
          user-select: none;
          animation: basketRewardTitleIn 620ms cubic-bezier(.16, 1, .3, 1) 160ms both;
        }

        .basket-reward-modal__stage:not(.is-compact) .basket-reward-modal__title {
          top: 5.031%;
        }

        .basket-reward-modal__title img {
          width: 2.674cqw;
          height: 1.771cqw;
          margin-top: -10px;
          display: block;
          object-fit: contain;
          clip-path: inset(0);
        }

        .basket-reward-modal__title span {
          font-family: var(--font-rounded-current);
          font-size: 3.472cqw;
          font-weight: 800;
          line-height: 1.02;
          white-space: nowrap;
          -webkit-text-stroke-width: 8px;
          -webkit-text-stroke-color: #FFAE0B;
          paint-order: stroke fill;
          text-shadow: 0 .055cqw 0 rgba(255, 198, 72, .9);
        }

        .basket-reward-modal__cards {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: 31.574%;
          height: 31.667%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .basket-reward-modal__stage.is-single .basket-reward-modal__cards {
          width: 14.771%;
        }

        .basket-reward-modal__stage.is-row .basket-reward-modal__cards {
          width: 77.326%;
          gap: .75cqw;
        }

        .basket-reward-modal__stage.is-grid .basket-reward-modal__cards {
          top: 15.432%;
          width: 77.326%;
          height: 64.877%;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: 1.543cqh .868cqw;
        }

        .basket-reward-modal__stage.is-grid.is-count-8 .basket-reward-card:nth-child(6) {
          grid-column: 2;
          grid-row: 2;
        }

        .basket-reward-modal__stage.is-grid.is-count-8 .basket-reward-card:nth-child(7) {
          grid-column: 3;
          grid-row: 2;
        }

        .basket-reward-modal__stage.is-grid.is-count-8 .basket-reward-card:nth-child(8) {
          grid-column: 4;
          grid-row: 2;
        }

        .basket-reward-modal__stage.is-last-page .basket-reward-modal__cards {
          top: 31.574%;
          width: 45.2%;
          height: 31.667%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          grid-template-rows: 1fr;
          gap: .75cqw;
        }

        .basket-reward-card {
          position: relative;
          height: 100%;
          aspect-ratio: 880 / 1066;
          overflow: visible;
          container-type: size;
          border-bottom: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          transform-origin: 50% 58%;
          animation: basketRewardCardIn 520ms cubic-bezier(.16, 1, .3, 1) both;
        }

        .basket-reward-card:nth-child(1) {
          animation-delay: 180ms;
        }

        .basket-reward-card:nth-child(2) {
          animation-delay: 230ms;
        }

        .basket-reward-card:nth-child(3) {
          animation-delay: 280ms;
        }

        .basket-reward-card:nth-child(4) {
          animation-delay: 330ms;
        }

        .basket-reward-card:nth-child(5) {
          animation-delay: 380ms;
        }

        .basket-reward-card:nth-child(6) {
          animation-delay: 270ms;
        }

        .basket-reward-card:nth-child(7) {
          animation-delay: 320ms;
        }

        .basket-reward-card:nth-child(8) {
          animation-delay: 370ms;
        }

        .basket-reward-card:nth-child(9) {
          animation-delay: 420ms;
        }

        .basket-reward-card:nth-child(10) {
          animation-delay: 470ms;
        }

        .basket-reward-card--a {
          background: transparent;
        }

        .basket-reward-card--b {
          background: transparent;
        }

        .basket-reward-card__image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }

        .basket-reward-card__content {
          position: relative;
          width: 98.731%;
          height: 100%;
          margin: 0 auto;
        }

        .basket-reward-card__serial {
          position: absolute;
          top: 5.848%;
          right: 6.905%;
          z-index: 5;
          font-family: Cousine, ui-monospace, SFMono-Regular, monospace;
          font-size: 4cqw;
          line-height: 1.176;
          color: #ffebd4;
          white-space: nowrap;
        }

        .basket-reward-card__figure {
          position: absolute;
          top: 10.721%;
          left: 0;
          width: 100%;
          height: 71.345%;
        }

        .basket-reward-card__art {
          position: absolute;
          top: .376%;
          left: 5.966%;
          width: 88.095%;
          height: 98.907%;
          filter: drop-shadow(0 0 2.35cqw rgba(214, 193, 117, .95));
        }

        .basket-reward-card__art-bg,
        .basket-reward-card__rays-mask,
        .basket-reward-card__rays {
          position: absolute;
          pointer-events: none;
          user-select: none;
        }

        .basket-reward-card__art-bg,
        .basket-reward-card__rays-mask {
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .basket-reward-card__art-bg {
          z-index: 0;
        }

        .basket-reward-card__rays-mask {
          z-index: 1;
          overflow: hidden;
          -webkit-mask: url("/assets/basket-reward/sss-card-mask.svg") center / 100% 100% no-repeat;
          mask: url("/assets/basket-reward/sss-card-mask.svg") center / 100% 100% no-repeat;
        }

        .basket-reward-card__rays {
          top: -36.67%;
          right: -37.16%;
          bottom: -38.35%;
          left: -34.08%;
          width: 171.24%;
          height: 175.02%;
          object-fit: cover;
        }

        .basket-reward-card__fish {
          position: absolute;
          z-index: 3;
          top: 25%;
          left: 28%;
          width: 37.48%;
          height: 63.03%;
          transform: rotate(-23.09deg);
          transform-origin: center;
          filter: drop-shadow(.34cqw .46cqw 0 rgba(33, 51, 78, .28));
          pointer-events: none;
          user-select: none;
        }

        .basket-reward-card__spark {
          position: absolute;
          z-index: 2;
          font-family: Inter, Arial, sans-serif;
          font-size: 4.865cqw;
          line-height: 1;
          color: #fcebc0;
        }

        .basket-reward-card__spark--one {
          top: 9.89%;
          left: 41.41%;
        }

        .basket-reward-card__spark--two {
          top: 22.2%;
          left: 75.54%;
        }

        .basket-reward-card__spark--three {
          top: 41.7%;
          left: 10.97%;
        }

        .basket-reward-card__spark--four {
          top: 76.09%;
          left: 19.51%;
        }

        .basket-reward-card__spark--five {
          top: 84.58%;
          left: 87.82%;
        }

        .basket-reward-card__rank {
          position: absolute;
          z-index: 4;
          top: -1.05%;
          left: 6.15%;
          width: 23.69%;
          font-family: var(--font-rounded-current);
          font-size: 12.694cqw;
          font-weight: 800;
          line-height: 1.074;
          letter-spacing: 0;
          background: linear-gradient(180deg, #ff8528 0%, #ff6f00 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          white-space: nowrap;
        }

        .basket-reward-card--a .basket-reward-card__rank {
          background-image: linear-gradient(180deg, #2b92ff 0%, #006ed7 100%);
        }

        .basket-reward-card--b .basket-reward-card__rank {
          background-image: linear-gradient(180deg, #16a765 0%, #027546 100%);
        }

        .basket-reward-card__meta {
          position: absolute;
          left: 5.25%;
          right: 5.25%;
          top: auto;
          bottom: 1.6%;
          margin-bottom: 8px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5cqw;
          height: 9.552%;
          font-family: var(--font-rounded-current);
        }

        .basket-reward-card__name {
          display: inline-block;
          font-size: 9.167cqw;
          font-weight: 800;
          line-height: 1.1;
          white-space: nowrap;
          background: linear-gradient(180deg, #f26a02 0%, #ffa100 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .basket-reward-card--a .basket-reward-card__name {
          background-image: linear-gradient(180deg, #2b92ff 0%, #006ed7 100%);
        }

        .basket-reward-card--b .basket-reward-card__name {
          background-image: linear-gradient(180deg, #16a765 0%, #027546 100%);
        }

        .basket-reward-card__stats {
          display: flex;
          flex-direction: column;
          justify-content: center;
          font-family: var(--font-rounded-current);
          font-size: 3.808cqw;
          font-weight: 700;
          line-height: 1.5;
          color: #000;
          white-space: nowrap;
        }

        .basket-reward-card__stat-row {
          display: flex;
          align-items: center;
          gap: 1.975cqw;
        }

        .basket-reward-card__stats b {
          color: #555;
          font-weight: 600;
        }

        .basket-reward-card__stats strong {
          font-weight: 800;
        }

        .basket-reward-card__roi {
          color: #10b981;
        }

        .basket-reward-modal__actions {
          position: absolute;
          z-index: 4;
          top: 87.377%;
          left: 50%;
          display: flex;
          gap: 1.736cqw;
          transform: translateX(-50%);
          animation: basketRewardActionsIn 460ms cubic-bezier(.16, 1, .3, 1) 430ms both;
        }

        .basket-reward-modal__stage.is-compact .basket-reward-modal__actions {
          top: 75.185%;
        }

        .basket-reward-modal__action,
        .basket-reward-modal__page {
          appearance: none;
          padding: 0;
          border: 0;
          cursor: pointer;
          font-family: var(--font-rounded-current);
          font-weight: 800;
        }

        .basket-reward-modal__action {
          width: 11.806cqw;
          height: 7.623cqh;
          border-radius: .833cqw;
          font-size: 1.667cqw;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
          box-shadow: inset 0 -.16cqw 0 rgba(0, 0, 0, .08);
          transition:
            transform 200ms ease,
            box-shadow 200ms ease,
            filter 200ms ease;
        }

        .basket-reward-modal__action--accept {
          color: rgba(0, 0, 0, .65);
          background: #9bdc5c;
        }

        .basket-reward-modal__action:hover {
          transform: translateY(-2px);
          filter: brightness(1.04) saturate(1.04);
          box-shadow:
            inset 0 -.16cqw 0 rgba(0, 0, 0, .08),
            0 .72cqw 1.2cqw rgba(0, 0, 0, .18);
        }

        .basket-reward-modal__action:active {
          transform: translateY(0);
          filter: brightness(.98);
        }

        .basket-reward-modal__action--inventory {
          color: #5a3e00;
          background: #ffdc75;
        }

        .basket-reward-modal__page {
          position: absolute;
          z-index: 5;
          top: 45.4%;
          display: grid;
          place-items: center;
          width: 2.78cqw;
          height: 4.94cqh;
          background: transparent;
          transition: filter 160ms ease;
        }

        .basket-reward-modal__page img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }

        .basket-reward-modal__page--prev {
          left: 4.74%;
        }

        .basket-reward-modal__page--next {
          right: 1.96%;
        }

        .basket-reward-modal__pager {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
        }

        .basket-reward-modal__pager .basket-reward-modal__page {
          pointer-events: auto;
        }

        .basket-reward-modal__page:disabled {
          cursor: default;
          opacity: .42;
          filter: saturate(.6);
        }

        .basket-reward-modal__page:hover {
          filter: brightness(1.08) saturate(1.04);
        }

        .basket-reward-modal__page:disabled:hover {
          filter: saturate(.6);
        }

        .basket-reward-modal__page:active {
          filter: brightness(1.02) saturate(1.02);
        }

        .basket-reward-modal__action:focus-visible,
        .basket-reward-modal__page:focus-visible {
          outline: 3px solid rgba(255, 255, 255, .82);
          outline-offset: 3px;
        }

        @media (max-width: 700px) and (orientation: portrait) {
          .basket-reward-modal {
            place-items: stretch;
            overflow: hidden;
          }

          .basket-reward-modal__coin-halo {
            width: 145vmax;
            height: 145vmax;
          }

          .basket-reward-modal__stage {
            width: 100vw;
            height: 100dvh;
            min-height: 100svh;
            aspect-ratio: auto;
            --basket-reward-band-top: 31%;
            --basket-reward-band-height: 35%;
          }

          .basket-reward-modal__stage:not(.is-compact) {
            --basket-reward-band-top: 19%;
            --basket-reward-band-height: 59%;
          }

          .basket-reward-modal__stage:is(.is-count-2, .is-count-3, .is-count-4, .is-count-5, .is-count-6) {
            --basket-reward-band-top: 25%;
            --basket-reward-band-height: 50%;
          }

          .basket-reward-modal__stage.is-paged {
            --basket-reward-band-top: 19%;
            --basket-reward-band-height: 59%;
          }

          .basket-reward-modal__band {
            left: 0;
            width: 100%;
          }

          .basket-reward-modal__background {
            object-fit: cover;
          }

          .basket-reward-modal__title {
            top: calc(var(--basket-reward-band-top) - 3.2dvh);
            gap: 6px;
            margin-top: 10px;
            width: max-content;
            max-width: none;
            justify-content: center;
          }

          .basket-reward-modal__stage:not(.is-compact) .basket-reward-modal__title {
            top: calc(var(--basket-reward-band-top) - 3dvh);
          }

          .basket-reward-modal__title img {
            width: 22px;
            height: 15px;
            margin-top: -4px;
          }

          .basket-reward-modal__title span {
            font-size: clamp(24px, 7.1vw, 32px);
            text-align: center;
            -webkit-text-stroke-width: 5px;
            text-shadow: 0 1px 0 rgba(255, 198, 72, .9);
          }

          .basket-reward-modal__cards {
            top: calc(var(--basket-reward-band-top) + var(--basket-reward-band-height) / 2);
            width: calc(100vw - 24px);
            height: auto;
            transform: translate(-50%, -50%);
          }

          .basket-reward-modal__stage:is(.is-count-2, .is-count-3, .is-count-4, .is-count-5, .is-count-6) .basket-reward-modal__cards {
            top: 50%;
          }

          .basket-reward-modal__stage.is-single .basket-reward-modal__cards {
            width: clamp(118px, 38vw, 160px);
          }

          .basket-reward-modal__stage.is-mobile-two-row .basket-reward-modal__cards {
            width: min(calc(100vw - 24px), 390px);
            height: auto;
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            grid-template-rows: repeat(2, auto);
            gap: 8px 6px;
          }

          .basket-reward-modal__stage.is-mobile-two-row .basket-reward-card {
            grid-column: span 2;
          }

          .basket-reward-modal__stage.is-mobile-two-row.is-count-4 .basket-reward-card:nth-child(4) {
            grid-column: 3 / span 2;
          }

          .basket-reward-modal__stage.is-mobile-two-row.is-count-5 .basket-reward-card:nth-child(4) {
            grid-column: 2 / span 2;
          }

          .basket-reward-modal__stage.is-mobile-two-row.is-count-5 .basket-reward-card:nth-child(5) {
            grid-column: 4 / span 2;
          }

          .basket-reward-modal__stage.is-mobile-three-row .basket-reward-modal__cards {
            top: calc(var(--basket-reward-band-top) + var(--basket-reward-band-height) / 2);
            width: min(calc(100vw - 72px), 330px);
            height: auto;
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            grid-template-rows: repeat(3, auto);
            gap: 8px 6px;
          }

          .basket-reward-modal__stage.is-mobile-three-row .basket-reward-card {
            grid-column: span 2;
            grid-row: auto;
          }

          .basket-reward-modal__stage.is-mobile-three-row.is-count-7 .basket-reward-card:nth-child(7) {
            grid-column: 3 / span 2;
          }

          .basket-reward-modal__stage.is-mobile-three-row.is-count-8 .basket-reward-card:nth-child(6) {
            grid-column: span 2;
            grid-row: auto;
          }

          .basket-reward-modal__stage.is-mobile-three-row.is-count-8 .basket-reward-card:nth-child(7) {
            grid-column: 2 / span 2;
            grid-row: auto;
          }

          .basket-reward-modal__stage.is-mobile-three-row.is-count-8 .basket-reward-card:nth-child(8) {
            grid-column: 4 / span 2;
            grid-row: auto;
          }

          .basket-reward-modal__stage.is-last-page.is-mobile-one-row .basket-reward-modal__cards {
            top: calc(var(--basket-reward-band-top) + var(--basket-reward-band-height) / 2);
            width: min(76vw, 330px);
            height: auto;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }

          .basket-reward-card {
            width: 100%;
            height: auto;
            aspect-ratio: 880 / 1066;
          }

          .basket-reward-modal__actions {
            top: auto;
            bottom: calc(max(20px, env(safe-area-inset-bottom)) + 8px);
            gap: 12px;
          }

          .basket-reward-modal__stage.is-compact .basket-reward-modal__actions {
            top: auto;
            bottom: calc(max(20px, env(safe-area-inset-bottom)) + 8px);
          }

          .basket-reward-modal__stage:is(.is-count-1, .is-count-2, .is-count-3, .is-count-4, .is-count-5, .is-count-6, .is-count-8) .basket-reward-modal__actions {
            top: calc(var(--basket-reward-band-top) + var(--basket-reward-band-height) + 40px);
            bottom: auto;
          }

          .basket-reward-modal__stage.is-paged .basket-reward-modal__actions {
            top: calc(var(--basket-reward-band-top) + var(--basket-reward-band-height) + 76px);
            bottom: auto;
          }

          .basket-reward-modal__action {
            width: clamp(86px, 24vw, 112px);
            height: 44px;
            border-radius: 8px;
            font-size: 16px;
            box-shadow: inset 0 -2px 0 rgba(0, 0, 0, .08);
          }

          .basket-reward-modal__pager {
            position: absolute;
            z-index: 5;
            inset: auto 0 calc(max(20px, env(safe-area-inset-bottom)) + 64px);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            pointer-events: none;
          }

          .basket-reward-modal__stage.is-paged .basket-reward-modal__pager {
            top: calc(var(--basket-reward-band-top) + var(--basket-reward-band-height) + 10px);
            bottom: auto;
          }

          .basket-reward-modal__pager:empty {
            display: none;
          }

          .basket-reward-modal__page {
            position: static;
            left: auto;
            right: auto;
            top: auto;
            display: grid;
            place-items: center;
            width: 56px;
            height: 56px;
            border-radius: 0;
            background: transparent;
            transform: none;
            pointer-events: auto;
          }

          .basket-reward-modal__page--prev img,
          .basket-reward-modal__page--next img {
            width: 30px;
            height: auto;
            transform: none;
          }
        }

        @keyframes basketRewardOverlayIn {
          from {
            opacity: 0;
            backdrop-filter: blur(18px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(40px);
          }
        }

        @keyframes basketRewardStageIn {
          0% {
            opacity: 0;
            transform: translateY(2.2cqh) scale(.94);
          }
          62% {
            opacity: 1;
            transform: translateY(-.32cqh) scale(1.012);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes basketRewardCoinHaloIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(.36);
          }
          32% {
            opacity: .82;
            transform: translate(-50%, -50%) scale(.94);
          }
          58% {
            opacity: .62;
            transform: translate(-50%, -50%) scale(1.02);
          }
          78% {
            opacity: .22;
            transform: translate(-50%, -50%) scale(1.08);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.12);
          }
        }

        @keyframes basketRewardShineSweep {
          0% {
            opacity: 0;
            transform: translateX(-42%);
          }
          32% {
            opacity: .88;
          }
          100% {
            opacity: 0;
            transform: translateX(42%);
          }
        }

        @keyframes basketRewardBandIn {
          0% {
            opacity: 0;
            transform: scaleX(.78) scaleY(.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes basketRewardTitleIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-1.8cqh) scale(.88);
          }
          72% {
            opacity: 1;
            transform: translateX(-50%) translateY(.18cqh) scale(1.035);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @keyframes basketRewardCardIn {
          0% {
            opacity: 0;
            transform: translateY(2.8cqh) scale(.82) rotate(-1.4deg);
          }
          68% {
            opacity: 1;
            transform: translateY(-.35cqh) scale(1.035) rotate(.24deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0);
          }
        }

        @keyframes basketRewardActionsIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(1.8cqh) scale(.92);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .basket-reward-modal,
          .basket-reward-modal__coin-halo,
          .basket-reward-modal__stage,
          .basket-reward-modal__stage::after,
          .basket-reward-modal__band,
          .basket-reward-modal__title,
          .basket-reward-card,
          .basket-reward-modal__actions {
            animation: none;
          }

          .basket-reward-modal__coin-halo {
            display: none;
          }
        }

        .hud-main-action {
	          position: relative;
	          z-index: 2;
	          display: flex;
          box-sizing: border-box;
          align-items: center;
          gap: 36px;
          height: 120px;
          padding: 20px 40px;
          color: inherit;
          background: #ffedb7;
          border: 0;
          border-radius: 16px;
          box-shadow: 0 8px 0 #4e433c;
          cursor: pointer;
          font: inherit;
          transition: transform 80ms ease, box-shadow 80ms ease, filter 80ms ease;
        }

        .hud-main-action__free-trial-count {
          position: absolute;
          left: 50%;
          top: calc(100% + 2px);
          z-index: 12;
          transform: translateX(-50%);
          padding: 0;
          color: rgba(78, 67, 60, .72);
          -webkit-text-fill-color: rgba(78, 67, 60, .72);
          -webkit-text-stroke-width: 0;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.1;
          letter-spacing: 0;
          paint-order: normal;
          text-align: center;
          text-shadow: none;
          white-space: nowrap;
          pointer-events: auto;
        }

        .hud-main-action--waiting {
          width: 415px;
          min-width: 415px;
          display: grid;
          grid-template-columns: 80px 1fr auto;
          justify-content: stretch;
          gap: 18px;
          background: #d9e6d3;
          cursor: default;
        }

        .hud-main-action--notice {
          width: 415px;
          min-width: 415px;
          justify-content: center;
          gap: 0;
          padding: 20px 40px;
          color: #4e433c;
          background: #ffedb7;
          box-shadow: none;
          cursor: default;
        }

        .hud-main-action--notice .hud-main-action__label {
          max-width: var(--hud-notice-label-width, 100%);
          color: #4e433c;
          -webkit-text-fill-color: #4e433c;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0;
          line-height: normal;
          white-space: nowrap;
        }

        .hud-main-action--notice .hud-main-action__label::before {
          content: none;
        }

        .hud-main-action__notice-icon {
          position: absolute;
          top: -26px;
          right: -10px;
          width: 60px;
          height: 60px;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }

        .hud-main-action__tool {
          flex: 0 0 auto;
          width: 80px;
          height: 79px;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .hud-main-action__label {
          position: relative;
          z-index: 0;
          display: inline-block;
          max-width: 100%;
          color: #FFF;
          text-align: center;
          -webkit-text-fill-color: #FFF;
          font-family: var(--font-rounded-current);
          font-size: 50px;
          font-style: normal;
          font-weight: 700;
          font-synthesis: none;
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 100%;
          letter-spacing: 5px;
          paint-order: stroke fill;
          stroke-linecap: round;
          stroke-linejoin: round;
          white-space: nowrap;
        }

        .hud-main-action__label-text {
          display: inline-block;
        }

        .hud-main-action__label--free-trial .hud-main-action__label-text {
          opacity: 0;
          pointer-events: none;
        }

        .hud-main-action__label--free-trial::before {
          transform: translateY(-10px);
        }

        .hud-main-action__label::before {
          content: attr(data-label);
          position: absolute;
          inset: 0;
          z-index: -1;
          color: #FFF;
          text-align: center;
          -webkit-text-fill-color: #FFF;
          -webkit-text-stroke-width: 10px;
          -webkit-text-stroke-color: #4E433C;
          paint-order: stroke fill;
          stroke-linecap: round;
          stroke-linejoin: round;
          text-shadow:
            0 1px 0 #4E433C,
            1px 0 0 #4E433C,
            0 -1px 0 #4E433C,
            -1px 0 0 #4E433C,
            1px 1px 0 #4E433C,
            -1px 1px 0 #4E433C,
            1px -1px 0 #4E433C,
            -1px -1px 0 #4E433C;
        }

        .hud-main-action__label--progress {
          min-width: 152px;
          letter-spacing: 2px;
        }

        .hud-main-action__waiting {
          width: 132px;
          min-width: 0;
          display: grid;
          justify-items: start;
          gap: 7px;
          color: #4e433c;
          font-weight: 1000;
          line-height: 1;
        }

        .hud-main-action__waiting-title {
          max-width: 100%;
          font-size: 24px;
          line-height: 26px;
          letter-spacing: 0;
          overflow: hidden;
          text-align: left;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hud-main-action__timer {
          font-size: 34px;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0;
        }

        .hud-main-action__stop {
          appearance: none;
          flex: 0 0 auto;
          height: 44px;
          min-width: 76px;
          max-width: 100%;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #7f2f24;
          background: #fff8e6;
          border: 0;
          border-radius: 10px;
          box-shadow: inset 0 2px 0 rgba(255, 255, 255, .58), 0 3px 0 rgba(78, 67, 60, .28);
          cursor: pointer;
          font: inherit;
          font-size: 18px;
          font-weight: 1000;
          line-height: 1;
          transition: transform 80ms ease, box-shadow 80ms ease, filter 80ms ease;
        }

        .hud-main-action__stop:active {
          transform: translateY(2px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .46), 0 1px 0 rgba(78, 67, 60, .3);
        }

        .hud-basket {
          position: relative;
          width: 120px;
          height: 120px;
          padding: 0;
          background: transparent;
          border: 0;
          border-radius: 16px;
          box-shadow: none;
          cursor: pointer;
          font: inherit;
          overflow: visible;
          transition: transform 80ms ease, filter 80ms ease;
        }

        .hud-basket__shell {
          position: absolute;
          inset: 0 0 -8px;
          border-radius: 16px;
          overflow: hidden;
          clip-path: inset(0 0 0 0 round 16px);
          transform: translateZ(0);
          transition: clip-path 80ms ease;
        }

        .hud-basket__icon {
          position: absolute;
          inset: 0 0 -8px;
          width: 120px;
          height: 128px;
          object-fit: fill;
          transition: transform 80ms ease;
          pointer-events: none;
          user-select: none;
        }

        .hud-badge {
          position: absolute;
          left: 110px;
          top: 4px;
          width: 60px;
          height: 60px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          background: #fd5f5a;
        }

        .hud-badge span {
          color: #fff;
          font-family: var(--font-rounded-current);
          font-size: 28px;
          font-weight: 900;
          line-height: normal;
          white-space: nowrap;
        }

        .hud-badge--compact span {
          font-size: 22px;
        }

        .menu-item:hover,
        .hud-main-action:not(:disabled):hover,
        .hud-basket:not(:disabled):hover {
          filter: brightness(1.02);
        }

        .menu-item:active {
          transform: translateY(1px);
        }

        .hud-main-action:not(:disabled):active,
        .hud-basket:not(:disabled):active {
          transform: translateY(6px);
        }

        .hud-main-action:not(:disabled):active {
          box-shadow: 0 0 0 #4e433c;
        }

        .hud-basket:not(:disabled):active .hud-basket__shell {
          clip-path: inset(0 0 8px 0 round 16px);
        }

        .hud-main-action--disabled,
        .hud-main-action--disabled:hover,
        .hud-main-action--disabled:active {
          box-shadow: none;
          filter: none;
          transform: none;
        }

        .hud-basket--disabled,
        .hud-basket--disabled:hover,
        .hud-basket--disabled:active {
          filter: grayscale(1);
          transform: none;
        }

	        .menu-item:focus-visible,
	        .cast-auto-button:focus-visible,
	        .cast-auto-stop:focus-visible,
	        .hud-agent-required:focus-visible,
	        .cast-count-stepper:focus-visible,
	        .cast-count-input:focus-visible,
	        .auto-cast-modal__button:focus-visible,
	        .hud-main-action:focus-visible,
	        .hud-main-action__stop:focus-visible,
	        .hud-basket:focus-visible {
	          outline: 3px solid #ffcc00;
          outline-offset: 4px;
        }

        .ui-left {
          position: absolute;
          left: clamp(18px, 2.55vw, 52px);
          bottom: clamp(24px, 3.2vh, 46px);
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          gap: clamp(12px, 1.1vw, 18px);
          width: fit-content;
          z-index: 5;
        }

        .menu-tile {
          appearance: none;
          padding: 0;
          margin: 0;
          background: transparent;
          border: 0;
          color: inherit;
          font: inherit;
          text-decoration: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: clamp(82px, 5.6vw, 104px);
          min-height: 92px;
          transition: transform .22s cubic-bezier(.23,1,.32,1);
          position: relative; /* establish stacking context for label */
        }

        .menu-tile__icon {
          position: relative;
          z-index: 1;
        }

        .menu-tile:hover {
          transform: translateY(-3px);
        }

        .menu-tile:active {
          transform: translateY(1px);
        }

        .menu-tile:focus-visible {
          outline: 2px solid var(--ac-focus-yellow);
          outline-offset: 4px;
          border-radius: 8px;
        }

        .menu-tile__icon {
          width: 72%;
          max-width: 72px;
          aspect-ratio: 1;
          object-fit: contain;
          image-rendering: auto;
          filter: drop-shadow(0 4px 0 rgba(62, 48, 37, .28))
                  drop-shadow(0 8px 14px rgba(62, 48, 37, .18));
          pointer-events: none;
          user-select: none;
          transition: filter .22s ease;
        }

        .menu-tile:hover .menu-tile__icon {
          filter: drop-shadow(0 6px 0 rgba(62, 48, 37, .32))
                  drop-shadow(0 10px 18px rgba(62, 48, 37, .22));
        }

        .menu-tile__name {
          position: relative;
          z-index: 1;
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: .06em;
          white-space: nowrap;
          text-shadow: 0 2px 0 rgba(0, 0, 0, .15);
        }

        .pixel-button {
          appearance: none;
          width: clamp(82px, 5.75vw, 120px);
          aspect-ratio: 1;
          position: relative;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 28% 23%, rgba(255,255,255,.72) 0 10%, transparent 11%),
            linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 2.5px solid var(--ac-border);
          border-radius: var(--radius-md);
          padding: 0;
          box-shadow:
            0 5px 0 0 var(--ac-shadow),
            0 8px 18px rgba(61, 52, 40, .12);
          cursor: pointer;
          font: inherit;
          transition: all .25s cubic-bezier(.4, 0, .2, 1);
        }

        .pixel-button:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
          box-shadow:
            0 6px 0 0 var(--ac-shadow),
            0 10px 22px rgba(61, 52, 40, .15);
        }

        .pixel-button:active {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 0 var(--ac-shadow),
            0 4px 12px rgba(61, 52, 40, .12);
        }

        .pixel-button:focus-visible,
        .shop:focus-visible {
          outline: 2px solid var(--ac-focus-yellow);
          outline-offset: 3px;
        }

        .pixel-button::after {
          content: "";
          position: absolute;
          inset: 9px;
          border: 2px solid rgba(196, 184, 158, .55);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, .13);
        }

        .pixel-button--image::after {
          content: none;
        }

        .ui-left .pixel-button--image {
          box-shadow: none;
        }

        .ui-left .pixel-button--image:hover,
        .ui-left .pixel-button--image:active {
          box-shadow: none;
        }

        .icon-bag,
        .icon-trophy,
        .icon-case {
          position: relative;
          z-index: 1;
          width: 56%;
          height: 48%;
        }

        .menu-icon-img {
          position: relative;
          z-index: 2;
          width: 86%;
          height: 86%;
          display: block;
          object-fit: contain;
          image-rendering: auto;
          filter: drop-shadow(0 3px 0 rgba(62, 48, 37, .22));
          pointer-events: none;
          user-select: none;
        }

        .icon-bag {
          width: 61%;
          height: 58%;
          margin-top: 6%;
          background:
            radial-gradient(circle at 49% 43%, #f3c16f 0 4%, transparent 5%),
            linear-gradient(90deg, transparent 0 13%, #6e3f28 14% 23%, transparent 24% 76%, #6e3f28 77% 86%, transparent 87%),
            linear-gradient(180deg, #d99046 0 24%, #af6534 25% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-md);
          box-shadow:
            inset 8px 0 0 rgba(255, 201, 105, .34),
            inset -8px 0 0 rgba(86, 41, 24, .22),
            0 5px 0 rgba(80, 44, 27, .22);
        }

        .icon-bag::before {
          content: "";
          position: absolute;
          left: 22%;
          top: -23%;
          width: 56%;
          height: 38%;
          border: 5px solid var(--ink-dark);
          border-bottom: 0;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          background: #bf763c;
          box-shadow:
            inset 0 6px 0 rgba(255, 211, 125, .32),
            0 19px 0 -6px #6d3a22;
        }

        .icon-bag::after {
          content: "";
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 11%;
          height: 36%;
          background:
            radial-gradient(circle at 50% 36%, #f0bb5e 0 6%, transparent 7%),
            linear-gradient(180deg, #c9793d 0 38%, #9d552f 39% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-md) var(--radius-md) var(--radius-sm) var(--radius-sm);
          box-shadow:
            inset 6px 0 0 rgba(255, 198, 99, .24),
            inset -5px 0 0 rgba(82, 38, 23, .22);
        }

        .icon-trophy {
          width: 64%;
          height: 62%;
          margin-top: 4%;
        }

        .icon-trophy::before {
          content: "";
          position: absolute;
          left: 25%;
          top: 1%;
          width: 50%;
          height: 48%;
          background:
            linear-gradient(90deg, rgba(255, 244, 160, .6) 0 18%, transparent 19% 100%),
            linear-gradient(90deg, #d8891d 0%, #ffd962 44%, #f4a329 65%, #a95a18 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-xs) var(--radius-xs) var(--radius-sm) var(--radius-sm);
          box-shadow:
            inset 0 7px 0 rgba(255, 242, 139, .7),
            inset -7px 0 0 rgba(126, 60, 18, .25);
        }

        .icon-trophy::after {
          content: "";
          position: absolute;
          left: 20%;
          bottom: 0;
          width: 60%;
          height: 18%;
          background: linear-gradient(90deg, #a85b1d, #f0aa35 42%, #8c4619);
          border: 5px solid var(--ink-dark);
          border-radius: 4px;
          box-shadow:
            0 -13px 0 -2px #ce7920,
            0 -13px 0 2px var(--ink-dark),
            22px -36px 0 -12px #f7c348,
            24px -36px 0 -7px var(--ink-dark),
            -22px -36px 0 -12px #f7c348,
            -24px -36px 0 -7px var(--ink-dark);
        }

        .icon-trophy .cup-stem {
          position: absolute;
          left: 42%;
          bottom: 18%;
          width: 16%;
          height: 25%;
          background: linear-gradient(90deg, #a65a1c, #f0a735 55%, #8b4418);
          border-left: 5px solid var(--ink-dark);
          border-right: 5px solid var(--ink-dark);
          z-index: 1;
        }

        .icon-trophy .cup-handles {
          position: absolute;
          left: 4%;
          right: 4%;
          top: 14%;
          height: 32%;
          border-left: 5px solid var(--ink-dark);
          border-right: 5px solid var(--ink-dark);
          border-radius: var(--radius-sm);
        }

        .icon-case {
          width: 64%;
          height: 51%;
          margin-top: 12%;
          background:
            linear-gradient(180deg, #c77737 0 33%, #8e4628 34% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-sm);
          box-shadow:
            inset 8px 0 0 rgba(255, 198, 99, .22),
            inset -8px 0 0 rgba(73, 33, 21, .24),
            0 5px 0 rgba(76, 42, 29, .22);
        }

        .icon-case::before {
          content: "";
          position: absolute;
          left: 28%;
          top: -27%;
          width: 44%;
          height: 34%;
          border: 5px solid var(--ink-dark);
          border-bottom: 0;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          background: #d89443;
          box-shadow:
            0 21px 0 -7px #f0be5a,
            0 21px 0 -2px var(--ink-dark);
        }

        .icon-case::after {
          content: "";
          position: absolute;
          right: -17%;
          bottom: -17%;
          width: 40%;
          aspect-ratio: 1;
          background:
            radial-gradient(circle at 36% 32%, rgba(255, 242, 159, .9) 0 16%, transparent 17%),
            radial-gradient(circle at 50% 50%, #ffd761 0 43%, #d58a22 44% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: 50%;
          box-shadow:
            inset -4px -5px 0 rgba(130, 65, 18, .24),
            0 3px 0 rgba(76, 42, 29, .22);
        }

        .icon-case .case-flap {
          position: absolute;
          left: 14%;
          right: 14%;
          top: 9%;
          height: 34%;
          background: #9b532d;
          border: 4px solid var(--ink-dark);
          border-top: 0;
          border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        }

        .icon-case .case-lock {
          position: absolute;
          left: 43%;
          top: 23%;
          width: 14%;
          aspect-ratio: 1;
          background: #ffd15a;
          border: 4px solid var(--ink-dark);
          border-radius: 50%;
          z-index: 2;
        }

        .shop {
          position: absolute;
          right: clamp(28px, 2.8vw, 58px);
          top: clamp(34px, 4vh, 58px);
          width: clamp(98px, 7.35vw, 152px);
          height: clamp(91px, 7.05vw, 145px);
          z-index: 5;
          filter: drop-shadow(0 5px 0 var(--ac-shadow)) drop-shadow(0 8px 18px rgba(61, 52, 40, .12));
          transition: all .25s cubic-bezier(.4, 0, .2, 1);
        }

        .shop:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 6px 0 var(--ac-shadow)) drop-shadow(0 10px 22px rgba(61, 52, 40, .15));
        }

        .shop:active {
          transform: translateY(2px);
          filter: drop-shadow(0 1px 0 var(--ac-shadow)) drop-shadow(0 4px 12px rgba(61, 52, 40, .12));
        }

        .shop .awning {
          position: absolute;
          left: 2%;
          right: 2%;
          top: 0;
          height: 34%;
          background:
            linear-gradient(180deg, rgba(255,255,255,.35), transparent 42%),
            repeating-linear-gradient(90deg, #2e7ec2 0 17%, #ecf7ff 17% 32%, #438fd0 32% 49%);
          border: 3px solid var(--ac-text);
          border-radius: var(--radius-md) var(--radius-md) var(--radius-xs) var(--radius-xs);
          box-shadow:
            inset 0 -7px 0 rgba(65, 39, 27, .2),
            0 4px 0 rgba(70, 38, 25, .22);
          z-index: 2;
        }

        .shop .base {
          position: absolute;
          left: 13%;
          right: 13%;
          bottom: 0;
          height: 73%;
          background:
            radial-gradient(circle at 18% 65%, rgba(151, 98, 54, .22) 0 4%, transparent 5%),
            radial-gradient(circle at 78% 56%, rgba(151, 98, 54, .18) 0 4%, transparent 5%),
            linear-gradient(90deg, #e8cf9b 0 23%, #f7dfae 24% 73%, #d5b986 74% 100%);
          border: 3px solid var(--ac-text);
          border-radius: var(--radius-xs) var(--radius-xs) var(--radius-sm) var(--radius-sm);
          box-shadow: inset 0 32px 0 #a84e20;
        }

        .shop .label {
          position: absolute;
          left: 18%;
          right: 18%;
          top: 35%;
          height: 31%;
          display: grid;
          place-items: center;
          color: #ffe184;
          font-weight: 950;
          font-size: clamp(23px, 2vw, 43px);
          line-height: 1;
          letter-spacing: .03em;
          text-shadow:
            3px 0 var(--ac-text),
            0 3px var(--ac-text),
            -3px 0 var(--ac-text),
            0 -3px var(--ac-text),
            4px 4px 0 rgba(44, 20, 13, .24);
          z-index: 3;
        }

        .shop .door {
          position: absolute;
          width: 23%;
          height: 27%;
          left: 38.5%;
          bottom: 2%;
          background:
            linear-gradient(90deg, rgba(255, 187, 78, .2), transparent 45%),
            #b55f24;
          border: 3px solid var(--ac-text);
          border-radius: 8px 8px 0 0;
          z-index: 3;
        }

        .shop .door::after {
          content: "";
          position: absolute;
          right: 18%;
          top: 44%;
          width: 5px;
          height: 5px;
          background: #ffd15a;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #63301a;
        }

        .shop .stone {
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 10%;
          height: 27%;
          background:
            linear-gradient(90deg, transparent 0 20%, rgba(113, 74, 43, .2) 21% 25%, transparent 26% 52%, rgba(113, 74, 43, .18) 53% 58%, transparent 59%),
            linear-gradient(0deg, transparent 0 44%, rgba(113, 74, 43, .18) 45% 50%, transparent 51%);
          z-index: 2;
        }

        .shop-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: clamp(18px, 3vw, 44px);
          background: rgba(52, 119, 166, .34);
          backdrop-filter: blur(5px);
        }

        .shop-modal {
          width: min(1120px, 94vw);
          max-height: min(820px, 88svh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--ac-text);
          background:
            radial-gradient(circle at 10% 4%, rgba(255,255,255,.75) 0 8%, transparent 9%),
            linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 3px solid var(--ac-border);
          border-radius: var(--radius-lg);
          box-shadow:
            0 7px 0 var(--ac-shadow),
            0 22px 60px rgba(66, 48, 31, .22);
        }

        .shop-modal__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: clamp(18px, 2.2vw, 28px) clamp(18px, 2.6vw, 34px) 16px;
          border-bottom: 2px dashed rgba(196, 184, 158, .65);
        }

        .shop-modal__title {
          margin: 0;
          font-family: var(--modal-title-font);
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: .02em;
          color: var(--ac-text);
        }

        .shop-modal__subtitle {
          margin: 8px 0 0;
          color: var(--ac-text-body);
          font-size: 13px;
          font-weight: 700;
        }

        .delete-confirm-modal {
          width: min(520px, 92vw);
          max-height: none;
        }

        .delete-confirm-modal__body {
          padding: 18px clamp(18px, 2.2vw, 28px) 20px;
          display: grid;
          gap: 14px;
        }

        .delete-confirm-modal__text {
          margin: 0;
          color: var(--ac-text);
          font-size: 14px;
          font-weight: 800;
          line-height: 1.6;
        }

        .delete-confirm-modal__target {
          padding: 12px 14px;
          color: #5d4a36;
          background: #fff7e3;
          border: 2px solid rgba(196, 184, 158, .72);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.5;
        }

        .delete-confirm-modal__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .delete-confirm-modal__footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 2px;
        }

        .delete-confirm-modal__btn {
          min-width: 100px;
          height: 38px;
          padding: 0 14px;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .delete-confirm-modal__btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .delete-confirm-modal__btn--danger {
          color: #fffdf4;
          background: linear-gradient(180deg, #e36d5c 0%, #b94a38 100%);
          border-color: #7f2f24;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.18),
            2px 2px 0 rgba(127, 47, 36, .45);
        }

        .delete-confirm-modal__btn--danger:hover {
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.18),
            3px 3px 0 rgba(127, 47, 36, .45);
        }

        .inventory-toast {
          position: fixed;
          right: max(24px, env(safe-area-inset-right));
          bottom: max(24px, env(safe-area-inset-bottom));
          z-index: 95;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          width: min(460px, calc(100vw - 32px));
          padding: 12px 16px;
          color: var(--ac-text);
          background: linear-gradient(180deg, #fff8e6 0%, #f7e8bf 100%);
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-sm);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.62),
            0 6px 0 rgba(78, 67, 60, .34),
            0 16px 34px rgba(77, 51, 28, .18);
          animation: inventory-toast-pop 220ms ease-out;
          pointer-events: none;
        }

        .inventory-toast__icon {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          color: #fffdf4;
          background: linear-gradient(180deg, #34d399 0%, #0f9f6e 100%);
          border: 2px solid #08724f;
          border-radius: 999px;
          box-shadow: 0 3px 0 rgba(8, 114, 79, .34);
          font-size: 21px;
          font-weight: 1000;
          line-height: 1;
        }

        .inventory-toast__title {
          margin: 0;
          color: var(--ac-text);
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.25;
        }

        .inventory-toast__message {
          margin: 3px 0 0;
          color: #725d42;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
        }

        @keyframes inventory-toast-pop {
          from {
            opacity: 0;
            transform: translate(12px, 10px) scale(.96);
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }

        .shop-modal__close {
          width: 44px;
          height: 44px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 0 var(--ac-shadow-input);
          transition: all .2s ease;
        }

        .shop-modal__close:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
        }

        .shop-modal__toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px clamp(18px, 2.6vw, 34px);
        }

        .shop-search {
          position: relative;
          width: min(320px, 100%);
        }

        .shop-search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          width: 16px;
          height: 16px;
          transform: translateY(-50%);
          color: var(--ac-text-body);
        }

        .shop-input,
        .shop-select {
          height: 40px;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          outline: none;
        }

        .shop-input {
          width: 100%;
          padding: 0 14px 0 38px;
        }

        .shop-select {
          padding: 0 12px;
        }

        .shop-input:focus,
        .shop-select:focus,
        .shop-chip:focus-visible,
        .shop-card__icon-btn:focus-visible,
        .shop-card__action:focus-visible {
          border-color: var(--ac-primary);
          outline: 2px solid rgba(25, 200, 185, .28);
          outline-offset: 2px;
        }

        .shop-controls {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .shop-select-aisland {
          width: 132px;
          height: 40px;
        }

        .shop-select-aisland--sort {
          width: 162px;
        }

        .shop-select-aisland [class*="animal-wrapper-"] {
          width: 100%;
          min-width: 0;
          height: 100%;
        }

        .shop-select-aisland [class*="animal-trigger-"] {
          height: 40px;
          padding: 0 14px 0 18px;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
        }

        .shop-select-aisland [class*="animal-trigger-"]:hover {
          transform: translate(-1px, -1px);
          border-color: rgba(196, 184, 158, .86);
          background: var(--ac-cream-light);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .shop-select-aisland [class*="animal-value-"],
        .shop-select-aisland [class*="animal-placeholder-"] {
          color: var(--ac-text);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .shop-select-aisland [class*="animal-dropdown-"] {
          /* animal-island-ui defaults its dropdown to a right-side popout (inline inset 50%/auto/auto/100%
             with transform translateY(-50%) and margin-left 6px), which positions the panel to the right
             of the trigger and vertically-centered. Override every dimension so the panel drops straight
             down beneath the trigger. */
          inset: 100% auto auto 0 !important;
          left: 0 !important;
          right: auto !important;
          top: calc(100% + 6px) !important;
          bottom: auto !important;
          margin: 0 !important;
          transform: none !important;
          min-width: 100% !important;
          background: #fff3d3;
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 6px 0 var(--ac-shadow-input), 0 12px 26px rgba(61, 52, 40, .14);
        }

        .shop-select-aisland [class*="animal-option-"] {
          color: var(--ac-text);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .sort-direction-select {
          position: relative;
          width: 100%;
          height: 40px;
        }

        .sort-direction-select__trigger {
          appearance: none;
          width: 100%;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px 0 18px;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .sort-direction-select__trigger:hover {
          transform: translate(-1px, -1px);
          background: var(--ac-cream-light);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .sort-direction-select__trigger:focus-visible,
        .sort-direction-select__option:focus-visible {
          border-color: var(--ac-primary);
          outline: 2px solid rgba(25, 200, 185, .28);
          outline-offset: 2px;
        }

        .sort-direction-select__chevron {
          width: 12px;
          height: 12px;
          display: flex;
          align-items: center;
          color: #a09080;
          line-height: 0;
          transform: rotate(0deg);
          transition: transform .18s ease;
        }

        .sort-direction-select.is-open .sort-direction-select__chevron {
          transform: rotate(180deg);
        }

        .sort-direction-select__menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 20;
          min-width: 100%;
          width: max-content;
          display: grid;
          gap: 4px;
          padding: 10px;
          background: #fff3d3;
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 6px 0 var(--ac-shadow-input), 0 12px 26px rgba(61, 52, 40, .14);
        }

        .sort-direction-select__option {
          appearance: none;
          min-width: 150px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 12px;
          color: var(--ac-text);
          background: transparent;
          border: 2px solid transparent;
          border-radius: var(--radius-sm);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .sort-direction-select__option:hover,
        .sort-direction-select__option.is-active {
          background: #ffe8a9;
        }

        .sort-direction-select__direction {
          color: rgba(114, 93, 66, .78);
          font-size: 12px;
        }

        .game-landing .shop-modal .shop-select-aisland [class*="animal-option-"]::before,
        .game-landing .shop-modal .shop-select-aisland [class*="animal-hovered-"]::before {
          content: none !important;
          display: none !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          animation: none !important;
        }

        .shop-chip {
          height: 40px;
          padding: 0 14px;
          color: var(--ac-text);
          background: rgba(255, 249, 232, .72);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          box-shadow: none;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .shop-chip:hover {
          border-color: transparent;
          background: #fffdf4;
        }

        .shop-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          overflow: auto;
          padding: 0 clamp(18px, 2.6vw, 34px) clamp(18px, 2.6vw, 34px);
        }

        .shop-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 248, .86);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          box-shadow: none;
          cursor: pointer;
          overflow: hidden;
          transition: transform .18s ease, background .18s ease;
        }

        .shop-card:hover,
        .shop-card:focus-visible {
          background: rgba(255, 255, 248, .96);
          transform: translateY(-1px);
        }

        .shop-card:focus-visible {
          outline: 2px solid rgba(25, 200, 185, .35);
          outline-offset: 3px;
        }

        .shop-card__body {
          padding: 15px;
        }

        .shop-card__title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .shop-card__title {
          margin: 0;
          color: var(--ac-text);
          font-size: 17px;
          line-height: 1.25;
          font-weight: 900;
        }

        .shop-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 9px;
        }

        .shop-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 25px;
          padding: 4px 9px;
          color: var(--ac-text-body);
          background: #fff3d3;
          border: 1.5px solid rgba(196, 184, 158, .72);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 900;
        }

        .shop-badge--primary {
          color: #08766e;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .35);
        }

        .shop-card__desc {
          display: -webkit-box;
          min-height: 42px;
          margin: 12px 0 0;
          overflow: hidden;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.75;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .shop-curve {
          height: 62px;
          margin-top: 12px;
          padding-top: 9px;
          border-top: 2px dashed rgba(196, 184, 158, .55);
        }

        .shop-curve__label {
          margin-bottom: 4px;
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .shop-curve svg {
          width: 100%;
          height: 40px;
          overflow: visible;
        }

        .shop-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .shop-metric {
          min-width: 0;
        }

        .shop-metric__label {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .shop-metric__value {
          margin-top: 3px;
          color: var(--ac-text);
          font-size: 14px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .shop-metric__value--up {
          color: #0b9f73;
        }

        .shop-metric__value--down {
          color: #d85d48;
        }

        .shop-card__actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: auto;
          padding: 13px 15px 15px;
          border-top: 2px dashed rgba(196, 184, 158, .55);
        }

        .shop-card__icon-btn,
        .shop-card__action {
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 3px 0 var(--ac-shadow-input);
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          transition: all .18s ease;
        }

        .shop-card__icon-btn {
          width: 36px;
          padding: 0;
          color: #c78320;
        }

        .shop-card__icon-btn.is-starred {
          color: #a86b12;
          background: #ffe6a9;
          border-color: #e5b243;
        }

        .shop-card__action {
          gap: 6px;
          padding: 0 13px;
        }

        .shop-card__action--primary {
          color: #075b55;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .46);
        }

        .shop-card__icon-btn:hover,
        .shop-card__action:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
        }

        .shop-empty {
          grid-column: 1 / -1;
          padding: 44px 20px;
          color: var(--ac-text-body);
          background: rgba(255, 255, 248, .82);
          border: 2px dashed var(--ac-border);
          border-radius: var(--radius-md);
          text-align: center;
          font-weight: 900;
        }

        .inventory-modal {
          --inventory-pixel-edge: color-mix(in srgb, var(--ac-border) 82%, var(--ac-text));
          --inventory-pixel-shadow: color-mix(in srgb, var(--ac-shadow) 76%, var(--ac-text));
          --inventory-toolbar-height: 140px;
          --inventory-filter-height: 110px;
          width: min(1180px, 95vw);
          background: linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 2px solid var(--inventory-pixel-edge);
          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .88),
            5px 5px 0 rgba(189, 174, 160, .72),
            0 20px 48px rgba(66, 48, 31, .18);
          image-rendering: pixelated;
        }

        .inventory-modal .shop-modal__header {
          align-items: center;
          padding-top: 16px;
          background: rgba(255, 249, 232, .88);
          border-bottom: 2px solid rgba(196, 184, 158, .62);
        }

        .inventory-modal .shop-modal__title {
          font-size: 30px;
          color: var(--ac-text);
        }

        .inventory-title-wrap {
          min-width: 0;
          order: 1;
        }

        .inventory-filter-toggle {
          display: none;
        }

        .inventory-modal .shop-modal__close {
          width: 38px;
          height: 38px;
          order: 2;
        }

        .inventory-modal .shop-modal__toolbar {
          align-content: flex-start;
          flex: 0 0 auto;
          min-height: 0;
          height: auto;
          padding-top: 16px;
          padding-bottom: 10px;
          background: rgba(255, 249, 232, .58);
          border-bottom: 0;
        }

        .inventory-modal .shop-modal__toolbar {
          max-height: var(--inventory-toolbar-height);
          position: relative;
          z-index: 20;
          overflow: visible;
          opacity: 1;
          transform: translateY(0);
          transition:
            max-height .48s cubic-bezier(.22, 1, .36, 1),
            opacity .34s cubic-bezier(.22, 1, .36, 1),
            transform .42s cubic-bezier(.22, 1, .36, 1);
          will-change: max-height, opacity, transform;
        }

        .inventory-modal .inventory-grade-filter {
          align-content: flex-start;
          flex: 0 0 auto;
          min-height: 0;
          height: auto;
          max-height: var(--inventory-filter-height);
          overflow: hidden;
          opacity: 1;
          transform: translateY(0);
          transition:
            max-height .48s cubic-bezier(.22, 1, .36, 1),
            opacity .34s cubic-bezier(.22, 1, .36, 1),
            transform .42s cubic-bezier(.22, 1, .36, 1),
            padding-top .42s cubic-bezier(.22, 1, .36, 1),
            padding-bottom .42s cubic-bezier(.22, 1, .36, 1);
          will-change: max-height, opacity, transform, padding-top, padding-bottom;
        }

        .inventory-modal.inventory-modal--controls-hidden .shop-modal__toolbar,
        .inventory-modal.inventory-modal--controls-hidden .inventory-grade-filter {
          min-height: 0;
          height: 0;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          padding-top: 0;
          padding-bottom: 0;
          transform: translateY(-6px);
          pointer-events: none;
        }

        .inventory-modal .shop-modal__close,
        .inventory-modal .shop-input,
        .inventory-modal .shop-chip,
        .inventory-modal .sort-direction-select__trigger,
        .inventory-modal .shop-select-aisland [class*="animal-trigger-"] {
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
        }

        .inventory-modal .shop-modal__close:hover,
        .inventory-modal .shop-chip:hover,
        .inventory-modal .sort-direction-select__trigger:hover,
        .inventory-modal .shop-select-aisland [class*="animal-trigger-"]:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .inventory-modal .shop-modal__title,
        .inventory-detail-modal .shop-modal__title {
          font-family: var(--modal-title-font);
        }

        .inventory-grade-filter {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          padding: 8px clamp(18px, 2.6vw, 34px) 10px;
          background: rgba(255, 249, 232, .46);
        }

        .inventory-grade-filter__chip {
          --grade-chip-bg: var(--ac-cream-light);
          --grade-chip-edge: rgba(196, 184, 158, .86);
          --grade-chip-shadow: rgba(189, 174, 160, .42);
          appearance: none;
          min-width: 48px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          color: #101010;
          background: var(--grade-chip-bg);
          border: 1.5px solid var(--grade-chip-edge);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 var(--grade-chip-shadow);
          font: inherit;
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: .03em;
          transition: transform .14s ease, box-shadow .14s ease, filter .14s ease;
        }

        .inventory-grade-filter__chip:hover,
        .inventory-grade-filter__chip.is-active {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 var(--grade-chip-shadow);
          filter: saturate(1.06);
        }

        .inventory-grade-filter__chip.is-active {
          border-width: 2px;
          outline: 2px solid rgba(16, 16, 16, .08);
          outline-offset: 1px;
        }

        .inventory-grade-filter__chip--prop {
          --grade-chip-bg: #ececec;
          --grade-chip-edge: #c9c9c9;
          --grade-chip-shadow: rgba(74, 70, 63, .14);
        }

        .inventory-grade-filter__chip--misc {
          --grade-chip-bg: #ececec;
          --grade-chip-edge: #c9c9c9;
          --grade-chip-shadow: rgba(74, 70, 63, .14);
        }

        .inventory-grade-filter__chip--SSS {
          --grade-chip-bg: linear-gradient(180deg, oklch(0.98 0.37 36), oklch(0.95 0.24 77));
          --grade-chip-edge: #d39a2b;
          --grade-chip-shadow: rgba(156, 93, 15, .22);
        }

        .inventory-grade-filter__chip--SS {
          --grade-chip-bg: #fff7d9;
          --grade-chip-edge: #f4d36c;
          --grade-chip-shadow: rgba(176, 122, 16, .16);
        }

        .inventory-grade-filter__chip--S {
          --grade-chip-bg: #f7e2ff;
          --grade-chip-edge: #c17df2;
          --grade-chip-shadow: rgba(107, 78, 179, .16);
        }

        .inventory-grade-filter__chip--A {
          --grade-chip-bg: #cfefff;
          --grade-chip-edge: #4aa7e4;
          --grade-chip-shadow: rgba(43, 85, 143, .16);
        }

        .inventory-grade-filter__chip--B {
          --grade-chip-bg: #defec0;
          --grade-chip-edge: #9bdc5c;
          --grade-chip-shadow: rgba(72, 122, 38, .16);
        }

        .inventory-grade-filter__chip--C {
          --grade-chip-bg: #f3eee8;
          --grade-chip-edge: #c1ab8b;
          --grade-chip-shadow: rgba(111, 88, 67, .14);
        }

        .inventory-grade-filter__chip--D {
          --grade-chip-bg: #ececec;
          --grade-chip-edge: #c9c9c9;
          --grade-chip-shadow: rgba(74, 70, 63, .14);
        }

        .settings-modal {
          position: relative;
          width: min(1160px, 94vw);
          height: min(580px, 88vh);
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 2px solid color-mix(in srgb, var(--ac-border) 82%, var(--ac-text));
          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .88),
            5px 5px 0 rgba(189, 174, 160, .72),
            0 20px 48px rgba(66, 48, 31, .18);
          image-rendering: pixelated;
        }

        .settings-modal .shop-modal__header {
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 16px;
          background: rgba(255, 249, 232, .88);
          border-bottom: 2px solid rgba(196, 184, 158, .62);
        }

        .settings-modal .shop-modal__title {
          font-family: var(--modal-title-font);
          font-size: 30px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .02em;
          color: var(--ac-text);
          text-shadow: none;
        }

        .settings-modal .shop-modal__close {
          width: 38px;
          height: 38px;
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
        }

        .mobile-page-surface {
          will-change: transform, opacity;
        }

        .settings-mobile-controls {
          display: flex;
          flex: 1 1 auto;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .settings-mobile-controls .shop-modal__close {
          display: none;
        }

        .settings-content {
          flex: 1;
          min-height: 0;
          overflow: auto;
          padding: 18px clamp(18px, 2.8vw, 30px) 24px;
        }

        .settings-content--agent {
          padding: 0;
          overflow: hidden;
          background: #fffdf4;
        }

        .settings-tabs {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
        }

        .settings-tab {
          appearance: none;
          min-height: 38px;
          padding: 0 18px;
          color: rgba(121, 79, 39, .66);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
          transition: background 120ms ease, color 120ms ease;
        }

        .settings-tab:hover {
          color: var(--ac-text);
          background: rgba(255, 247, 227, .72);
        }

        .settings-tab.is-active {
          color: var(--ac-text);
          background: #ffd557;
          box-shadow: none;
        }

        .settings-agent-panel {
          --settings-agent-side-width: 176px;
          position: static;
          min-height: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          align-items: start;
          gap: 0;
          font-family: var(--font-rounded-current);
          font-variation-settings: "BEVL" var(--BEVL);
        }

        .settings-agent-side-nav {
          position: relative;
          z-index: 1;
          display: grid;
          align-content: start;
          gap: 4px;
          min-height: 100%;
          overflow: visible;
          padding: 18px 0;
          background: rgba(255, 253, 244, .86);
          border-right: 1.5px solid rgba(121, 79, 39, .2);
        }

        .settings-agent-side-tab {
          appearance: none;
          width: 170px;
          min-height: 48px;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          padding: 0 18px 0 22px;
          color: rgba(121, 79, 39, .72);
          text-align: left;
          background: transparent;
          border: 1.5px solid transparent;
          border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
          box-shadow: none;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 1000;
          line-height: 1.25;
          transition: background 120ms ease, color 120ms ease;
        }

        .settings-agent-side-tab:hover {
          color: var(--ac-text);
          background: rgba(255, 253, 244, .66);
        }

        .settings-agent-side-tab.is-active {
          color: var(--ac-text);
          background: #ffd557;
          border-color: rgba(121, 79, 39, .22);
          box-shadow: none;
        }

        .settings-agent-main {
          position: static;
          min-width: 0;
          height: 100%;
          overflow: auto;
          padding: 22px clamp(20px, 2.6vw, 28px) 28px;
          display: flex;
          flex-direction: column;
        }
        .settings-agent-main__topbar {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: 16px;
        }
        .settings-agent-main__topbar .settings-agent-intro-copy { margin-bottom: 0; }
        .settings-agent-main__footer {
          display: flex; justify-content: flex-end; align-items: center; gap: 10px;
          margin-top: auto; padding: 8px 0 16px;
        }
        .sac-buddy-banner {
          display: flex; align-items: center; gap: 12px;
          margin-top: auto;
          padding: 14px 16px;
          background: rgba(255, 213, 87, .08);
          border: 0;
          border-radius: var(--radius-sm);
        }
        .settings-agent-main__footer + .sac-buddy-banner {
          margin-top: 0;
        }
        .sac-buddy-banner__icon { font-size: 30px; flex-shrink: 0; }
        .sac-buddy-banner__body { flex: 1; min-width: 0; }
        .sac-buddy-banner__title { font-size: 13px; font-weight: 800; color: var(--ac-text); margin-bottom: 2px; }
        .sac-buddy-banner__desc  { font-size: 11px; color: rgba(121,79,39,.7); line-height: 1.5; }
        .sac-buddy-banner__btn {
          appearance: none; flex-shrink: 0;
          background: rgba(255,253,244,.56);
          color: rgba(121,79,39,.78);
          border: 1.5px solid rgba(196,184,158,.48);
          border-radius: var(--radius-xs); padding: 7px 16px;
          font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
          text-decoration: none; display: inline-block;
        }
        .sac-buddy-banner__btn:hover {
          color: var(--ac-text);
          background: rgba(255,213,87,.18);
          border-color: rgba(121,79,39,.32);
        }

        .settings-agent-intro-copy {
          margin: 0 0 18px;
          color: rgba(121, 79, 39, .74);
          font-size: 15px;
          font-weight: 1000;
          line-height: 1.45;
        }

        .settings-agent-flow-copy {
          margin: 0 0 16px;
          color: rgba(121, 79, 39, .72);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
        }

        .settings-agent-setup-guide {
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 12px;
          margin: -4px 0 16px;
          padding: 12px;
          background: rgba(255, 248, 232, .74);
          border: 1.5px solid rgba(196, 184, 158, .58);
          border-radius: var(--radius-xs);
        }

        .settings-agent-setup-rail {
          position: relative;
          display: grid;
          grid-template-rows: repeat(3, minmax(0, 1fr));
          align-items: start;
          justify-items: center;
          gap: 16px;
          padding: 4px 0;
        }

        .settings-agent-setup-rail::before {
          content: "";
          position: absolute;
          top: 20px;
          bottom: 20px;
          left: 50%;
          width: 1.5px;
          transform: translateX(-50%);
          background: rgba(196, 184, 158, .72);
        }

        .settings-agent-setup-step-dot {
          z-index: 1;
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          color: #5f5a4e;
          background: #f9f4e4;
          border: 1.5px solid rgba(196, 184, 158, .72);
          border-radius: 999px;
          box-shadow: 0 1px 0 rgba(255, 255, 255, .75) inset;
        }

        .settings-agent-setup-steps {
          display: grid;
          gap: 10px;
        }

        .settings-agent-setup-step {
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-height: 58px;
          padding: 10px 12px;
          color: var(--ac-text);
          background: #fffdf4;
          border: 1.5px solid rgba(196, 184, 158, .56);
          border-radius: var(--radius-xs);
          box-shadow: 0 1px 0 rgba(255, 255, 255, .72) inset;
        }

        .settings-agent-setup-step--with-action {
          grid-template-columns: 32px minmax(0, 1fr) auto;
        }

        .settings-agent-setup-step-icon {
          width: 32px;
          height: 32px;
          display: inline-grid;
          place-items: center;
          color: #7b5a26;
          background: #fff4d7;
          border: 1px solid rgba(196, 184, 158, .44);
          border-radius: 999px;
        }

        .settings-agent-setup-step strong {
          display: block;
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.2;
        }

        .settings-agent-setup-step span {
          display: block;
          margin-top: 4px;
          color: rgba(121, 79, 39, .68);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
        }

        .settings-agent-install {
          display: grid;
          gap: 22px;
          color: var(--ac-text);
        }

        .settings-agent-install ~ .settings-agent-api-panel {
          display: none;
        }

        .settings-agent-install__intro {
          display: grid;
          gap: 8px;
        }

        .settings-agent-install__title {
          margin: 0;
          color: #1f160c;
          font-size: 25px;
          font-weight: 1000;
          line-height: 1.15;
        }

        .settings-agent-install__subtitle {
          margin: 0;
          color: rgba(121, 79, 39, .66);
          font-size: 14px;
          font-weight: 900;
          line-height: 1.45;
        }

        .settings-agent-install-tabs {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          margin: 16px 0 -23px;
          padding-left: 16px;
          position: relative;
          z-index: 2;
        }

        .settings-agent-install-tab {
          appearance: none;
          min-height: 44px;
          padding: 0 14px;
          color: rgba(121, 79, 39, .62);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs) var(--radius-xs) 0 0;
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
          white-space: nowrap;
        }

        .settings-agent-install-tab.is-active {
          color: #1f160c;
          background: #fffdf4;
          box-shadow: inset 0 -2px 0 #1f160c;
        }

        .settings-agent-install-card {
          display: grid;
          gap: 34px;
          padding: 78px 34px 38px;
          background: #fffdf4;
          border: 1.5px solid rgba(196, 184, 158, .72);
          border-radius: var(--radius-xs);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .28);
        }

        .settings-agent-install-step {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        .settings-agent-install-step__num {
          width: 48px;
          height: 48px;
          display: inline-grid;
          place-items: center;
          color: #5b5148;
          background: #f1eee7;
          border-radius: var(--radius-xs);
          font-size: 20px;
          font-weight: 1000;
        }

        .settings-agent-install-step__body {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .settings-agent-install-step__body h3 {
          margin: 0;
          color: #1f160c;
          font-size: 22px;
          font-weight: 1000;
          line-height: 1.22;
        }

        .settings-agent-install-step__body p {
          margin: 0;
          color: rgba(121, 79, 39, .68);
          font-size: 16px;
          font-weight: 850;
          line-height: 1.45;
        }

        .settings-agent-install-command {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 34px;
          align-items: center;
          gap: 10px;
          padding: 13px 12px 13px 16px;
          background: #f0eee9;
          border: 1.5px solid rgba(196, 184, 158, .48);
          border-radius: var(--radius-xs);
        }

        .settings-agent-install-command code {
          min-width: 0;
          overflow: hidden;
          color: #6c655e;
          font-family: var(--font-rounded-current);
          font-size: 17px;
          font-weight: 800;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-agent-install-copy {
          width: 32px;
          height: 32px;
          display: inline-grid;
          place-items: center;
          color: #71685f;
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .settings-agent-install-copy:hover,
        .settings-agent-install-copy:focus-visible {
          color: var(--ac-text);
          background: rgba(255, 213, 87, .28);
        }

        .settings-agent-install-checks {
          display: grid;
          gap: 14px;
          margin-top: -2px;
        }

        .settings-agent-install-check {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          color: rgba(121, 79, 39, .68);
          font-size: 16px;
          font-weight: 850;
          line-height: 1.35;
        }

        .settings-agent-install-check svg {
          color: #18b560;
        }

        .settings-agent-install-check code {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 1px 8px;
          color: #71685f;
          background: #f1eee9;
          border: 1px solid rgba(196, 184, 158, .44);
          border-radius: 4px;
          font-family: var(--font-rounded-current);
          font-size: 15px;
          font-weight: 850;
        }
        .settings-agent-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px 24px;
        }

        .settings-agent-provider-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          overflow: visible;
          background: transparent;
          border: 0;
          border-radius: 0;
        }

        .settings-agent-provider-row {
          position: relative;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          color: var(--ac-text);
          background: rgba(255, 213, 87, .08);
          border: 0;
          border-radius: 14px;
        }

        .settings-agent-provider-row:first-child {
          border-radius: 14px;
        }

        .settings-agent-provider-row:last-child {
          border-radius: 14px;
        }

        .settings-agent-provider-row.is-connected {
          background: rgba(31, 163, 116, .07);
        }

        .settings-agent-provider-row.is-disconnected {
          background: rgba(255, 213, 87, .08);
        }

        .settings-agent-provider-row.is-unavailable {
          background: rgba(255, 213, 87, .08);
        }

        .settings-agent-provider-row.is-connected::before {
          content: "";
          position: absolute;
          left: 0;
          top: 14px;
          bottom: 14px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: rgba(31, 163, 116, .58);
        }

        .settings-agent-provider-row.is-disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .settings-agent-provider-row.is-disabled:hover,
        .settings-agent-provider-row.is-disabled:focus-visible {
          border-color: rgba(196, 184, 158, .58);
          outline: none;
        }

        .settings-agent-provider-head {
          min-width: 0;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          align-items: center;
          gap: 12px;
        }

        .settings-agent-provider-mark {
          width: 44px;
          height: 44px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          overflow: hidden;
          color: #fffdf4;
          background: #1f1e1b;
          border-radius: 11px;
          font-size: 16px;
          font-weight: 1000;
          line-height: 0;
        }

        .settings-agent-provider-mark--codex,
        .settings-agent-provider-mark--claude-code {
          background: rgba(252, 205, 212, .72);
          border: 0;
        }

        .settings-agent-provider-mark--codex {
          background: rgba(201, 213, 255, .72);
          border: 0;
        }

        .settings-agent-provider-mark--openrouter {
          background: rgba(201, 213, 255, .72);
          color: #fffdf4;
          border: 0;
          border-radius: 11px;
        }

        .settings-agent-provider-mark--openrouter .settings-agent-provider-icon,
        .settings-agent-provider-mark--openrouter .settings-agent-provider-icon > * {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          border-radius: inherit !important;
          overflow: hidden;
        }

        .settings-agent-provider-mark--openrouter .settings-agent-provider-icon {
          background: transparent !important;
          box-shadow: none !important;
        }

        .settings-agent-provider-mark--openrouter .settings-agent-provider-icon svg {
          width: 44px !important;
          height: 44px !important;
          transform: scale(.76) !important;
          transform-origin: center;
        }

        .settings-agent-provider-icon {
          width: 100% !important;
          height: 100% !important;
          display: block;
          flex: 0 0 100%;
          overflow: hidden;
          border-radius: inherit !important;
        }

        .settings-agent-provider-icon svg,
        .settings-agent-provider-icon img,
        .settings-agent-provider-icon canvas {
          width: 100% !important;
          height: 100% !important;
          display: block;
          flex: 0 0 100%;
        }

        .settings-agent-provider-icon svg {
          transform: scale(.76) !important;
          transform-origin: center;
        }

        .settings-agent-provider-icon img,
        .settings-agent-provider-icon canvas {
          transform: none !important;
        }

        .settings-agent-provider-name {
          min-width: 0;
          display: grid;
          gap: 5px;
          color: var(--ac-text);
          font-size: 16px;
          font-weight: 1000;
          line-height: 1.05;
        }

        .settings-agent-provider-name > span:first-child {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-agent-provider-meta {
          color: rgba(121, 79, 39, .64);
          font-size: 11px;
          font-weight: 700;
          line-height: 1.25;
        }

        .settings-agent-provider-badge {
          width: max-content;
          min-height: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          background: transparent;
          border-radius: 0;
          color: rgba(121, 79, 39, .66);
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .settings-agent-provider-badge::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: none;
        }

        .settings-agent-provider-badge.is-connected {
          color: #3fae6b;
          background: transparent;
        }

        .settings-agent-provider-badge.is-disconnected {
          color: #c7bea5;
          background: transparent;
        }

        .settings-agent-provider-badge.is-unavailable {
          color: #c46a2a;
          background: transparent;
        }

        .settings-agent-provider-status-line {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .settings-agent-provider-hint {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(121, 79, 39, .46);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.25;
        }

        .settings-agent-provider-actions {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          flex-wrap: wrap;
        }

        .settings-agent-provider-action-button {
          appearance: none;
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          color: var(--ac-text);
          background: rgba(255, 253, 244, .92);
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          box-shadow: none;
        }

        .settings-agent-provider-actions .settings-agent-provider-action-button,
        .settings-agent-provider-actions .settings-agent-provider-action-button:hover,
        .settings-agent-provider-actions .settings-agent-provider-action-button:focus,
        .settings-agent-provider-actions .settings-agent-provider-action-button:focus-visible {
          border: 0;
          box-shadow: none;
          outline: none;
        }

        .settings-agent-provider-action-button--compact {
          min-height: 28px;
          padding: 0 10px;
          font-size: 12px;
          border: 0;
          box-shadow: none;
        }

        .settings-agent-provider-action-button svg {
          width: 14px;
          height: 14px;
        }

        .settings-agent-provider-action-button:hover,
        .settings-agent-provider-action-button:focus-visible {
          border: 0;
          box-shadow: none;
          outline: none;
        }

        .settings-agent-provider-action-button:disabled {
          cursor: wait;
        }

        .settings-agent-provider-action-button.is-disabled {
          cursor: not-allowed;
          color: rgba(121, 79, 39, .58);
          background: rgba(196, 184, 158, .28);
          border: 0;
          box-shadow: none;
          opacity: 1;
          filter: grayscale(.18);
        }

        .settings-agent-provider-action-button.is-loading svg {
          animation: settings-agent-spin .8s linear infinite;
        }

        .settings-agent-provider-action-button--primary {
          background: #f8c840;
          border: 0;
          border-radius: 8px;
          box-shadow: none;
        }

        @media (max-width: 980px) {
          .settings-agent-provider-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .settings-agent-provider-list {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .settings-agent-provider-add {
          appearance: none;
          min-height: 38px;
          padding: 0 14px;
          color: var(--ac-text);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
        }

        .settings-agent-provider-add:hover,
        .settings-agent-provider-add:focus-visible {
          background: rgba(255, 213, 87, .72);
          outline: none;
        }

        .settings-agent-provider-icon-action {
          appearance: none;
          width: 38px;
          height: 38px;
          position: relative;
          display: inline-grid;
          place-items: center;
          color: var(--ac-text);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
          font: inherit;
        }

        .settings-agent-provider-icon-action:hover,
        .settings-agent-provider-icon-action:focus-visible {
          background: rgba(255, 213, 87, .72);
          outline: none;
        }

        .settings-agent-provider-icon-action:disabled {
          cursor: wait;
        }

        .settings-agent-provider-icon-action.is-loading svg {
          animation: settings-agent-spin .8s linear infinite;
        }

        @keyframes settings-agent-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .settings-agent-provider-icon-action::after {
          content: attr(data-label);
          position: absolute;
          left: 50%;
          bottom: calc(100% + 8px);
          z-index: 4;
          padding: 5px 8px;
          color: #fffdf4;
          background: rgba(62, 45, 31, .94);
          border-radius: 6px;
          box-shadow: 0 6px 14px rgba(61, 52, 40, .18);
          font-size: 12px;
          font-weight: 900;
          line-height: 1;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transform: translate(-50%, 4px);
          transition: opacity .16s ease, transform .16s ease;
        }

        .settings-agent-provider-icon-action:hover::after,
        .settings-agent-provider-icon-action:focus-visible::after {
          opacity: 1;
          transform: translate(-50%, 0);
        }

        /* ── Multi-step Agent Connect Modal ── */
        .sac-modal {
          position: relative;
          width: min(600px, 100%);
          max-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
          color: var(--ac-text);
          background: #fffdf4;
          border: 1.5px solid rgba(121, 79, 39, .28);
          border-radius: var(--radius-xs);
          box-shadow: 0 0 0 3px rgba(255,253,244,.72), 0 18px 36px rgba(66,48,31,.16);
          animation: sacPopIn 0.18s ease;
        }
        .sac-modal:has(.sac-success) {
          width: fit-content;
          max-width: 100%;
        }
        @keyframes sacPopIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sac-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1.5px solid rgba(196, 184, 158, .4);
          gap: 12px;
        }
        .sac-title { flex: 1; min-width: 0; font-size: 15px; font-weight: 800; color: var(--ac-text); white-space: nowrap; }
        .sac-close {
          appearance: none; width: 28px; height: 28px; flex-shrink: 0;
          display: inline-grid; place-items: center;
          color: rgba(121,79,39,.7); background: transparent;
          border: 0; border-radius: var(--radius-xs); cursor: pointer;
        }
        .sac-close:hover { color: var(--ac-text); background: rgba(255,213,87,.3); }

        /* Steps bar — inline in header */
        .sac-steps {
          flex: 1;
          display: flex; align-items: center; justify-content: flex-end;
          gap: 0;
          padding: 0;
        }
        .sac-sitem {
          display: flex; align-items: center; gap: 5px;
          position: relative;
        }
        .sac-sitem:not(:last-child)::after {
          content: ''; display: inline-block;
          width: 18px; height: 1.5px;
          background: rgba(196,184,158,.5);
          margin: 0 4px; vertical-align: middle;
        }
        .sac-circle {
          width: 22px; height: 22px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800;
          background: rgba(196,184,158,.3); color: rgba(121,79,39,.5);
          transition: background 0.2s, color 0.2s; flex-shrink: 0;
        }
        .sac-circle--active { background: #5bbcd6; color: #fff; }
        .sac-circle--done   { background: #ffd557; color: #5a3e00; }
        .sac-slabel { font-size: 10px; color: rgba(121,79,39,.45); }
        .sac-slabel--active { color: #3a9bbf; font-weight: 700; }
        .sac-slabel--done   { color: #b8940a; font-weight: 700; }

        /* Body */
        .sac-body {
          min-height: 0;
          padding: 16px 18px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sac-body::-webkit-scrollbar {
          display: none;
        }
        .sac-sub  { font-size: 12px; color: rgba(121,79,39,.72); line-height: 1.6; margin: 0; }

        /* Inline step (page-embedded flow) */
        .sac-inline-step {
          padding: 4px 0 0; margin-top: 4px;
        }
        .sac-inline-step__head { margin-bottom: 18px; position: relative; }
        .sac-inline-step__title { font-family: var(--modal-title-font); font-size: 18px; font-weight: 800; color: var(--ac-text); margin: 0 0 6px; }
        .sac-inline-step__sub { font-size: 13px; color: rgba(121,79,39,.72); line-height: 1.6; margin: 0; }
        .sac-inline-back {
          appearance: none; font: inherit; cursor: pointer; background: none; border: none;
          color: rgba(121,79,39,.7); font-size: 12.5px; font-weight: 700;
          padding: 0; margin-bottom: 10px; display: inline-flex; align-items: center; gap: 2px;
        }
        .sac-inline-back:hover { color: var(--ac-text); }
        .sac-inline-step .sac-body { padding: 0; }

        /* Connection mode bar (manage view) */
        .sac-mode-bar {
          display: flex; align-items: center; justify-content: space-between;
          background: #fff2c9; border: 1.5px solid rgba(212, 159, 47, .36);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 12px;
        }
        .sac-mode-bar__label { font-size: 13px; font-weight: 700; color: var(--ac-text); }
        .sac-mode-bar__switch {
          appearance: none; font: inherit; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: 0; border-radius: 8px;
          color: rgba(121,79,39,.85); font-size: 12px; padding: 5px 12px;
          box-shadow: none;
          transition: background 0.15s;
        }
        .sac-mode-bar__switch:hover { background: rgba(121,79,39,.06); }


        /* Mode cards */
        .sac-mode-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sac-mode-card {
          appearance: none; text-align: left;
          border: 2px solid rgba(196,184,158,.55); border-radius: var(--radius-xs);
          min-height: 100px; padding: 18px 20px; cursor: pointer; background: #fffdf4;
          display: flex; align-items: center; gap: 14px;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          font: inherit; color: inherit;
        }
        .sac-mode-card:hover {
          border-color: rgba(255, 213, 87, .5); background: rgba(255, 213, 87, .04);
        }
        .sac-mode-card--sel {
          border-color: #ffd557; background: rgba(255, 213, 87, .08);
          box-shadow: inset 0 0 0 2px rgba(255, 213, 87, .12);
        }
        .sac-mode-body { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
        .sac-mode-title { font-weight: 800; font-size: 14px; line-height: 1.2; margin-bottom: 0; color: rgba(92, 61, 25, .94); }
        .sac-mode-desc  { font-size: 12px; color: rgba(121,79,39,.68); line-height: 1.45; }
        .sac-mode-card--locked { opacity: 0.5; cursor: not-allowed; }
        .sac-mode-card--locked:hover { border-color: rgba(196,184,158,.55); background: #fffdf4; }
        .sac-mode-lock { margin-left: auto; font-size: 12px; align-self: center; }
        .sac-mode-warning {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(78, 67, 60, .24);
          backdrop-filter: blur(2px);
        }
        .sac-disconnect-all-btn {
          flex: 0 0 auto;
          font-size: 12px; font: inherit; cursor: pointer; appearance: none;
          color: #8a4a0b; background: #ffd557; border: 1px solid rgba(180,83,9,.35);
          border-radius: 6px; padding: 5px 12px;
          transition: background 0.15s, border-color 0.15s;
        }
        .sac-disconnect-all-btn:hover { background: rgba(180,83,9,.07); border-color: rgba(180,83,9,.6); }

        .sac-mode-warning .settings-agent-confirm-actions {
          justify-content: flex-end;
          align-items: center;
        }

        .sac-mode-warning .sac-disconnect-all-btn {
          order: -1;
          height: 34px;
          border: 0;
          padding: 0 14px;
          font-size: 12px;
          line-height: 34px;
          box-shadow: none;
        }

        .sac-mode-warning .settings-agent-confirm-actions .settings-action--primary {
          height: 28px;
          padding: 0 14px;
          background: #fff7e3;
          box-shadow: none;
        }

        /* Radio dot */
        .sac-radio {
          width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(196,184,158,.7);
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.15s, background 0.15s; margin-top: 1px;
        }
        .sac-radio--checked { border-color: #ffd557; background: #ffd557; }
        .sac-radio--checked::after { content: ''; width: 5px; height: 5px; border-radius: 50%; background: #794f27; }

        /* Option cards */
        .sac-opt-card {
          border: 1.5px solid rgba(196,184,158,.5); border-radius: var(--radius-xs);
          padding: 12px 14px; cursor: pointer; background: #fffdf4;
          transition: border-color 0.15s, background 0.15s;
        }
        .sac-opt-card:hover, .sac-opt-card--sel { border-color: #ffd557; background: #fffbee; }
        .sac-opt-card--auth-code {
          position: relative;
        }
        .sac-opt-card--auth-code.sac-opt-card--sel {
          padding-right: 17px;
        }
        .sac-opt-card--auth-code.sac-opt-card--sel .settings-agent-refresh-icon {
          position: absolute;
          top: 22px;
          right: 18px;
          z-index: 1;
        }
        .sac-opt-card--inline-form,
        .sac-opt-card--inline-form:hover,
        .sac-opt-card--inline-form.sac-opt-card--sel {
          padding: 0;
          cursor: default;
          background: transparent;
          border-color: transparent;
        }

        .sac-opt-card--api-web,
        .sac-opt-card--api-web:hover {
          box-sizing: border-box;
          padding: 12px 14px;
          cursor: pointer;
          background: #fffdf4;
          border-color: rgba(196,184,158,.5);
          transition: none;
        }

        .sac-opt-card--api-web.sac-opt-card--sel,
        .sac-opt-card--api-web.sac-opt-card--sel:hover {
          box-sizing: border-box;
          padding: 12px 14px;
          background: #fffbee;
          border-color: #ffd557;
        }

        .sac-opt-head  { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .sac-opt-title { font-weight: 700; font-size: 13px; color: var(--ac-text); }
        .sac-opt-desc  { font-size: 11px; color: rgba(121,79,39,.65); margin-left: 25px; }
        .sac-opt-detail { margin-top: 12px; margin-left: 25px; }
        .sac-opt-card--inline-form .sac-opt-head { margin-bottom: 5px; }
        .sac-opt-card--inline-form .sac-opt-detail { margin: 14px 0 0 25px; }
        .sac-opt-card--api-web .sac-opt-detail,
        .sac-opt-card--api-web:hover .sac-opt-detail {
          margin: 14px 0 0 25px;
        }
        .sac-opt-card--plain-form .sac-opt-head,
        .sac-opt-card--plain-form .sac-opt-desc { display: none; }
        .sac-opt-card--plain-form .sac-opt-detail { margin: 0; }
        .sac-api-panel {
          display: grid;
          gap: 8px;
          padding: 4px 0 0;
        }
        .sac-api-panel__head {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sac-api-panel__desc {
          color: rgba(121,79,39,.66);
          font-size: 11px;
          line-height: 1.5;
        }
        .sac-api-panel__detail {
          display: grid;
          gap: 8px;
        }
        .sac-api-panel__actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 0;
        }
        .sac-api-panel--plain .sac-api-panel__detail {
          padding-left: 0;
        }
        .sac-badge {
          background: rgba(91,214,155,.2); color: #2a7a4a;
          font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 10px;
        }

        /* Note bar inside opt-detail */
        .sac-note {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: rgba(121,79,39,.72);
          background: rgba(255,213,87,.12); border-radius: var(--radius-xs);
          padding: 8px 10px; margin-bottom: 10px;
        }
        .sac-note span { flex: 1; line-height: 1.5; }

        /* Code box */
        .sac-code-box {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255, 253, 244, .82);
          border: 1.5px solid rgba(196,184,158,.52);
          border-radius: var(--radius-xs);
          padding: 8px 10px 8px 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
        }
        .sac-code-box code { flex: 1; font-size: 12px; color: rgb(121,79,39); font-family: var(--font-rounded-current); word-break: break-all; }

        .sac-code-copy {
          appearance: none;
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--ac-text);
          background: rgba(255,213,87,.28);
          border: 1.5px solid rgba(121,79,39,.16);
          border-radius: var(--radius-xs);
          cursor: pointer;
          transition: background .15s ease, border-color .15s ease, transform .15s ease;
        }

        .sac-code-copy:hover,
        .sac-code-copy:focus-visible {
          color: var(--ac-text);
          background: rgba(255,213,87,.72);
          border-color: rgba(121,79,39,.28);
          outline: none;
        }

        .sac-code-copy:active {
          transform: translateY(1px);
        }

        .sac-link { color: #3a9bbf; font-size: 13px; font-weight: 600; text-decoration: none; }
        .sac-link:hover { text-decoration: underline; }

        .sac-manual-guide {
          max-height: min(280px, 42vh);
          overflow-y: auto;
          margin-right: -10px;
          padding-right: 10px;
        }
        .sac-guide-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; counter-reset: guide-step; }
        .sac-guide-steps > li { counter-increment: guide-step; display: flex; flex-direction: column; gap: 6px; }
        .sac-guide-step-title { font-size: 12px; font-weight: 700; color: var(--ac-text); }
        .sac-guide-step-title::before { content: counter(guide-step) ". "; }
        .sac-guide-fields { list-style: disc; padding-left: 16px; margin: 0; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: rgba(121,79,39,.8); }
        .sac-guide-field-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
        .sac-guide-fields code { background: rgba(196,184,158,.2); border-radius: 3px; padding: 0 4px; font-family: var(--font-rounded-current); font-size: 11px; }
        .sac-guide-copy {
          appearance: none;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          color: rgba(121,79,39,.68);
          background: rgba(255,253,244,.76);
          border: 1px solid rgba(196,184,158,.52);
          border-radius: 5px;
          cursor: pointer;
        }
        .sac-guide-copy:hover,
        .sac-guide-copy:focus-visible { color: var(--ac-text); background: #fffdf4; outline: none; }
        .sac-guide-hint-wrap { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 8px; }
        .sac-guide-hint { font-size: 11px; color: rgba(121,79,39,.65); line-height: 1.5; margin: 0; }
        .sac-guide-img-button {
          appearance: none;
          display: block;
          width: 100%;
          padding: 0;
          background: transparent;
          border: 0;
          border-radius: 6px;
          cursor: zoom-in;
        }
        .sac-guide-img-button:focus-visible {
          outline: 2px solid #ffd557;
          outline-offset: 2px;
        }
        .sac-guide-img { width: 100%; border-radius: 6px; border: 1px solid rgba(196,184,158,.4); display: block; transition: border-color .15s ease, box-shadow .15s ease; }
        .sac-guide-img-button:hover .sac-guide-img,
        .sac-guide-img-button:focus-visible .sac-guide-img {
          border-color: rgba(121,79,39,.36);
          box-shadow: 0 8px 18px rgba(66,48,31,.14);
        }

        .sac-image-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 42px;
          background: rgba(25, 31, 37, .52);
          backdrop-filter: blur(5px);
        }
        .sac-image-preview-modal {
          position: relative;
          width: min(1180px, 94vw);
          height: min(820px, 88vh);
          display: grid;
          place-items: center;
          overflow: auto;
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .sac-image-preview-close {
          appearance: none;
          position: fixed;
          top: 26px;
          right: 30px;
          z-index: 2;
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          color: #fffdf4;
          background: rgba(25, 31, 37, .5);
          border: 0;
          border-radius: 999px;
          cursor: pointer;
        }
        .sac-image-preview-close:hover,
        .sac-image-preview-close:focus-visible {
          color: #5a3e00;
          background: #ffd557;
          outline: none;
        }
        .sac-image-preview-toolbar {
          position: fixed;
          top: 26px;
          left: 50%;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px;
          background: rgba(25, 31, 37, .5);
          border-radius: 999px;
          transform: translateX(-50%);
        }
        .sac-image-preview-tool {
          appearance: none;
          min-width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          padding: 0 10px;
          color: #fffdf4;
          background: transparent;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }
        .sac-image-preview-tool:hover,
        .sac-image-preview-tool:focus-visible {
          color: #5a3e00;
          background: #ffd557;
          outline: none;
        }
        .sac-image-preview-tool:disabled {
          opacity: .38;
          cursor: not-allowed;
        }
        .sac-image-preview-body {
          width: max-content;
          height: max-content;
          display: block;
        }
        .sac-image-preview-body img {
          display: block;
          max-width: min(1120px, calc(94vw - 84px));
          max-height: calc(88vh - 84px);
          width: auto;
          height: auto;
          border: 0;
          border-radius: 0;
          box-shadow: 0 18px 44px rgba(25, 31, 37, .36);
          transform-origin: center;
        }

        /* Nav */
        .sac-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
        .sac-btn-prev {
          appearance: none; background: transparent; color: rgba(121,79,39,.72);
          border: 1.5px solid rgba(196,184,158,.7); border-radius: var(--radius-xs);
          padding: 8px 18px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .sac-btn-next, .sac-btn-sm {
          appearance: none; background: #ffd557; color: #5a3e00; border: none;
          border-radius: var(--radius-xs); padding: 8px 22px;
          font: inherit; font-size: 13px; font-weight: 800; cursor: pointer;
        }
        .sac-btn-sm { padding: 7px 13px; white-space: nowrap; }
        .sac-btn-next:hover, .sac-btn-sm:hover { background: #f5c030; }

        /* Success */
        .sac-success {
          box-sizing: border-box;
          width: 450px;
          max-width: 100%;
          margin-inline: auto;
          text-align: center;
          padding: 28px 18px 24px !important;
        }
        .sac-success-icon  { font-size: 48px; margin-bottom: 10px; }
        .sac-success-title { font-size: 17px; font-weight: 800; color: #2a7a4a; margin-bottom: 6px; }
        .sac-success-msg   { font-size: 13px; color: #4a9a6a; margin-bottom: 16px; }

        .sac-buddy-card {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; margin-bottom: 20px;
          background: rgba(255,213,87,.12);
          border: 1.5px solid rgba(245,200,66,.5);
          border-radius: var(--radius-xs);
          text-align: left;
        }
        .sac-buddy-card__icon { font-size: 28px; flex-shrink: 0; }
        .sac-buddy-card__body { flex: 1; min-width: 0; }
        .sac-buddy-card__title { font-size: 13px; font-weight: 800; color: var(--ac-text); margin-bottom: 2px; }
        .sac-buddy-card__desc  { font-size: 11px; color: rgba(121,79,39,.7); line-height: 1.5; }
        .sac-buddy-card__btn {
          appearance: none; flex-shrink: 0;
          background: #ffd557; color: #5a3e00; border: none;
          border-radius: var(--radius-xs); padding: 7px 14px;
          font: inherit; font-size: 12px; font-weight: 800; cursor: pointer;
          text-decoration: none; display: inline-block;
        }
        .sac-buddy-card__btn:hover { background: #f5c030; }

        /* Auth preview trigger */
        .sac-auth-preview-trigger-row { padding: 16px 0 4px; display: flex; justify-content: center; }
        .sac-auth-preview-trigger {
          appearance: none; background: transparent;
          border: 1.5px dashed rgba(196,184,158,.7); border-radius: var(--radius-xs);
          padding: 7px 16px; font: inherit; font-size: 12px; font-weight: 700;
          color: rgba(121,79,39,.5); cursor: pointer;
        }
        .sac-auth-preview-trigger:hover { border-color: rgba(121,79,39,.4); color: rgba(121,79,39,.8); background: rgba(255,213,87,.1); }

        /* Auth preview modal */
        .sac-auth-preview {
          width: min(450px, 96vw);
          display: flex; flex-direction: column; align-items: center;
          gap: 0;
          padding: 32px 28px 16px;
          background: #fffdf4;
          border: 1.5px solid rgba(121,79,39,.22);
          border-radius: var(--radius-xs);
          box-shadow: 0 0 0 3px rgba(255,253,244,.72), 0 18px 48px rgba(66,48,31,.18);
          animation: sacPopIn 0.18s ease;
          text-align: center;
        }
        .sac-auth-preview__icon { margin-bottom: 20px; border-radius: 16px; overflow: hidden; }
        .sac-auth-preview__heading { font-size: 17px; font-weight: 700; color: var(--ac-text); line-height: 1.5; margin: 0 0 12px; }
        .sac-auth-preview__body { font-size: 13px; font-weight: 200; color: rgba(121,79,39,.75); line-height: 1.6; margin: 0 0 24px; }
        .sac-auth-preview__title { font-size: 17px; font-weight: 700; color: var(--ac-text); line-height: 1.5; margin: 0 0 20px; }
        .sac-auth-preview__perms {
          width: 100%; list-style: none; padding: 0; margin: 0 0 24px;
          border-top: 1.5px solid rgba(196,184,158,.4);
          border-bottom: 1.5px solid rgba(196,184,158,.4);
        }
        .sac-auth-preview__perms li {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 4px; font-size: 14px; color: var(--ac-text);
        }
        .sac-auth-preview__check { color: #3fae6b; font-weight: 800; font-size: 15px; flex-shrink: 0; }
        .sac-auth-preview__allow {
          appearance: none; width: 100%; padding: 12px;
          background: #f8c840; color: #5a3e00; border: none;
          border-radius: var(--radius-xs); font: inherit; font-size: 14px; font-weight: 800;
          cursor: pointer; margin-bottom: 10px;
        }
        .sac-auth-preview__allow:hover { background: #f5c030; }
        .sac-auth-preview__cancel {
          appearance: none; background: transparent; border: 0;
          font: inherit; font-size: 13px; color: rgba(121,79,39,.6);
          cursor: pointer; padding: 4px 8px;
        }
        .sac-auth-preview__cancel:hover { color: var(--ac-text); }

        .settings-agent-connect-overlay {
          position: absolute;
          inset: 0;
          z-index: 6;
          display: grid;
          place-items: center;
          padding: 28px;
          background: rgba(78, 67, 60, .14);
        }

        .settings-agent-connect-modal {
          position: relative;
          width: min(548px, 100%);
          height: auto;
          max-height: 100%;
          display: grid;
          grid-template-rows: auto auto;
          gap: 14px;
          overflow: hidden;
          padding: 18px 18px 20px;
          color: var(--ac-text);
          background: #fffdf4;
          border: 1.5px solid rgba(121, 79, 39, .28);
          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 3px rgba(255, 253, 244, .72),
            0 18px 36px rgba(66, 48, 31, .16);
        }

        .settings-agent-confirm-modal {
          width: min(360px, 100%);
          display: grid;
          gap: 18px;
          padding: 18px;
          color: var(--ac-text);
          background: rgba(255, 253, 244, .98);
          border: 2px solid rgba(196, 184, 158, .7);
          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .78),
            4px 4px 0 rgba(189, 174, 160, .5),
            0 18px 36px rgba(66, 48, 31, .18);
        }

        .settings-agent-connect-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .settings-agent-connect-modal--compact-header .settings-agent-connect-modal__header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 28px;
          align-items: center;
          gap: 10px;
        }

        .settings-agent-connect-modal--compact-header .settings-agent-method-tabs {
          margin-right: 0;
        }

        .settings-agent-connect-modal--compact-header .settings-agent-connect-modal__close {
          width: 28px;
          height: 28px;
          padding: 0;
          color: rgba(121, 79, 39, .78);
          background: transparent;
          border: 0;
          box-shadow: none;
        }

        .settings-agent-connect-modal--compact-header .settings-agent-connect-modal__close:hover,
        .settings-agent-connect-modal--compact-header .settings-agent-connect-modal__close:focus-visible {
          color: var(--ac-text);
          background: transparent;
          opacity: .85;
        }

        .settings-agent-connect-modal__close {
          appearance: none;
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--ac-text);
          background: #fff7e3;
          border: 1.5px solid rgba(196, 184, 158, .72);
          border-radius: var(--radius-xs);
          cursor: pointer;
          box-shadow: none;
        }

        .settings-agent-method-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3px;
          min-width: 0;
          padding: 3px;
          background: rgba(255, 247, 227, .72);
          border: 1.5px solid rgba(196, 184, 158, .52);
          border-radius: var(--radius-xs);
        }

        .settings-agent-method-tab {
          appearance: none;
          min-height: 30px;
          position: relative;
          padding: 0 12px;
          color: rgba(121, 79, 39, .68);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 1000;
          transition: background 120ms ease, color 120ms ease;
        }

        .settings-agent-method-tab.is-active {
          color: var(--ac-text);
          background: #ffd557;
          box-shadow: 1px 1px 0 rgba(189, 174, 160, .28);
        }

        .settings-agent-method-tab.is-active::after {
          content: none;
        }

        .settings-agent-method-tab:hover,
        .settings-agent-method-tab:focus-visible {
          color: var(--ac-text);
          background: rgba(255, 213, 87, .52);
          outline: none;
        }

        .settings-agent-method-tab.is-active:hover,
        .settings-agent-method-tab.is-active:focus-visible {
          background: #ffd557;
        }

        .settings-agent-card {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow: auto;
          padding: 0;
          color: var(--ac-text);
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .settings-agent-connect-modal .settings-agent-card {
          gap: 12px;
          min-height: 232px;
          overflow: visible;
          padding-bottom: 0;
        }

        .settings-agent-card__head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .settings-agent-card__title {
          display: grid;
          gap: 5px;
        }

        .settings-agent-card__title strong {
          font-size: 17px;
          font-weight: 1000;
          line-height: 1.1;
        }

        .settings-agent-card__title span {
          color: rgba(121, 79, 39, .68);
          font-size: 12px;
          font-weight: 850;
          line-height: 1.35;
        }

        .settings-agent-status {
          flex: 0 0 auto;
          color: #9d6b1c;
          font-size: 12px;
          font-weight: 1000;
          white-space: nowrap;
        }

        .settings-agent-status.is-active {
          color: #18855c;
        }

        .settings-agent-status.is-danger {
          color: #b14b43;
        }

        .settings-agent-status.is-muted {
          color: rgba(121, 79, 39, .54);
        }

        .settings-agent-api-panel {
          gap: 14px;
        }

        .settings-agent-card__title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .settings-agent-count {
          min-width: 24px;
          height: 20px;
          display: inline-grid;
          place-items: center;
          padding: 0 7px;
          color: rgba(121, 79, 39, .72);
          background: #fff7e3;
          border: 1px solid rgba(196, 184, 158, .5);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 1000;
        }

        .settings-agent-api-list {
          display: grid;
          gap: 10px;
        }

        .settings-agent-api-empty {
          display: grid;
          place-items: center;
          gap: 8px;
          min-height: 150px;
          color: rgba(121, 79, 39, .62);
          text-align: center;
          background: #fff8e8;
          border: 1.5px dashed rgba(196, 184, 158, .7);
          border-radius: var(--radius-xs);
          font-size: 12px;
          font-weight: 850;
        }

        .settings-agent-api-item {
          display: grid;
          gap: 10px;
          padding: 14px;
          background: #fff8e8;
          border: 1.5px solid rgba(196, 184, 158, .56);
          border-radius: var(--radius-xs);
        }

        .settings-agent-api-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .settings-agent-api-name {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .settings-agent-api-name strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 1000;
        }

        .settings-agent-icon-button {
          appearance: none;
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: rgba(121, 79, 39, .72);
          background: transparent;
          border: 1.5px solid transparent;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .settings-agent-icon-button:hover,
        .settings-agent-icon-button:focus-visible {
          color: var(--ac-text);
          background: #fffdf4;
          border-color: rgba(196, 184, 158, .62);
        }

        .settings-agent-api-actions {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex: 0 0 auto;
        }

        .settings-agent-api-menu-anchor {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex: 0 0 auto;
        }

        .settings-agent-api-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          z-index: 3;
          min-width: 138px;
          padding: 5px;
          background: #fffdf4;
          border: 1.5px solid rgba(196, 184, 158, .72);
          border-radius: var(--radius-xs);
          box-shadow: 0 12px 24px rgba(66, 48, 31, .16);
        }

        .settings-agent-api-menu button {
          appearance: none;
          width: 100%;
          min-height: 32px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          color: #b14b43;
          text-align: left;
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .settings-agent-api-menu button:hover {
          background: rgba(177, 75, 67, .1);
        }

        .settings-agent-api-keyline {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }

        .settings-agent-api-label {
          color: rgba(121, 79, 39, .62);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .settings-agent-api-secret {
          min-width: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 6px;
          padding: 7px 8px;
          background: rgba(255, 253, 244, .78);
          border-radius: var(--radius-xs);
        }

        .settings-agent-api-secret code {
          min-width: 0;
          overflow: hidden;
          color: #6c4622;
          font-size: 12px;
          font-weight: 1000;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-agent-api-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 16px;
          color: rgba(121, 79, 39, .68);
          font-size: 11px;
          font-weight: 850;
        }

        .settings-agent-api-meta strong {
          color: #9d6b1c;
          font-weight: 1000;
        }

        .settings-agent-api-update {
          color: #b27319;
        }

        .settings-agent-api-name-edit {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1 1 auto;
        }

        .settings-agent-api-name-edit .settings-input {
          min-height: 34px;
          max-width: 280px;
          padding-block: 0;
        }

        .settings-agent-prompt-preview {
          max-height: 190px;
          overflow: auto;
          padding: 12px;
          color: #4e433c;
          background: #fff8e8;
          border: 1.5px solid rgba(196, 184, 158, .56);
          border-radius: var(--radius-xs);
          font-family: var(--font-rounded-current);
          font-size: 11px;
          font-weight: 850;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .settings-agent-api-create-modal {
          width: min(520px, 100%);
        }

        .settings-agent-api-steps {
          display: grid;
          grid-template-columns: auto minmax(24px, 1fr) auto;
          align-items: center;
          gap: 10px;
        }

        .settings-agent-api-step {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(121, 79, 39, .62);
          font-size: 12px;
          font-weight: 1000;
        }

        .settings-agent-api-step span:first-child {
          width: 22px;
          height: 22px;
          display: inline-grid;
          place-items: center;
          background: #fff7e3;
          border: 1.5px solid rgba(196, 184, 158, .62);
          border-radius: 999px;
        }

        .settings-agent-api-step.is-active {
          color: var(--ac-text);
        }

        .settings-agent-api-step.is-active span:first-child {
          background: #ffd557;
          border-color: rgba(121, 79, 39, .26);
        }

        .settings-agent-api-step-line {
          height: 1.5px;
          background: rgba(196, 184, 158, .56);
        }

        .settings-agent-auth-options {
          width: 100%;
          display: grid;
          grid-template-columns: minmax(136px, .74fr) minmax(0, 1fr);
          column-gap: 18px;
          overflow: visible;
          background: rgba(255, 253, 244, .82);
          border: 0;
          border-radius: var(--radius-xs);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
          padding: 12px;
        }

        .settings-agent-auth-option {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          align-content: center;
          align-items: center;
          padding: 0;
          margin: 0;
          background: transparent;
          border: 0;
          border-radius: 0;
        }

        .settings-agent-auth-option--scan {
          padding-right: 0;
        }

        .settings-agent-auth-option--code {
          gap: 14px;
          padding-left: 18px;
          border-left: 1.5px solid rgba(196, 184, 158, .1);
        }

        .settings-agent-auth-option > div:first-child,
        .settings-agent-code-copy {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .settings-agent-auth-option__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .settings-agent-auth-option span {
          color: rgba(121, 79, 39, .66);
          font-size: 10px;
          font-weight: 750;
          line-height: 1.45;
        }

        .settings-agent-auth-option strong {
          color: var(--ac-text);
          font-weight: 1000;
        }

        .settings-agent-auth-option__head strong {
          font-size: 13px;
          line-height: 1.2;
        }

        .settings-agent-code-copy strong {
          color: rgb(121,79,39);
          font-family: var(--font-rounded-current);
          font-size: 20px;
          letter-spacing: .06em;
          line-height: 1;
        }

        .settings-agent-code-copy__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
        }

        .settings-agent-code-copy__head span {
          min-width: 0;
        }

        .settings-agent-auth-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          align-items: center;
          gap: 8px;
        }

        .settings-agent-auth-option--code .settings-action {
          width: min(100%, 240px);
          min-height: 36px;
          border-radius: var(--radius-xs);
          font-size: 12px;
          font-weight: 900;
        }

        .settings-agent-auth-option--code .settings-action--primary {
          color: #5a3e00;
          background: #ffd557;
          border: 0;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.42);
        }

        .settings-agent-auth-option--code .settings-action--primary:hover,
        .settings-agent-auth-option--code .settings-action--primary:focus-visible {
          background: #f5c030;
        }

        .settings-agent-qr {
          width: 116px;
          height: 116px;
          display: block;
          justify-self: start;
          overflow: hidden;
          background: #fff;
          border: 1.5px solid rgba(196,184,158,.42);
          border-radius: 6px;
          padding: 5px;
        }

        .settings-agent-qr img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          image-rendering: auto;
        }

        .settings-agent-meta {
          display: grid;
          gap: 0;
          border-top: 1px solid rgba(196, 184, 158, .52);
          border-bottom: 1px solid rgba(196, 184, 158, .52);
        }

        .settings-agent-meta__row {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(196, 184, 158, .34);
          font-size: 12px;
          font-weight: 900;
        }

        .settings-agent-meta__row:last-child {
          border-bottom: 0;
        }

        .settings-agent-meta__row span:first-child {
          color: rgba(121, 79, 39, .62);
        }

        .settings-agent-meta__row span:last-child {
          min-width: 0;
          overflow: hidden;
          color: var(--ac-text);
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .settings-agent-form {
          display: grid;
          gap: 12px;
        }

        .settings-agent-form--byok {
          min-height: 0;
          align-content: start;
          gap: 10px;
        }

        .settings-agent-form .settings-field {
          gap: 8px;
        }

        .settings-agent-form--byok .settings-field {
          gap: 8px;
        }

        .settings-agent-form--byok .settings-input {
          height: 40px;
        }

        .settings-agent-byok-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 2px;
        }

        .settings-agent-byok-actions .settings-action {
          min-width: 92px;
        }

        .settings-field__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .settings-api-key-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .settings-api-key-link:hover {
          text-decoration: underline;
        }

        .settings-api-key-link__muted {
          color: rgba(92, 99, 119, .86);
          font-weight: 800;
        }

        .settings-api-key-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 14px;
          margin-top: 2px;
        }

        .settings-agent-test-message {
          margin: -2px 0 0;
          font-size: 11px;
          font-weight: 900;
          line-height: 1.45;
        }

        .settings-agent-test-message.is-error {
          color: #b42318;
        }

        .settings-agent-test-message.is-success {
          color: #16794c;
        }

        .settings-agent-confirm-copy {
          margin: 0;
          color: rgba(121, 79, 39, .72);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.45;
        }

        .settings-agent-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .settings-agent-actions {
          display: flex;
          flex-wrap: wrap;
          flex: 0 0 auto;
          gap: 10px;
          margin-top: auto;
        }

        .settings-agent-snippet {
          min-height: 74px;
          padding: 12px;
          overflow: auto;
          color: #4e433c;
          background: #fff7e3;
          border: 1.5px solid rgba(196, 184, 158, .62);
          border-radius: var(--radius-xs);
          font-family: var(--font-rounded-current);
          font-size: 11px;
          font-weight: 850;
          line-height: 1.45;
          white-space: pre-wrap;
        }

        .settings-agent-note {
          color: rgba(121, 79, 39, .66);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.45;
        }

        .settings-agent-auth-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 30px;
          margin: 0;
        }

        .settings-agent-auth-note span {
          min-width: 0;
        }

        .settings-agent-refresh-icon {
          appearance: none;
          width: 28px;
          height: 28px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: rgba(121, 79, 39, .78);
          background: transparent;
          border: 1.5px solid rgba(196, 184, 158, .5);
          border-radius: var(--radius-xs);
          cursor: pointer;
          box-shadow: none;
        }

        .settings-agent-refresh-icon:hover,
        .settings-agent-refresh-icon:focus-visible {
          color: var(--ac-text);
          background: #ffd557;
        }

        @media (max-width: 760px) {
          .settings-agent-panel {
            --settings-agent-side-width: 0px;
            grid-template-columns: 1fr;
          }

          .settings-agent-side-nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .settings-agent-side-tab {
            width: 100%;
          }

          .settings-agent-grid {
            grid-template-columns: 1fr;
          }

          .settings-agent-provider-row {
            grid-template-columns: auto minmax(0, 1fr);
            gap: 10px 14px;
            padding-block: 12px;
          }

          .settings-agent-provider-actions {
            grid-column: 2;
            justify-content: flex-start;
          }

          .settings-agent-setup-guide {
            grid-template-columns: 1fr;
          }

          .settings-agent-setup-rail {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-template-rows: none;
            gap: 10px;
            padding: 0;
          }

          .settings-agent-setup-rail::before {
            top: 50%;
            right: 20px;
            left: 20px;
            bottom: auto;
            width: auto;
            height: 1.5px;
            transform: translateY(-50%);
          }

          .settings-agent-setup-step {
            grid-template-columns: 1fr;
            justify-items: start;
          }

          .settings-agent-setup-step--with-action {
            grid-template-columns: 1fr;
          }

          .settings-agent-setup-download {
            justify-self: start;
          }

          .settings-agent-auth-options {
            grid-template-columns: 1fr;
            gap: 14px;
            padding: 12px;
          }

          .settings-agent-auth-option--code {
            padding-left: 0;
            border-left: 0;
            border-top: 1.5px solid rgba(196, 184, 158, .46);
            padding-top: 14px;
          }

          .settings-agent-auth-option {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .settings-agent-auth-option--scan {
            padding-right: 0;
          }

          .settings-agent-auth-option--code {
            padding-top: 14px;
            padding-left: 0;
            border-top: 1px solid rgba(196, 184, 158, .44);
            border-left: 0;
          }

          .settings-agent-auth-actions,
          .settings-agent-qr {
            justify-self: start;
          }

          .settings-agent-api-row,
          .settings-agent-api-name-edit {
            align-items: flex-start;
            flex-direction: column;
          }

          .settings-agent-api-keyline {
            grid-template-columns: 1fr;
          }
        }

        .settings-section {
          padding: 18px;
          background: rgba(255, 253, 244, .86);
          border: 2px solid rgba(196, 184, 158, .7);
          border-radius: var(--radius-sm);
          box-shadow: none;
        }

        .settings-section + .settings-section {
          margin-top: 14px;
        }

        .settings-section__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .settings-section__title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--ac-text);
          font-size: 16px;
          font-weight: 1000;
        }

        .settings-section__icon {
          color: #794f27;
        }

        .settings-language-select {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .settings-language-select [class*="animal-wrapper-"] {
          width: 100%;
          min-width: 0;
        }

        .settings-language-select [class*="animal-trigger-"] {
          box-sizing: border-box;
          width: 100%;
          min-height: 48px;
          padding: 0 14px 0 18px;
          color: var(--ac-text);
          background: #fffdf4;
          border: 2px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-xs);
          box-shadow: none !important;
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
        }

        .settings-language-select [class*="animal-trigger-"]:hover,
        .settings-language-select [class*="animal-trigger-"]:focus-visible {
          box-shadow: none !important;
        }

        .settings-language-select [class*="animal-value-"],
        .settings-language-select [class*="animal-placeholder-"] {
          color: var(--ac-text);
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
        }

        .settings-language-select [class*="animal-dropdown-"] {
          inset: 100% auto auto 0 !important;
          left: 0 !important;
          right: auto !important;
          top: calc(100% + 6px) !important;
          bottom: auto !important;
          margin: 0 !important;
          transform: none !important;
          width: 100% !important;
          min-width: 100% !important;
          background: #fff3d3;
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 6px 0 var(--ac-shadow-input), 0 12px 26px rgba(61, 52, 40, .14);
        }

        .settings-language-select [class*="animal-option-"] {
          color: var(--ac-text);
          font: inherit;
          font-size: 14px;
          font-weight: 950;
        }

        .settings-language-select [class*="animal-option-"]::before,
        .settings-language-select [class*="animal-hovered-"]::before {
          content: none !important;
          display: none !important;
        }

        .settings-profile {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          align-items: start;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .settings-field {
          display: grid;
          gap: 7px;
          color: var(--ac-text);
          font-size: 12px;
          font-weight: 950;
        }

        .settings-field--full {
          grid-column: 1 / -1;
        }

        .settings-profile .settings-input {
          width: 100%;
        }

        .settings-input {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          color: var(--ac-text);
          background: #fffdf4;
          border: 2px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-xs);
          box-shadow: none;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
        }

        .settings-input:disabled {
          color: rgba(121, 79, 39, .62);
          background: rgba(245, 236, 212, .78);
          cursor: not-allowed;
        }

        .settings-helper {
          color: rgba(121, 79, 39, .7);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.45;
        }

        .settings-inline {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .settings-code-field {
          position: relative;
          display: block;
        }

        .settings-code-field .settings-input {
          padding-right: 82px;
        }

        .settings-action.settings-code-send {
          position: absolute;
          top: 50%;
          right: 6px;
          min-width: 0;
          width: max-content;
          min-height: 30px;
          padding: 0 9px;
          transform: translateY(-50%);
          box-shadow: none;
        }

        .settings-action.settings-code-send:hover,
        .settings-action.settings-code-send:active,
        .settings-action.settings-code-send:focus-visible {
          box-shadow: none;
        }

        .settings-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 14px;
        }

        .settings-action {
          appearance: none;
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 0;
          border-radius: var(--radius-xs);
          box-shadow: none;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 1000;
        }

        .settings-action--primary {
          background: #ffd557;
        }

        .settings-action--quiet {
          color: rgba(121, 79, 39, .78);
          background: #fff7e3;
        }

        .settings-action--danger {
          color: #9f3934;
          background: #fff0ee;
        }

        .settings-logout-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-top: 36px;
          margin-bottom: 20px;
        }

        .settings-action--logout {
          --settings-warning: #FD5F5A;
          min-width: 108px;
          color: #fffdf4;
          background: var(--settings-warning);
          border: 0;
        }

        .settings-action--logout:hover,
        .settings-action--logout:focus-visible {
          color: #fffdf4;
          background: #e84d49;
          border: 0;
        }

        .settings-confirm-modal .settings-action--logout {
          border: 0;
        }

        .settings-confirm-modal {
          --settings-warning: #FD5F5A;
          --settings-warning-soft: #fff0ee;
          width: min(392px, 100%);
          display: grid;
          gap: 18px;
          padding: 18px;
          color: var(--ac-text);
          background: rgba(255, 253, 244, .98);
          border: 2px solid rgba(196, 184, 158, .7);
          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .78),
            4px 4px 0 rgba(189, 174, 160, .5),
            0 18px 36px rgba(66, 48, 31, .18);
        }

        .settings-confirm-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .settings-confirm-modal__title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--settings-warning);
          font-size: 16px;
          font-weight: 1000;
        }

        .settings-confirm-modal__close {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(121, 79, 39, .78);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
        }

        .settings-confirm-modal__close:hover,
        .settings-confirm-modal__close:focus-visible {
          color: var(--ac-text);
          background: rgba(255, 247, 227, .72);
        }

        .settings-confirm-modal__copy {
          margin: 0;
          color: rgba(121, 79, 39, .72);
          font-size: 13px;
          font-weight: 850;
          line-height: 1.5;
        }

        .settings-confirm-modal__actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .settings-modal-backdrop {
          container-type: inline-size;
          container-name: settings-modal-shell;
        }

        .game-landing:has(.game-stage--mobile-cover) .inventory-modal-backdrop.mobile-page-shell {
          --mobile-page-enter-duration: 320ms;
          --mobile-page-exit-duration: 260ms;
          --mobile-page-enter-ease: cubic-bezier(0.22, 1, 0.36, 1);
          --mobile-page-exit-ease: cubic-bezier(0.4, 0, 1, 1);
          --mobile-page-surface-enter-x: 40px;
          --mobile-page-surface-exit-x: 28px;
        }

        .game-landing:has(.game-stage--mobile-cover) .settings-modal-backdrop.mobile-page-shell {
          --mobile-page-enter-duration: 320ms;
          --mobile-page-exit-duration: 260ms;
          --mobile-page-enter-ease: cubic-bezier(0.22, 1, 0.36, 1);
          --mobile-page-exit-ease: cubic-bezier(0.4, 0, 1, 1);
          --mobile-page-surface-enter-x: 40px;
          --mobile-page-surface-exit-x: 28px;
        }

        .game-landing:has(.game-stage--mobile-cover) .leaderboard-modal-backdrop.mobile-page-shell {
          --mobile-page-enter-duration: 320ms;
          --mobile-page-exit-duration: 260ms;
          --mobile-page-enter-ease: cubic-bezier(0.22, 1, 0.36, 1);
          --mobile-page-exit-ease: cubic-bezier(0.4, 0, 1, 1);
          --mobile-page-surface-enter-x: 40px;
          --mobile-page-surface-exit-x: 28px;
        }

        .game-landing:has(.game-stage--mobile-cover) .settings-modal-backdrop {
          place-items: stretch;
          overflow: hidden;
          padding: 0;
          background: rgba(216, 237, 247, .98);
        }

        .game-landing:has(.game-stage--mobile-cover) .settings-modal {
          box-sizing: border-box;
          width: 100vw;
          max-width: none;
          inline-size: 100vw;
          max-inline-size: none;
          height: 100dvh;
          block-size: 100dvh;
          max-height: 100dvh;
          max-block-size: 100dvh;
          min-block-size: 0;
          min-inline-size: 0;
          transform: none;
          border-radius: 0;
          border: 0;
          box-shadow: none;
        }

        @supports (height: 100svh) {
          .game-landing:has(.game-stage--mobile-cover) .settings-modal {
            block-size: 100svh;
            max-block-size: 100svh;
          }
        }

        @media (max-width: 700px) {
          .mobile-page-shell {
            --mobile-page-enter-duration: 280ms;
            --mobile-page-exit-duration: 220ms;
            --mobile-page-enter-ease: cubic-bezier(0.22, 1, 0.36, 1);
            --mobile-page-exit-ease: cubic-bezier(0.4, 0, 1, 1);
            --mobile-page-surface-enter-x: 18px;
            --mobile-page-surface-exit-x: 14px;
          }

          .mobile-page-shell[data-mobile-page-transition="opening"] {
            animation: mobile-page-backdrop-in var(--mobile-page-enter-duration) var(--mobile-page-enter-ease) both;
          }

          .mobile-page-shell[data-mobile-page-transition="closing"] {
            animation: mobile-page-backdrop-out var(--mobile-page-exit-duration) var(--mobile-page-exit-ease) both;
            pointer-events: none;
          }

          .mobile-page-shell[data-mobile-page-transition="opening"] .mobile-page-surface {
            animation: mobile-page-surface-in var(--mobile-page-enter-duration) var(--mobile-page-enter-ease) both;
          }

          .mobile-page-shell[data-mobile-page-transition="closing"] .mobile-page-surface {
            animation: mobile-page-surface-out var(--mobile-page-exit-duration) var(--mobile-page-exit-ease) both;
          }

          .settings-modal-backdrop {
            place-items: stretch;
            overflow: hidden;
            padding: 0;
            background: rgba(216, 237, 247, .98);
          }

          .settings-modal {
            box-sizing: border-box;
            width: 100%;
            max-width: none;
            inline-size: 100vw;
            max-inline-size: none;
            height: 100dvh;
            block-size: 100dvh;
            max-height: 100dvh;
            max-block-size: 100dvh;
            min-block-size: 0;
            min-inline-size: 0;
            transform: none;
            border-radius: 0;
            border: 0;
            box-shadow: none;
          }

          @supports (height: 100svh) {
            .settings-modal {
              block-size: 100svh;
              max-block-size: 100svh;
            }
          }

          .settings-modal .shop-modal__header {
            position: sticky;
            top: 0;
            z-index: 30;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            padding:
              max(12px, env(safe-area-inset-top))
              max(16px, env(safe-area-inset-right))
              12px
              max(16px, env(safe-area-inset-left));
            background: rgba(255, 249, 232, .88);
            border-bottom: 1.5px solid rgba(196, 184, 158, .56);
            backdrop-filter: blur(10px);
          }

          .settings-modal .shop-modal__header > .shop-modal__close {
            display: none;
          }

          .settings-mobile-controls {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: stretch;
            gap: 8px;
          }

          .settings-mobile-controls .shop-modal__close {
            display: inline-grid;
          }

          .settings-tabs {
            min-width: 0;
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .settings-tab {
            min-width: 0;
            min-height: 44px;
            padding: 0 10px;
            font-size: 13px;
            line-height: 1.15;
            border: 1.5px solid rgba(196, 184, 158, .68);
            background: rgba(255, 253, 244, .84);
          }

          .settings-content {
            padding:
              16px
              max(16px, env(safe-area-inset-right))
              calc(28px + env(safe-area-inset-bottom))
              max(16px, env(safe-area-inset-left));
            overscroll-behavior: contain;
            background: rgba(255, 249, 232, .46);
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .settings-content::-webkit-scrollbar {
            display: none;
          }

          .settings-content--agent {
            overflow: auto;
          }

          .settings-section {
            padding: 16px;
            border-width: 1.5px;
            border-radius: 14px;
          }

          .settings-section + .settings-section {
            margin-top: 14px;
          }

          .settings-section__head {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
          }

          .settings-section__title {
            min-width: 0;
            font-size: 16px;
            line-height: 1.2;
          }

          .settings-profile,
          .settings-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .settings-language-select {
            width: 100%;
            grid-template-columns: minmax(0, 1fr);
          }

          .settings-field--full {
            grid-column: auto;
          }

          .settings-field {
            gap: 8px;
            font-size: 13px;
          }

          .settings-input {
            min-width: 0;
            height: 48px;
            font-size: 14px;
          }

          .settings-code-field {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 108px;
            align-items: stretch;
            gap: 8px;
          }

          .settings-code-field .settings-input {
            padding-right: 12px;
          }

          .settings-action.settings-code-send {
            position: static;
            min-height: 48px;
            min-width: 108px;
            padding: 0 12px;
            transform: none;
          }

          .settings-actions,
          .settings-confirm-modal__actions,
          .settings-agent-confirm-actions,
          .settings-agent-actions,
          .settings-agent-byok-actions {
            justify-content: stretch;
          }

          .settings-actions .settings-action,
          .settings-confirm-modal__actions .settings-action,
          .settings-agent-confirm-actions .settings-action,
          .settings-agent-actions .settings-action,
          .settings-agent-byok-actions .settings-action {
            flex: 1 1 0;
            min-height: 48px;
          }

          .settings-action {
            min-height: 48px;
            font-size: 13px;
          }

          .settings-logout-row {
            margin-top: 20px;
            margin-bottom: 8px;
          }

          .settings-action--logout {
            width: 100%;
          }

          .settings-agent-panel {
            height: auto;
            min-height: 100%;
          }

          .settings-agent-main {
            height: auto;
            min-height: 100%;
            overflow: visible;
            padding: 0;
          }

          .settings-agent-main__topbar,
          .settings-agent-card__head,
          .settings-agent-api-row,
          .settings-agent-api-name-edit,
          .settings-agent-auth-note,
          .sac-buddy-banner {
            align-items: stretch;
            flex-direction: column;
          }

          .settings-agent-install {
            gap: 16px;
          }

          .settings-agent-install__title {
            font-size: 22px;
          }

          .settings-agent-install__subtitle,
          .settings-agent-install-step__body p,
          .settings-agent-install-check {
            font-size: 13px;
          }

          .settings-agent-install-tabs {
            gap: 8px;
            margin: 6px 0 -1px;
            padding-left: 0;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .settings-agent-install-tabs::-webkit-scrollbar {
            display: none;
          }

          .settings-agent-install-tab {
            min-height: 44px;
            padding: 0 12px;
            flex: 0 0 auto;
            font-size: 13px;
          }

          .settings-agent-install-card {
            gap: 20px;
            padding: 16px;
          }

          .settings-agent-install-step {
            grid-template-columns: minmax(0, 1fr);
            gap: 10px;
          }

          .settings-agent-install-step__num {
            width: 44px;
            height: 44px;
          }

          .settings-agent-install-step__body h3 {
            font-size: 18px;
          }

          .settings-agent-install-command {
            grid-template-columns: minmax(0, 1fr) 44px;
            padding: 10px;
          }

          .settings-agent-install-command code {
            font-size: 12px;
          }

          .settings-agent-install-copy {
            width: 44px;
            height: 44px;
          }

          .settings-agent-provider-list {
            grid-template-columns: minmax(0, 1fr);
          }

          .settings-agent-provider-row {
            padding: 12px;
            border-radius: var(--radius-xs);
          }

          .settings-agent-provider-row:first-child,
          .settings-agent-provider-row:last-child {
            border-radius: var(--radius-xs);
          }

          .settings-agent-provider-actions {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .settings-agent-provider-action-button,
          .settings-agent-provider-action-button--compact,
          .settings-agent-provider-add,
          .settings-agent-icon-button,
          .settings-agent-refresh-icon,
          .sac-mode-bar__switch,
          .sac-disconnect-all-btn,
          .sac-mode-warning .settings-agent-confirm-actions .settings-action--primary,
          .sac-code-copy,
          .sac-guide-copy,
          .sac-btn-prev,
          .sac-btn-next,
          .sac-btn-sm {
            min-height: 44px;
          }

          .settings-agent-icon-button,
          .settings-agent-refresh-icon,
          .sac-code-copy,
          .sac-guide-copy {
            width: 44px;
            height: 44px;
          }

          .sac-mode-bar {
            align-items: center;
            flex-direction: row;
            gap: 10px;
          }

          .sac-mode-bar__switch {
            flex: 0 0 auto;
            justify-content: center;
            white-space: nowrap;
          }

          .sac-mode-bar__label {
            min-width: 0;
            flex: 1 1 auto;
          }

          .sac-mode-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .sac-nav {
            gap: 10px;
          }

          .sac-nav > * {
            flex: 1 1 0;
          }

          .sac-opt-detail,
          .sac-opt-card--inline-form .sac-opt-detail,
          .sac-opt-card--api-web .sac-opt-detail,
          .sac-opt-card--api-web:hover .sac-opt-detail {
            margin-left: 0;
          }

          .sac-api-panel__actions {
            justify-content: stretch;
          }

          .sac-api-panel__actions .sac-btn-next {
            width: 100%;
          }

          .sac-code-box {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 44px;
          }

          .sac-mode-warning {
            padding: 12px;
          }

          .settings-agent-connect-overlay {
            padding: 12px;
          }

          .settings-agent-connect-modal,
          .settings-agent-confirm-modal,
          .settings-confirm-modal {
            inline-size: min(100%, 520px);
            max-inline-size: 100%;
            max-height: calc(100dvh - 56px);
            overflow: auto;
            padding: 14px;
          }

          @supports (height: 100svh) {
            .settings-agent-connect-modal,
            .settings-agent-confirm-modal,
            .settings-confirm-modal {
              max-height: calc(100svh - 56px);
            }
          }

          .settings-agent-connect-modal__header,
          .settings-confirm-modal__header {
            gap: 10px;
          }

          .settings-agent-connect-modal__close,
          .settings-confirm-modal__close {
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
          }

          .settings-agent-method-tab {
            min-height: 44px;
            padding: 0 8px;
            font-size: 12px;
          }

          .settings-agent-card,
          .settings-agent-connect-modal .settings-agent-card {
            min-height: 0;
            overflow: visible;
          }

          .settings-agent-card__title strong {
            font-size: 16px;
          }

          .settings-agent-status {
            white-space: normal;
          }

          .settings-agent-api-name-edit .settings-input {
            max-width: none;
          }

          .settings-agent-api-actions {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }

          .settings-agent-api-secret {
            grid-template-columns: minmax(0, 1fr) 44px 44px;
            padding: 6px;
          }

          .settings-agent-api-menu button {
            min-height: 44px;
          }

          .settings-agent-api-steps {
            grid-template-columns: minmax(0, 1fr);
            align-items: stretch;
          }

          .settings-agent-api-step-line {
            display: none;
          }

          .settings-agent-auth-options {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .settings-agent-auth-option--code {
            padding-left: 0;
            padding-top: 14px;
            border-left: 0;
            border-top: 1.5px solid rgba(196, 184, 158, .44);
          }

          .settings-agent-auth-option--code .settings-action {
            width: 100%;
            min-height: 44px;
          }

          .settings-agent-meta__row {
            grid-template-columns: minmax(0, 1fr);
            gap: 4px;
          }

          .settings-agent-qr {
            width: 128px;
            height: 128px;
          }

          .settings-agent-prompt-preview,
          .settings-agent-snippet {
            max-height: 220px;
          }
        }

        @keyframes mobile-page-backdrop-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes mobile-page-backdrop-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes mobile-page-surface-in {
          from {
            opacity: .01;
            transform: translate3d(var(--mobile-page-surface-enter-x, 18px), 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes mobile-page-surface-out {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          to {
            opacity: .01;
            transform: translate3d(var(--mobile-page-surface-exit-x, 14px), 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-page-shell,
          .mobile-page-surface {
            animation: none !important;
            transition: none !important;
          }
        }

        @media (max-width: 640px) {
          .settings-action--logout {
            width: 100%;
          }
        }

        .settings-action:disabled {
          opacity: .48;
          cursor: not-allowed;
          box-shadow: none;
        }

	        .leaderboard-modal {
	          width: min(960px, 94vw);
	          height: min(760px, calc(100svh - clamp(56px, 8svh, 104px)));
	          max-height: calc(100svh - clamp(56px, 8svh, 104px));
	          background: linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
	          border: 2px solid color-mix(in srgb, var(--ac-border) 82%, var(--ac-text));
	          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .88),
            5px 5px 0 rgba(189, 174, 160, .72),
            0 20px 48px rgba(66, 48, 31, .18);
          image-rendering: pixelated;
        }

	        .leaderboard-modal .shop-modal__header {
	          flex: 0 0 auto;
	          align-items: center;
	          justify-content: space-between;
	          gap: 14px;
	          padding-top: 16px;
          background: rgba(255, 249, 232, .88);
          border-bottom: 2px solid rgba(196, 184, 158, .62);
        }

        .leaderboard-modal__heading {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex: 1 1 auto;
        }

        .leaderboard-modal .shop-modal__title {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          padding: 0 18px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.2;
          font-weight: 1000;
          letter-spacing: 0;
          color: var(--ac-text);
          text-shadow: none;
        }

        .leaderboard-modal .shop-modal__close {
          width: 38px;
          height: 38px;
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
        }

        .leaderboard-panel {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 18px clamp(18px, 2.6vw, 34px) 24px;
        }

        .leaderboard-tabs {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          padding: 0;
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .leaderboard-tab {
          appearance: none;
          min-height: 38px;
          padding: 0 18px;
          color: rgba(121, 79, 39, .66);
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          cursor: pointer;
          font: inherit;
          font-size: 14px;
          font-weight: 1000;
          transition: background 120ms ease, color 120ms ease;
        }

        .leaderboard-tab:hover {
          color: var(--ac-text);
          background: rgba(255, 247, 227, .72);
        }

        .leaderboard-tab.is-active {
          color: var(--ac-text);
          background: #ffd557;
          box-shadow: none;
        }

        .leaderboard-podium {
          flex: 0 0 auto;
          position: relative;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: end;
          gap: 16px;
          margin-top: 0;
          padding: 24px 0 8px;
          isolation: isolate;
        }

        .leaderboard-podium::before {
          content: "";
          position: absolute;
          left: 4px;
          right: 4px;
          bottom: 1px;
          height: 28px;
          z-index: -1;
          background:
            linear-gradient(90deg, transparent 0 2%, rgba(121, 79, 39, .16) 2% 98%, transparent 98%),
            repeating-linear-gradient(90deg, rgba(121, 79, 39, .18) 0 2px, transparent 2px 26px),
            linear-gradient(180deg, #f4d58f 0%, #d5ad62 100%);
          border: 2px solid rgba(121, 79, 39, .34);
          border-radius: var(--radius-xs);
          box-shadow: 0 5px 0 rgba(121, 79, 39, .18);
        }

        .leaderboard-podium-card {
          --podium-bg: #fff7e3;
          --podium-edge: rgba(196, 184, 158, .74);
          --podium-shadow: rgba(121, 79, 39, .2);
          --podium-medal: #d7c39b;
          position: relative;
          min-width: 0;
          min-height: var(--podium-height, 150px);
          display: grid;
          align-content: space-between;
          gap: 12px;
          overflow: visible;
          padding: 18px;
          color: var(--ac-text);
          background:
            linear-gradient(135deg, rgba(255,255,255,.62) 0 16%, transparent 16% 100%),
            radial-gradient(circle at 85% 18%, rgba(255,255,255,.72) 0 9px, transparent 10px),
            linear-gradient(180deg, #fffdf4 0%, var(--podium-bg) 100%);
          border: 2px solid var(--podium-edge);
          border-radius: var(--radius-sm);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.56),
            4px 4px 0 var(--podium-shadow),
            0 12px 22px rgba(66, 48, 31, .12);
          transform: translateY(var(--podium-lift, 0));
        }

        .leaderboard-podium-card::before,
        .leaderboard-podium-card::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .leaderboard-podium-card::before {
          left: 14px;
          right: 14px;
          bottom: -11px;
          height: 12px;
          background: color-mix(in srgb, var(--podium-edge) 52%, #fffdf4);
          border: 2px solid color-mix(in srgb, var(--podium-edge) 82%, #2c2117);
          border-top: 0;
          border-radius: 0 0 var(--radius-xs) var(--radius-xs);
          box-shadow: 2px 3px 0 rgba(121, 79, 39, .18);
        }

        .leaderboard-podium-card::after {
          right: 14px;
          bottom: 12px;
          width: 52px;
          height: 6px;
          opacity: .58;
          background: repeating-linear-gradient(90deg, var(--podium-edge) 0 6px, transparent 6px 11px);
          border-radius: 999px;
        }

        .leaderboard-podium-card__shine {
          position: absolute;
          inset: 8px 8px auto auto;
          width: 48px;
          height: 48px;
          opacity: .52;
          background:
            linear-gradient(90deg, transparent 44%, rgba(255, 253, 244, .92) 44% 56%, transparent 56%),
            linear-gradient(0deg, transparent 44%, rgba(255, 253, 244, .92) 44% 56%, transparent 56%);
          transform: rotate(18deg) scale(var(--shine-scale, .7));
        }

        .leaderboard-podium-card__head {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .leaderboard-podium-card--rank-1 {
          --podium-height: 202px;
          --podium-lift: -10px;
          --podium-bg: #fff0a8;
          --podium-edge: #d69b21;
          --podium-shadow: rgba(169, 110, 28, .32);
          --podium-medal: #f3b72d;
          --shine-scale: .95;
          z-index: 3;
        }

        .leaderboard-podium-card--rank-2 {
          --podium-height: 166px;
          --podium-bg: #edf4f2;
          --podium-edge: #93a8a6;
          --podium-shadow: rgba(86, 106, 104, .22);
          --podium-medal: #9ca9a8;
        }

        .leaderboard-podium-card--rank-3 {
          --podium-height: 154px;
          --podium-bg: #f8ddc6;
          --podium-edge: #b9794c;
          --podium-shadow: rgba(146, 83, 45, .24);
          --podium-medal: #b9794c;
        }

        .leaderboard-rank-badge {
          position: relative;
          width: 42px;
          height: 42px;
          display: inline-grid;
          place-items: center;
          color: #fffdf4;
          background: var(--podium-medal);
          border: 2px solid color-mix(in srgb, var(--podium-medal) 60%, #2c2117);
          border-radius: 999px;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.42),
            0 3px 0 rgba(44, 33, 23, .28);
          font-size: 16px;
          font-weight: 1000;
          line-height: 1;
        }

        .leaderboard-rank-badge__ring {
          position: absolute;
          inset: 5px;
          border: 1.5px solid rgba(255, 253, 244, .58);
          border-radius: 999px;
        }

        .leaderboard-rank-tag {
          position: relative;
          padding: 4px 10px;
          color: color-mix(in srgb, var(--podium-edge) 68%, #2c2117);
          background: rgba(255, 253, 244, .82);
          border: 1.5px solid color-mix(in srgb, var(--podium-edge) 56%, #fffdf4);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 1000;
          box-shadow: 1px 2px 0 rgba(121, 79, 39, .12);
        }

        .leaderboard-crown {
          position: absolute;
          left: 50%;
          top: -25px;
          z-index: 4;
          width: 58px;
          height: 34px;
          transform: translateX(-50%);
          filter: drop-shadow(0 3px 0 rgba(121, 79, 39, .22));
        }

        .leaderboard-crown::before {
          content: "";
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 0;
          height: 13px;
          background: #f3b72d;
          border: 2px solid #8f6420;
          border-radius: 0 0 8px 8px;
        }

        .leaderboard-crown span {
          position: absolute;
          bottom: 9px;
          width: 20px;
          height: 22px;
          background: #ffd557;
          border: 2px solid #8f6420;
          transform: rotate(45deg);
        }

        .leaderboard-crown span:nth-child(1) {
          left: 4px;
        }

        .leaderboard-crown span:nth-child(2) {
          left: 19px;
          bottom: 14px;
        }

        .leaderboard-crown span:nth-child(3) {
          right: 4px;
        }

        .leaderboard-champion-ribbon {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          min-height: 22px;
          margin-bottom: 6px;
          padding: 0 10px;
          color: #fffdf4;
          background: #8f6420;
          border: 1.5px solid rgba(44, 33, 23, .36);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(121, 79, 39, .18);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .08em;
        }

        .leaderboard-name {
          position: relative;
          z-index: 1;
          overflow: hidden;
          color: var(--ac-text);
          font-size: 17px;
          font-weight: 1000;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-balance {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgb(121, 79, 39);
          font-size: 22px;
          font-weight: 1000;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .leaderboard-balance__icon {
          width: 24px;
          height: 24px;
          flex: 0 0 auto;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .leaderboard-casts {
          position: relative;
          z-index: 1;
          color: #725d42;
          font-size: 12px;
          font-weight: 900;
        }

        .leaderboard-list {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          flex-direction: column;
          margin-top: 16px;
          overflow: hidden;
          background: #fffdf4;
          border: 2px solid rgba(196, 184, 158, .7);
          border-radius: var(--radius-sm);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .35);
        }

        .leaderboard-list__scroll {
          flex: 1 1 auto;
          min-height: 0;
          overflow-y: auto;
          background: #fffdf4;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
        }

        .leaderboard-list-row {
          display: grid;
          grid-template-columns: 58px minmax(0, 1.3fr) minmax(120px, .8fr) minmax(86px, .55fr);
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          color: var(--ac-text);
          font-size: 13px;
          font-weight: 850;
          border-bottom: 1px solid rgba(196, 184, 158, .45);
        }

        .leaderboard-list-row:last-child {
          border-bottom: 0;
        }

        .leaderboard-list-row--head {
          flex: 0 0 auto;
          position: relative;
          z-index: 2;
          color: var(--ac-text-body);
          background: #fff7e3;
          font-size: 12px;
          font-weight: 950;
          box-shadow: 0 2px 0 rgba(196, 184, 158, .32);
        }

        .leaderboard-list__rank {
          color: #725d42;
          font-weight: 1000;
        }

        .leaderboard-list__name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-list__balance {
          color: rgb(121, 79, 39);
          text-align: left;
          font-variant-numeric: tabular-nums;
          font-weight: 1000;
        }

        .leaderboard-list__casts {
          text-align: left;
          font-variant-numeric: tabular-nums;
        }

        .leaderboard-list__metric {
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 5px;
          color: rgb(121, 79, 39);
          text-align: left;
          font-variant-numeric: tabular-nums;
          font-weight: 1000;
        }

        .leaderboard-list__metric .leaderboard-balance__icon {
          width: 18px;
          height: 18px;
        }

        .leaderboard-list-row--head .leaderboard-list__balance,
        .leaderboard-list-row--head .leaderboard-list__casts {
          color: var(--ac-text-body);
          font-weight: 950;
        }

        .leaderboard-list-row.is-current {
          position: relative;
          overflow: hidden;
          background: var(--leaderboard-row-bg, #fffdf4);
        }

        .leaderboard-list-row.is-current::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          padding: 2px;
          border-radius: inherit;
          background: conic-gradient(
            from var(--leaderboard-gradient-angle),
            #cc98ff 0%,
            #ff944a 34%,
            #ff7cbd 67%,
            #cc98ff 100%
          );
          pointer-events: none;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: leaderboard-border-rotate 5s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .leaderboard-list-row.is-current::after {
            animation: none;
          }
        }

        .leaderboard-list-row.leaderboard-current-row--sticky {
          flex: 0 0 auto;
          position: relative;
          z-index: 3;
          margin: 0;
          border-top: 2px solid rgba(224, 184, 78, .72);
          border-bottom: 0;
          box-shadow: 0 -2px 0 rgba(196, 184, 158, .3), 0 -10px 18px rgba(66, 48, 31, .08);
        }

        .leaderboard-modal {
          width: min(960px, calc(100vw - 48px));
          height: auto;
          max-height: calc(100svh - 48px);
          overflow: visible;
          background: transparent;
          border: 0;
          border-radius: 8px;
          box-shadow: none;
          color: #794f27;
        }

        .leaderboard-modal .shop-modal__header {
          position: relative;
          z-index: 0;
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: -10px;
          padding: 12px 34px 18px;
          background: #fff7e8;
          border-bottom: 2px solid rgba(255, 255, 255, .62);
          border-radius: 8px 8px 0 0;
        }

        .leaderboard-modal .shop-modal__close {
          width: 38px;
          height: 38px;
          color: #725d42;
          background: #f8f8f0;
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: 4px;
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
        }

        .leaderboard-tabs {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0;
        }

        .leaderboard-tab {
          width: auto;
          min-height: 38px;
          padding: 0 12px;
          color: rgba(121, 79, 39, .6);
          background: transparent;
          border: 0;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 950;
          line-height: 21px;
          white-space: nowrap;
        }

        .leaderboard-tab.is-active,
        .leaderboard-tab:hover {
          color: #794f27;
          background: #ffd557;
        }

        .leaderboard-panel {
          position: relative;
          z-index: 1;
          height: auto;
          min-height: 0;
          display: block;
          overflow: hidden;
          padding: 0;
          background: linear-gradient(180deg, #FDD355 0%, #FFF9B4 100%);
          border-radius: 8px;
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .88),
            5px 5px 0 rgba(189, 174, 160, .72),
            0 20px 48px rgba(66, 48, 31, .18);
        }

        .leaderboard-panel--week {
          background: linear-gradient(180deg, #FDD355 0%, #FFF9B4 100%);
        }

        .leaderboard-panel--month {
          background: linear-gradient(180deg, #FDB163 0%, #FBE79A 100%);
        }

        .leaderboard-panel::before {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 1000px;
          height: 638px;
          transform: translate(-50%, -50%);
          background: url("/assets/ranking-modal/watermark-full.png") center / cover no-repeat;
          pointer-events: none;
        }

        .leaderboard-figma-content {
          position: relative;
          z-index: 1;
          height: auto;
          padding: 12px 34px 24px;
        }

        .leaderboard-list {
          --leaderboard-scrollbar-outset: 16px;
          --leaderboard-row-width: 500px;
          position: relative;
          z-index: 2;
          width: var(--leaderboard-row-width);
          height: auto;
          margin: 0;
          overflow: visible;
          background: transparent;
          border: 0;
          border-radius: 6px;
          box-shadow: none;
        }

        .leaderboard-list-row {
          position: relative;
          width: 100%;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 50px 180px 100px 80px;
          gap: 20px;
          align-items: center;
          min-height: 54px;
          padding: 9px 16px;
          color: #794f27;
          border: 0;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 950;
          line-height: 19.5px;
        }

        .leaderboard-list-row--head {
          min-height: 50px;
          padding: 16px 16px 10px;
          color: #ffffff;
          background: transparent;
          border-radius: 0;
          box-shadow: none;
          font-size: 12px;
          line-height: 18px;
        }

        .leaderboard-list-row--head .leaderboard-list__balance,
        .leaderboard-list-row--head .leaderboard-list__casts {
          color: #ffffff;
        }

        .leaderboard-list__scroll {
          width: calc(100% + var(--leaderboard-scrollbar-outset));
          box-sizing: border-box;
          height: 390px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          margin-right: calc(-1 * var(--leaderboard-scrollbar-outset));
          padding-right: var(--leaderboard-scrollbar-outset);
          background: transparent;
          scrollbar-gutter: auto;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .leaderboard-list__scroll > .leaderboard-list-row {
          flex: 0 0 auto;
          width: var(--leaderboard-row-width);
          height: 54px;
          min-height: 54px;
        }

        .leaderboard-list__scroll::-webkit-scrollbar {
          width: 6px;
        }

        .leaderboard-list__scroll.is-scrolling {
          scrollbar-color: rgba(121, 79, 39, .28) rgba(255, 253, 244, .28);
        }

        .leaderboard-list__scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }

        .leaderboard-list__scroll::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 999px;
        }

        .leaderboard-list__scroll.is-scrolling::-webkit-scrollbar-track {
          background: rgba(255, 253, 244, .28);
        }

        .leaderboard-list__scroll.is-scrolling::-webkit-scrollbar-thumb {
          background: rgba(121, 79, 39, .28);
        }

        @property --leaderboard-gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes leaderboard-border-rotate {
          to {
            --leaderboard-gradient-angle: 360deg;
          }
        }

        .leaderboard-list-row--rank-1 {
          --leaderboard-row-bg: linear-gradient(90deg, #fff19a 0%, #fffae9 44.17%, #fffbf4 100%);
          background: var(--leaderboard-row-bg);
        }

        .leaderboard-list-row--rank-2 {
          --leaderboard-row-bg: linear-gradient(90deg, #eff5f2 0%, #f9f9f3 49.52%, #fffbf4 100%);
          background: var(--leaderboard-row-bg);
        }

        .leaderboard-list-row--rank-3 {
          --leaderboard-row-bg: linear-gradient(90deg, #fae2ce 0%, #fffae9 44.17%, #fffbf4 100%);
          background: var(--leaderboard-row-bg);
        }

        .leaderboard-list__scroll > .leaderboard-list-row--rank-1,
        .leaderboard-list__scroll > .leaderboard-list-row--rank-2,
        .leaderboard-list__scroll > .leaderboard-list-row--rank-3 {
          height: 68px;
          min-height: 68px;
        }

        .leaderboard-list-row--rank-4 {
          --leaderboard-row-bg: linear-gradient(90deg, #fffdf4 0%, #fffdf4 100%);
          background: var(--leaderboard-row-bg);
        }

        .leaderboard-list-row.is-current {
          overflow: hidden;
          background: var(--leaderboard-row-bg, #fffdf4);
        }

        .leaderboard-list-row.is-current::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          padding: 2px;
          border-radius: inherit;
          background: conic-gradient(
            from var(--leaderboard-gradient-angle),
            #cc98ff 0%,
            #ff944a 34%,
            #ff7cbd 67%,
            #cc98ff 100%
          );
          pointer-events: none;
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: leaderboard-border-rotate 5s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .leaderboard-list-row.is-current::after {
            animation: none;
          }
        }

        .leaderboard-list-row.leaderboard-current-row--sticky {
          height: 54px;
          min-height: 54px;
          margin-top: 4px;
          padding: 9px 16px;
          border: 0;
          border-radius: 12px;
          box-shadow: 0 -10px 18px rgba(66, 48, 31, .08);
        }

        .leaderboard-list-row.leaderboard-current-row--sticky.is-unranked {
          --leaderboard-row-bg: linear-gradient(90deg, #fffdf4 0%, #fffdf4 100%);
          background: var(--leaderboard-row-bg);
        }

        .leaderboard-rank-icon {
          width: 50px;
          height: 36px;
          max-width: 100%;
          display: block;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .leaderboard-list__rank,
        .leaderboard-list__name,
        .leaderboard-list__metric,
        .leaderboard-list__casts {
          min-width: 0;
          color: #794f27;
          text-align: left;
        }

        .leaderboard-list__name,
        .leaderboard-list__name-text {
          min-width: 0;
        }

        .leaderboard-list__name {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-list__name-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .leaderboard-list__mobile-casts {
          display: none;
        }

        .leaderboard-list__metric {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-variant-numeric: tabular-nums;
        }

        .leaderboard-balance__icon,
        .leaderboard-list__metric .leaderboard-balance__icon {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }

        .leaderboard-hero-art {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 536px;
          width: 424px;
          height: auto;
          display: grid;
          place-items: center;
          pointer-events: none;
        }

        .leaderboard-hero-art img {
          width: 450px;
          height: 454px;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .leaderboard-refresh-note {
          position: absolute;
          right: 34px;
          bottom: 18px;
          z-index: 3;
          margin: 0;
          padding: 6px 10px;
          color: rgba(121, 79, 39, .76);
          opacity: .5;
          background: rgba(255, 253, 244, .56);
          border: 0;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 950;
          line-height: 18px;
          white-space: nowrap;
        }

        @media (max-width: 760px) {
          .leaderboard-modal-backdrop {
            place-items: stretch;
            overflow: hidden;
            padding: 0;
            background: rgba(216, 237, 247, .96);
          }

          .leaderboard-modal {
            box-sizing: border-box;
            width: 100vw;
            max-width: none;
            inline-size: 100vw;
            max-inline-size: none;
            height: 100svh;
            max-height: 100svh;
            overflow: hidden;
            border-radius: 0;
          }

          .leaderboard-modal .shop-modal__header {
            position: sticky;
            top: 0;
            z-index: 30;
            min-height: 0;
            align-items: center;
            gap: 8px;
            padding:
              max(12px, env(safe-area-inset-top))
              max(16px, env(safe-area-inset-right))
              12px
              max(16px, env(safe-area-inset-left));
            background: rgba(255, 249, 232, .88);
            border-bottom: 1.5px solid rgba(196, 184, 158, .56);
            border-radius: 0;
            backdrop-filter: blur(10px);
          }

          .leaderboard-modal .shop-modal__close {
            width: 44px;
            height: 44px;
            flex: 0 0 auto;
            color: #794f27;
            border-width: 1.5px;
            border-radius: 4px;
            box-shadow: none;
          }

          .leaderboard-modal .shop-modal__close svg {
            width: 22px;
            height: 22px;
          }

          .leaderboard-tabs {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: center;
            gap: 8px;
            min-width: 0;
          }

          .leaderboard-modal__heading {
            min-width: 0;
            flex: 1 1 auto;
            align-items: center;
          }

          .leaderboard-tab {
            min-width: 0;
            min-height: 44px;
            height: 44px;
            padding: 0 10px;
            color: rgba(121, 79, 39, .62);
            background: rgba(255, 253, 244, .84);
            border: 1.5px solid rgba(196, 184, 158, .68);
            border-radius: 6px;
            font-size: 15px;
            line-height: 1.15;
          }

          .leaderboard-tab.is-active {
            color: #794f27;
            background: #ffd557;
            border-color: rgba(205, 165, 57, .82);
          }

          .leaderboard-panel {
            flex: 1 1 auto;
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            min-height: 0;
            display: flex;
            border-radius: 0;
          }

          .leaderboard-figma-content {
            flex: 1 1 auto;
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 50px 14px max(18px, env(safe-area-inset-bottom));
          }

          .leaderboard-list {
            --leaderboard-scrollbar-outset: 0px;
            --leaderboard-row-width: 100%;
            flex: 1 1 auto;
            width: 100%;
            min-width: 0;
            min-height: 0;
          }

          .leaderboard-list-row {
            grid-template-columns: minmax(58px, .62fr) minmax(0, 1.18fr) minmax(78px, .82fr);
            gap: 8px;
            min-height: 64px;
            padding: 10px 14px;
            border-radius: 16px;
            font-size: 15px;
            line-height: 1.18;
          }

          .leaderboard-list-row--head {
            position: absolute;
            left: 0;
            right: 0;
            top: -42px;
            min-height: 42px;
            padding: 0 14px;
            color: #ffffff;
            background: transparent;
            border-radius: 0;
            box-shadow: none;
            font-size: 15px;
          }

          .leaderboard-list-row--head .leaderboard-list__balance {
            color: #ffffff;
            text-align: right;
            white-space: normal;
          }

          .leaderboard-list__scroll {
            width: 100%;
            height: auto;
            flex: 1 1 auto;
            min-height: 0;
            gap: 6px;
            margin-right: 0;
            padding-right: 0;
            overflow-x: hidden;
            scrollbar-gutter: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .leaderboard-list__scroll::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }

          .leaderboard-list__scroll > .leaderboard-list-row {
            width: 100%;
            height: 64px;
            min-height: 64px;
          }

          .leaderboard-list__scroll > .leaderboard-list-row--rank-1,
          .leaderboard-list__scroll > .leaderboard-list-row--rank-2,
          .leaderboard-list__scroll > .leaderboard-list-row--rank-3 {
            height: 76px;
            min-height: 76px;
          }

          .leaderboard-list-row.leaderboard-current-row--sticky {
            height: 72px;
            min-height: 72px;
            margin: 10px 0 -8px;
            padding: 10px 14px;
            border-radius: 16px;
          }

          .leaderboard-list-row.leaderboard-current-row--sticky.is-unranked {
            grid-template-columns: 76px minmax(0, 1fr) minmax(76px, .78fr);
          }

          .leaderboard-list__rank {
            overflow-wrap: anywhere;
            font-size: 15px;
            line-height: 1.15;
          }

          .leaderboard-list-row.leaderboard-current-row--sticky.is-unranked .leaderboard-list__rank {
            overflow-wrap: normal;
            white-space: nowrap;
            font-size: 13px;
          }

          .leaderboard-rank-icon {
            width: 46px;
            height: 38px;
          }

          .leaderboard-list__name {
            display: grid;
            gap: 3px;
            white-space: normal;
          }

          .leaderboard-list__name-text {
            font-size: 16px;
            line-height: 1.2;
          }

          .leaderboard-list__mobile-casts {
            display: block;
            overflow: hidden;
            color: rgba(121, 79, 39, .58);
            font-size: 11px;
            font-weight: 900;
            line-height: 1.15;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .leaderboard-list__metric {
            justify-content: flex-end;
            gap: 5px;
            min-width: 0;
            font-size: 15px;
            white-space: nowrap;
          }

          .leaderboard-balance__icon,
          .leaderboard-list__metric .leaderboard-balance__icon {
            width: 22px;
            height: 22px;
          }

          .leaderboard-list__casts--desktop {
            display: none;
          }

          .leaderboard-refresh-note {
            position: static;
            align-self: center;
            max-width: 100%;
            margin: 10px 0 -16px;
            padding: 4px 8px;
            text-align: center;
            font-size: 12px;
            line-height: 1.2;
            white-space: normal;
          }

          .leaderboard-hero-art {
            display: none;
          }
        }

        @media (max-width: 360px) {
          .leaderboard-figma-content {
            padding-inline: 10px;
          }

          .leaderboard-list-row {
            grid-template-columns: 52px minmax(0, 1fr) 74px;
            gap: 6px;
            padding-inline: 10px;
            font-size: 14px;
          }

          .leaderboard-list-row.leaderboard-current-row--sticky.is-unranked {
            grid-template-columns: 70px minmax(0, 1fr) 70px;
          }

          .leaderboard-list-row--head {
            padding-inline: 10px;
            font-size: 14px;
          }

          .leaderboard-tab {
            min-width: 76px;
            padding-inline: 10px;
            font-size: 17px;
          }
        }

        .inventory-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 14px clamp(18px, 2.6vw, 34px) 0;
        }

        .inventory-stat {
          min-width: 0;
          padding: 13px 14px;
          background: rgba(255,255,248,.72);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
        }

        .inventory-stat__label {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .inventory-stat__value {
          margin-top: 5px;
          color: var(--ac-text);
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .inventory-grid {
          flex: 1 1 auto;
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
          grid-auto-rows: minmax(357px, auto);
          align-items: start;
          gap: 16px;
          overflow: auto;
          padding: 10px clamp(18px, 2.6vw, 34px) clamp(18px, 2.6vw, 34px);
          background: transparent;
          perspective: 1500px;
        }

        /* Inventory cards: rebuilt to match the Figma card screenshot proportions. */
        .inventory-card {
          --tier-bg: #fff7d9;
          --tier-edge: #f3c93d;
          --tier-accent: #a8e86b;
          --tier-accent-deep: #5b9a2d;
          --tier-ray: rgba(139, 204, 92, .2);
          --tier-star: #74b54f;
          --tier-cta-text: #1a1a1a;
          --card-tilt-x: 0deg;
          --card-tilt-y: 0deg;
          --card-shine-x: 50%;
          --card-shine-y: 50%;
          --card-shine-angle: 135deg;

          position: relative;
          min-width: 0;
          align-self: start;
          display: flex;
          flex-direction: column;
          width: 100%;
          min-height: 400px;
          padding: 18px 18px 18px;
          background: var(--tier-bg);
          border: 0 solid var(--tier-edge);
          border-radius: 24px;
          box-shadow: none;
          color: #1a1a1a;
          overflow: visible;
          isolation: isolate;
          transform:
            perspective(1200px)
            rotateX(var(--card-tilt-y))
            rotateY(var(--card-tilt-x))
            translateY(0)
            scale(1);
          transform-style: preserve-3d;
          will-change: transform;
          transition:
            transform .36s cubic-bezier(.22,1,.36,1),
            box-shadow .24s ease,
            filter .24s ease;
        }
        .inventory-card::before {
          content: "";
          position: absolute;
          inset: -10px;
          z-index: -1;
          border-radius: inherit;
          background: radial-gradient(circle at var(--card-shine-x) var(--card-shine-y), color-mix(in srgb, var(--tier-accent) 36%, white) 0%, rgba(255,255,255,0) 58%);
          filter: blur(16px);
          opacity: 0;
          transform: translateZ(-12px);
          transition: opacity .24s ease;
          pointer-events: none;
        }
        .inventory-card::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 4;
          border-radius: inherit;
          background:
            linear-gradient(
              var(--card-shine-angle),
              transparent 34%,
              rgba(255, 255, 255, .26) 48%,
              rgba(255, 255, 255, .1) 53%,
              transparent 66%
            ),
            radial-gradient(circle at var(--card-shine-x) var(--card-shine-y), rgba(255,255,255,.16), transparent 34%);
          opacity: 0;
          mix-blend-mode: overlay;
          pointer-events: none;
          transition: opacity .2s ease;
        }
        .inventory-card:hover {
          transform:
            perspective(1200px)
            rotateX(var(--card-tilt-y))
            rotateY(var(--card-tilt-x))
            translateY(-5px)
            scale(1.008);
          box-shadow: 0 14px 24px rgba(20, 20, 20, .14);
          filter: saturate(1.02);
          z-index: 10;
        }
        .inventory-card:has(.inv-more-menu) {
          z-index: 200;
        }
        .inventory-card:hover::before { opacity: .42; }
        .inventory-card:hover::after { opacity: .9; }
        .inventory-card:hover .inv-head,
        .inventory-card:hover .inv-art,
        .inventory-card:hover .inv-stats,
        .inventory-card:hover .inv-actions {
          transform: translateZ(14px);
        }

        @property --s-glow-angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .inventory-card--SSS,
        .inventory-card--SS {
          background: var(--tier-bg);
          border-color: var(--tier-edge);
          border-radius: 8px;
          box-shadow: none;
          animation: none;
          min-height: 0;
        }

        .inventory-card--SSS::before,
        .inventory-card--SS::before {
          display: none;
        }

        .inventory-card--SSS::after,
        .inventory-card--SS::after {
          inset: -3px;
          border-radius: inherit;
          box-shadow: none;
        }

        .border-glow-card--holographic.inventory-card::before,
        .border-glow-card--holographic.inventory-card::after {
          display: none;
        }

        .inventory-card--SSS .inv-art,
        .inventory-card--SS .inv-art {
          border-width: 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--SSS .inv-medal,
        .inventory-card--SS .inv-medal {
          border-width: 0;
        }

        .inventory-card--SSS .inv-art__tag,
        .inventory-card--SS .inv-art__tag {
          padding: 4px 10px;
          border-width: 0;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--SSS .inv-art__tag {
          background: linear-gradient(180deg, oklch(0.98 0.37 36), oklch(0.95 0.24 77));
        }

        .inventory-card--SSS .inv-stats,
        .inventory-card--SS .inv-stats {
          border-width: 0;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--SSS .inv-btn,
        .inventory-card--SS .inv-btn {
          border-width: 0;
          border-radius: 4px;
        }

        .inventory-card--SS .inv-btn--star.is-on {
          background: #ffffff;
        }

        .inventory-card--SSS .inv-btn--cta {
          background: #ffffff;
        }

        .inventory-card--SS .inv-btn--cta {
          background: #ffffff;
        }

        .inventory-card--SSS .inv-head,
        .inventory-card--SS .inv-head {
          margin-bottom: 0;
        }

        .inventory-card--SSS:hover,
        .inventory-card--SS:hover {
          box-shadow: 0 14px 24px rgba(20, 20, 20, .14);
        }

        .inventory-card--SSS:hover::before,
        .inventory-card--SS:hover::before {
          opacity: 0;
        }

        .inventory-card--SSS {
          --tier-bg: linear-gradient(180deg, oklch(0.98 0.37 36), oklch(0.95 0.24 77));
          --tier-edge: #d39a2b;
          --tier-accent: #ffa742;
          --tier-accent-deep: #9c5d0f;
          --tier-ray: rgba(255, 208, 110, .32);
          --tier-star: #ffa742;
          --tier-cta-text: #101010;
        }

        .inv-head {
          position: relative;
          z-index: 12;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          height: auto;
          min-height: 0;
          padding: 0 0 8px;
          transform: translateZ(0);
          transition: transform .28s cubic-bezier(.22,1,.36,1);
        }
        .inv-no {
          font-family: inherit;
          font-weight: 950;
          font-size: 20px;
          color: #1a1a1a;
          letter-spacing: .015em;
          line-height: 1;
        }
	        .inv-medal {
	          position: relative;
	          top: auto;
	          right: auto;
	          flex: 0 0 auto;
	          min-width: 34px;
	          height: 26px;
	          z-index: 30;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          color: #101010;
          background: var(--tier-accent);
          border-width: 2px;
          border-style: solid;
          border-color: #101010;
          border-radius: 999px;
          box-shadow: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: .04em;
	          pointer-events: auto;
          transform: translateZ(24px);
          transition: transform .28s cubic-bezier(.22,1,.36,1);
        }
        .inv-medal--SSS {
          min-width: 54px;
          height: 28px;
          padding: 0 9px;
          font-size: 12px;
          letter-spacing: .03em;
        }
        .inv-medal--SSS {
          background: linear-gradient(180deg, oklch(0.98 0.37 36), oklch(0.95 0.24 77));
          box-shadow: 0 10px 16px rgba(171, 118, 25, .14);
        }
        .inventory-card:hover .inv-medal {
          transform: translateZ(34px) translateY(-1px);
        }

        .inv-art {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          height: 175px;
          margin: 0;
          background: #ffffff;
          border: 3px solid #101010;
          border-bottom: 0;
          border-radius: 22px 22px 0 0;
          overflow: hidden;
          transform: translateZ(0);
          transition: transform .28s cubic-bezier(.22,1,.36,1);
        }
        .inv-art::before,
        .inv-art::after { content: none; }
        .inv-art__rays {
          position: absolute;
          inset: 0;
          background:
            repeating-conic-gradient(
              from 0deg at 50% 62%,
              var(--tier-ray) 0deg 5deg,
              transparent 5deg 20deg
            );
          opacity: .85;
          pointer-events: none;
          transition: transform .62s ease, opacity .24s ease;
        }
        .inventory-card:hover .inv-art__rays {
          transform: scale(1.06) rotate(5deg);
          opacity: 1;
        }
        .inv-art__star {
          position: absolute;
          background: var(--tier-star);
          clip-path: polygon(
            50% 0%, 60% 35%, 98% 35%, 68% 57%,
            80% 95%, 50% 73%, 20% 95%, 32% 57%,
            2% 35%, 40% 35%
          );
          opacity: .9;
          pointer-events: none;
          transition: transform .24s ease, opacity .24s ease;
        }
        .inventory-card:hover .inv-art__star {
          opacity: 1;
          transform: translateZ(12px) scale(1.14);
        }
        .inv-art__star--1 { top: 14%; left: 12%; width: 13px; height: 13px; }
        .inv-art__star--2 { top: 8%;  left: 50%; width: 10px; height: 10px; }
        .inv-art__star--3 { top: 36%; right: 8%; width: 12px; height: 12px; }
        .inv-art__star--4 { bottom: 30%; left: 6%; width: 10px; height: 10px; }
        .inv-art__star--5 { bottom: 14%; left: 36%; width: 8px;  height: 8px; }
        .inv-art__star--6 { bottom: 22%; right: 16%; width: 14px; height: 14px; }
        .inv-art__img {
          position: relative;
          z-index: 1;
          width: min(88%, 174px);
          height: 92%;
          object-fit: contain;
          image-rendering: pixelated;
          transition: transform .22s cubic-bezier(.22,1,.36,1);
        }
        .inventory-card:hover .inv-art__img {
          transform: translateY(-5px) translateZ(24px) scale(1.055);
        }
        .inv-art__tag {
          position: absolute;
          right: -3px;
          bottom: -3px;
          z-index: 2;
          min-width: 64px;
          padding: 7px 9px 6px;
          background: var(--tier-accent);
          border: 3px solid #101010;
          border-radius: 11px 0 0 0;
          color: #101010;
          font-family: inherit;
          font-weight: 900;
          font-size: 12px;
          letter-spacing: .03em;
          text-align: center;
          box-shadow: none;
        }

        .inv-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 26px;
          min-height: auto;
          margin: 0;
          padding: 10px 16px;
          background: #ffffff;
          border: 3px solid #101010;
          border-radius: 0 0 22px 22px;
          box-shadow: none;
          transform: translateZ(0);
          transition: transform .28s cubic-bezier(.22,1,.36,1);
        }
        .inv-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
          min-width: 0;
          width: 80px;
          height: 38px;
          line-height: 1;
        }
        .inv-stat__label {
          font-family: inherit;
          font-weight: 700;
          font-size: 12px;
          color: #8a8a8a;
          letter-spacing: .02em;
          line-height: 1.2;
        }
        .inv-stat__value {
          font-family: inherit;
          font-weight: 950;
          font-size: 16px;
          color: #1a1a1a;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .inv-stat__value--pos { color: #10B981; }
        .inv-stat__value--neg { color: #F43F5E; }

        .inv-stats--inline {
          grid-template-columns: 1fr;
          align-items: center;
          min-height: 62px;
        }

        .inv-stat--inline {
          width: auto;
          height: 38px;
          flex-direction: row;
          align-items: baseline;
          gap: 0;
        }

        .inv-actions {
          display: grid;
          grid-template-columns: 50px 50px 1fr;
          gap: 11px;
          padding: 0;
          margin-top: 10px;
          transform: translateZ(0);
          transition: transform .28s cubic-bezier(.22,1,.36,1);
        }
        .inv-more-wrap {
          position: relative;
          min-width: 0;
          z-index: 220;
        }
        .inv-more-wrap > .inv-btn {
          width: 100%;
        }
        .inv-more-menu {
          position: absolute;
          left: 0;
          top: calc(100% + 6px);
          z-index: 240;
          min-width: 96px;
          padding: 5px;
          background: #fffdf4;
          border: 2px solid #101010;
          border-radius: 4px;
          box-shadow: 3px 3px 0 rgba(16, 16, 16, .18);
        }
        .inv-more-menu__item {
          appearance: none;
          width: 100%;
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 12px;
          color: #c92e2e;
          background: #fff7f2;
          border: 0;
          border-radius: 3px;
          font: inherit;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }
        .inv-more-menu__item:hover {
          background: #ffe6df;
        }
        .inv-btn {
          appearance: none;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          font: inherit;
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
          text-decoration: none;
          cursor: pointer;
          border-radius: 9px;
          transition: transform .14s cubic-bezier(.23,1,.32,1), box-shadow .14s ease, background-color .14s ease;
        }
        .inv-btn:active { transform: translateY(1px) scale(.98); }
        .inv-btn--ghost {
          background: #ffffff;
          color: #1a1a1a;
          border: 2px solid #101010;
          box-shadow: none;
        }
        .inv-btn--ghost:hover { transform: translateY(-1px); }
        .inv-btn--star.is-on { background: #fff7df; color: #b8862e; }
        .inv-btn--cta {
          background: #ffffff;
          color: #1a1a1a;
          border: 2px solid #101010;
          font-family: inherit;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: .06em;
          box-shadow: none;
        }
        .inv-btn--cta:hover { transform: translateY(-2px); }
        .inv-btn--cta:active {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35), 0 1px 0 var(--tier-accent-deep);
        }

        .inventory-card--SS {
          --tier-bg: #fff7d9;
          --tier-edge: #f4d36c;
          --tier-accent: #ffd66f;
          --tier-accent-deep: #b07a10;
          --tier-ray: rgba(244, 196, 75, .28);
          --tier-star: #fbcf3a;
          --tier-cta-text: #1a1a1a;
        }
        .inventory-card--S {
          --tier-bg: #f7e2ff;
          --tier-edge: #c17df2;
          --tier-accent: #c17df2;
          --tier-accent-deep: #6b4eb3;
          --tier-ray: rgba(149, 116, 220, .28);
          --tier-star: #8d6dd6;
          --tier-cta-text: #101010;
          border-radius: 8px;
          min-height: 0;
        }

        .inventory-card--S .inv-art {
          border-width: 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--S .inv-medal {
          border-width: 0;
        }

        .inventory-card--S .inv-art__tag {
          padding: 4px 10px;
          border-width: 0;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--S .inv-stats {
          border-width: 0;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--S .inv-btn {
          border-width: 0;
          border-radius: 4px;
        }

        .inventory-card--S .inv-btn--cta {
          background: #ffffff;
        }

        .inventory-card--S .inv-head {
          margin-bottom: 0;
        }
        .inventory-card--A {
          --tier-bg: #cfefff;
          --tier-edge: #4aa7e4;
          --tier-accent: #4aa7e4;
          --tier-accent-deep: #2b558f;
          --tier-ray: rgba(91, 142, 216, .25);
          --tier-star: #4d8acc;
          --tier-cta-text: #101010;
          border-radius: 8px;
          min-height: 0;
        }

        .inventory-card--A .inv-art {
          border-width: 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--A .inv-medal {
          border-width: 0;
        }

        .inventory-card--A .inv-art__tag {
          padding: 4px 10px;
          border-width: 0;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--A .inv-stats {
          border-width: 0;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--A .inv-btn {
          border-width: 0;
          border-radius: 4px;
        }

        .inventory-card--A .inv-head {
          margin-bottom: 0;
        }
        .inventory-card--B {
          --tier-bg: #defec0;
          --tier-edge: #9bdc5c;
          --tier-accent: #9bdc5c;
          --tier-accent-deep: #487a26;
          --tier-ray: rgba(130, 194, 90, .25);
          --tier-star: #6db142;
          --tier-cta-text: #101010;
          border-radius: 8px;
          min-height: 0;
        }

        .inventory-card--B .inv-art {
          border-width: 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--B .inv-medal {
          border-width: 0;
        }

        .inventory-card--B .inv-art__tag {
          padding: 4px 10px;
          border-width: 0;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--B .inv-stats {
          border-width: 0;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--B .inv-btn {
          border-width: 0;
          border-radius: 4px;
        }

        .inventory-card--B .inv-head {
          margin-bottom: 0;
        }
        .inventory-card--C {
          --tier-bg: #f3eee8;
          --tier-edge: #c1ab8b;
          --tier-accent: #d1b89c;
          --tier-accent-deep: #6f5843;
          --tier-ray: rgba(173, 156, 140, .2);
          --tier-star: #a18d77;
          --tier-cta-text: #101010;
          border-radius: 8px;
          min-height: 0;
        }

        .inventory-card--C .inv-art {
          border-width: 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--C .inv-medal {
          border-width: 0;
        }

        .inventory-card--C .inv-art__tag {
          padding: 4px 10px;
          border-width: 0;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--C .inv-stats {
          border-width: 0;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--C .inv-btn {
          border-width: 0;
          border-radius: 4px;
        }

        .inventory-card--C .inv-head {
          margin-bottom: 0;
        }
        .inventory-card--D {
          --tier-bg: #ececec;
          --tier-edge: #c9c9c9;
          --tier-accent: #c9c9c9;
          --tier-accent-deep: #4a463f;
          --tier-ray: rgba(138, 133, 125, .22);
          --tier-star: #7d7770;
          --tier-cta-text: #101010;
          border-radius: 8px;
          min-height: 0;
        }

        .inventory-card--D .inv-art {
          border-width: 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--D .inv-medal {
          border-width: 0;
        }

        .inventory-card--D .inv-art__tag {
          padding: 4px 10px;
          border-width: 0;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--D .inv-stats {
          border-width: 0;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--D .inv-btn {
          border-width: 0;
          border-radius: 4px;
        }

        .inventory-card--D .inv-head {
          margin-bottom: 0;
        }
        .inventory-card--D .inv-art__img { filter: grayscale(.5); }

        .inventory-card--prop,
        .inventory-card--misc {
          border-radius: 8px;
          min-height: 0;
        }

        .inventory-card--prop {
          --tier-bg: #ececec;
          --tier-edge: #f4d36c;
          --tier-accent: #c9c9c9;
          --tier-accent-deep: #4a463f;
          --tier-ray: rgba(138, 133, 125, .22);
          --tier-star: #7d7770;
          --tier-cta-text: #101010;
        }

        .inventory-card--misc {
          --tier-bg: #ececec;
          --tier-edge: #f4d36c;
          --tier-accent: #c9c9c9;
          --tier-accent-deep: #4a463f;
          --tier-ray: rgba(138, 133, 125, .22);
          --tier-star: #7d7770;
          --tier-cta-text: #101010;
        }

        .inventory-card--prop .inv-art,
        .inventory-card--misc .inv-art {
          border-width: 2px 2px 0;
          border-radius: 4px 4px 0 0;
        }

        .inventory-card--prop .inv-art__tag,
        .inventory-card--misc .inv-art__tag {
          padding: 4px 10px;
          border-width: 2px;
          border-radius: 4px 0 0 0;
        }

        .inventory-card--prop .inv-stats,
        .inventory-card--misc .inv-stats {
          border-width: 2px;
          border-radius: 0 0 4px 4px;
        }

        .inventory-card--prop .inv-btn,
        .inventory-card--misc .inv-btn {
          border-radius: 4px;
        }

        .inventory-card--prop .inv-actions,
        .inventory-card--misc .inv-actions {
          display: flex;
          width: 100%;
        }

        .inventory-card--prop .inv-actions .inv-more-wrap,
        .inventory-card--misc .inv-actions .inv-more-wrap,
        .inventory-card--prop .inv-actions .inv-btn,
        .inventory-card--misc .inv-actions .inv-btn {
          flex: 1 1 0;
          min-width: 0;
        }

        .inventory-card--prop .inv-btn--ghost,
        .inventory-card--misc .inv-btn--ghost {
          border-width: 2px;
        }

        .inventory-card--misc .inv-medal,
        .inventory-card--misc .inv-art,
        .inventory-card--misc .inv-art__tag,
        .inventory-card--misc .inv-stats,
        .inventory-card--misc .inv-btn {
          border-width: 0;
        }

        .inventory-card--prop .inv-head,
        .inventory-card--misc .inv-head {
          margin-bottom: 0;
        }

        .inventory-card--prop .inv-item-art,
        .inventory-card--misc .inv-item-art {
          width: auto;
          height: 175px;
          transform: translateZ(0);
        }

        .inventory-card--prop .inv-item-art::before,
        .inventory-card--misc .inv-item-art::before {
          display: none;
        }

        .inv-item-art {
          position: relative;
          z-index: 1;
          width: 112px;
          height: 112px;
          display: grid;
          place-items: center;
          transform: translateZ(18px);
        }

        .inv-item-art::before {
          content: "";
          position: absolute;
          inset: 14px;
          background: rgba(255, 255, 255, .58);
          border: 2px solid rgba(16, 16, 16, .18);
          border-radius: 50%;
          box-shadow: inset 0 -8px 0 rgba(16, 16, 16, .06);
        }

        .inv-item-art__glyph {
          position: relative;
          width: 58px;
          height: 58px;
          background: var(--tier-accent);
          border: 3px solid #101010;
          box-shadow: 4px 4px 0 rgba(16, 16, 16, .14);
        }
        .inv-item-art__image {
          position: relative;
          z-index: 1;
          width: min(78%, 142px);
          height: 82%;
          object-fit: contain;
          image-rendering: auto;
        }

        .inv-item-art--prop .inv-item-art__glyph {
          border-radius: 50% 50% 46% 46%;
          transform: rotate(-10deg);
        }

        .inv-item-art--prop .inv-item-art__glyph::before {
          content: "";
          position: absolute;
          left: 16px;
          right: 16px;
          top: -18px;
          height: 20px;
          background: #f6d36a;
          border: 3px solid #101010;
          border-bottom: 0;
          border-radius: 14px 14px 0 0;
        }

        .inv-item-art--misc .inv-item-art__glyph {
          border-radius: 10px 10px 18px 18px;
          transform: rotate(8deg);
        }

        .inv-item-art--misc .inv-item-art__glyph::before {
          content: "";
          position: absolute;
          inset: 10px 12px auto;
          height: 13px;
          background: rgba(255, 255, 255, .72);
          border: 2px solid #101010;
          border-radius: 999px;
        }

        @media (prefers-reduced-motion: reduce) {
          .inventory-grid { perspective: none; }
          .inventory-card,
          .inventory-card:hover,
          .inventory-card:hover .inv-head,
          .inventory-card:hover .inv-art,
          .inventory-card:hover .inv-stats,
          .inventory-card:hover .inv-actions,
          .inventory-card:hover .inv-medal,
          .inventory-card:hover .inv-art__img,
          .inventory-card:hover .inv-art__rays,
          .inventory-card:hover .inv-art__star,
          .inventory-card--SSS,
          .inventory-card--SS,
          .inventory-card--SSS::before,
          .inventory-card--SS::before,
          .inventory-card--SSS .inv-btn--cta {
            animation: none;
          }
          .inventory-card,
          .inventory-card:hover,
          .inventory-card:hover .inv-head,
          .inventory-card:hover .inv-art,
          .inventory-card:hover .inv-stats,
          .inventory-card:hover .inv-actions,
          .inventory-card:hover .inv-medal,
          .inventory-card:hover .inv-art__img,
          .inventory-card:hover .inv-art__rays,
          .inventory-card:hover .inv-art__star {
            transform: none;
            transition: none;
          }
          .inventory-card::before,
          .inventory-card::after { display: none; }
        }

        @keyframes sCardBorderSpin {
          to { --s-glow-angle: 360deg; }
        }

        @keyframes sCardNeonPulse {
          0%, 100% {
            box-shadow:
              0 0 0 1px rgba(255, 246, 255, .72),
              0 0 14px rgba(255, 137, 251, .38),
              0 0 30px rgba(151, 93, 255, .2);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(255, 252, 255, .9),
              0 0 22px rgba(255, 151, 253, .6),
              0 0 48px rgba(151, 93, 255, .34);
          }
        }

        @keyframes sCardHaloPulse {
          0%, 100% {
            opacity: .48;
            transform: translateZ(-12px) scale(.985);
          }
          50% {
            opacity: .76;
            transform: translateZ(-12px) scale(1.015);
          }
        }

        @keyframes cardLegendaryGlow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 2px #fff5cf,
              inset 0 0 0 4px #b56a0a,
              inset 0 26px 0 -18px rgba(255, 255, 255, .7),
              0 8px 0 rgba(150, 86, 14, .55),
              0 14px 28px rgba(241, 165, 28, .45),
              0 0 0 1px rgba(255, 220, 120, .55),
              0 0 22px rgba(255, 195, 80, .45);
          }
          50% {
            box-shadow:
              inset 0 0 0 2px #fff5cf,
              inset 0 0 0 4px #b56a0a,
              inset 0 26px 0 -18px rgba(255, 255, 255, .85),
              0 8px 0 rgba(150, 86, 14, .55),
              0 16px 32px rgba(241, 165, 28, .55),
              0 0 0 1px rgba(255, 235, 160, .8),
              0 0 36px rgba(255, 195, 80, .8);
          }
        }

        @keyframes cardSunburst {
          to { transform: rotate(360deg); }
        }

        .inventory-card__main {
          min-width: 0;
          display: contents;
        }

        .inventory-card__top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 8px 8px;
          margin: -2px -2px 0;
          border-bottom: 2px solid rgba(199, 154, 61, .35);
        }

        .inventory-card__title {
          margin: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          color: #fffdf4;
          background: linear-gradient(180deg, #6a4a30 0%, #4a311e 100%);
          border: 2px solid #2f1d0f;
          border-radius: 6px;
          box-shadow: inset 0 2px 0 rgba(255,255,255,.22), 0 2px 0 rgba(0,0,0,.18);
          font-size: 13px;
          letter-spacing: .08em;
          line-height: 1.1;
          font-weight: 950;
          text-shadow: 0 1px 0 rgba(0,0,0,.35);
        }

        .inventory-card__expression {
          display: -webkit-box;
          min-height: 37px;
          margin: 10px 0 0;
          overflow: hidden;
          color: rgba(114, 93, 66, .86);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.7;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .inventory-card__metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: auto;
        }

        .inventory-card__side {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
          border-left: 0;
        }

        .inventory-grade {
          position: relative;
          min-width: 40px;
          height: 40px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: #fffdf4;
          background: radial-gradient(circle at 30% 30%, #6dd4c8 0%, #2f8c83 75%);
          border: 2.5px solid #1d5b55;
          border-radius: 50%;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.45),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #1d5b55;
          font-size: 17px;
          font-weight: 950;
          text-shadow: 0 1px 0 rgba(0,0,0,.35);
          transform: translateY(-2px);
        }

        .inventory-grade--SSS {
          background: radial-gradient(circle at 30% 30%, #fff2a3 0%, #e1932a 80%);
          border-color: #8a5912;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.55),
            inset 0 -3px 0 rgba(0,0,0,.22),
            0 3px 0 rgba(0, 0, 0, .3),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #8a5912,
            0 0 14px rgba(241, 191, 76, .9);
        }

        .inventory-grade--SS {
          background: radial-gradient(circle at 30% 30%, #fff7d9 0%, #f4d36c 80%);
          border-color: #b07a10;
        }

        .inventory-grade--S {
          background: radial-gradient(circle at 30% 30%, #e0c7ff 0%, #8d5edb 80%);
          border-color: #6b4eb3;
        }

        .inventory-grade--A {
          background: radial-gradient(circle at 30% 30%, #9ec3ff 0%, #3a6dc6 80%);
          border-color: #20407c;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.45),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #20407c;
        }

        .inventory-grade--B {
          background: radial-gradient(circle at 30% 30%, #c9f59b 0%, #6db142 80%);
          border-color: #487a26;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.4),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #487a26;
        }

        .inventory-grade--C {
          background: radial-gradient(circle at 30% 30%, #f0a98c 0%, #b85b3a 80%);
          border-color: #6f3522;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.4),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #6f3522;
        }

        .inventory-grade--D {
          background: radial-gradient(circle at 30% 30%, #d8d2c4 0%, #7a6e60 85%);
          border-color: #4a3f33;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.4),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #4a3f33;
        }

        .inventory-art {
          position: relative;
          min-height: 150px;
          display: grid;
          place-items: center;
          margin: 6px 0 2px;
          padding: 10px 0;
          background:
            radial-gradient(70% 90% at 50% 55%, rgba(255, 244, 200, .9) 0%, rgba(245, 215, 140, .35) 60%, rgba(245, 215, 140, 0) 100%),
            linear-gradient(180deg, #fff2cb 0%, #f3d997 100%);
          border: 2px solid #b8862e;
          border-radius: 10px;
          box-shadow:
            inset 0 0 0 2px #fff8e2,
            inset 0 -6px 12px rgba(184, 134, 46, .25);
          overflow: hidden;
        }

        .inventory-art::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(45deg, rgba(255, 255, 255, .12) 0 6px, transparent 6px 14px);
          pointer-events: none;
          mix-blend-mode: overlay;
          opacity: .55;
        }

        .inventory-avatar {
          position: relative;
          z-index: 1;
          width: min(78%, 200px);
          height: 150px;
          object-fit: contain;
          image-rendering: pixelated;
          filter: drop-shadow(0 6px 0 rgba(120, 86, 28, .35));
          transition: transform .25s cubic-bezier(.23,1,.32,1);
        }

        .inventory-card:hover .inventory-avatar {
          transform: translateY(-3px) scale(1.04);
        }

        .inventory-card__metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: auto;
        }

        .inventory-metric-card {
          min-width: 0;
          min-height: 54px;
          display: block;
          padding: 8px 6px;
          text-align: center;
          color: #4a311e;
          background: linear-gradient(180deg, #fffaec 0%, #f3d997 100%);
          border: 2px solid #b8862e;
          border-radius: 8px;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .65),
            inset 0 -2px 0 rgba(184, 134, 46, .25),
            0 2px 0 rgba(120, 86, 28, .25);
        }

        .inventory-metric-card__label {
          color: rgba(74, 49, 30, .8);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .inventory-metric-card__value {
          margin-top: 4px;
          color: #1d5b55;
          font-size: 17px;
          line-height: 1;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 1px 0 rgba(255, 255, 255, .55);
        }

        .inventory-action {
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6f5a50;
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          box-shadow: none;
          font: inherit;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          transition: transform .16s ease, border-color .16s ease;
        }

        .inventory-action:hover {
          transform: translate(-1px, -1px);
          color: var(--ac-text);
        }

        .inventory-action--square {
          width: 32px;
          padding: 0;
        }

        .inventory-action--favorite {
          color: #e06354;
        }

        .inventory-action--primary {
          min-width: 132px;
          flex: 1 1 auto;
          gap: 6px;
          padding: 0 10px;
          color: #fffdf4;
          background: linear-gradient(180deg, #58c2b8 0%, #2f8c83 100%);
          border: 2.5px solid #1d5b55;
          border-radius: 8px;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .45),
            inset 0 -2px 0 rgba(0, 0, 0, .18),
            0 3px 0 rgba(29, 91, 85, .8),
            0 0 0 1.5px rgba(255, 247, 223, .55);
          font-size: 14px;
          letter-spacing: .06em;
          text-shadow: 0 1px 0 rgba(0, 0, 0, .35);
        }

        .inventory-action--primary:hover {
          color: #fffdf4;
          transform: translateY(-2px);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .55),
            inset 0 -2px 0 rgba(0, 0, 0, .18),
            0 5px 0 rgba(29, 91, 85, .8),
            0 0 0 1.5px rgba(255, 247, 223, .65);
        }

        .inventory-status {
          display: inline-flex;
          align-items: center;
          width: max-content;
          min-height: 25px;
          padding: 4px 9px;
          color: #0b725c;
          background: #e6f9f0;
          border: 1.5px solid rgba(31, 163, 116, .28);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 950;
        }

        .inventory-status--failed {
          color: #a54635;
          background: #ffe4d9;
          border-color: rgba(216, 93, 72, .28);
        }

        .inventory-side-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 900;
        }

        .inventory-side-row strong {
          color: var(--ac-text);
          font-variant-numeric: tabular-nums;
        }

        .inventory-curve {
          height: 58px;
          margin-top: auto;
        }

        .inventory-curve svg {
          width: 100%;
          height: 58px;
          overflow: visible;
        }

        .inventory-actions {
          width: 100%;
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
        }

        .inventory-empty {
          grid-column: 1 / -1;
          align-self: stretch;
          min-height: 100%;
          display: grid;
          align-content: center;
          place-items: center;
          gap: 16px;
          justify-content: center;
          padding: 30px 16px 34px;
          color: rgba(114, 93, 66, .38);
          background: transparent;
          border: 0;
          border-top: 1px solid rgba(196, 184, 158, .45);
          border-radius: 0;
          font-family: var(--wallet-ui-font);
          font-size: 14px;
          font-weight: 900;
          font-synthesis: none;
          font-optical-sizing: auto;
          font-variation-settings: "wght" 720, "BEVL" var(--BEVL);
          line-height: 1;
          text-align: center;
        }

        .inventory-empty__icon {
          position: relative;
          z-index: 1;
          width: min(120px, 34vw);
          max-width: 120px;
          height: auto;
          margin-bottom: 0;
          opacity: .5;
          user-select: none;
        }

        .inventory-empty > span {
          display: block;
          margin-top: 2px;
        }

        .inventory-detail-modal {
          width: min(1180px, 95vw);
        }

        .inventory-detail-modal .shop-modal__header {
          align-items: center;
          padding: 16px 32px;
          background: rgba(255, 249, 232, .88);
          border-bottom: 2px solid rgba(196, 184, 158, .62);
        }

        .inventory-detail-modal .shop-modal__close {
          width: 38px;
          height: 38px;
        }

        .inventory-detail-heading {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .inventory-detail-back {
          appearance: none;
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .inventory-detail-back:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .inventory-detail-title-wrap {
          min-width: 0;
          flex: 1 1 auto;
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
          position: relative;
          z-index: 0;
        }

        .inventory-detail-title-wrap .shop-modal__title {
          margin: 0;
          font-size: 26px;
          line-height: 30px;
          min-height: 30px;
          position: relative;
          z-index: 0;
        }

        .inventory-detail-subtitle {
          margin-top: 0;
          color: var(--ac-text-body);
          font-family: var(--font-rounded-current);
          font-size: 12px;
          font-weight: 600;
          font-synthesis: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          position: relative;
          z-index: 1;
        }

        .inventory-detail-content {
          overflow: auto;
          padding: 18px 32px 32px;
          background:
            linear-gradient(180deg, rgba(255,249,232,.52), rgba(255,249,232,0) 180px),
            transparent;
        }

        .inventory-detail-mobile-layer {
          display: none;
        }

        .inventory-factor-detail {
          color: #2c2117;
          font-family: inherit;
        }

        .inventory-factor-detail * {
          font-family: inherit !important;
        }

        .inventory-factor-detail h1 {
          color: #2c2117;
          font-size: clamp(24px, 2.1vw, 34px);
          line-height: 1.1;
          font-weight: 950;
          letter-spacing: .01em;
        }

        .inventory-factor-detail .surface-card {
          background: rgba(255, 255, 248, .82);
          border: 2px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 0 rgba(189, 174, 160, .52);
        }

        .inventory-factor-detail .bg-accent {
          background-color: rgba(255, 243, 211, .78);
        }

        .inventory-factor-detail .text-foreground {
          color: #2c2117;
        }

        .inventory-factor-detail .text-muted-foreground {
          color: rgba(114, 93, 66, .82);
        }

        .inventory-factor-detail .text-primary {
          color: #08766e;
        }

        .inventory-factor-detail .border-border,
        .inventory-factor-detail .border-border\\/60,
        .inventory-factor-detail .border-border\\/80 {
          border-color: rgba(196, 184, 158, .68);
        }

        .inventory-factor-detail button {
          font-family: inherit;
        }

        .strategy-detail-backdrop {
          position: fixed;
          inset: 0;
          z-index: 55;
          display: grid;
          place-items: center;
          padding: clamp(14px, 2vw, 34px);
          background: rgba(39, 93, 131, .28);
          backdrop-filter: blur(7px);
        }

        .strategy-detail-modal {
          width: min(1240px, 96vw);
          max-height: min(900px, 91svh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--ac-text);
          background:
            radial-gradient(circle at 8% 5%, rgba(255,255,255,.72) 0 8%, transparent 9%),
            linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 3px solid var(--ac-border);
          border-radius: var(--radius-lg);
          box-shadow: 0 7px 0 var(--ac-shadow), 0 24px 70px rgba(66, 48, 31, .25);
        }

        .strategy-detail__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: clamp(18px, 2vw, 28px) clamp(18px, 2.5vw, 34px) 14px;
          border-bottom: 2px dashed rgba(196, 184, 158, .65);
        }

        .strategy-detail__back,
        .strategy-detail__close,
        .strategy-detail__button,
        .strategy-detail__range {
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          box-shadow: 0 3px 0 var(--ac-shadow-input);
          font: inherit;
          font-weight: 900;
          transition: all .18s ease;
        }

        .strategy-detail__back,
        .strategy-detail__close {
          width: 42px;
          height: 42px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: var(--radius-md);
        }

        .strategy-detail__back:hover,
        .strategy-detail__close:hover,
        .strategy-detail__button:hover,
        .strategy-detail__range:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
        }

        .strategy-detail__title {
          margin: 0;
          color: var(--ac-text);
          font-size: clamp(25px, 2.6vw, 38px);
          line-height: 1.05;
          font-weight: 900;
        }

        .strategy-detail__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .strategy-detail__actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
        }

        .strategy-detail__button {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 14px;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 12px;
        }

        .strategy-detail__button--primary {
          color: #075b55;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .46);
        }

        .strategy-detail__content {
          overflow: auto;
          padding: 18px clamp(18px, 2.5vw, 34px) clamp(18px, 2.5vw, 34px);
        }

        .detail-metric-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .detail-metric-card,
        .detail-panel {
          background: rgba(255,255,248,.86);
          border: 2px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 0 rgba(189, 174, 160, .68);
        }

        .detail-metric-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          min-width: 0;
          background: rgba(255,255,248,.86);
          border: 2px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 0 rgba(189, 174, 160, .68);
        }

        .detail-metric-card__border {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border: inherit;
          border-radius: inherit;
          background: transparent;
        }

        .detail-metric-card__content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 12px;
        }

        .detail-label {
          position: relative;
          z-index: 10;
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .detail-value {
          position: relative;
          z-index: 20;
          margin-top: 7px;
          color: var(--ac-text);
          font-size: 18px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .detail-value--up {
          color: #0b9f73;
        }

        .detail-value--down {
          color: #d85d48;
        }

        .detail-panel-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .detail-panel {
          min-width: 0;
          padding: 15px;
        }

        .detail-panel--wide {
          grid-column: span 2;
        }

        .detail-panel__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: var(--ac-text);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .detail-panel__title {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 7px 0;
          border-top: 1px dashed rgba(196, 184, 158, .55);
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 800;
        }

        .detail-row strong {
          color: var(--ac-text);
          text-align: right;
          font-weight: 900;
        }

        .detail-chart {
          width: 100%;
          height: 230px;
          margin-top: 8px;
          overflow: visible;
        }

        .strategy-detail__ranges {
          display: flex;
          gap: 6px;
        }

        .strategy-detail__range {
          min-width: 46px;
          height: 30px;
          border-radius: var(--radius-sm);
          font-size: 10px;
        }

        .strategy-detail__range.is-active {
          color: #075b55;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .46);
        }

        .detail-config {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px 14px;
        }

        .detail-preferences {
          display: grid;
          gap: 7px;
        }

        .detail-pref-row {
          display: grid;
          grid-template-columns: 72px 1fr 48px;
          align-items: center;
          gap: 8px;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 900;
        }

        .detail-pref-bar {
          height: 10px;
          overflow: hidden;
          background: #efe4c8;
          border: 1px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-xs);
        }

        .detail-pref-bar span {
          display: block;
          height: 100%;
          background: var(--ac-primary);
          border-radius: inherit;
        }

        .detail-position-table {
          width: 100%;
          border-collapse: collapse;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 800;
        }

        .detail-position-table th,
        .detail-position-table td {
          padding: 8px 6px;
          border-top: 1px dashed rgba(196, 184, 158, .55);
          text-align: left;
          white-space: nowrap;
        }

        .detail-position-table th {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        @media (max-width: 1100px) {
          .detail-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .detail-panel-grid {
            grid-template-columns: 1fr;
          }

          .detail-panel--wide {
            grid-column: auto;
          }
        }

        @media (max-width: 900px) {
          .game-landing {
            min-width: 0;
          }

          .leaderboard-layout {
            grid-template-columns: 1fr;
          }

          .leaderboard-art {
            display: none;
          }

          .shop-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .inventory-grid {
            grid-template-columns: 1fr;
          }

        }

        @media (max-width: 680px) {
          .shop-modal {
            width: 96vw;
          }

          .wallet-modal-backdrop {
            place-items: stretch;
            overflow: hidden;
            padding: 0;
            background: rgba(216, 237, 247, .96);
          }

          .shop-modal.leaderboard-modal {
            width: 100%;
            max-width: none;
            inline-size: 100%;
            max-inline-size: none;
          }

          .shop-modal.wallet-modal {
            width: 100%;
            max-width: none;
            inline-size: 100%;
            max-inline-size: none;
            height: 100svh;
            max-height: 100svh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .shop-grid {
            grid-template-columns: 1fr;
          }

          .inventory-summary {
            grid-template-columns: 1fr;
          }

          .leaderboard-layout .leaderboard-list-row {
            grid-template-columns: 52px minmax(0, 1fr) minmax(92px, auto) minmax(58px, auto);
          }

          .inventory-card {
            grid-template-columns: 1fr;
          }

          .inventory-card__side {
            padding-left: 0;
            border-left: 0;
            border-top: 2px dashed rgba(196, 184, 158, .55);
            padding-top: 12px;
          }
        }

        .inventory-modal-backdrop {
          container-type: inline-size;
          container-name: inventory-modal-shell;
        }

        @media (max-width: 700px) {
          .inventory-modal-backdrop {
            place-items: stretch;
            overflow: hidden;
            padding: 0;
            background: #d8edf7;
          }

          .inventory-modal {
            --inventory-toolbar-height: auto;
            --inventory-filter-height: auto;
            box-sizing: border-box;
            inline-size: 100vw;
            block-size: 100dvh;
            max-block-size: 100dvh;
            min-inline-size: 0;
            min-block-size: 0;
            display: flex;
            flex-direction: column;
            border-radius: 0;
            border-inline: 0;
            border-block: 0;
            box-shadow: none;
          }

          .inventory-detail-mobile-layer {
            position: absolute;
            inset: 0;
            z-index: 1;
            display: block;
            pointer-events: auto;
          }

          .inventory-detail-mobile-layer[data-mobile-detail-transition="opening"] {
            animation: mobile-page-backdrop-in var(--mobile-page-enter-duration, 280ms) var(--mobile-page-enter-ease, cubic-bezier(0.22, 1, 0.36, 1)) both;
          }

          .inventory-detail-mobile-layer[data-mobile-detail-transition="closing"] {
            animation: mobile-page-backdrop-out var(--mobile-page-exit-duration, 220ms) var(--mobile-page-exit-ease, cubic-bezier(0.4, 0, 1, 1)) both;
            pointer-events: none;
          }

          .inventory-detail-mobile-page {
            inline-size: 100%;
            block-size: 100%;
            max-inline-size: none;
            max-block-size: none;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            will-change: transform, opacity;
          }

          .inventory-detail-mobile-layer[data-mobile-detail-transition="opening"] .inventory-detail-mobile-page {
            animation: mobile-page-surface-in var(--mobile-page-enter-duration, 280ms) var(--mobile-page-enter-ease, cubic-bezier(0.22, 1, 0.36, 1)) both;
          }

          .inventory-detail-mobile-layer[data-mobile-detail-transition="closing"] .inventory-detail-mobile-page {
            animation: mobile-page-surface-out var(--mobile-page-exit-duration, 220ms) var(--mobile-page-exit-ease, cubic-bezier(0.4, 0, 1, 1)) both;
          }

          @supports (height: 100svh) {
            .inventory-modal {
              block-size: 100svh;
              max-block-size: 100svh;
            }
          }

          .inventory-modal .shop-modal__header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto 44px;
            align-items: center;
            gap: 8px;
            min-block-size: 64px;
            padding-block: max(10px, env(safe-area-inset-top)) 8px;
            padding-inline: max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right));
            background: rgba(255, 249, 232, .88);
            border-bottom: 2px solid rgba(196, 184, 158, .62);
          }

          .inventory-title-wrap {
            min-inline-size: 0;
            order: initial;
            grid-column: 1;
            grid-row: 1;
          }

          .inventory-modal .shop-modal__title {
            font-size: 24px;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .inventory-modal .shop-modal__close,
          .inventory-detail-modal .shop-modal__close,
          .inventory-detail-back,
          .settings-mobile-controls .shop-modal__close {
            inline-size: 44px;
            block-size: 44px;
            justify-self: end;
            flex: 0 0 44px;
            box-shadow: none;
            order: initial;
          }

          .inventory-modal .inventory-filter-toggle {
            appearance: none;
            min-inline-size: 44px;
            min-block-size: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            justify-self: end;
            padding-inline: 12px;
            color: var(--ac-text);
            background: var(--ac-cream-light);
            border: 1.5px solid var(--ac-border);
            border-radius: var(--radius-xs);
            box-shadow: none;
            font: inherit;
            font-size: 13px;
            font-weight: 1000;
            line-height: 1;
            grid-column: 2;
            grid-row: 1;
          }

          .inventory-modal .shop-modal__close {
            grid-column: 3;
            grid-row: 1;
          }

          .inventory-detail-back {
            justify-self: start;
          }

          .inventory-modal .inventory-filter-toggle span {
            white-space: nowrap;
          }

          .inventory-modal .shop-modal__close:hover,
          .inventory-modal .shop-modal__close:focus-visible,
          .settings-mobile-controls .shop-modal__close:hover,
          .settings-mobile-controls .shop-modal__close:focus-visible,
          .inventory-modal .inventory-filter-toggle:hover,
          .inventory-modal .inventory-filter-toggle:focus-visible {
            transform: none;
            border-color: var(--ac-border);
            box-shadow: none;
            outline: none;
          }

          .inventory-modal .shop-modal__toolbar {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            align-content: start;
            gap: 10px;
            padding: 10px 16px 8px;
            background: rgba(255, 249, 232, .88);
          }

          .inventory-modal .shop-search,
          .inventory-modal .shop-controls {
            inline-size: 100%;
          }

          .inventory-modal .shop-controls {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            justify-content: stretch;
          }

          .inventory-modal .shop-select-aisland,
          .inventory-modal .shop-select-aisland--sort {
            inline-size: 100%;
            min-inline-size: 0;
            block-size: 44px;
          }

          .inventory-modal .shop-input,
          .inventory-modal .shop-select-aisland [class*="animal-trigger-"],
          .inventory-modal .sort-direction-select,
          .inventory-modal .sort-direction-select__trigger {
            block-size: 44px;
            min-block-size: 44px;
            box-shadow: none;
            transform: none;
          }

          .inventory-modal .shop-select-aisland [class*="animal-trigger-"]:hover,
          .inventory-modal .shop-select-aisland [class*="animal-trigger-"]:focus-visible,
          .inventory-modal .sort-direction-select__trigger:hover,
          .inventory-modal .sort-direction-select__trigger:focus-visible {
            box-shadow: none;
            transform: none;
            border-color: rgba(196, 184, 158, .86);
            outline: none;
          }

          .inventory-modal .sort-direction-select__menu {
            right: auto;
            left: 0;
            inline-size: 100%;
            min-inline-size: 100%;
            max-inline-size: 100%;
          }

          .inventory-modal .sort-direction-select__option {
            min-inline-size: 0;
            min-block-size: 44px;
            inline-size: 100%;
          }

          .inventory-modal .inventory-grade-filter {
            display: flex;
            flex-wrap: nowrap;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
            overflow-y: hidden;
            overscroll-behavior-inline: contain;
            padding: 8px 16px 12px;
            scroll-padding-inline: 16px;
            scrollbar-width: none;
            background: rgba(255, 249, 232, .88);
            border-bottom: 2px solid rgba(127, 151, 164, .28);
          }

          .inventory-modal .inventory-grade-filter::-webkit-scrollbar {
            display: none;
          }

          .inventory-modal .inventory-grade-filter__chip {
            flex: 0 0 auto;
            min-inline-size: 58px;
            block-size: 44px;
            padding-inline: 12px;
            font-size: 12px;
            box-shadow: none;
            transform: none;
          }

          .inventory-modal .inventory-grade-filter__chip:hover,
          .inventory-modal .inventory-grade-filter__chip:focus-visible,
          .inventory-modal .inventory-grade-filter__chip.is-active {
            box-shadow: none;
            transform: none;
            filter: none;
          }

          .inventory-modal.inventory-modal--controls-hidden .shop-modal__toolbar,
          .inventory-modal.inventory-modal--controls-hidden .inventory-grade-filter {
            padding-block: 0;
          }

          .inventory-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 16px max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
            perspective: none;
            overscroll-behavior: contain;
          }

          .inventory-card,
          .inventory-card:hover {
            min-block-size: 0;
            flex: 0 0 auto;
            padding: clamp(12px, 3.6cqi, 15px);
            border-radius: 16px;
            transform: none;
            box-shadow: none;
          }

          .inventory-card:hover .inv-head,
          .inventory-card:hover .inv-art,
          .inventory-card:hover .inv-stats,
          .inventory-card:hover .inv-actions,
          .inventory-card:hover .inv-medal,
          .inventory-card:hover .inv-art__img,
          .inventory-card:hover .inv-art__rays,
          .inventory-card:hover .inv-art__star {
            transform: none;
          }

          .inventory-card::before,
          .inventory-card::after {
            display: none;
          }

          .inv-head {
            min-block-size: 32px;
            padding-block-end: 8px;
          }

          .inv-no {
            font-size: clamp(19px, 6.2cqi, 25px);
          }

          .inv-medal {
            min-block-size: 32px;
            min-inline-size: 54px;
            font-size: 13px;
            transform: none;
          }

          .inv-art,
          .inventory-card--prop .inv-item-art,
          .inventory-card--misc .inv-item-art {
            block-size: clamp(146px, 42cqi, 188px);
          }

          .inv-art__img,
          .inv-item-art__image {
            max-inline-size: min(72%, 176px);
          }

          .inv-art__tag {
            right: 0;
            bottom: 0;
            min-block-size: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 4px 10px;
            font-size: 13px;
          }

          .inv-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            padding: 10px 14px;
          }

          .inv-stat {
            inline-size: auto;
            min-inline-size: 0;
            block-size: auto;
            min-block-size: 42px;
          }

          .inv-stat__label {
            font-size: 12px;
          }

          .inv-stat__value {
            font-size: clamp(17px, 5.2cqi, 22px);
          }

          .inv-actions {
            grid-template-columns: 64px 64px minmax(0, 1fr);
            gap: 10px;
            margin-block-start: 12px;
          }

          .inv-btn,
          .inv-more-menu__item {
            min-block-size: 48px;
          }

          .inv-more-menu {
            min-inline-size: 118px;
          }

          .inventory-card--prop .inv-actions,
          .inventory-card--misc .inv-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .inventory-empty {
            padding: 34px 16px;
          }

          .inventory-detail-modal .shop-modal__header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 44px;
            align-items: center;
            gap: 8px;
            min-block-size: 64px;
            padding: 10px;
          }

          .inventory-detail-heading {
            display: grid;
            grid-template-columns: 44px minmax(0, 1fr);
            align-items: center;
            min-inline-size: 0;
            inline-size: 100%;
            justify-self: stretch;
            gap: 8px;
          }

          .inventory-detail-title-wrap {
            inline-size: 100%;
            max-inline-size: 270px;
            min-block-size: 44px;
            justify-self: stretch;
            gap: 0;
            transform: translateY(-4px);
          }

          .inventory-detail-title-wrap .shop-modal__title {
            display: block;
            font-size: 16px;
            line-height: 1.08;
            padding-top: 8px;
          }

          .inventory-detail-subtitle {
            margin-top: 3px;
            white-space: normal;
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            font-size: 11px;
            line-height: 1.25;
          }

          .inventory-detail-content {
            padding: 10px;
            overscroll-behavior: contain;
          }

          .inventory-detail-modal .inventory-factor-detail > .space-y-6,
          .inventory-detail-modal .inventory-factor-detail .space-y-6 {
            gap: 12px;
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card {
            border-radius: 12px;
            box-shadow: 0 2px 0 rgba(189, 174, 160, .42);
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card > .px-6 {
            padding-inline: 14px;
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card > .py-4 {
            padding-block-start: 12px;
            padding-block-end: 8px;
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card > .pb-6 {
            padding-block-end: 14px;
          }

          .inventory-detail-modal .inventory-factor-detail .text-base {
            font-size: 15px;
            line-height: 1.2;
          }

          .inventory-detail-modal .inventory-factor-detail .text-sm {
            font-size: 13px;
            line-height: 1.65;
          }

          .inventory-detail-modal .inventory-factor-detail .rounded-\[8px\] {
            border-radius: 10px;
          }

          .inventory-detail-modal .inventory-factor-detail code {
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .inventory-detail-modal .inventory-factor-detail .font-mono {
            font-family: inherit !important;
          }

          .inventory-detail-modal .inventory-factor-detail .alpha-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .inventory-detail-modal .inventory-factor-detail .alpha-metric-card {
            width: 100%;
            min-width: 0;
          }

          .inventory-detail-modal .inventory-factor-detail .gap-3 {
            gap: 10px;
          }

          .inventory-detail-modal .inventory-factor-detail .min-h-\[60px\] {
            min-height: 72px;
          }

          .inventory-detail-modal .inventory-factor-detail .h-\[400px\],
          .inventory-detail-modal .inventory-factor-detail .h-\[300px\] {
            height: 340px;
          }

          .inventory-detail-modal .inventory-factor-detail [aria-label="Chart selector"],
          .inventory-detail-modal .inventory-factor-detail [aria-label="图表选择器"] {
            display: flex;
            flex-wrap: nowrap;
            inline-size: 100%;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            padding-block-end: 2px;
            scrollbar-width: none;
          }

          .inventory-detail-modal .inventory-factor-detail [aria-label="Chart selector"]::-webkit-scrollbar,
          .inventory-detail-modal .inventory-factor-detail [aria-label="图表选择器"]::-webkit-scrollbar {
            display: none;
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card .flex.flex-wrap.items-center.justify-between {
            align-items: stretch;
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card [class*="gap-1.5"][class*="flex-wrap"] {
            flex-wrap: nowrap;
            max-inline-size: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            overscroll-behavior-inline: contain;
            scrollbar-width: none;
          }

          .inventory-detail-modal .inventory-factor-detail .surface-card [class*="gap-1.5"][class*="flex-wrap"]::-webkit-scrollbar {
            display: none;
          }

          .inventory-detail-modal .inventory-factor-detail [aria-label="Chart selector"] button,
          .inventory-detail-modal .inventory-factor-detail [aria-label="图表选择器"] button {
            flex: 0 0 auto;
            min-block-size: 44px;
          }

          .inventory-detail-modal .inventory-factor-detail button {
            min-block-size: 44px;
          }

          .delete-confirm-modal {
            inline-size: min(100%, 420px);
            max-inline-size: 100%;
          }

          .delete-confirm-modal__body {
            padding: 16px;
          }

          .delete-confirm-modal__actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .delete-confirm-modal__btn {
            min-block-size: 44px;
            min-inline-size: 0;
          }
        }
      `}</style>

      <div
        className={`game-stage${stageLayout.mode === "cover" ? " game-stage--mobile-cover" : ""}`}
        style={{
          transform: `translate(-50%, -50%) scale(${stageLayout.scale})`,
          "--stage-scale": stageLayout.scale,
          "--mobile-safe-left": `${stageLayout.safeLeft}px`,
          "--mobile-safe-top": `${stageLayout.safeTop}px`,
          "--mobile-visible-width": `${stageLayout.visibleWidth}px`,
          "--mobile-visible-height": `${stageLayout.visibleHeight}px`,
        } as CSSProperties}
      >
        <img
          className="game-bg"
          src="/assets/bg.png"
          alt=""
          aria-hidden="true"
        />

        <GameHudStats
          coinBalance={displayedCoinBalance}
          cashBalance={displayedCashBalanceUsd}
          fishBalance={fishBalance}
          variant={gameVersionMode}
          cashDecimals={cashDataScenarioMode === "empty" ? 0 : 1}
          tr={tr}
          onOpenWallet={walletController.openWalletModal}
        />

        <div
          ref={topActionsRef}
          className={`top-actions${uiLang === "en" ? " top-actions--en" : ""}${gameVersionMode === "mvp" ? " top-actions--mvp" : ""}`}
          aria-label={tr("Navigation", "功能入口")}
        >
          {gameVersionMode === "normal" && (
            <>
              <button className="menu-item" type="button" aria-label={tr("Pond", "鱼塘")}>
                <img
                  className="menu-icon"
                  src={HUD_ASSETS.pond}
                  alt=""
                  width="62"
                  height="52"
                  style={{ top: 12, width: 62, height: 52 }}
                />
                <span className="menu-label" data-label={tr("Pond", "鱼塘")}>{tr("Pond", "鱼塘")}</span>
              </button>

              <button
                className="menu-item"
                type="button"
                aria-label={tr("Fish Market", "鱼市场")}
                onClick={() => openStandaloneGameRoute("/fish-market")}
              >
                <img
                  className="menu-icon"
                  src={HUD_ASSETS.market}
                  alt=""
                  width="56"
                  height="52"
                  style={{ top: 16, width: 56, height: 52 }}
                />
                <span className="menu-label" data-label={tr("Fish Market", "鱼市场")}>{tr("Fish Market", "鱼市场")}</span>
              </button>
            </>
          )}

              <button
                className="menu-item"
                type="button"
                aria-label={tr("Inventory", "图鉴")}
                onClick={() => {
                  setInventoryControlsHidden(isMobileViewport());
                  inventoryScrollTopRef.current = 0;
                  setInventoryOpen(true);
                }}
              >
                <img
                  className="menu-icon"
                  src={HUD_ASSETS.guide}
                  alt=""
                  width="48"
                  height="57"
                  style={{ top: 16, width: 48, height: 57 }}
                />
                <span className="menu-label" data-label={tr("Inventory", "图鉴")}>{tr("Inventory", "图鉴")}</span>
              </button>

          {gameVersionMode === "normal" && (
            <>
              <button
                className="menu-item"
                type="button"
                aria-label={tr("Scratch", "刮刮乐")}
                onClick={() => openStandaloneGameRoute("/scratch-card")}
              >
                <img
                  className="menu-icon"
                  src={HUD_ASSETS.scratchCard}
                  alt=""
                  width="56"
                  height="57"
                  style={{ top: 12, width: 56, height: 57 }}
                />
                <span className="menu-label" data-label={tr("Scratch", "刮刮乐")}>{tr("Scratch", "刮刮乐")}</span>
              </button>

              <button
                className="menu-item"
                type="button"
                aria-label={tr("Leaderboard", "排行榜")}
                onClick={() => setLeaderboardOpen(true)}
              >
                <img
                  className="menu-icon"
                  src={HUD_ASSETS.leaderboard}
                  alt=""
                  width="66"
                  height="62"
                  style={{ top: 6, width: 66, height: 62 }}
                />
                <span className="menu-label" data-label={tr("Leaderboard", "排行榜")}>{tr("Leaderboard", "排行榜")}</span>
              </button>
            </>
          )}

          <button
            className="menu-item"
            type="button"
            aria-label={tr("Settings", "设置")}
            onClick={openSettingsModal}
          >
            <img
              className="menu-icon"
              src={HUD_ASSETS.settings}
              alt=""
              width="52"
              height="52"
              style={{ top: 12, width: 52, height: 52 }}
            />
            <span className="menu-label" data-label={tr("Settings", "设置")}>{tr("Settings", "设置")}</span>
          </button>
        </div>

        {shouldShowTestScenarioPanel && (
          <div
            className={`test-scenario-panel${testScenarioPanelState === "collapsed" ? " is-collapsed" : ""}`}
            aria-label={tr("Test scenarios", "测试场景")}
            style={{
              left: testScenarioPanelPosition.left,
              top: testScenarioPanelPosition.top,
            } satisfies CSSProperties}
          >
            <div
              className="test-scenario-panel__header"
              onPointerDown={handleTestScenarioPanelPointerDown}
              onPointerMove={handleTestScenarioPanelPointerMove}
              onPointerUp={handleTestScenarioPanelPointerUp}
              onPointerCancel={handleTestScenarioPanelPointerUp}
              onMouseDown={handleTestScenarioPanelMouseDown}
            >
              <span className="test-scenario-panel__title">{tr("Demo scenarios", "演示场景")}</span>
              <button
                className="test-scenario-panel__toggle"
                type="button"
                aria-expanded={testScenarioPanelState === "expanded"}
                aria-label={
                  testScenarioPanelState === "expanded"
                    ? tr("Collapse demo scenarios", "收起演示场景")
                    : tr("Expand demo scenarios", "展开演示场景")
                }
                onClick={() =>
                  setTestScenarioPanelState((current) => (current === "expanded" ? "collapsed" : "expanded"))
                }
              >
                {testScenarioPanelState === "expanded" ? tr("Collapse", "收起") : tr("Expand", "展开")}
              </button>
            </div>
            {testScenarioPanelState === "expanded" && (
              <div className="test-scenario-panel__body">
                <section className="test-scenario-group" aria-labelledby="test-version-group-title">
                  <span id="test-version-group-title" className="test-scenario-group__title">{tr("Version", "版本选择")}</span>
                  <div className="test-version-segmented" role="tablist" aria-label={tr("Game version mode", "游戏版本")}>
                    <button
                      className={`test-version-segment${gameVersionMode === "normal" ? " is-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={gameVersionMode === "normal"}
                      onClick={() => setGameVersionMode("normal")}
                    >
                      {tr("Normal version", "正常版本")}
                    </button>
                    <button
                      className={`test-version-segment${gameVersionMode === "mvp" ? " is-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={gameVersionMode === "mvp"}
                      onClick={() => setGameVersionMode("mvp")}
                    >
                      {tr("MVP version", "MVP版")}
                    </button>
                  </div>
                </section>

                <section className="test-scenario-group" aria-labelledby="test-data-group-title">
                  <span id="test-data-group-title" className="test-scenario-group__title">{tr("Data state", "数据状态")}</span>
                  <div className="test-scenario-button-group">
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={toggleBasketBadgeScenario}
                      aria-label={tr("Toggle basket badge", "切换鱼篓角标")}
                    >
                      <span>
                        {tr(
                          `Basket badge: ${BASKET_BADGE_LABELS[basketBadgeMode]}`,
                          `鱼篓角标：${BASKET_BADGE_LABELS_ZH[basketBadgeMode]}`
                        )}
                      </span>
                    </button>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={toggleCoinDataScenario}
                      aria-label={tr("Toggle coin data state", "切换游戏币状态")}
                    >
                      <span>
                        {tr(
                          `Game coins: ${coinDataScenarioMode === "empty" ? "empty" : "has data"}`,
                          `游戏币状态：${coinDataScenarioMode === "empty" ? "无数据" : "有数据"}`
                        )}
                      </span>
                    </button>
                    <label className="test-scenario-field">
                      <span className="test-scenario-field__label">{tr("Game coin value", "游戏币值设定")}</span>
                      <input
                        className="test-scenario-field__input"
                        type="text"
                        inputMode="numeric"
                        value={testCoinBalanceDraft}
                        aria-label={tr("Set game coin value", "设定游戏币值")}
                        onChange={(event) => updateTestCoinBalanceDraft(event.target.value)}
                        onFocus={() => setCoinDataScenarioMode("filled")}
                        placeholder={DEFAULT_TEST_COIN_BALANCE.toLocaleString()}
                      />
                    </label>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={toggleCashDataScenario}
                      aria-label={tr("Toggle cash data state", "切换现金状态")}
                    >
                      <span>
                        {tr(
                          `Cash: ${cashDataScenarioMode === "empty" ? "empty" : "has data"}`,
                          `现金状态：${cashDataScenarioMode === "empty" ? "无数据" : "有数据"}`
                        )}
                      </span>
                    </button>
                    <label className="test-scenario-field">
                      <span className="test-scenario-field__label">{tr("Cash value", "现金值设定")}</span>
                      <input
                        className="test-scenario-field__input"
                        type="text"
                        inputMode="decimal"
                        value={testCashBalanceDraft}
                        aria-label={tr("Set cash value", "设定现金值")}
                        onChange={(event) => updateTestCashBalanceDraft(event.target.value)}
                        onFocus={() => setCashDataScenarioMode("filled")}
                        placeholder={DEFAULT_TEST_CASH_BALANCE.toFixed(1)}
                      />
                    </label>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={toggleInventoryScenario}
                      aria-label={tr("Toggle inventory state", "切换图鉴状态")}
                    >
                      <span>
                        {tr(
                          `Inventory: ${inventoryScenarioMode === "empty" ? "empty" : inventoryScenarioMode === "single" ? "1 item" : "multiple"}`,
                          `图鉴状态：${inventoryScenarioMode === "empty" ? "无数据" : inventoryScenarioMode === "single" ? "1个数据" : "多个数据"}`
                        )}
                      </span>
                    </button>
                  </div>
                </section>

                <section className="test-scenario-group" aria-labelledby="test-agent-group-title">
                  <span id="test-agent-group-title" className="test-scenario-group__title">{tr("Agent connection", "agent连接")}</span>
                  <div className="test-scenario-button-group">
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={() => applyTestScenario("logged-out")}
                    >
                      <span>{tr("Logged out", "未登录")}</span>
                    </button>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={() => applyTestScenario("free-trial")}
                    >
                      <span>{tr("Free trial", "免费试用")}</span>
                    </button>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={() => applyTestScenario("agent-disconnected")}
                    >
                      <span>{tr("Agent disconnected", "未连接agent")}</span>
                    </button>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={() => applyTestScenario("web-agent-connected")}
                    >
                      <span>{tr("Web agent", "连接网页agent")}</span>
                    </button>
                    <button
                      className="test-scenario-button"
                      type="button"
                      onClick={() => applyTestScenario("client-agent-connected")}
                    >
                      <span>{tr("Client agent", "连接客户端agent")}</span>
                    </button>
                    <button
                      className="test-scenario-button test-scenario-button--preview"
                      type="button"
                      onClick={openNextAgentAuthPreview}
                    >
                      <span>{tr("Authorization popup preview", "授权弹窗示意")}</span>
                  </button>
                  <button
                    className="test-scenario-button test-scenario-button--preview"
                    type="button"
                    onClick={openNextAgentTimeoutPreview}
                  >
                    <span>{tr("Timeout popup preview", "请求超时弹窗示意")}</span>
                  </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {agentAuthPreviewOpen && (
          <div className="settings-agent-connect-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setAgentAuthPreviewOpen(false); }}>
            <section className="sac-auth-preview" role="dialog" aria-modal="true">
              <div className="sac-auth-preview__icon" aria-hidden="true">
                {renderAgentAuthPreviewIcon(agentAuthPreviewProviderId)}
              </div>
              <p className="sac-auth-preview__heading">
                <strong>{getAgentProviderName(agentAuthPreviewProviderId)}</strong> {tr("would like to access your account and be able to:", "希望访问您的账号并能够：")}
              </p>
              <p className="sac-auth-preview__body">
                {tr(
                  `Allow ${getAgentProviderName(agentAuthPreviewProviderId)} to write, upload, and backtest plugin.py, then retrieve factor details and summarize the results.`,
                  `授权 ${getAgentProviderName(agentAuthPreviewProviderId)} 编写、上传并回测 plugin.py，随后获取因子信息并生成结果摘要。`
                )}
              </p>
              <button className="sac-auth-preview__allow" type="button" onClick={allowAgentAuthPreviewAccess}>
                {tr("Allow access", "允许访问")}
              </button>
            </section>
          </div>
        )}

        {agentAuthPreviewSuccessOpen && (
          <div className="settings-agent-connect-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAgentAuthPreviewSuccessOpen(false); }}>
            <section className="sac-modal" role="dialog" aria-modal="true" aria-label={tr("Connected", "连接成功")}>
              <div className="sac-body sac-success">
                <div className="sac-success-icon">🎉</div>
                <div className="sac-success-title">{tr("Connected!", "连接成功！")}</div>
                <div className="sac-success-msg">
                  {getAgentProviderName(agentAuthPreviewProviderId)} {tr("has been connected. You can start using it now.", "已成功接入，可以开始使用了。")}
                </div>
                {gameVersionMode === "normal" && (
                  <div className="sac-buddy-card">
                    <div className="sac-buddy-card__icon">🐾</div>
                    <div className="sac-buddy-card__body">
                      <div className="sac-buddy-card__title">{tr("Download Buddy", "下载 Buddy")}</div>
                      <div className="sac-buddy-card__desc">{tr("Desktop companion that syncs your fishing status in real time.", "桌面伴侣，实时同步主界面的钓鱼状态。")}</div>
                    </div>
                    <a href="#" className="sac-buddy-card__btn" onClick={(event) => event.preventDefault()}>
                      {tr("Download", "下载")}
                    </a>
                  </div>
                )}
                <button className="sac-btn-next" type="button" onClick={() => setAgentAuthPreviewSuccessOpen(false)}>
                  {tr("Done", "完成")}
                </button>
              </div>
            </section>
          </div>
        )}

        {agentTimeoutPreviewOpen && (
          <div
            className="settings-agent-connect-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setAgentTimeoutPreviewOpen(false);
            }}
          >
            <section className="sac-auth-preview sac-auth-preview--timeout" role="dialog" aria-modal="true" aria-label={tr("Connection request expired", "连接请求已过期")}>
              <div className="sac-auth-preview__icon" aria-hidden="true">
                {renderAgentAuthPreviewIcon(agentTimeoutPreviewProviderId)}
              </div>
              <p className="sac-auth-preview__heading">
                {tr("Connection request expired", "连接请求已过期")}
              </p>
              <p className="sac-auth-preview__body">
                {tr(
                  `This connection request has expired. Return to ${getAgentProviderName(agentTimeoutPreviewProviderId)} and start a new connection request.`,
                  `本次连接请求已过期，需回到 ${getAgentProviderName(agentTimeoutPreviewProviderId)} 重新发起连接。`
                )}
              </p>
              <button
                className="sac-auth-preview__allow"
                type="button"
                onClick={() => setAgentTimeoutPreviewOpen(false)}
              >
                {tr("Confirm", "确认")}
              </button>
            </section>
          </div>
        )}

        <div ref={hudBottomBarRef} className="hud-bottom-bar" aria-label={tr("Primary action", "主按钮")}>
          {shouldBlockCastForAgent && !mainCastActive ? (
            <div className="hud-disconnected-actions">
              <button className={`hud-disconnected-actions__tip${uiLang === "en" ? " is-en" : ""}`} type="button" onClick={openAgentRequiredSettings}>
                <img className="hud-disconnected-actions__tip-icon" src={noticeIconUrl} alt="" aria-hidden="true" />
                <span className="hud-disconnected-actions__tip-label">{agentRequiredLabel}</span>
              </button>
              <div className="hud-disconnected-actions__main">
                <button
                  className="hud-disconnected-actions__cast"
                  type="button"
                  aria-label={agentRequiredLabel}
                  aria-disabled="true"
                  disabled
                >
                  <img className="hud-disconnected-actions__cast-tool" src={HUD_ASSETS.rod} alt="" />
                  <span className="hud-disconnected-actions__cast-label" data-label={castButtonLabel}>{castButtonLabel}</span>
                </button>
                <button
                  className="hud-disconnected-actions__basket"
                  type="button"
                  aria-label={tr("Basket", "鱼篓")}
                  aria-disabled="true"
                  disabled
                >
                  <img className="hud-disconnected-actions__basket-icon" src={disconnectedBasketUrl} alt="" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hud-cast-stack">
                {showAutoCastControl && !isClientAgentConnected && (
                  <div className="cast-auto-inline" aria-label={tr("Auto cast settings", "自动抛竿设置")}>
                    <button
                      className="cast-auto-button"
                      type="button"
                      aria-label={tr("Enable auto cast", "开启自动抛竿")}
                      onClick={openAutoCastSettings}
                    >
                      <span className="cast-auto-title">{tr("Enable auto cast", "开启自动抛竿")}</span>
                    </button>
                  </div>
                )}

                {mainCastActive ? (
                  <div className="hud-main-action hud-main-action--waiting" role="group" aria-label={mainCastAriaLabel}>
                    <img className="hud-main-action__tool" src={HUD_ASSETS.rod} alt="" />
                    <span className="hud-main-action__waiting">
                      <span className="hud-main-action__waiting-title">{mainCastStatusTitle}</span>
                      <span className="hud-main-action__timer">{mainCastElapsedLabel}</span>
                    </span>
                    <button
                      className="hud-main-action__stop"
                      type="button"
                      aria-label={autoCastRunning ? tr("Stop auto cast", "停止自动抛竿") : tr("Stop casting", "停止抛竿")}
                      onClick={autoCastRunning ? handleStopAutoCast : handleStopManualCast}
                    >
                      {tr("Stop", "停止")}
                    </button>
                  </div>
                ) : isClientAgentConnected ? (
                  <button
                    className="hud-main-action hud-main-action--notice"
                    type="button"
                    aria-label={clientAgentOnlyLabel}
                    onClick={openClientAgentSettings}
                  >
                    <span className="hud-main-action__label" data-label={clientAgentOnlyLabel}>
                      {clientAgentOnlyLabel}
                    </span>
                    <img className="hud-main-action__notice-icon" src={noticeIconUrl} alt="" aria-hidden="true" />
                  </button>
                ) : (
                  <button className="hud-main-action" type="button" aria-label={castActionLabel} onClick={handleMainCastClick}>
                    <img className="hud-main-action__tool" src={HUD_ASSETS.rod} alt="" />
                    <span
                      className={`hud-main-action__label${isFreeTrialAvailable ? " hud-main-action__label--free-trial" : ""}`}
                      data-label={castButtonLabel}
                    >
                      <span className="hud-main-action__label-text">{castButtonLabel}</span>
                      {isFreeTrialAvailable && (
                        <span
                          className="hud-main-action__free-trial-count"
                          role="status"
                          aria-live="polite"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {freeTrialRemainingLabel}
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </div>

              <button className="hud-basket" type="button" aria-label={tr("Basket", "鱼篓")} onClick={handleBasketClick}>
                <span className="hud-basket__shell" aria-hidden="true">
                  <img className="hud-basket__icon" src={HUD_ASSETS.basket} alt="" />
                </span>
                {basketBadgeLabel && (
                  <span className={`hud-badge${basketBadgeLabel === "99+" ? " hud-badge--compact" : ""}`}>
                    <span>{basketBadgeLabel}</span>
                  </span>
                )}
                {basketEmptyToast && (
                  <span key={basketEmptyToast.id} className="hud-basket-empty-toast" role="status" aria-live="polite">
                    {basketEmptyToast.message}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {settingsPageTransition.shouldRender && (
        <div
          className="shop-modal-backdrop settings-modal-backdrop mobile-page-shell"
          data-mobile-page-transition={settingsPageTransition.phase}
          role="presentation"
          onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSettingsModal();
        }}
        >
          <section className="shop-modal settings-modal mobile-page-surface" role="dialog" aria-modal="true" aria-label={tr("Settings", "设置")}>
            <header className="shop-modal__header">
              <div className="settings-mobile-controls">
                <div className="settings-tabs" role="tablist" aria-label={tr("Settings categories", "设置分类")}>
                  <button
                    className={`settings-tab${settingsActiveTab === "general" ? " is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={settingsActiveTab === "general"}
                    onClick={() => setSettingsActiveTab("general")}
                  >
                    {tr("General", "通用设置")}
                  </button>
                  <button
                    className={`settings-tab${settingsActiveTab === "agent" ? " is-active" : ""}`}
                    type="button"
                    role="tab"
                    aria-selected={settingsActiveTab === "agent"}
                    onClick={openAgentSettingsTab}
                  >
                    {tr("Agent settings", "agent设置")}
                  </button>
                </div>
                <button
                  className="shop-modal__close"
                  type="button"
                  aria-label={tr("Close settings", "关闭设置")}
                  onClick={closeSettingsModal}
                >
                  <X size={22} strokeWidth={3} />
                </button>
              </div>
              <button
                className="shop-modal__close"
                type="button"
                aria-label={tr("Close settings", "关闭设置")}
                onClick={closeSettingsModal}
              >
                <X size={22} strokeWidth={3} />
              </button>
            </header>

            <div className={`settings-content${settingsActiveTab === "agent" ? " settings-content--agent" : ""}`}>
              {settingsActiveTab === "general" ? (
                <>
              <section className="settings-section">
                <div className="settings-section__head">
                  <div className="settings-section__title">
                    <Languages className="settings-section__icon" size={18} strokeWidth={3} />
                    <span>{tr("Language", "语言设置")}</span>
                  </div>
                </div>

                <div className="settings-language-select">
                  <Select
                    value={uiLang}
                    onChange={(key) => setUiLang(key as typeof uiLang)}
                    options={languageSelectOptions}
                    placeholder={tr("Choose language", "选择语言")}
                  />
                </div>
              </section>

              <section className="settings-section">
                <div className="settings-section__head">
                  <div className="settings-section__title">
                    <User className="settings-section__icon" size={18} strokeWidth={3} />
                    <span>{tr("Profile", "个人资料")}</span>
                  </div>
                  {!settingsEditingProfile ? (
                    <button
                      className="settings-action settings-action--quiet"
                      type="button"
                      onClick={() => {
                        setSettingsOriginalNickname(settingsNickname);
                        setSettingsEditingProfile(true);
                      }}
                    >
                      <Pencil size={14} strokeWidth={3} />
                      {tr("Edit", "编辑")}
                    </button>
                  ) : (
                    <button className="settings-action settings-action--quiet" type="button" onClick={handleCancelSettingsProfile}>
                      <X size={14} strokeWidth={3} />
                      {tr("Cancel", "取消")}
                    </button>
                  )}
                </div>

                <div className="settings-profile">
                  <div>
                    <label className="settings-field">
                      <span>{tr("Nickname", "昵称")}</span>
                      <input
                        className="settings-input"
                        value={settingsNickname}
                        disabled={!settingsEditingProfile}
                        placeholder={tr("Enter nickname", "请输入昵称")}
                        onChange={(event) => setSettingsNickname(event.target.value)}
                      />
                    </label>
                    {settingsEditingProfile && (
                      <div className="settings-actions">
                        <button className="settings-action settings-action--primary" type="button" onClick={handleSaveSettingsProfile}>
                          {tr("Save profile", "保存资料")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="settings-section">
                <div className="settings-section__head">
                  <div className="settings-section__title">
                    <Mail className="settings-section__icon" size={18} strokeWidth={3} />
                    <span>{tr("Change email", "修改邮箱")}</span>
                  </div>
                  {!settingsEditingEmail ? (
                    <button className="settings-action settings-action--quiet" type="button" onClick={() => setSettingsEditingEmail(true)}>
                      <Pencil size={14} strokeWidth={3} />
                      {tr("Edit", "编辑")}
                    </button>
                  ) : (
                    <button className="settings-action settings-action--quiet" type="button" onClick={handleCancelSettingsEmail}>
                      <X size={14} strokeWidth={3} />
                      {tr("Cancel", "取消")}
                    </button>
                  )}
                </div>

                <div className="settings-grid">
                  <label className="settings-field">
                    <span>{tr("Current email", "当前邮箱")}</span>
                    <input className="settings-input" value={settingsEmail} disabled readOnly />
                  </label>

                  {settingsEditingEmail && (
                    <label className="settings-field">
                      <span>{tr("Verification code", "验证码")}</span>
                      <span className="settings-code-field">
                        <input
                          className="settings-input"
                          value={settingsEmailVerCode}
                          placeholder={tr("Enter verification code", "请输入验证码")}
                          onChange={(event) => setSettingsEmailVerCode(event.target.value)}
                        />
                        <button
                          className="settings-action settings-action--quiet settings-code-send"
                          type="button"
                          onClick={() => {
                            setSettingsEmailCodeSent(true);
                            showSettingsFeedback(tr("Code sent", "验证码已发送"), tr("Verification code sent to your current email.", "验证码已发送至当前邮箱。"));
                          }}
                        >
                          {settingsEmailCodeSent ? tr("Resend", "重新发送") : tr("Send", "发送")}
                        </button>
                      </span>
                    </label>
                  )}

                  {settingsEditingEmail && (
                    <label className="settings-field settings-field--full">
                      <span>{tr("New email", "新邮箱")}</span>
                      <input
                        className="settings-input"
                        type="email"
                        value={settingsNewEmail}
                        placeholder={tr("Enter new email address", "请输入新邮箱地址")}
                        onChange={(event) => setSettingsNewEmail(event.target.value)}
                      />
                      {settingsNewEmail && !isValidEmailAddress(settingsNewEmail) && (
                        <span className="settings-helper">{tr("Enter a valid email address", "请输入有效的邮箱地址")}</span>
                      )}
                    </label>
                  )}
                </div>

                {settingsEditingEmail && (
                  <div className="settings-actions">
                    <button className="settings-action settings-action--primary" type="button" onClick={handleSaveSettingsEmail}>
                      {tr("Save email", "保存邮箱")}
                    </button>
                  </div>
                )}
              </section>

              <section className="settings-section">
                <div className="settings-section__head">
                  <div className="settings-section__title">
                    <Key className="settings-section__icon" size={18} strokeWidth={3} />
                    <span>{tr("Change password", "修改密码")}</span>
                  </div>
                  {!settingsEditingPassword ? (
                    <button className="settings-action settings-action--quiet" type="button" onClick={() => setSettingsEditingPassword(true)}>
                      <Pencil size={14} strokeWidth={3} />
                      {tr("Edit", "编辑")}
                    </button>
                  ) : (
                    <button className="settings-action settings-action--quiet" type="button" onClick={handleCancelSettingsPassword}>
                      <X size={14} strokeWidth={3} />
                      {tr("Cancel", "取消")}
                    </button>
                  )}
                </div>

                {settingsEditingPassword ? (
                  <>
                    <div className="settings-grid">
                      <label className="settings-field">
                        <span>{tr("Email", "邮箱")}</span>
                        <input className="settings-input" value={settingsEmail} disabled readOnly />
                      </label>
                      <label className="settings-field">
                        <span>{tr("Verification code", "验证码")}</span>
                        <span className="settings-code-field">
                          <input
                            className="settings-input"
                            value={settingsPasswordVerCode}
                            placeholder={tr("Enter verification code", "请输入验证码")}
                            onChange={(event) => setSettingsPasswordVerCode(event.target.value)}
                          />
                          <button
                            className="settings-action settings-action--quiet settings-code-send"
                            type="button"
                            onClick={() => {
                              setSettingsPasswordCodeSent(true);
                              showSettingsFeedback(tr("Code sent", "验证码已发送"), tr("Verification code sent to your email.", "验证码已发送至邮箱。"));
                            }}
                          >
                            {settingsPasswordCodeSent ? tr("Resend", "重新发送") : tr("Send", "发送")}
                          </button>
                        </span>
                      </label>
                      <label className="settings-field">
                        <span>{tr("New password", "新密码")}</span>
                        <input
                          className="settings-input"
                          type="password"
                          value={settingsNewPassword}
                          placeholder={tr("At least 8 characters", "至少 8 位")}
                          onChange={(event) => setSettingsNewPassword(event.target.value)}
                        />
                      </label>
                      <label className="settings-field">
                        <span>{tr("Confirm password", "确认密码")}</span>
                        <input
                          className="settings-input"
                          type="password"
                          value={settingsConfirmPassword}
                          placeholder={tr("Re-enter new password", "再次输入新密码")}
                          onChange={(event) => setSettingsConfirmPassword(event.target.value)}
                        />
                      </label>
                    </div>
                    <div className="settings-actions">
                      <button className="settings-action settings-action--primary" type="button" onClick={handleSaveSettingsPassword}>
                        {tr("Save password", "保存密码")}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="settings-helper">{tr("Verify your identity with an email code before setting a new login password.", "通过邮箱验证码验证身份后，可设置新的登录密码。")}</p>
                )}
              </section>

              <div className="settings-logout-row">
                <button
                  className="settings-action settings-action--logout"
                  type="button"
                  onClick={() => setSettingsLogoutConfirmOpen(true)}
                >
                  <LogOut size={14} strokeWidth={3} />
                  {tr("Sign out", "退出登录")}
                </button>
              </div>
                </>
              ) : (
                <div className="settings-agent-panel" role="tabpanel" aria-label={tr("Agent settings", "agent设置")}>
                  <div className="settings-agent-main">
                    {settingsAgentSection === "web" ? (
                      null
                    ) : (
                      <section className="settings-agent-install" aria-label={tr("Install client plugin", "安装客户端插件")}>
                        <div className="settings-agent-install__intro">
                          <h3 className="settings-agent-install__title">{tr("Install", "安装")}</h3>
                          <p className="settings-agent-install__subtitle">
                            {tr("Select your IDE and follow the instructions below.", "选择您的 IDE，并按下方说明完成安装。")}
                          </p>
                        </div>

                        <div className="settings-agent-install-tabs" role="tablist" aria-label={tr("Select IDE", "选择 IDE")}>
                          {agentInstallIdeOptions.map((option) => (
                            <button
                              className={`settings-agent-install-tab${agentInstallIde === option.id ? " is-active" : ""}`}
                              type="button"
                              role="tab"
                              aria-selected={agentInstallIde === option.id}
                              key={option.id}
                              onClick={() => setAgentInstallIde(option.id)}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div className="settings-agent-install-card">
                          <section className="settings-agent-install-step">
                            <span className="settings-agent-install-step__num">1</span>
                            <div className="settings-agent-install-step__body">
                              <h3>{tr("Run Installation Command", "运行安装命令")}</h3>
                              <p>
                                {tr(
                                  `Run this command in your terminal to add Quandora MCP to ${selectedAgentInstallIde.label}:`,
                                  `在终端中运行以下命令，将 Quandora MCP 添加到 ${selectedAgentInstallIde.label}：`
                                )}
                              </p>
                              <div className="settings-agent-install-command">
                                <code>{agentInstallCommand}</code>
                                <button
                                  className="settings-agent-install-copy"
                                  type="button"
                                  aria-label={tr("Copy installation command", "复制安装命令")}
                                  onClick={() => copyAgentText(agentInstallCommand, tr("Command copied", "命令已复制"), tr("Run it in your terminal.", "请在终端中运行。"))}
                                >
                                  <Copy size={20} strokeWidth={2.4} />
                                </button>
                              </div>
                            </div>
                          </section>

                          <section className="settings-agent-install-step">
                            <span className="settings-agent-install-step__num">2</span>
                            <div className="settings-agent-install-step__body">
                              <h3>{tr("Verify Installation", "验证安装")}</h3>
                              <p>
                                {tr(
                                  `After running the command, Quandora MCP will be available in ${selectedAgentInstallIde.label}.`,
                                  `运行命令后，Quandora MCP 将可在 ${selectedAgentInstallIde.label} 中使用。`
                                )}
                              </p>
                              <div className="settings-agent-install-checks">
                                <span className="settings-agent-install-check">
                                  <Check size={20} strokeWidth={2.6} />
                                  <span>{tr("The MCP server will be automatically configured", "MCP 服务将自动完成配置")}</span>
                                </span>
                                <span className="settings-agent-install-check">
                                  <Check size={20} strokeWidth={2.6} />
                                  <span>{tr(`You can start using Quandora commands in ${selectedAgentInstallIde.label} immediately`, `您可以立即在 ${selectedAgentInstallIde.label} 中使用 Quandora 命令`)}</span>
                                </span>
                                <span className="settings-agent-install-check">
                                  <RefreshCw size={20} strokeWidth={2.4} />
                                  <span>
                                    {tr("To verify, check your MCP servers by running:", "如需验证，可运行命令检查 MCP 服务：")}{" "}
                                    <code>{selectedAgentInstallIde.verifyCommand}</code>
                                  </span>
                                </span>
                              </div>
                            </div>
                          </section>
                        </div>
                      </section>
                    )}
                    {settingsAgentSection === "web" ? (
                      <>
                        {/* ===== Step 1: Choose connection mode (inline) ===== */}
                        {agentInlineStep === "mode" && (
                          <div className="sac-inline-step">
                            <div className="sac-inline-step__head">
                              <h3 className="sac-inline-step__title">{tr("Choose connection method", "选择连接方式")}</h3>
                              <p className="sac-inline-step__sub">{tr("Choose where you want to use this Agent. You can only pick one.", "请选择您希望在哪个环境中使用该 Agent，连接方式只能二选一。")}</p>
                            </div>
                            <div className="sac-mode-grid">
                              {(["web", "agent"] as const).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  className={`sac-mode-card${agentConnectMode === mode ? " sac-mode-card--sel" : ""}`}
                                  onClick={() => setAgentConnectMode(mode)}
                                >
                                  <div className={`sac-radio${agentConnectMode === mode ? " sac-radio--checked" : ""}`} />
                                  <div className="sac-mode-body">
                                    {mode === "web" ? (
                                      <>
                                        <div className="sac-mode-title">{tr("Use on web", "在网页上用")}</div>
                                        <div className="sac-mode-desc">{tr("Get an API Key to connect quickly. Supports ChatGPT.", "获取 API Key 即可快速接入，支持ChatGPT。")}</div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="sac-mode-title">{tr("Use on Agent client", "在 Agent 客户端上用")}</div>
                                        <div className="sac-mode-desc">{tr("Install the plugin on your local Agent client. Supports Codex, ClaudeCodex, and OpenClaw.", "在本地 Agent 客户端安装插件完成配置，支持 Codex，ClaudeCodex，Openclaw。")}</div>
                                      </>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="sac-nav">
                              <span />
                              <button className="sac-btn-next" type="button" onClick={proceedFromModeStep}>{tr("Next", "下一步")} →</button>
                            </div>
                          </div>
                        )}

                        {/* ===== Manage view: provider list (stays behind config/success modals) ===== */}
                        {agentInlineStep !== "mode" && (
                          <>
                        {/* Connection mode bar */}
                        <div className="sac-mode-bar">
                          <span className="sac-mode-bar__label">
                            {agentGlobalConnectMode === "agent"
                              ? tr("Use on Agent client", "在 Agent 客户端上用")
                              : tr("Use on web", "在网页上用")}
                          </span>
                          <button className="sac-mode-bar__switch" type="button" onClick={requestSwitchConnectMode}>
                            <RefreshCw size={13} strokeWidth={3} />
                            {tr("Switch method", "切换连接方式")}
                          </button>
                        </div>
                        {agentModeSwitchWarning && (
                          <div className="sac-mode-warning" role="presentation">
                            <section className="settings-agent-confirm-modal" role="alertdialog" aria-modal="true" aria-live="assertive" aria-label={tr("Connection notice", "连接提示")}>
                              <header className="settings-agent-connect-modal__header">
                                <div className="settings-agent-card__title">
                                  <strong>{tr("Connection notice", "连接提示")}</strong>
                                </div>
                                <button
                                  className="settings-agent-connect-modal__close"
                                  type="button"
                                  aria-label={tr("Close connection notice", "关闭连接提示")}
                                  onClick={() => setAgentModeSwitchWarning(false)}
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>
                              </header>
                              <p className="settings-agent-confirm-copy">
                                {agentConnectionWarningType === "provider"
                                  ? tr("Disconnect the connected agent before starting a new connection.", "请先断开已连接的 agent，再进行新的连接。")
                                  : tr("Disconnect the connected agent before switching methods.", "需断开已连接的agent，再切换连接方式。")}
                              </p>
                              <div className="settings-agent-confirm-actions">
                                {agentConnectionWarningType === "mode" && (
                                  <button className="sac-disconnect-all-btn" type="button" onClick={disconnectAllAgentProviders}>
                                    {tr("Disconnect all", "一键断开全部")}
                                  </button>
                                )}
                                <button
                                  className="settings-action settings-action--primary"
                                  type="button"
                                  onClick={() => setAgentModeSwitchWarning(false)}
                                >
                                  {tr("Cancel", "取消")}
                                </button>
                              </div>
                            </section>
                          </div>
                        )}
                        <div className="settings-agent-provider-list" aria-label={tr("Connectable providers", "可连接服务")}>
                          {agentVisibleProviders.map((provider) => {
                            const isConnected = agentConnectedProviderIds.has(provider.id);
                            const availability = agentProviderAvailabilityById[provider.id] ?? "available";
                            const isUnavailable = availability !== "available";
                            const isTestingStatus = agentStatusTestingProviderId === provider.id;
                            // Web mode: only the connect button is blocked if another provider is already connected.
                            const isBlockedByWebLimit = !isConnected && agentVisibleProviderMode === "web" && agentConnectedProviderIds.size > 0;
                            const providerStateClass = isUnavailable
                              ? " is-unavailable"
                              : isConnected
                                ? " is-connected"
                                : " is-disconnected";
                            const providerBadgeClass = isUnavailable
                              ? " is-unavailable"
                              : isConnected
                                ? " is-connected"
                                : " is-disconnected";
                            const providerBadgeLabel = isUnavailable
                              ? tr("Unavailable", "无法使用")
                              : isConnected
                                ? tr("Connected", "已连接")
                                : tr("Disconnected", "未连接");
                            const providerHint = availability === "outdated"
                              ? tr("Plugin version is outdated. Follow the connection guide to update the plugin.", "版本过旧，请参考连接流程更新 Plugin。")
                              : availability === "unavailable"
                                ? tr("Disconnect and reconnect is recommended.", "建议断开后重新连接。")
                                : "";

                            return (
                              <div
                                className={`settings-agent-provider-row${providerStateClass}`}
                                key={provider.id}
                              >
                                <div className="settings-agent-provider-head">
                                  <span className={`settings-agent-provider-mark settings-agent-provider-mark--${provider.id}`} aria-hidden="true">
                                    {renderAgentProviderIcon(provider)}
                                  </span>
                                  <span className="settings-agent-provider-name">
                                    <span>{getAgentProviderDisplayName(provider)}</span>
                                    <span className="settings-agent-provider-status-line">
                                      <span className={`settings-agent-provider-badge${providerBadgeClass}`}>
                                        {providerBadgeLabel}
                                      </span>
                                      {providerHint && (
                                        <span className="settings-agent-provider-hint">
                                          {providerHint}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                </div>
                                <div className="settings-agent-provider-actions">
                                  {isConnected || isUnavailable ? (
                                    <>
                                      <button
                                        className={`settings-agent-provider-action-button settings-agent-provider-action-button--compact${isTestingStatus ? " is-loading" : ""}`}
                                        type="button"
                                        aria-label={isTestingStatus ? tr("Testing status", "状态测试中") : tr("Status test", "状态测试")}
                                        disabled={isTestingStatus}
                                        onClick={() => testAgentProviderStatus(provider.id)}
                                      >
                                        <span>
                                          {isTestingStatus
                                            ? tr("Testing", "检查中")
                                            : agentGlobalConnectMode === "agent"
                                              ? tr("Test", "测试")
                                              : tr("Check", "检查")}
                                        </span>
                                      </button>
                                      <button
                                        className="settings-agent-provider-action-button settings-agent-provider-action-button--compact"
                                        type="button"
                                        aria-label={tr("Disconnect", "断连")}
                                        onClick={() => {
                                          if (isUnavailable && !isConnected) {
                                            resetUnavailableAgentProvider(provider.id);
                                            return;
                                          }
                                          requestDisconnectAgentProvider(provider.id);
                                        }}
                                      >
                                        <span>{tr("Disconnect", "断开")}</span>
                                      </button>
                                      {agentGlobalConnectMode === "agent" && (
                                        <button
                                          className="settings-agent-provider-action-button settings-agent-provider-action-button--compact"
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openAgentConnectModal(provider.id);
                                          }}
                                        >
                                          <span>{tr("Connect guide", "连接教程")}</span>
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <button
                                      className={`settings-agent-provider-action-button settings-agent-provider-action-button--primary${isBlockedByWebLimit ? " is-disabled" : ""}`}
                                      type="button"
                                      aria-disabled={isBlockedByWebLimit || undefined}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (isBlockedByWebLimit) {
                                          showAgentProviderBlockedWarning();
                                          return;
                                        }
                                        openAgentConnectModal(provider.id);
                                      }}
                                    >
                                      <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                                      {agentVisibleProviderMode === "web" ? tr("Connect", "连接") : tr("Connect guide", "连接教程")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                          </>
                        )}

                        {/* ===== Step 2: Configuration (modal) ===== */}
                        {agentInlineStep === "config" && (
                          <div
                            className="settings-agent-connect-overlay"
                            role="presentation"
                            onMouseDown={(event) => {
                              if (event.target === event.currentTarget) setAgentInlineStep("manage");
                            }}
                          >
                            <section className="sac-modal" role="dialog" aria-modal="true" aria-label={tr("Connect agent", "连接 Agent")}>
                              <header className="sac-header">
                                <span className="sac-title">{tr("Connect", "连接")} {getAgentProviderNameForMode(agentSelectedProviderId, agentConnectMode)}</span>
                                <button className="sac-close" type="button" aria-label={tr("Close", "关闭")} onClick={() => setAgentInlineStep("manage")}>
                                  <X size={16} strokeWidth={3} />
                                </button>
                              </header>
                            <div className="sac-body">
                              {agentConnectMode === "web" ? (
                                <>
                                  {/* API key option */}
                                  <div className={`sac-api-panel${isSelectedOpenRouter ? " sac-api-panel--plain" : ""}`}>
                                    {!isSelectedOpenRouter && (
                                      <>
                                        <div className="sac-api-panel__head">
                                          <span className="sac-opt-title">{tr("Enter API Key", "输入 API Key")}</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="sac-api-panel__detail">
                                      <label className="settings-field settings-field--compact">
                                        {isSelectedOpenRouter && (
                                          <span className="settings-field__head"><span>API Key</span></span>
                                        )}
                                        <input
                                          className="settings-input"
                                          type="password"
                                          value={agentByokKey}
                                          placeholder="sk-..."
                                          disabled={agentByokTestStatus === "testing"}
                                          onChange={(event) => {
                                            setAgentByokKey(event.target.value);
                                            setAgentByokTestStatus("idle");
                                            setAgentByokTestMessage("");
                                          }}
                                        />
                                      </label>
                                      {agentByokTestMessage && (
                                        <span className={`settings-agent-test-message${agentByokTestStatus === "valid" ? " is-success" : " is-error"}`}>
                                          {agentByokTestMessage}
                                        </span>
                                      )}
                                      <span className="settings-api-key-links">
                                        <a
                                          className="settings-api-key-link"
                                          href={isSelectedOpenRouter ? "https://openrouter.ai/settings/keys" : "https://platform.openai.com/api-keys"}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          {isSelectedOpenRouter
                                            ? tr("Get API Key from OpenRouter", "从 OpenRouter 获取 API Key")
                                            : tr("Get API Key from OpenAI", "从 OpenAI 获取 API Key")} <ArrowUpRight size={13} strokeWidth={3} />
                                        </a>
                                      </span>
                                      <div className="sac-api-panel__actions">
                                        <button
                                          className="sac-btn-next"
                                          type="button"
                                          onClick={() => {
                                            if (agentByokTestStatus !== "valid") {
                                              testAgentByok();
                                            } else {
                                              confirmAgentProviderConnection();
                                            }
                                          }}
                                        >
                                          {agentByokTestStatus !== "valid"
                                            ? tr("Verify & Connect", "验证并连接")
                                            : tr("Complete connection", "完成连接")} ✓
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className={`sac-opt-card${agentConnectPlugin === "auto" ? " sac-opt-card--sel" : ""}`} onClick={() => setAgentConnectPlugin("auto")}>
                                        <div className="sac-opt-head">
                                          <div className={`sac-radio${agentConnectPlugin === "auto" ? " sac-radio--checked" : ""}`} />
                                          <span className="sac-opt-title">⚡ {tr("Auto install", "自动安装")}</span>
                                          <span className="sac-badge">{tr("One-click", "一键完成")}</span>
                                        </div>
                                        <div className="sac-opt-desc">{tr("Enter the following command in the Codex chat to install the plugin.", "在 Codex 的聊天界面中输入以下命令安装插件")}</div>
                                        {agentConnectPlugin === "auto" && (
                                          <div className="sac-opt-detail" onClick={(e) => e.stopPropagation()}>
                                            <div className="sac-code-box">
                                              <code>npx @codex/buddy install --token=YOUR_TOKEN</code>
                                              <button
                                                className="sac-code-copy"
                                                type="button"
                                                aria-label={tr("Copy", "复制")}
                                                onClick={() => navigator.clipboard.writeText("npx @codex/buddy install --token=YOUR_TOKEN").catch(() => {})}
                                              >
                                                <Copy size={15} strokeWidth={3} />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <div className={`sac-opt-card${agentConnectPlugin === "manual" ? " sac-opt-card--sel" : ""}`} onClick={() => setAgentConnectPlugin("manual")}>
                                        <div className="sac-opt-head">
                                          <div className={`sac-radio${agentConnectPlugin === "manual" ? " sac-radio--checked" : ""}`} />
                                          <span className="sac-opt-title">📂 {tr("Manual install", "手动安装")}</span>
                                        </div>
                                        <div className="sac-opt-desc">{tr("Follow the official guide to configure manually.", "按官方文档引导，手动配置插件路径和参数。")}</div>
                                        {agentConnectPlugin === "manual" && (
                                          <div className="sac-opt-detail sac-manual-guide" onClick={(e) => e.stopPropagation()}>
                                            <ol className="sac-guide-steps">
                                              <li>
                                                <span className="sac-guide-step-title">{tr('In Codex, click "Plugins → OpenAI Bundled → Add more"', '在Codex应用程序中点击"插件–OpenAI Bundled–添加更多"')}</span>
                                                <button className="sac-guide-img-button" type="button" aria-label={tr("Preview step 1 image", "预览步骤 1 图片")} onClick={() => openAgentGuidePreview("/assets/manual-step1.png")}>
                                                  <img className="sac-guide-img" src="/assets/manual-step1.png" alt="step 1" />
                                                </button>
                                              </li>
                                              <li>
                                                <span className="sac-guide-step-title">{tr("Fill in the following info", "填入以下信息")}</span>
                                                <ul className="sac-guide-fields">
                                                  <li>
                                                    <span className="sac-guide-field-line">
                                                      <span>{tr("Source", "来源")}：<code>{AGENT_MANUAL_SOURCE}</code></span>
                                                      <button
                                                        className="sac-guide-copy"
                                                        type="button"
                                                        aria-label={tr("Copy source", "复制来源")}
                                                        onClick={() => copyAgentManualField(AGENT_MANUAL_SOURCE, tr("Source", "来源"))}
                                                      >
                                                        <Copy size={11} strokeWidth={3} />
                                                      </button>
                                                    </span>
                                                  </li>
                                                  <li>
                                                    <span className="sac-guide-field-line">
                                                      <span>{tr("Git ref", "Git 引用")}：<code>{AGENT_MANUAL_GIT_REF}</code></span>
                                                      <button
                                                        className="sac-guide-copy"
                                                        type="button"
                                                        aria-label={tr("Copy git ref", "复制 Git 引用")}
                                                        onClick={() => copyAgentManualField(AGENT_MANUAL_GIT_REF, tr("Git ref", "Git 引用"))}
                                                      >
                                                        <Copy size={11} strokeWidth={3} />
                                                      </button>
                                                    </span>
                                                  </li>
                                                </ul>
                                                <button className="sac-guide-img-button" type="button" aria-label={tr("Preview step 2 image", "预览步骤 2 图片")} onClick={() => openAgentGuidePreview("/assets/manual-step2.png")}>
                                                  <img className="sac-guide-img" src="/assets/manual-step2.png" alt="step 2" />
                                                </button>
                                              </li>
                                              <li>
                                                <span className="sac-guide-step-title">{tr("Start a new chat session", "开始一个新的聊天会话")}</span>
                                                <div className="sac-guide-hint-wrap">
                                                  <p className="sac-guide-hint">{AGENT_MANUAL_PROMPT}</p>
                                                  <button
                                                    className="sac-guide-copy"
                                                    type="button"
                                                    aria-label={tr("Copy prompt", "复制提示词")}
                                                    onClick={() => copyAgentManualField(AGENT_MANUAL_PROMPT, tr("Prompt", "提示词"))}
                                                  >
                                                    <Copy size={11} strokeWidth={3} />
                                                  </button>
                                                </div>
                                                <button className="sac-guide-img-button" type="button" aria-label={tr("Preview step 3 image", "预览步骤 3 图片")} onClick={() => openAgentGuidePreview("/assets/manual-step3.png")}>
                                                  <img className="sac-guide-img" src="/assets/manual-step3.png" alt="step 3" />
                                                </button>
                                              </li>
                                              <li>
                                                <span className="sac-guide-step-title">{tr("Log in to Quandora and authorize", "登录Quandora，并同意授权")}</span>
                                              </li>
                                            </ol>
                                          </div>
                                        )}
                                      </div>
                                      {agentGuidePreviewImageSrc && (
                                        <div className="sac-image-preview-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAgentGuidePreview(); }}>
                                          <section className="sac-image-preview-modal" role="dialog" aria-modal="true" aria-label={tr("Image preview", "图片预览")}>
                                            <div className="sac-image-preview-toolbar" role="group" aria-label={tr("Image zoom controls", "图片缩放控制")}>
                                              <button className="sac-image-preview-tool" type="button" aria-label={tr("Zoom out", "缩小")} disabled={agentGuidePreviewScale <= 0.5} onClick={() => zoomAgentGuidePreview("out")}>
                                                <ZoomOut size={16} strokeWidth={3} />
                                              </button>
                                              <button className="sac-image-preview-tool" type="button" onClick={() => setAgentGuidePreviewScale(1)}>
                                                {tr("Original size", "原尺寸")}
                                              </button>
                                              <button className="sac-image-preview-tool" type="button" aria-label={tr("Zoom in", "放大")} disabled={agentGuidePreviewScale >= 3} onClick={() => zoomAgentGuidePreview("in")}>
                                                <ZoomIn size={16} strokeWidth={3} />
                                              </button>
                                            </div>
                                            <button className="sac-image-preview-close" type="button" aria-label={tr("Close image preview", "关闭图片预览")} onClick={closeAgentGuidePreview}>
                                              <X size={20} strokeWidth={3} />
                                            </button>
                                            <div className="sac-image-preview-body">
                                              <img
                                                src={agentGuidePreviewImageSrc}
                                                alt={tr("Manual install guide preview", "手动安装教程预览")}
                                                style={{ transform: `scale(${agentGuidePreviewScale})` }}
                                              />
                                            </div>
                                          </section>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {agentConnectMode === "agent" && (
                                    <div className="sac-nav">
                                      <span />
                                      <button className="sac-btn-next" type="button" onClick={confirmAgentProviderConnectionAndClose}>
                                        {tr("OK", "确定")} ✓
                                      </button>
                                    </div>
                                  )}
                                </div>
                            {/* close sac-body */}
                            </section>
                          </div>
                        )}

                        {/* ===== Step 3: Success (modal) ===== */}
                        {agentInlineStep === "success" && (
                          <div className="settings-agent-connect-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAgentInlineStep("manage"); }}>
                            <section className="sac-modal" role="dialog" aria-modal="true" aria-label={tr("Connected", "连接成功")}>
                            <div className="sac-body sac-success">
                              <div className="sac-success-icon">🎉</div>
                              <div className="sac-success-title">{tr("Connected!", "连接成功！")}</div>
                              <div className="sac-success-msg">{getAgentProviderName(agentSelectedProviderId)} {tr("has been connected. You can start using it now.", "已成功接入，可以开始使用了。")}</div>
                              {gameVersionMode === "normal" && (
                                <div className="sac-buddy-card">
                                  <div className="sac-buddy-card__icon">🐾</div>
                                  <div className="sac-buddy-card__body">
                                    <div className="sac-buddy-card__title">{tr("Download Buddy", "下载 Buddy")}</div>
                                    <div className="sac-buddy-card__desc">{tr("Desktop companion that syncs your fishing status in real time.", "桌面伴侣，实时同步主界面的钓鱼状态。")}</div>
                                  </div>
                                  <a href="#" className="sac-buddy-card__btn" onClick={(e) => e.preventDefault()}>
                                    {tr("Download", "下载")}
                                  </a>
                                </div>
                              )}
                              <button className="sac-btn-next" type="button" onClick={() => setAgentInlineStep("manage")}>{tr("Done", "完成")}</button>
                            </div>
                            </section>
                          </div>
                        )}

                        {agentDisconnectConfirmProviderId && (
                          <div
                            className="settings-agent-connect-overlay"
                            role="presentation"
                            onMouseDown={(event) => {
                              if (event.target === event.currentTarget) setAgentDisconnectConfirmProviderId(null);
                            }}
                          >
                            <section className="settings-agent-confirm-modal" role="dialog" aria-modal="true" aria-label={tr("Confirm disconnection", "确认断连")}>
                              <header className="settings-agent-connect-modal__header">
                                <div className="settings-agent-card__title">
                                  <strong>{tr("Disconnect agent", "确认断连")}</strong>
                                </div>
                                <button
                                  className="settings-agent-connect-modal__close"
                                  type="button"
                                  aria-label={tr("Close confirmation dialog", "关闭确认弹窗")}
                                  onClick={() => setAgentDisconnectConfirmProviderId(null)}
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>
                              </header>
                              <p className="settings-agent-confirm-copy">
                                {tr(
                                  `Disconnect ${getAgentProviderName(agentDisconnectConfirmProviderId)}? You can reconnect it later.`,
                                  `确认断开 ${getAgentProviderName(agentDisconnectConfirmProviderId)}？稍后可重新连接。`
                                )}
                              </p>
                              <div className="settings-agent-confirm-actions">
                                <button
                                  className="settings-action settings-action--quiet"
                                  type="button"
                                  onClick={() => setAgentDisconnectConfirmProviderId(null)}
                                >
                                  {tr("Cancel", "取消")}
                                </button>
                                <button
                                  className="settings-action settings-action--danger"
                                  type="button"
                                  onClick={() => disconnectAgentProvider(agentDisconnectConfirmProviderId)}
                                >
                                  {tr("Confirm disconnect", "确认断连")}
                                </button>
                              </div>
                            </section>
                          </div>
                        )}
                        {agentInlineStep !== "mode" && gameVersionMode === "normal" && (
                          <div className="sac-buddy-banner">
                            <div className="sac-buddy-banner__icon">🐾</div>
                            <div className="sac-buddy-banner__body">
                              <div className="sac-buddy-banner__title">{tr("Download Buddy", "下载 Buddy")}</div>
                              <div className="sac-buddy-banner__desc">{tr("Desktop companion that syncs your fishing status in real time.", "桌面伴侣，实时同步主界面的钓鱼状态。")}</div>
                            </div>
                            <a href="#" className="sac-buddy-banner__btn" onClick={(e) => e.preventDefault()}>{tr("Download", "下载")}</a>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <article className="settings-agent-card settings-agent-api-panel">
                          {agentApiKeys.length === 0 ? (
                            <div className="settings-agent-api-empty">
                              <Key size={30} strokeWidth={2.5} />
                              <span>{tr("No API keys yet", "暂无 API 密钥")}</span>
                              <span>{tr("Create your first API key to connect your AI agent.", "创建首个 API 密钥以连接你的 AI Agent。")}</span>
                            </div>
                          ) : (
                            <div className="settings-agent-api-list">
                              {agentApiKeys.map((item) => {
                                const isVisible = agentApiVisibleKeyIds.has(item.id);
                                const needsUpdate = item.skillVersion !== AGENT_SKILL_LATEST;
                                const displayKey = isVisible ? item.apiKey : `${item.apiKey.slice(0, 6)}${"*".repeat(16)}...`;

                                return (
                                  <section className="settings-agent-api-item" key={item.id}>
                                    <div className="settings-agent-api-row">
                                      {agentApiEditingNameId === item.id ? (
                                        <div className="settings-agent-api-name-edit">
                                          <input
                                            className="settings-input"
                                            value={agentApiEditNameValue}
                                            autoFocus
                                            onChange={(event) => setAgentApiEditNameValue(event.target.value)}
                                            onKeyDown={(event) => {
                                              if (event.key === "Enter") saveAgentApiName(item.id);
                                              if (event.key === "Escape") setAgentApiEditingNameId(null);
                                            }}
                                          />
                                          <button className="settings-action settings-action--primary" type="button" onClick={() => saveAgentApiName(item.id)}>
                                            <Check size={13} strokeWidth={3} />
                                            {tr("Save", "保存")}
                                          </button>
                                          <button className="settings-action settings-action--quiet" type="button" onClick={() => setAgentApiEditingNameId(null)}>
                                            <X size={13} strokeWidth={3} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="settings-agent-api-name">
                                          <strong>{item.name}</strong>
                                          <button
                                            className="settings-agent-icon-button"
                                            type="button"
                                            aria-label={tr(`Edit ${item.name}`, `编辑 ${item.name}`)}
                                            onClick={() => {
                                              setAgentApiEditingNameId(item.id);
                                              setAgentApiEditNameValue(item.name);
                                            }}
                                          >
                                            <Pencil size={13} strokeWidth={3} />
                                          </button>
                                        </div>
                                      )}

                                      <div className="settings-agent-api-actions">
                                        <button className={`settings-action ${needsUpdate ? "settings-action--quiet" : "settings-action--primary"}`} type="button" onClick={() => copyAgentApiPrompt(item)}>
                                          <FileText size={14} strokeWidth={3} />
                                          {needsUpdate ? tr("Copy latest prompt", "复制最新版提示词") : tr("Copy prompt", "复制提示词")}
                                        </button>
                                        <div className="settings-agent-api-menu-anchor" ref={agentApiMoreMenuId === item.id ? agentApiMoreMenuRef : undefined}>
                                          <button
                                            className="settings-agent-icon-button"
                                            type="button"
                                            aria-label={tr("More options", "更多操作")}
                                            onClick={() => setAgentApiMoreMenuId(agentApiMoreMenuId === item.id ? null : item.id)}
                                          >
                                            <MoreHorizontal size={16} strokeWidth={3} />
                                          </button>
                                          {agentApiMoreMenuId === item.id && (
                                            <div className="settings-agent-api-menu">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setAgentApiMoreMenuId(null);
                                                  setAgentApiDeleteConfirmId(item.id);
                                                }}
                                              >
                                                <Trash2 size={13} strokeWidth={3} />
                                                {tr("Delete API Key", "删除 API 密钥")}
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="settings-agent-api-keyline">
                                      <span className="settings-agent-api-label">{tr("API Key", "API 密钥")}</span>
                                      <div className="settings-agent-api-secret">
                                        <code>{displayKey}</code>
                                        <button className="settings-agent-icon-button" type="button" aria-label={isVisible ? tr("Hide API Key", "隐藏 API 密钥") : tr("Show API Key", "显示 API 密钥")} onClick={() => toggleAgentApiKeyVisibility(item.id)}>
                                          {isVisible ? <EyeOff size={13} strokeWidth={3} /> : <Eye size={13} strokeWidth={3} />}
                                        </button>
                                        <button className="settings-agent-icon-button" type="button" aria-label={tr("Copy API Key", "复制 API 密钥")} onClick={() => copyAgentText(item.apiKey, tr("API key copied", "API 密钥已复制"), tr("Store it securely in your agent environment.", "请在 Agent 环境中安全保存。"))}>
                                          <Copy size={13} strokeWidth={3} />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="settings-agent-api-meta">
                                      <span>{tr("Skill", "Skill")} <strong>{item.skillVersion}</strong></span>
                                      {needsUpdate && <span className="settings-agent-api-update">{tr(`Update available: ${AGENT_SKILL_LATEST}`, `可更新至：${AGENT_SKILL_LATEST}`)}</span>}
                                      <span>{tr("Updated", "更新于")} {item.updatedAt}</span>
                                      <button className="settings-agent-icon-button" type="button" aria-label={tr("Check for skill updates", "检查 Skill 更新")} onClick={() => refreshAgentApiSkill(item.id)}>
                                        <RefreshCw size={13} strokeWidth={3} />
                                      </button>
                                    </div>
                                  </section>
                                );
                              })}
                            </div>
                          )}

                        </article>

                        {agentApiDeleteConfirmId && (
                          <div
                            className="settings-agent-connect-overlay"
                            role="presentation"
                            onMouseDown={(event) => {
                              if (event.target === event.currentTarget) setAgentApiDeleteConfirmId(null);
                            }}
                          >
                            <section className="settings-agent-confirm-modal" role="dialog" aria-modal="true" aria-label={tr("Delete API Key", "删除 API 密钥")}>
                              <header className="settings-agent-connect-modal__header">
                                <div className="settings-agent-card__title">
                                  <strong>{tr("Delete API Key", "删除 API 密钥")}</strong>
                                </div>
                                <button className="settings-agent-connect-modal__close" type="button" aria-label={tr("Close confirmation dialog", "关闭确认弹窗")} onClick={() => setAgentApiDeleteConfirmId(null)}>
                                  <X size={18} strokeWidth={3} />
                                </button>
                              </header>
                              <p className="settings-agent-confirm-copy">
                                {tr("Are you sure you want to delete", "确认删除")}{" "}
                                <strong>{agentApiKeys.find((item) => item.id === agentApiDeleteConfirmId)?.name}</strong>?
                                {" "}
                                {tr("This action cannot be undone and any agents using this key will lose access.", "该操作不可撤销，使用该密钥的 Agent 将失去访问权限。")}
                              </p>
                              <div className="settings-agent-confirm-actions">
                                <button className="settings-action settings-action--quiet" type="button" onClick={() => setAgentApiDeleteConfirmId(null)}>
                                  {tr("Cancel", "取消")}
                                </button>
                                <button className="settings-action settings-action--danger" type="button" onClick={() => deleteAgentApiKey(agentApiDeleteConfirmId)}>
                                  {tr("Delete", "删除")}
                                </button>
                              </div>
                            </section>
                          </div>
                        )}

                        {agentApiCreateModalOpen && (
                          <div
                            className="settings-agent-connect-overlay"
                            role="presentation"
                            onMouseDown={(event) => {
                              if (event.target === event.currentTarget) {
                                if (agentApiCreateStep === 2) finishAgentApiCreate();
                                else setAgentApiCreateModalOpen(false);
                              }
                            }}
                          >
                            <section className="settings-agent-confirm-modal settings-agent-api-create-modal" role="dialog" aria-modal="true" aria-label={agentApiCreateStep === 1 ? tr("Create New API Key", "创建新的 API 密钥") : tr("Your API Key is Ready", "API 密钥已准备就绪")}>
                              <header className="settings-agent-connect-modal__header">
                                <div className="settings-agent-card__title">
                                  <strong>{agentApiCreateStep === 1 ? tr("Create New API Key", "创建新的 API 密钥") : tr("Your API Key is Ready", "API 密钥已准备就绪")}</strong>
                                </div>
                                <button
                                  className="settings-agent-connect-modal__close"
                                  type="button"
                                  aria-label={tr("Close API key dialog", "关闭 API 密钥弹窗")}
                                  onClick={() => {
                                    if (agentApiCreateStep === 2) finishAgentApiCreate();
                                    else setAgentApiCreateModalOpen(false);
                                  }}
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>
                              </header>

                              <div className="settings-agent-api-steps" aria-hidden="true">
                                <span className={`settings-agent-api-step${agentApiCreateStep >= 1 ? " is-active" : ""}`}><span>1</span>{tr("Generate API", "生成 API")}</span>
                                <span className="settings-agent-api-step-line" />
                                <span className={`settings-agent-api-step${agentApiCreateStep >= 2 ? " is-active" : ""}`}><span>2</span>{tr("Paste to Agent", "粘贴到 Agent")}</span>
                              </div>

                              {agentApiCreateStep === 1 ? (
                                <div className="settings-agent-form">
                                  <p className="settings-agent-note">{tr("Give your API key a name to identify it later.", "为 API 密钥命名，便于后续识别。")}</p>
                                  <label className="settings-field">
                                    <span>{tr("API Name", "API 名称")}</span>
                                    <input
                                      className="settings-input"
                                      value={agentApiNewName}
                                      autoFocus
                                      placeholder={tr("e.g., My Trading Bot, Research Agent...", "例如：我的交易机器人、研究 Agent...")}
                                      onChange={(event) => setAgentApiNewName(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") createAgentApiKey();
                                      }}
                                    />
                                  </label>
                                  <div className="settings-agent-actions">
                                    <button className="settings-action settings-action--primary" type="button" onClick={createAgentApiKey}>
                                      {tr("Create API Key", "创建 API 密钥")}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="settings-agent-form">
                                  <p className="settings-agent-note">{tr("Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek) to start using Quandora Trading.", "复制下方提示词并粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）即可开始使用 Quandora Trading。")}</p>
                                  <pre className="settings-agent-prompt-preview">{buildAgentSkillPrompt(agentApiCreatedSecret, AGENT_SKILL_LATEST)}</pre>
                                  <div className="settings-agent-actions">
                                    <button
                                      className="settings-action settings-action--primary"
                                      type="button"
                                      onClick={() => copyAgentText(buildAgentSkillPrompt(agentApiCreatedSecret, AGENT_SKILL_LATEST), tr("Prompt copied", "提示词已复制"), tr("Paste it into your AI agent.", "请粘贴到你的 AI Agent 中。"))}
                                    >
                                      <Copy size={14} strokeWidth={3} />
                                      {tr("Copy Prompt", "复制提示词")}
                                    </button>
                                    <button className="settings-action settings-action--quiet" type="button" onClick={finishAgentApiCreate}>
                                      {tr("Done", "完成")}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </section>
                          </div>
                        )}
	                      </>
	                    )}
	                  </div>
                </div>
              )}
            </div>

            {settingsLogoutConfirmOpen && (
              <div
                className="settings-agent-connect-overlay"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setSettingsLogoutConfirmOpen(false);
                }}
              >
                <section className="settings-confirm-modal" role="dialog" aria-modal="true" aria-label={tr("Confirm sign out", "确认退出登录")}>
                  <header className="settings-confirm-modal__header">
                    <div className="settings-confirm-modal__title">
                      <LogOut size={18} strokeWidth={3} />
                      <strong>{tr("Sign out?", "确认退出登录？")}</strong>
                    </div>
                    <button
                      className="settings-confirm-modal__close"
                      type="button"
                      aria-label={tr("Close confirmation dialog", "关闭确认弹窗")}
                      onClick={() => setSettingsLogoutConfirmOpen(false)}
                    >
                      <X size={18} strokeWidth={3} />
                    </button>
                  </header>
                  <p className="settings-confirm-modal__copy">
                    {tr(
                      "You will leave the current account session and return to the login page.",
                      "退出后将结束当前账号会话，并返回登录页。"
                    )}
                  </p>
                  <div className="settings-confirm-modal__actions">
                    <button className="settings-action settings-action--quiet" type="button" onClick={() => setSettingsLogoutConfirmOpen(false)}>
                      {tr("Cancel", "取消")}
                    </button>
                    <button className="settings-action settings-action--logout" type="button" onClick={handleConfirmLogout}>
                      {tr("Confirm sign out", "确认退出")}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      )}

      {autoCastSettingsOpen && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeAutoCastSettings();
        }}>
          <section className="auto-cast-modal" role="dialog" aria-modal="true" aria-label={tr("Auto cast settings", "自动抛竿设置")}>
            <div className="auto-cast-modal__body">
              <label className="auto-cast-field">
                <span>{tr("Total casts this run", "本次抛竿总次数")}</span>
                <div className="cast-count-control cast-count-control--modal" role="group" aria-label={tr("Set total auto casts for this run", "设置本次自动抛竿总次数")}>
                  <button
                    className="cast-count-stepper"
                    type="button"
                    aria-label={tr("Decrease auto cast count", "减少自动抛竿次数")}
                    disabled={autoCastDraftCount <= MIN_AUTO_CAST_COUNT}
                    onClick={() => updateAutoCastCount(autoCastDraftCount - 1)}
                  >
                    -
                  </button>
                  <input
                    className="cast-count-input"
                    type="number"
                    min={MIN_AUTO_CAST_COUNT}
                    max={MAX_AUTO_CAST_COUNT}
                    inputMode="numeric"
                    value={autoCastDraftCount}
                    aria-label={tr("Total auto casts this run", "本次自动抛竿总次数")}
                    onChange={(event) => updateAutoCastCount(Number(event.target.value))}
                  />
                  <button
                    className="cast-count-stepper"
                    type="button"
                    aria-label={tr("Increase auto cast count", "增加自动抛竿次数")}
                    disabled={autoCastDraftCount >= MAX_AUTO_CAST_COUNT}
                    onClick={() => updateAutoCastCount(autoCastDraftCount + 1)}
                  >
                    +
                  </button>
                </div>
              </label>
              <p className="auto-cast-modal__hint">{tr("Maximum 100 casts", "最多 100 次")}</p>
            </div>

            <footer className="auto-cast-modal__actions">
              <button className="auto-cast-modal__button auto-cast-modal__button--ghost" type="button" onClick={closeAutoCastSettings}>
                {tr("Cancel", "取消")}
              </button>
              <button className="auto-cast-modal__button auto-cast-modal__button--primary" type="button" onClick={handleStartAutoCast}>
                {tr("Start", "开始")}
              </button>
            </footer>
          </section>
        </div>
      )}

      {basketRewardModalOpen && basketItemCount > 0 && (
        <div
          className="basket-reward-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBasketRewardModal();
          }}
        >
          {basketRewardHaloVisible && (
            <div
              className="basket-reward-modal__coin-halo"
              aria-hidden="true"
              onAnimationEnd={() => setBasketRewardHaloVisible(false)}
            />
          )}
          <section
            className={basketRewardStageClass}
            role="dialog"
            aria-modal="true"
            aria-label={tr("Basket rewards", "鱼篓奖励")}
          >
            <div className="basket-reward-modal__band" aria-hidden="true">
              <img className="basket-reward-modal__background" src={basketRewardBackgroundImage} alt="" />
            </div>

            <div className="basket-reward-modal__title">
              <img src={BASKET_REWARD_ASSETS.titleStarLeft} alt="" />
              <span>{tr("Congratulations", "恭喜获得")}</span>
              <img src={BASKET_REWARD_ASSETS.titleStarRight} alt="" />
            </div>

            <div className="basket-reward-modal__cards" aria-label={tr("Reward cards", "奖励卡片")}>
              {basketRewardCards.map((rewardCard, index) => {
                const card = BASKET_REWARD_CARD_COPY[rewardCard.kind];
                return (
                  <article
                    className={`basket-reward-card basket-reward-card--${rewardCard.kind}`}
                    key={`${basketRewardModalPage}-${rewardCard.kind}-${rewardCard.image}-${index}`}
                    aria-label={`${card.tier} ${card.name}`}
                  >
                    <img className="basket-reward-card__image" src={rewardCard.image} alt="" aria-hidden="true" />
                  </article>
                );
              })}
            </div>

            <div className="basket-reward-modal__pager" aria-label={tr("Reward pages", "奖励分页")}>
              {isBasketRewardMultiPage && (
                <>
                  <button
                    className="basket-reward-modal__page basket-reward-modal__page--prev"
                    type="button"
                    aria-label={tr("Previous reward page", "上一页奖励")}
                    disabled={basketRewardModalPage === "first"}
                    onClick={() => setBasketRewardModalPage("first")}
                  >
                    <img src={BASKET_REWARD_ASSETS.pagePrev} alt="" />
                  </button>
                  <button
                    className="basket-reward-modal__page basket-reward-modal__page--next"
                    type="button"
                    aria-label={tr("Next reward page", "下一页奖励")}
                    disabled={basketRewardModalPage === "last"}
                    onClick={() => setBasketRewardModalPage("last")}
                  >
                    <img src={BASKET_REWARD_ASSETS.pageNext} alt="" />
                  </button>
                </>
              )}
            </div>

            <footer className="basket-reward-modal__actions">
              <button
                className="basket-reward-modal__action basket-reward-modal__action--accept"
                type="button"
                aria-label={tr("Collect", "收下")}
                onClick={closeBasketRewardModal}
              >
                {tr("Collect", "收下")}
              </button>
            </footer>
          </section>
        </div>
      )}

      {leaderboardPageTransition.shouldRender && (
        <div className="shop-modal-backdrop leaderboard-modal-backdrop mobile-page-shell" data-mobile-page-transition={leaderboardPageTransition.phase} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLeaderboardOpen(false);
        }}>
          <section className="shop-modal leaderboard-modal mobile-page-surface" role="dialog" aria-modal="true" aria-label={tr("Leaderboard", "排行榜")}>
            <header className="shop-modal__header">
              <div className="leaderboard-modal__heading">
                <div className="leaderboard-tabs" role="tablist" aria-label={tr("Leaderboard period", "排行榜周期")}>
                  {(["week", "month"] as const).map((period) => (
                    <button
                      key={period}
                      className={`leaderboard-tab${leaderboardPeriod === period ? " is-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={leaderboardPeriod === period}
                      onClick={() => setLeaderboardPeriod(period)}
                    >
                      {period === "week" ? tr("Weekly", "周榜") : tr("Monthly", "月榜")}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="shop-modal__close"
                type="button"
                aria-label={tr("Close leaderboard", "关闭排行榜")}
                onClick={() => setLeaderboardOpen(false)}
              >
                <X size={22} strokeWidth={3} />
              </button>
            </header>

            <div className={`leaderboard-panel leaderboard-panel--${leaderboardPeriod}`}>
              <div className="leaderboard-figma-content">
                <section className="leaderboard-list" aria-label={tr("Leaderboard list", "排行榜列表")}>
                  <div className="leaderboard-list-row leaderboard-list-row--head">
                    <span>{tr("Rank", "排名")}</span>
                    <span>{tr("Nickname", "用户")}</span>
                    <span className="leaderboard-list__balance">{leaderboardBalanceLabel}</span>
                    <span className="leaderboard-list__casts leaderboard-list__casts--desktop">{leaderboardCastsLabel}</span>
                  </div>
                  <div
                    className={`leaderboard-list__scroll${leaderboardScrolling ? " is-scrolling" : ""}`}
                    onScroll={handleLeaderboardScroll}
                  >
                    {leaderboardListRows.map((row) => {
                      const rankIcon = getLeaderboardRankIcon(row.rank);
                      return (
                        <div
                          className={`leaderboard-list-row leaderboard-list-row--rank-${Math.min(row.rank, 4)}${row.id === CURRENT_LEADERBOARD_USER_ID ? " is-current" : ""}`}
                          key={row.id}
                        >
                          <span className="leaderboard-list__rank">
                            {rankIcon ? (
                              <img className="leaderboard-rank-icon" src={rankIcon} alt={`NO.${row.rank}`} />
                            ) : (
                              `NO.${row.rank}`
                            )}
                          </span>
                          <span className="leaderboard-list__name">
                            <span className="leaderboard-list__name-text">{row.nickname}</span>
                            <span className="leaderboard-list__mobile-casts">{leaderboardCastsLabel} {row.casts}</span>
                          </span>
                          <span className="leaderboard-list__metric">
                            <img className="leaderboard-balance__icon" src={RANKING_MODAL_ASSETS.coin} alt="" />
                            <span>{formatLeaderboardBalance(row.balance)}</span>
                          </span>
                          <span className="leaderboard-list__casts leaderboard-list__casts--desktop">{row.casts}</span>
                        </div>
                      );
                    })}
                  </div>
                  {currentLeaderboardRow && (
                    <div className={`leaderboard-list-row leaderboard-current-row--sticky leaderboard-list-row--rank-${currentLeaderboardInVisibleList ? Math.min(currentLeaderboardRow.rank, 4) : 4}${currentLeaderboardInVisibleList ? "" : " is-unranked"}`}>
                      <span className="leaderboard-list__rank">
                        {currentLeaderboardInVisibleList && getLeaderboardRankIcon(currentLeaderboardRow.rank) ? (
                          <img className="leaderboard-rank-icon" src={getLeaderboardRankIcon(currentLeaderboardRow.rank) ?? ""} alt={`NO.${currentLeaderboardRow.rank}`} />
                        ) : currentLeaderboardInVisibleList ? (
                          `NO.${currentLeaderboardRow.rank}`
                        ) : (
                          tr("Unranked", "未上榜")
                        )}
                      </span>
                      <span className="leaderboard-list__name">
                        <span className="leaderboard-list__name-text">{currentLeaderboardRow.nickname}</span>
                        <span className="leaderboard-list__mobile-casts">{leaderboardCastsLabel} {currentLeaderboardRow.casts}</span>
                      </span>
                      <span className="leaderboard-list__metric">
                        <img className="leaderboard-balance__icon" src={RANKING_MODAL_ASSETS.coin} alt="" />
                        <span>{formatLeaderboardBalance(currentLeaderboardRow.balance)}</span>
                      </span>
                      <span className="leaderboard-list__casts leaderboard-list__casts--desktop">{currentLeaderboardRow.casts}</span>
                    </div>
                  )}
                </section>

                <aside className="leaderboard-hero-art" aria-hidden="true">
                  <img
                    src={leaderboardPeriod === "week" ? RANKING_MODAL_ASSETS.mascotWeek : RANKING_MODAL_ASSETS.mascotMonth}
                    alt=""
                  />
                </aside>
                <p className="leaderboard-refresh-note">
                  {leaderboardPeriod === "week"
                    ? tr("Updates Mon 00:00", "每周一 0点 刷新")
                    : tr("Updates 1st 00:00", "每月1日 0点 刷新")}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {inventoryPageTransition.shouldRender && (
        <div
          className="shop-modal-backdrop inventory-modal-backdrop mobile-page-shell"
          data-mobile-page-transition={inventoryPageTransition.phase}
          role="presentation"
          onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeInventoryModal();
          }
        }}
        >
          {activeInventoryFactor && !isMobileViewport() ? (
            <section className="shop-modal inventory-modal inventory-detail-modal mobile-page-surface" role="dialog" aria-modal="true" aria-labelledby="inventory-detail-title">
              <header className="shop-modal__header">
                <div className="inventory-detail-heading">
                  <button
                    className="inventory-detail-back"
                    type="button"
                    aria-label={tr("Back to inventory", "返回图鉴")}
                    onClick={closeInventoryFactorDetail}
                  >
                    <ArrowLeft size={20} strokeWidth={3} />
                  </button>
                  <div className="inventory-detail-title-wrap">
                    <h2 className="shop-modal__title" id="inventory-detail-title">{activeInventoryFactor.name}</h2>
                    <div className="inventory-detail-subtitle">
                      NO. {inventoryFactorNoById.get(activeInventoryFactor.id) ?? 1}｜{tr("Created", "创建于")} {activeInventoryFactor.createdAt}｜{activeInventoryFactor.agentSource ?? "Codex"}
                    </div>
                  </div>
                </div>
                <button
                  className="shop-modal__close"
                  type="button"
                  aria-label={tr("Close factor detail", "关闭图鉴详情")}
                  onClick={closeInventoryModal}
                >
                  <X size={22} strokeWidth={3} />
                </button>
              </header>

              <div className="inventory-detail-content">
                <div className="inventory-factor-detail">
                  <AlphaViewModeProvider>
                    <AlphaDetail
                      embedded
                      hideHeader
                      factorIdOverride={activeInventoryFactor.id}
                      factorOverride={activeInventoryFactor}
                    />
                  </AlphaViewModeProvider>
                </div>
              </div>
            </section>
          ) : (
          <section
            className={`shop-modal inventory-modal mobile-page-surface${inventoryControlsHidden ? " inventory-modal--controls-hidden" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
          >
            <header className="shop-modal__header">
              <button
                className="shop-modal__close"
                type="button"
                aria-label={tr("Close inventory", "关闭图鉴")}
                onClick={closeInventoryModal}
              >
                <X size={22} strokeWidth={3} />
              </button>
              <div className="inventory-title-wrap">
                <h2 className="shop-modal__title" id="inventory-modal-title">{tr("Inventory", "图鉴")}</h2>
              </div>
              <button
                className="inventory-filter-toggle"
                type="button"
                aria-label={inventoryControlsHidden ? tr("Show search and filters", "显示搜索和筛选") : tr("Hide search and filters", "隐藏搜索和筛选")}
                aria-controls="inventory-search-filters"
                aria-expanded={!inventoryControlsHidden}
                onClick={() => setInventoryControlsHidden((hidden) => !hidden)}
              >
                <span>{tr("Search / Filter", "搜索/筛选")}</span>
              </button>
            </header>

            <div className="shop-modal__toolbar" id="inventory-search-filters">
              <label className="shop-search">
                <Search aria-hidden="true" />
                <input
                  className="shop-input"
                  value={factorQuery}
                  onChange={(event) => setFactorQuery(event.target.value)}
                  placeholder={tr("Search by name, ID, expression...", "按名称、ID、表达式搜索...")}
                />
              </label>

              <div className="shop-controls">
                <div className="shop-select-aisland" aria-label={tr("Factor filter", "因子筛选")}>
                  <Select
                    value={factorFilter}
                    onChange={(key) => setFactorFilter(key as FactorFilterKey)}
                    options={factorFilterSelectOptions}
                    placeholder={tr("Choose filter", "选择筛选")}
                  />
                </div>
                <div className="shop-select-aisland shop-select-aisland--sort" aria-label={tr("Factor sort", "因子排序")}>
                  <div
                    className={`sort-direction-select${factorSortOpen ? " is-open" : ""}`}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFactorSortOpen(false);
                    }}
                  >
                    <button
                      className="sort-direction-select__trigger"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={factorSortOpen}
                      onClick={() => setFactorSortOpen((open) => !open)}
                    >
                      <span>{tr("Sort", "排序")}</span>
                      <span className="sort-direction-select__chevron" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    {factorSortOpen && (
                      <div className="sort-direction-select__menu" role="listbox" aria-label={tr("Factor sort", "因子排序")}>
                        {factorSortKeys.map((key) => {
                          const optionDir = factorSortKey === key && factorSortDir === "asc" ? "asc" : "desc";
                          return (
                            <button
                              className={`sort-direction-select__option${factorSortKey === key ? " is-active" : ""}`}
                              type="button"
                              role="option"
                              aria-selected={factorSortKey === key}
                              key={key}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleFactorSortChange(key)}
                            >
                              <span>{factorSortLabels[key]}</span>
                              <span className="sort-direction-select__direction">
                                {optionDir === "asc" ? tr("Ascending", "升序") : tr("Descending", "降序")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {shouldShowInventoryGradeFilter && (
              <div className="inventory-grade-filter" aria-label={tr("Grade filter", "等级筛选")}>
                {inventoryGradeFilterOptions.map((grade) => (
                  <button
                    className={`inventory-grade-filter__chip inventory-grade-filter__chip--${grade}${inventoryGradeFilter === grade ? " is-active" : ""}`}
                    type="button"
                    key={grade}
                    aria-pressed={inventoryGradeFilter === grade}
                    onClick={() => setInventoryGradeFilter(grade)}
                  >
                    {grade === "all"
                      ? tr("All", "全部")
                      : grade === "misc"
                        ? tr("Misc", "杂物")
                        : grade}
                  </button>
                ))}
              </div>
            )}

            <div className="inventory-grid" ref={inventoryGridRef} onScroll={handleInventoryGridScroll}>
              {displayedInventoryFactors.map((factor) => {
                const isStarred = starredFactors.has(factor.id);
                const returns = parseMetricValue(factor.returns);
                const visualGrade = getInventoryVisualGrade(factor);
                const cardClassName = `inventory-card inventory-card--${visualGrade}`;
                const menuId = `factor-${factor.id}`;
                const inventoryNo = inventoryFactorNoById.get(factor.id) ?? 1;
                const cardBody = (
                  <>
                    <header className="inv-head">
                      <span className="inv-no">NO.{inventoryNo}</span>
                      <div className={`inv-medal inv-medal--${visualGrade}`}>
                        {visualGrade}
                      </div>
                    </header>

                    <div className="inv-art" aria-hidden="true">
                      <div className="inv-art__rays" />
                      <span className="inv-art__star inv-art__star--1" />
                      <span className="inv-art__star inv-art__star--2" />
                      <span className="inv-art__star inv-art__star--3" />
                      <span className="inv-art__star inv-art__star--4" />
                      <span className="inv-art__star inv-art__star--5" />
                      <span className="inv-art__star inv-art__star--6" />
                      <img className="inv-art__img" src="/assets/pixel-whale-avatar.png" alt="" />
                      <span className="inv-art__tag">{tr("Sunfish", "翻车鱼")}</span>
                    </div>

                    <div className="inv-stats">
                      <div className="inv-stat">
                        <span className="inv-stat__label">{tr("Sharpe", "Sharpe")}</span>
                        <span className="inv-stat__value">{factor.sharpe.toFixed(2)}</span>
                      </div>
                      <div className="inv-stat">
                        <span className="inv-stat__label">{tr("ROI", "ROI")}</span>
                        <span className={`inv-stat__value inv-stat__value--${returns >= 0 ? "pos" : "neg"}`}>{returns >= 0 ? "+" : ""}{factor.returns}</span>
                      </div>
                    </div>

                    <div className="inv-actions">
                      <div className="inv-more-wrap">
                        <button
                          className="inv-btn inv-btn--ghost"
                          type="button"
                          aria-label={tr("More actions", "更多操作")}
                          aria-haspopup="menu"
                          aria-expanded={openInventoryMenuId === menuId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenInventoryMenuId((current) => (current === menuId ? null : menuId));
                          }}
                        >
                          <MoreHorizontal size={20} strokeWidth={3} />
                        </button>
                        {openInventoryMenuId === menuId && (
                          <div className="inv-more-menu" role="menu">
                            <button
                              className="inv-more-menu__item"
                              type="button"
                              role="menuitem"
                              onClick={() => handleRequestInventoryDelete({
                                kind: "factor",
                                id: factor.id,
                                label: `${tr("Factor", "因子")} NO.${inventoryNo} ${factor.name}`,
                              })}
                            >
                              {tr("Delete", "删除")}
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        className={`inv-btn inv-btn--ghost inv-btn--star${isStarred ? " is-on" : ""}`}
                        type="button"
                        aria-pressed={isStarred}
                        aria-label={isStarred ? tr("Unfavorite factor", "取消收藏因子") : tr("Favorite factor", "收藏因子")}
                        onClick={() => toggleFactorStar(factor.id)}
                      >
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                          <path d="M12 3 14.5 9 21 9.5 16 14 17.5 20.5 12 17 6.5 20.5 8 14 3 9.5 9.5 9z"
                                fill={isStarred ? "#f6c63a" : "none"} stroke="#1d0f06" strokeWidth="1.6" strokeLinejoin="round" />
                        </svg>
                      </button>
	                      <button
	                        className="inv-btn inv-btn--cta"
	                        type="button"
	                        onClick={() => openInventoryFactorDetail(factor)}
	                      >
                        {tr("View", "查看")}
                      </button>
                    </div>
                  </>
                );

                return visualGrade === "SSS" || visualGrade === "SS" ? (
                  <BorderGlow
                    as="article"
                    className={`${cardClassName} inventory-card--laser`}
                    key={factor.id}
                    edgeSensitivity={visualGrade === "SSS" ? 14 : 18}
                    glowColor={visualGrade === "SSS" ? "44 100 72" : "49 95 78"}
                    backgroundColor="var(--tier-bg)"
                    borderRadius={8}
                    glowRadius={visualGrade === "SSS" ? 32 : 24}
                    glowIntensity={visualGrade === "SSS" ? 0.88 : 0.58}
                    coneSpread={visualGrade === "SSS" ? 11 : 15}
                    animated
                    animationDurationMs={3500}
                    colors={visualGrade === "SSS" ? ["#ffd66f", "#ffffff", "#ffd66f"] : ["#ffe794", "#ffffff", "#f4d36c"]}
                    fillOpacity={visualGrade === "SSS" ? 0.4 : 0.28}
                    holographic
                    onMouseMove={handleInventoryCardMove}
                    onMouseLeave={handleInventoryCardLeave}
                  >
                    {cardBody}
                  </BorderGlow>
                ) : (
                  <article
                    className={cardClassName}
                    key={factor.id}
                    onMouseMove={handleInventoryCardMove}
                    onMouseLeave={handleInventoryCardLeave}
                  >
                    {cardBody}
                  </article>
                );
              })}

              {displayedInventorySpecialCards.map((item) => {
                const cardClassName = `inventory-card inventory-card--${item.type}`;
                const menuId = `item-${item.id}`;
                const inventoryNo = inventorySpecialNoById.get(item.id) ?? factorRows.length + 1;
                const isStarred = starredInventoryItems.has(item.id);
                const favoriteItemLabel = item.type === "prop"
                  ? {
                      favorite: tr("Favorite item", "收藏道具"),
                      unfavorite: tr("Unfavorite item", "取消收藏道具"),
                    }
                  : {
                      favorite: tr("Favorite misc item", "收藏杂物"),
                      unfavorite: tr("Unfavorite misc item", "取消收藏杂物"),
                    };
                return (
                  <article
                    className={cardClassName}
                    key={item.id}
                    onMouseMove={handleInventoryCardMove}
                    onMouseLeave={handleInventoryCardLeave}
                  >
                    <header className="inv-head">
                      <span className="inv-no">NO.{inventoryNo}</span>
                      <div className="inv-medal" aria-hidden="true">
                        {item.type === "prop" ? tr("Prop", "道具") : tr("Misc", "杂物")}
                      </div>
                    </header>

                    <div className={`inv-art inv-item-art inv-item-art--${item.type}`} aria-hidden="true">
                      <div className="inv-art__rays" />
                      <span className="inv-art__star inv-art__star--1" />
                      <span className="inv-art__star inv-art__star--2" />
                      <span className="inv-art__star inv-art__star--3" />
                      <span className="inv-art__star inv-art__star--4" />
                      <span className="inv-art__star inv-art__star--5" />
                      <span className="inv-art__star inv-art__star--6" />
                      {item.imageSrc ? (
                        <img className="inv-item-art__image" src={item.imageSrc} alt="" />
                      ) : (
                        <div className="inv-item-art__glyph" />
                      )}
                      <span className="inv-art__tag">{tr(item.tagEn, item.tagZh)}</span>
                    </div>

                    <div className={`inv-stats${item.statsLayout === "inline" ? " inv-stats--inline" : ""}`}>
                      {item.statsLayout === "inline" ? (
                        <div className="inv-stat inv-stat--inline">
                          <span className="inv-stat__label">{tr(item.metricOneLabelEn, item.metricOneLabel)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="inv-stat">
                            <span className="inv-stat__label">{tr(item.metricOneLabelEn, item.metricOneLabel)}</span>
                            <span className="inv-stat__value">{tr(item.metricOneValueEn ?? item.metricOneValue, item.metricOneValue)}</span>
                          </div>
                          <div className="inv-stat">
                            <span className="inv-stat__label">{tr(item.metricTwoLabelEn ?? item.metricTwoLabel, item.metricTwoLabel)}</span>
                            <span className="inv-stat__value">{tr(item.metricTwoValueEn ?? item.metricTwoValue, item.metricTwoValue)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="inv-actions">
                      <div className="inv-more-wrap">
                        <button
                          className="inv-btn inv-btn--ghost"
                          type="button"
                          aria-label={tr("More actions", "更多操作")}
                          aria-haspopup="menu"
                          aria-expanded={openInventoryMenuId === menuId}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenInventoryMenuId((current) => (current === menuId ? null : menuId));
                          }}
                        >
                          <MoreHorizontal size={20} strokeWidth={3} />
                        </button>
                        {openInventoryMenuId === menuId && (
                          <div className="inv-more-menu" role="menu">
                            <button
                              className="inv-more-menu__item"
                              type="button"
                              role="menuitem"
                              onClick={() => handleRequestInventoryDelete({
                                kind: "item",
                                id: item.id,
                                label: `${tr(item.type === "prop" ? "Item" : "Misc item", item.type === "prop" ? "道具" : "杂物")} NO.${inventoryNo} ${tr(item.tagEn, item.tagZh)}`,
                              })}
                            >
                              {tr("Delete", "删除")}
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        className={`inv-btn inv-btn--ghost inv-btn--star${isStarred ? " is-on" : ""}`}
                        type="button"
                        aria-pressed={isStarred}
                        aria-label={isStarred ? favoriteItemLabel.unfavorite : favoriteItemLabel.favorite}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleInventoryItemStar(item.id);
                        }}
                      >
                        <Star size={18} strokeWidth={2.5} fill={isStarred ? "#f6c63a" : "none"} />
                      </button>
                    </div>
                  </article>
                );
              })}

              {displayedInventoryFactors.length === 0 && displayedInventorySpecialCards.length === 0 && (
                <div className="shop-empty inventory-empty">
                  <img className="inventory-empty__icon" src="/assets/wallet-empty-state.svg" alt="" aria-hidden="true" />
                  <span>{tr("Empty", "空空如也")}</span>
                </div>
              )}
            </div>
          </section>
          )}
          {isMobileViewport() && visibleInventoryDetailFactor && (
            <section
              className="inventory-detail-mobile-layer"
              data-mobile-detail-transition={inventoryDetailPageTransition.phase}
              aria-hidden={!inventoryDetailPageTransition.shouldRender}
            >
              <section className="shop-modal inventory-modal inventory-detail-modal inventory-detail-mobile-page" role="dialog" aria-modal="true" aria-labelledby="inventory-detail-title">
                <header className="shop-modal__header">
                  <div className="inventory-detail-heading">
                    <button
                      className="inventory-detail-back"
                      type="button"
                      aria-label={tr("Back to inventory", "返回图鉴")}
                      onClick={closeInventoryFactorDetail}
                    >
                      <ArrowLeft size={20} strokeWidth={3} />
                    </button>
                    <div className="inventory-detail-title-wrap">
                      <h2 className="shop-modal__title" id="inventory-detail-title">{visibleInventoryDetailFactor.name}</h2>
                      <div className="inventory-detail-subtitle">
                        NO. {inventoryFactorNoById.get(visibleInventoryDetailFactor.id) ?? 1}｜{tr("Created", "创建于")} {visibleInventoryDetailFactor.createdAt}｜{visibleInventoryDetailFactor.agentSource ?? "Codex"}
                      </div>
                    </div>
                  </div>
                  <button
                    className="shop-modal__close"
                    type="button"
                    aria-label={tr("Close factor detail", "关闭图鉴详情")}
                    onClick={closeInventoryModal}
                  >
                    <X size={22} strokeWidth={3} />
                  </button>
                </header>

                <div className="inventory-detail-content">
                  <div className="inventory-factor-detail">
                    <AlphaViewModeProvider>
                      <AlphaDetail
                        embedded
                        hideHeader
                        factorIdOverride={visibleInventoryDetailFactor.id}
                        factorOverride={visibleInventoryDetailFactor}
                      />
                    </AlphaViewModeProvider>
                  </div>
                </div>
              </section>
            </section>
          )}
        </div>
      )}

      {pendingInventoryDelete && (
        <div
          className="shop-modal-backdrop inventory-modal-backdrop"
          role="presentation"
          style={{ zIndex: 70 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingInventoryDelete(null);
          }}
        >
          <section className="shop-modal delete-confirm-modal" role="dialog" aria-modal="true" aria-label={tr("Delete confirmation", "删除确认")}>
            <div className="delete-confirm-modal__body">
              <p className="delete-confirm-modal__text">
                {tr(
                  "This item will be deleted permanently. Please confirm if you want to continue.",
                  "删除后不可恢复，请确认是否继续。"
                )}
              </p>
              <div className="delete-confirm-modal__target">
                {pendingInventoryDelete.label}
              </div>
              <div className="delete-confirm-modal__actions">
                <button
                  className="delete-confirm-modal__btn"
                  type="button"
                  onClick={() => setPendingInventoryDelete(null)}
                >
                  {tr("Cancel", "取消")}
                </button>
                <button
                  className="delete-confirm-modal__btn delete-confirm-modal__btn--danger"
                  type="button"
                  onClick={handleConfirmInventoryDelete}
                >
                  {tr("Delete", "删除")}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {shopOpen && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShopOpen(false);
        }}>
          <section className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="shop-modal-title">
            <header className="shop-modal__header">
              <div>
                <h2 className="shop-modal__title" id="shop-modal-title">{tr("Shop", "商店")}</h2>
              </div>
              <button className="shop-modal__close" type="button" aria-label={tr("Close shop", "关闭商店")} onClick={() => setShopOpen(false)}>
                <X size={22} strokeWidth={3} />
              </button>
            </header>

            <div className="shop-modal__toolbar">
              <label className="shop-search">
                <Search aria-hidden="true" />
                <input
                  className="shop-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
                />
              </label>

              <div className="shop-controls">
                <div className="shop-select-aisland" aria-label={tr("Category filter", "分类筛选")}>
                  <Select
                    value={filter}
                    onChange={(key) => setFilter(key as FilterKey)}
                    options={filterSelectOptions}
                    placeholder={tr("Choose category", "选择分类")}
                  />
                </div>
                <div className="shop-select-aisland shop-select-aisland--sort" aria-label={tr("Sort", "排序")}>
                  <div
                    className={`sort-direction-select${strategySortOpen ? " is-open" : ""}`}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setStrategySortOpen(false);
                    }}
                  >
                    <button
                      className="sort-direction-select__trigger"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={strategySortOpen}
                      onClick={() => setStrategySortOpen((open) => !open)}
                    >
                      <span>{tr("Sort", "排序")}</span>
                      <span className="sort-direction-select__chevron" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    {strategySortOpen && (
                      <div className="sort-direction-select__menu" role="listbox" aria-label={tr("Sort", "排序")}>
                        {strategySortKeys.map((key) => {
                          const optionDir = sortKey === key && sortDir === "asc" ? "asc" : "desc";
                          return (
                            <button
                              className={`sort-direction-select__option${sortKey === key ? " is-active" : ""}`}
                              type="button"
                              role="option"
                              aria-selected={sortKey === key}
                              key={key}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleStrategySortChange(key)}
                            >
                              <span>{sortLabels[key]}</span>
                              <span className="sort-direction-select__direction">
                                {optionDir === "asc" ? tr("Ascending", "升序") : tr("Descending", "降序")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="shop-grid">
              {filteredStrategies.map((strategy) => {
                const tier = getStrategyTier(strategy);
                const isStarred = starredStrategies.has(strategy.id);
                const roi = parseMetricValue(strategy.annualReturn);
                const drawdown = parseMetricValue(strategy.maxDrawdown);

                return (
                  <article
                    className="shop-card"
                    key={strategy.id}
                    role="button"
                    tabIndex={0}
                    aria-label={tr(`Open strategy detail for ${strategy.name}`, `查看策略详情：${strategy.name}`)}
                    onClick={() => openStrategyDetail(strategy)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStrategyDetail(strategy);
                      }
                    }}
                  >
                    <div className="shop-card__body">
                      <div className="shop-card__title-row">
                        <h3 className="shop-card__title">{strategy.name}</h3>
                      </div>
                      <div className="shop-card__meta">
                        <span className="shop-badge">{strategy.updatedAt}</span>
                        <span className="shop-badge">ID {strategy.id}</span>
                        <span className="shop-badge"><Users size={14} />{uiLang === "zh" ? `已使用${strategy.subscribers ?? 0}次` : `Used ${strategy.subscribers ?? 0} times`}</span>
                      </div>
                      <p className="shop-card__desc">{translateDescription(strategy)}</p>

                      <div className="shop-curve">
                        <div className="shop-curve__label">{tr("Asset Curve", "资产曲线")}</div>
                        <svg viewBox="0 0 240 48" aria-hidden="true">
                          <path d="M4 38 C 34 30, 42 42, 66 28 S 104 20, 130 24 S 166 36, 196 17 S 221 15, 236 10" fill="none" stroke={roi >= 0 ? "#0b9f73" : "#d85d48"} strokeWidth="5" strokeLinecap="round" />
                          <path d="M4 38 C 34 30, 42 42, 66 28 S 104 20, 130 24 S 166 36, 196 17 S 221 15, 236 10 L236 48 L4 48 Z" fill={roi >= 0 ? "rgba(25,200,185,.18)" : "rgba(216,93,72,.16)"} />
                        </svg>
                      </div>

                      <div className="shop-metrics">
                        <div className="shop-metric">
                          <div className="shop-metric__label">ROI</div>
                          <div className={`shop-metric__value ${roi < 0 ? "shop-metric__value--down" : "shop-metric__value--up"}`}>{strategy.annualReturn}</div>
                        </div>
                        <div className="shop-metric">
                          <div className="shop-metric__label">{tr("Win Rate", "胜率")}</div>
                          <div className="shop-metric__value">{strategy.winRate}</div>
                        </div>
                        <div className="shop-metric">
                          <div className="shop-metric__label">{tr("Sharpe", "夏普")}</div>
                          <div className="shop-metric__value">{strategy.sharpe.toFixed(2)}</div>
                        </div>
                        <div className="shop-metric">
                          <div className="shop-metric__label">{tr("Max DD", "最大回撤")}</div>
                          <div className={`shop-metric__value ${drawdown === 0 ? "" : "shop-metric__value--down"}`}>{strategy.maxDrawdown}</div>
                        </div>
                      </div>
                    </div>

                    <div className="shop-card__actions">
                      <button
                        className={`shop-card__icon-btn${isStarred ? " is-starred" : ""}`}
                        type="button"
                        aria-pressed={isStarred}
                        aria-label={isStarred ? tr("Unfavorite strategy", "取消收藏策略") : tr("Favorite strategy", "收藏策略")}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStar(strategy.id);
                        }}
                      >
                        <Star size={15} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                      <Link
                        className="shop-card__action"
                        href={`/strategies/new?template=${strategy.id}&creationMode=platform&scale=single&inputMethod=form`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tr("Copy", "复制")}
                      </Link>
                      <Link
                        className="shop-card__action shop-card__action--primary"
                        href={`/strategies/${strategy.id}?source=official&tier=${tier}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tr("View", "查看")} <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {filteredStrategies.length === 0 && (
                <div className="shop-empty">{tr("No strategies match your filters.", "没有符合当前筛选条件的策略。")}</div>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedStrategy && detailModel && (
        <div className="strategy-detail-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedStrategy(null);
        }}>
          <section className="strategy-detail-modal" role="dialog" aria-modal="true" aria-labelledby="strategy-detail-title">
            <header className="strategy-detail__header">
              <button className="strategy-detail__back" type="button" aria-label={tr("Back to shop", "返回商店")} onClick={() => setSelectedStrategy(null)}>
                <ArrowLeft size={20} strokeWidth={3} />
              </button>

              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <h2 className="strategy-detail__title" id="strategy-detail-title">{selectedStrategy.name}</h2>
                <div className="strategy-detail__meta">
                  <span className="shop-badge">ID {selectedStrategy.id}</span>
                  <span className="shop-badge">{selectedStrategy.updatedAt}</span>
                  <span className="shop-badge"><Users size={14} />{uiLang === "zh" ? `已使用${selectedStrategy.subscribers ?? 0}次` : `Used ${selectedStrategy.subscribers ?? 0} times`}</span>
                  <span className="shop-badge shop-badge--primary">
                    {getStrategyTier(selectedStrategy) === "official" ? tr("Official", "官方") : tr("Graduated", "三方")}
                  </span>
                </div>
              </div>

              <div className="strategy-detail__actions">
                <button
                  className={`strategy-detail__button${starredStrategies.has(selectedStrategy.id) ? " strategy-detail__button--primary" : ""}`}
                  type="button"
                  aria-pressed={starredStrategies.has(selectedStrategy.id)}
                  onClick={() => toggleStar(selectedStrategy.id)}
                >
                  <Star size={15} fill={starredStrategies.has(selectedStrategy.id) ? "currentColor" : "none"} />
                  {starredStrategies.has(selectedStrategy.id) ? tr("Favorited", "已收藏") : tr("Favorite", "收藏")}
                </button>
                <Link className="strategy-detail__button strategy-detail__button--primary" href={`/strategies/new?template=${selectedStrategy.id}&creationMode=platform&scale=single&inputMethod=form`}>
                  <ClipboardList size={15} />
                  {tr("Copy", "复制")}
                </Link>
                <button className="strategy-detail__close" type="button" aria-label={tr("Close detail", "关闭详情")} onClick={() => setSelectedStrategy(null)}>
                  <X size={21} strokeWidth={3} />
                </button>
              </div>
            </header>

            <div className="strategy-detail__content">
              <div className="detail-metric-grid">
                {[
                  [tr("Total Equity", "总权益"), `${detailModel.currentEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`, ""],
                  [tr("PnL", "盈亏"), `${fmtSigned(detailModel.totalReturn)} USDT`, detailModel.totalReturn >= 0 ? "detail-value--up" : "detail-value--down"],
                  ["ROI", selectedStrategy.annualReturn, detailModel.roi >= 0 ? "detail-value--up" : "detail-value--down"],
                  [tr("Win Rate", "胜率"), selectedStrategy.winRate, ""],
                [tr("Sharpe", "夏普"), selectedStrategy.sharpe.toFixed(2), ""],
                [tr("Max Drawdown", "最大回撤"), selectedStrategy.maxDrawdown, "detail-value--down"],
              ].map(([label, value, tone]) => (
                <div className="detail-metric-card" key={label}>
                  <div className="detail-metric-card__border" aria-hidden="true" />
                  <div className="detail-metric-card__content">
                    <div className="detail-label">{label}</div>
                    <div className={`detail-value ${tone}`}>{value}</div>
                  </div>
                </div>
              ))}
              </div>

              <div className="detail-panel-grid">
                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><Wallet size={16} />{tr("Fund Statistics", "资金统计")}</span>
                  </div>
                  {detailModel.fundRows.map(([label, value]) => (
                    <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><TrendingUp size={16} />{tr("Performance", "表现指标")}</span>
                  </div>
                  {detailModel.perfRows.map(([label, value]) => (
                    <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><BarChart3 size={16} />{tr("Trading Stats", "交易统计")}</span>
                  </div>
                  {detailModel.tradeRows.map(([label, value]) => (
                    <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </section>

                <section className="detail-panel detail-panel--wide">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><TrendingUp size={16} />{tr("Asset Curve", "资产曲线")}</span>
                    <div className="strategy-detail__ranges" aria-label={tr("Curve range", "曲线区间")}>
                      {curveRanges.map((range) => (
                        <button
                          className={`strategy-detail__range${curveRange === range ? " is-active" : ""}`}
                          type="button"
                          key={range}
                          onClick={() => setCurveRange(range)}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                  <svg className="detail-chart" viewBox="0 0 640 230" aria-label={tr("Strategy asset curve", "策略资产曲线")}>
                    <defs>
                      <linearGradient id="strategyCurveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#19c8b9" stopOpacity=".26" />
                        <stop offset="100%" stopColor="#19c8b9" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M16 30 H624 M16 80 H624 M16 130 H624 M16 180 H624" stroke="rgba(196,184,158,.42)" strokeWidth="1.5" strokeDasharray="7 7" />
                    <path d={`${detailModel.equityPath} L624 214 L16 214 Z`} fill="url(#strategyCurveFill)" />
                    <path d={detailModel.benchmarkPath} fill="none" stroke="#d69b48" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 9" />
                    <path d={detailModel.equityPath} fill="none" stroke="#19c8b9" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><PieChart size={16} />{tr("Position Preference", "持仓偏好")}</span>
                  </div>
                  <div className="detail-preferences">
                    {[
                      ["BTC", "42%"],
                      ["ETH", "28%"],
                      [selectedStrategy.market === "DEX" ? "DeFi" : "ALT", "18%"],
                      [tr("Other", "其他"), "12%"],
                    ].map(([label, value]) => (
                      <div className="detail-pref-row" key={label}>
                        <span>{label}</span>
                        <div className="detail-pref-bar"><span style={{ width: value }} /></div>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="detail-panel detail-panel--wide">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><ClipboardList size={16} />{tr("Strategy Configuration", "策略配置")}</span>
                  </div>
                  <div className="detail-config">
                    {detailModel.configRows.map(([label, value]) => (
                      <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                    ))}
                  </div>
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><Wallet size={16} />{tr("Position History", "持仓历史")}</span>
                  </div>
                  <table className="detail-position-table">
                    <thead>
                      <tr>
                        <th>{tr("Asset", "资产")}</th>
                        <th>{tr("Side", "方向")}</th>
                        <th>{tr("Weight", "权重")}</th>
                        <th>{tr("PnL", "盈亏")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["BTCUSDT", tr("Long", "做多"), "42%", "+12.46%"],
                        ["ETHUSDT", tr("Long", "做多"), "28%", "+8.13%"],
                        [selectedStrategy.market === "DEX" ? "UNIUSDT" : "SOLUSDT", tr("Long", "做多"), "18%", "+5.92%"],
                        ["USDT", tr("Cash", "现金"), "12%", "0.00%"],
                      ].map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell) => <td key={cell}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          </section>
        </div>
      )}

      {inventoryToast && (
        <div
          key={inventoryToast.id}
          className="inventory-toast"
          role="status"
          aria-live="polite"
        >
          <span className="inventory-toast__icon" aria-hidden="true">✓</span>
          <div>
            <p className="inventory-toast__title">{inventoryToast.title}</p>
            <p className="inventory-toast__message">{inventoryToast.message}</p>
          </div>
        </div>
      )}
    </main>
  );
}
