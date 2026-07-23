import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  translateUi,
  type UiCopy,
  type UiLang,
  useAppLanguage,
} from "@/contexts/AppLanguageContext";
import {
  tradeBots,
  tradePositionRows,
  formatSigned,
  type TradeEnvironment,
  type BotStatus,
} from "@/lib/tradeData";
import {
  deleteTradeBotDeployment,
  getTradeBotsWithDeployments,
} from "@/lib/tradeDeployments";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  localizeDateRangeLabel,
  StrategyReportDateControl,
} from "./StrategyReportDateControl";
import "./Trade.css";

type PendingAction =
  | { type: "stop"; botId: string }
  | { type: "delete"; botId: string }
  | null;

export const TRADE_RETURN_TRANSITION_STORAGE_KEY = "otterquant:trade-return-transition";

type BotStatusFilter = "all" | "running" | "stop";
type BotSortKey = "equity" | "unrealizedPnl" | "roi" | "updatedAt";
type BotSortDirection = "default" | "desc" | "asc";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";

export const tradeCopy: Record<string, UiCopy> = {
  Today: { ja: "今日", ko: "오늘", es: "Hoy", fr: "Aujourd'hui" },
  "Past 7 days": { ja: "過去 7 日", ko: "지난 7일", es: "Últimos 7 días", fr: "7 derniers jours" },
  "Past 30 days": { ja: "過去 30 日", ko: "지난 30일", es: "Últimos 30 días", fr: "30 derniers jours" },
  "Past 90 days": { ja: "過去 90 日", ko: "지난 90일", es: "Últimos 90 días", fr: "90 derniers jours" },
  "Past 180 days": { ja: "過去 180 日", ko: "지난 180일", es: "Últimos 180 días", fr: "180 derniers jours" },
  "Past year": { ja: "過去 1 年", ko: "지난 1년", es: "Último año", fr: "Année écoulée" },
  "Custom date range": { ja: "カスタム期間", ko: "사용자 지정 기간", es: "Rango personalizado", fr: "Période personnalisée" },
  "Select summary period": { ja: "集計期間を選択", ko: "요약 기간 선택", es: "Seleccionar periodo de resumen", fr: "Sélectionner la période de synthèse" },
  "Start date": { ja: "開始日", ko: "시작일", es: "Fecha de inicio", fr: "Date de début" },
  "End date": { ja: "終了日", ko: "종료일", es: "Fecha de fin", fr: "Date de fin" },
  Switch: { ja: "切り替え", ko: "전환", es: "Cambiar", fr: "Changer" },
  "Running Strategies": { ja: "稼働中のストラテジー", ko: "실행 중인 전략", es: "Estrategias en ejecución", fr: "Stratégies en cours" },
  "Total Assets (USDT)": { ja: "総資産（USDT）", ko: "총자산(USDT)", es: "Activos totales (USDT)", fr: "Actifs totaux (USDT)" },
  "PnL (USDT)": { ja: "PnL（USDT）", ko: "PnL(USDT)", es: "PnL (USDT)", fr: "PnL (USDT)" },
  "Average ROI": { ja: "平均 ROI", ko: "평균 ROI", es: "ROI medio", fr: "ROI moyen" },
  "Filter strategy status": { ja: "ストラテジー状態を絞り込む", ko: "전략 상태 필터", es: "Filtrar estado de estrategia", fr: "Filtrer l'état des stratégies" },
  All: { ja: "すべて", ko: "전체", es: "Todo", fr: "Tout" },
  Running: { ja: "稼働中", ko: "실행 중", es: "En ejecución", fr: "En cours" },
  Stopped: { ja: "停止済み", ko: "중지됨", es: "Detenidas", fr: "Arrêtées" },
  "Trading strategies": { ja: "取引ストラテジー", ko: "거래 전략", es: "Estrategias de trading", fr: "Stratégies de trading" },
  Strategy: { ja: "ストラテジー", ko: "전략", es: "Estrategia", fr: "Stratégie" },
  Assets: { ja: "資産", ko: "자산", es: "Activos", fr: "Actifs" },
  PnL: { ja: "PnL", ko: "PnL", es: "PnL", fr: "PnL" },
  Return: { ja: "リターン", ko: "수익률", es: "Retorno", fr: "Rendement" },
  "Paper Status": { ja: "ペーパートレード状態", ko: "모의 거래 상태", es: "Estado de paper trading", fr: "Statut du paper trading" },
  Updated: { ja: "更新日時", ko: "업데이트", es: "Actualizado", fr: "Mis à jour" },
  Actions: { ja: "操作", ko: "작업", es: "Acciones", fr: "Actions" },
  Refresh: { ja: "更新", ko: "새로고침", es: "Actualizar", fr: "Actualiser" },
  Refreshing: { ja: "更新中", ko: "새로고침 중", es: "Actualizando", fr: "Actualisation" },
  Stop: { ja: "停止", ko: "중지", es: "Detener", fr: "Arrêter" },
  Restart: { ja: "再開", ko: "재시작", es: "Reiniciar", fr: "Redémarrer" },
  More: { ja: "その他", ko: "더보기", es: "Más", fr: "Plus" },
  Delete: { ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer" },
  "Paper trading stopped": { ja: "ペーパートレードを停止しました", ko: "모의 거래가 중지되었습니다", es: "Paper trading detenido", fr: "Paper trading arrêté" },
  "Paper trading restarted": { ja: "ペーパートレードを再開しました", ko: "모의 거래가 재시작되었습니다", es: "Paper trading reiniciado", fr: "Paper trading redémarré" },
  "Paper trading data refreshed": { ja: "ペーパートレードデータを更新しました", ko: "모의 거래 데이터를 새로고침했습니다", es: "Datos de paper trading actualizados", fr: "Données du paper trading actualisées" },
  "Paper trading deployment deleted": { ja: "ペーパートレードのデプロイを削除しました", ko: "모의 거래 배포가 삭제되었습니다", es: "Despliegue de paper trading eliminado", fr: "Déploiement de paper trading supprimé" },
  "No matching paper-trading deployments": { ja: "一致するペーパートレードがありません", ko: "일치하는 모의 거래 배포가 없습니다", es: "No hay despliegues de paper trading coincidentes", fr: "Aucun déploiement de paper trading correspondant" },
  "No paper-trading deployments in this status": { ja: "この状態のペーパートレードはありません", ko: "이 상태의 모의 거래 배포가 없습니다", es: "No hay despliegues de paper trading con este estado", fr: "Aucun déploiement de paper trading avec ce statut" },
  "Adjust the keyword or status filter.": { ja: "キーワードまたは状態フィルターを調整してください。", ko: "키워드 또는 상태 필터를 조정하세요.", es: "Ajusta la palabra clave o el filtro de estado.", fr: "Modifiez le mot-clé ou le filtre d'état." },
  "Switch the status filter.": { ja: "状態フィルターを切り替えてください。", ko: "상태 필터를 전환하세요.", es: "Cambia el filtro de estado.", fr: "Changez le filtre d'état." },
  "Delete Paper Trading": { ja: "ペーパートレードを削除", ko: "모의 거래 삭제", es: "Eliminar paper trading", fr: "Supprimer le paper trading" },
  "Stop Paper Trading": { ja: "ペーパートレードを停止", ko: "모의 거래 중지", es: "Detener paper trading", fr: "Arrêter le paper trading" },
  "Are you sure you want to stop this paper-trading deployment? Open positions and its configuration will be kept so you can restart it later.": {
    ja: "このペーパートレードを停止しますか？後で再開できるよう、オープンポジションと設定は保持されます。",
    ko: "이 모의 거래 배포를 중지할까요? 나중에 재시작할 수 있도록 미결제 포지션과 설정은 유지됩니다.",
    es: "¿Quieres detener este despliegue de paper trading? Se conservarán las posiciones abiertas y la configuración para poder reiniciarlo más tarde.",
    fr: "Voulez-vous arrêter ce déploiement de paper trading ? Les positions ouvertes et sa configuration seront conservées afin de pouvoir le redémarrer ultérieurement.",
  },
  Cancel: { ja: "キャンセル", ko: "취소", es: "Cancelar", fr: "Annuler" },
  "Confirm Delete": { ja: "削除を確認", ko: "삭제 확인", es: "Confirmar eliminación", fr: "Confirmer la suppression" },
  "Confirm Stop": { ja: "停止を確認", ko: "중지 확인", es: "Confirmar detención", fr: "Confirmer l'arrêt" },
};

const tradeSortLabels: Record<BotSortKey, Record<UiLang, string>> = {
  equity: { en: "assets", zh: "资产", ja: "資産", ko: "자산", es: "activos", fr: "actifs" },
  unrealizedPnl: { en: "PnL", zh: "盈亏", ja: "PnL", ko: "PnL", es: "PnL", fr: "PnL" },
  roi: { en: "return", zh: "收益率", ja: "リターン", ko: "수익률", es: "retorno", fr: "rendement" },
  updatedAt: { en: "updated time", zh: "更新时间", ja: "更新日時", ko: "업데이트 시간", es: "hora de actualización", fr: "heure de mise à jour" },
};

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown"
    ? stored
    : "greenUpRedDown";
}

function getTrendClass(value: number, mode: ChartColorMode) {
  if (value === 0) return "oq-trend-neutral";
  const upClass =
    mode === "redUpGreenDown" ? "oq-trend-risk" : "oq-trend-positive";
  const downClass =
    mode === "redUpGreenDown" ? "oq-trend-positive" : "oq-trend-risk";
  return value > 0 ? upClass : downClass;
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return true;
}

function formatRefreshTimestamp(date: Date) {
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  const timePart = [date.getHours(), date.getMinutes()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return `${datePart} ${timePart}`;
}

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled: boolean;
  explanation: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="oq-plain-explanation-tooltip">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

const SHOW_WORKBENCH_260712 = true;

export default function Trade() {
  return SHOW_WORKBENCH_260712 ? <TradeWorkbench260712 /> : null;
}

function TradeWorkbench260712() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string, copy: UiCopy = {}) =>
    translateUi(uiLang, en, zh, { ...tradeCopy[en], ...copy });
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const envFromQuery = searchParams.get("env");
  const focusStrategyId = searchParams.get("focusStrategy");
  const focusTradeId = searchParams.get("focusTradeId");
  const tradeSearchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();
  const todayLabel = tr("Today", "今天");

  const [environment, setEnvironment] = useState<TradeEnvironment>(
    envFromQuery === "live" ? "live" : "paper"
  );
  const [activeSummaryPeriod, setActiveSummaryPeriod] = useState(todayLabel);
  const [isReturningFromDetail] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(TRADE_RETURN_TRANSITION_STORAGE_KEY) === "true";
  });
  const [focusedBotId, setFocusedBotId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [statusFilter, setStatusFilter] = useState<BotStatusFilter>("all");
  const [botSort, setBotSort] = useState<{ key: BotSortKey | null; direction: BotSortDirection }>({
    key: null,
    direction: "default",
  });
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() =>
    readChartColorMode()
  );
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() =>
    readPlainExplanationEnabled()
  );
  const allTradeBots = useMemo(
    () => getTradeBotsWithDeployments(tradeBots),
    []
  );
  const [statusById, setStatusById] = useState<Record<string, BotStatus>>(() =>
    Object.fromEntries(
      allTradeBots.map((bot, index) => [
        bot.id,
        index % 4 === 1 ? "paused" : "running",
      ])
    )
  );
  const [refreshedAtById, setRefreshedAtById] = useState<Record<string, string>>({});
  const [refreshingBotIds, setRefreshingBotIds] = useState<Set<string>>(() => new Set());
  const [deletedBotIds, setDeletedBotIds] = useState<Set<string>>(() => new Set());
  const refreshTimerByBotRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (envFromQuery === "paper" || envFromQuery === "live") {
      setEnvironment(envFromQuery);
    }
  }, [envFromQuery]);

  useEffect(() => {
    if (!isReturningFromDetail) return;
    window.sessionStorage.removeItem(TRADE_RETURN_TRANSITION_STORAGE_KEY);
  }, [isReturningFromDetail]);

  useEffect(() => {
    setActiveSummaryPeriod(todayLabel);
  }, [todayLabel]);

  useEffect(() => {
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);

  useEffect(() => {
    const syncPlainExplanation = () =>
      setPlainExplainEnabled(readPlainExplanationEnabled());
    window.addEventListener("storage", syncPlainExplanation);
    window.addEventListener("focus", syncPlainExplanation);
    return () => {
      window.removeEventListener("storage", syncPlainExplanation);
      window.removeEventListener("focus", syncPlainExplanation);
    };
  }, []);

  useEffect(() => () => {
    refreshTimerByBotRef.current.forEach(timerId => window.clearTimeout(timerId));
    refreshTimerByBotRef.current.clear();
  }, []);

  const visibleBots = useMemo(
    () =>
      allTradeBots
        .filter(bot => bot.environment === environment && !deletedBotIds.has(bot.id))
        .map(bot => ({
          ...bot,
          status: statusById[bot.id] ?? "running",
          updatedAt: refreshedAtById[bot.id] ?? bot.updatedAt,
        })),
    [allTradeBots, deletedBotIds, environment, refreshedAtById, statusById]
  );
  const pendingBotName = pendingAction
    ? allTradeBots.find(bot => bot.id === pendingAction.botId)?.name
    : undefined;
  const searchFilteredBots = useMemo(() => {
    if (!tradeSearchQuery) return visibleBots;

    return visibleBots.filter(bot =>
      [bot.name, bot.id, bot.strategyId, bot.symbol, bot.market, bot.leverage]
        .filter(value => value !== undefined && value !== null)
        .some(value => String(value).toLowerCase().includes(tradeSearchQuery))
    );
  }, [tradeSearchQuery, visibleBots]);
  const filteredVisibleBots = useMemo(() => {
    if (statusFilter === "all") return searchFilteredBots;
    return searchFilteredBots.filter(bot =>
      statusFilter === "running"
        ? bot.status === "running"
        : bot.status !== "running"
    );
  }, [searchFilteredBots, statusFilter]);
  const sortedVisibleBots = useMemo(() => {
    if (!botSort.key || botSort.direction === "default") return filteredVisibleBots;

    const sortValue = (bot: (typeof filteredVisibleBots)[number]) => {
      if (botSort.key === "equity") return bot.equity;
      if (botSort.key === "unrealizedPnl") return bot.unrealizedPnl;
      if (botSort.key === "updatedAt") {
        const timestamp = Date.parse(bot.updatedAt.replace(" ", "T"));
        return Number.isFinite(timestamp) ? timestamp : 0;
      }
      return (bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100;
    };
    const multiplier = botSort.direction === "desc" ? -1 : 1;

    return filteredVisibleBots
      .map((bot, index) => ({ bot, index }))
      .sort((left, right) => {
        const difference = sortValue(left.bot) - sortValue(right.bot);
        return difference === 0 ? left.index - right.index : difference * multiplier;
      })
      .map(({ bot }) => bot);
  }, [botSort, filteredVisibleBots]);
  const visiblePositions = useMemo(
    () => tradePositionRows.filter(row => row.environment === environment),
    [environment]
  );
  const summary = useMemo(() => {
    const activeBots = visibleBots.filter(
      bot => bot.status === "running"
    ).length;
    const totalEquity = visibleBots.reduce((acc, bot) => acc + bot.equity, 0);
    const totalUnrealized = visiblePositions.reduce(
      (acc, row) => acc + row.pnl,
      0
    );
    const avgRoi =
      visibleBots.length > 0
        ? visibleBots.reduce(
            (acc, bot) =>
              acc + (bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100,
            0
          ) /
          visibleBots.length
        : 0;

    return { activeBots, totalEquity, totalUnrealized, avgRoi };
  }, [visibleBots, visiblePositions]);

  const stopBot = (botId: string) => {
    setStatusById(prev => ({ ...prev, [botId]: "paused" }));
    toast.success(tr("Paper trading stopped", "模拟盘已停止"));
  };

  const restartBot = (botId: string) => {
    setStatusById(prev => ({ ...prev, [botId]: "running" }));
    toast.success(tr("Paper trading restarted", "模拟盘已重新启动"));
  };

  const refreshBot = (botId: string) => {
    if (refreshTimerByBotRef.current.has(botId)) return;

    const completeRefresh = () => {
      setRefreshedAtById(prev => ({
        ...prev,
        [botId]: formatRefreshTimestamp(new Date()),
      }));
      setRefreshingBotIds(prev => {
        const next = new Set(prev);
        next.delete(botId);
        return next;
      });
      refreshTimerByBotRef.current.delete(botId);
      toast.success(tr("Paper trading data refreshed", "模拟盘数据已刷新"));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      completeRefresh();
      return;
    }

    setRefreshingBotIds(prev => new Set(prev).add(botId));
    const timerId = window.setTimeout(completeRefresh, 480);
    refreshTimerByBotRef.current.set(botId, timerId);
  };

  const deleteBot = (botId: string) => {
    deleteTradeBotDeployment(botId);
    setDeletedBotIds(prev => {
      const next = new Set(prev);
      next.add(botId);
      return next;
    });
    toast.success(tr("Paper trading deployment deleted", "模拟盘已删除"));
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "stop") stopBot(pendingAction.botId);
    else deleteBot(pendingAction.botId);
    setPendingAction(null);
  };

  const formatMetricNumber = (value: number, digits = 2) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const formatBotRoi = (bot: (typeof visibleBots)[number]) =>
    ((bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100).toFixed(1);
  const cycleBotSort = (key: BotSortKey) => {
    setBotSort(current => {
      if (current.key !== key || current.direction === "default") {
        return { key, direction: "desc" };
      }
      if (current.direction === "desc") return { key, direction: "asc" };
      return { key: null, direction: "default" };
    });
  };
  const sortDirectionFor = (key: BotSortKey): BotSortDirection =>
    botSort.key === key ? botSort.direction : "default";
  const ariaSortFor = (key: BotSortKey): "none" | "ascending" | "descending" => {
    const direction = sortDirectionFor(key);
    if (direction === "desc") return "descending";
    if (direction === "asc") return "ascending";
    return "none";
  };
  const sortButtonLabel = (key: BotSortKey) => {
    const direction = sortDirectionFor(key);
    const label = tradeSortLabels[key];
    const labelsByDirection: Record<BotSortDirection, Record<UiLang, string>> = {
      default: {
        en: `Sort ${label.en} descending`,
        zh: `${label.zh}按降序排列`,
        ja: `${label.ja}を降順に並べ替え`,
        ko: `${label.ko} 내림차순 정렬`,
        es: `Ordenar ${label.es} de forma descendente`,
        fr: `Trier ${label.fr} par ordre décroissant`,
      },
      desc: {
        en: `Sort ${label.en} ascending`,
        zh: `${label.zh}按升序排列`,
        ja: `${label.ja}を昇順に並べ替え`,
        ko: `${label.ko} 오름차순 정렬`,
        es: `Ordenar ${label.es} de forma ascendente`,
        fr: `Trier ${label.fr} par ordre croissant`,
      },
      asc: {
        en: `Restore default ${label.en} order`,
        zh: `恢复${label.zh}默认顺序`,
        ja: `${label.ja}のデフォルト順序に戻す`,
        ko: `${label.ko} 기본 순서 복원`,
        es: `Restaurar el orden predeterminado de ${label.es}`,
        fr: `Rétablir l'ordre par défaut des ${label.fr}`,
      },
    };
    return labelsByDirection[direction][uiLang];
  };
  const sortIconFor = (key: BotSortKey) => {
    const direction = sortDirectionFor(key);
    if (direction === "desc") return <ArrowDown aria-hidden="true" />;
    if (direction === "asc") return <ArrowUp aria-hidden="true" />;
    return <ArrowUpDown aria-hidden="true" />;
  };
  const summaryPeriodLabel = localizeDateRangeLabel(activeSummaryPeriod, uiLang);
  const isTodaySummaryPeriod = activeSummaryPeriod === todayLabel;
  const summaryPeriodContextCopy: Record<UiLang, string> = isTodaySummaryPeriod
    ? {
        en: "today",
        zh: "今天",
        ja: "本日",
        ko: "오늘",
        es: "hoy",
        fr: "aujourd'hui",
      }
    : {
        en: `during ${summaryPeriodLabel.toLowerCase()}`,
        zh: `${summaryPeriodLabel}内`,
        ja: `${summaryPeriodLabel}の期間中`,
        ko: `${summaryPeriodLabel} 동안`,
        es: `durante ${summaryPeriodLabel.toLowerCase()}`,
        fr: `sur ${summaryPeriodLabel.toLowerCase()}`,
      };
  const metricExplanations = {
    activeBots: tr(
      `Number of strategies trading automatically ${summaryPeriodContextCopy.en}.`,
      `${summaryPeriodContextCopy.zh}正在自动交易的策略数量。`,
      {
        ja: isTodaySummaryPeriod
          ? "本日、自動取引を行っているストラテジー数。"
          : `${summaryPeriodLabel}に自動取引を行っているストラテジー数。`,
        ko: `${summaryPeriodContextCopy.ko} 자동 거래 중인 전략 수입니다.`,
        es: `Número de estrategias que operan automáticamente ${summaryPeriodContextCopy.es}.`,
        fr: `Nombre de stratégies exécutant des transactions automatiquement ${summaryPeriodContextCopy.fr}.`,
      }
    ),
    totalEquity: tr(
      `Combined account assets across all visible strategies ${summaryPeriodContextCopy.en}.`,
      `${summaryPeriodContextCopy.zh}所有可见策略的账户资产合计。`,
      {
        ja: isTodaySummaryPeriod
          ? "本日時点で表示されている全ストラテジーの口座資産合計。"
          : `${summaryPeriodLabel}に表示された全ストラテジーの口座資産合計。`,
        ko: `${summaryPeriodContextCopy.ko} 표시된 모든 전략의 계정 자산 합계입니다.`,
        es: `Activos combinados de todas las estrategias visibles ${summaryPeriodContextCopy.es}.`,
        fr: `Total des actifs des comptes de toutes les stratégies visibles ${summaryPeriodContextCopy.fr}.`,
      }
    ),
    unrealizedPnl: tr(
      `Combined PnL across all visible strategies ${summaryPeriodContextCopy.en}.`,
      `${summaryPeriodContextCopy.zh}所有可见策略的盈亏金额合计。`,
      {
        ja: isTodaySummaryPeriod
          ? "本日時点で表示されている全ストラテジーの合計 PnL。"
          : `${summaryPeriodLabel}に表示された全ストラテジーの合計 PnL。`,
        ko: `${summaryPeriodContextCopy.ko} 표시된 모든 전략의 합산 PnL입니다.`,
        es: `PnL combinado de todas las estrategias visibles ${summaryPeriodContextCopy.es}.`,
        fr: `PnL cumulé de toutes les stratégies visibles ${summaryPeriodContextCopy.fr}.`,
      }
    ),
    avgRoi: tr(
      `Average return across all visible strategies ${summaryPeriodContextCopy.en}.`,
      `${summaryPeriodContextCopy.zh}所有可见策略收益率的平均值。`,
      {
        ja: isTodaySummaryPeriod
          ? "本日時点で表示されている全ストラテジーの平均リターン。"
          : `${summaryPeriodLabel}に表示された全ストラテジーの平均リターン。`,
        ko: `${summaryPeriodContextCopy.ko} 표시된 모든 전략의 평균 수익률입니다.`,
        es: `Retorno medio de todas las estrategias visibles ${summaryPeriodContextCopy.es}.`,
        fr: `Rendement moyen de toutes les stratégies visibles ${summaryPeriodContextCopy.fr}.`,
      }
    ),
  };

  useEffect(() => {
    if (!focusStrategyId && !focusTradeId) return;
    const target = visibleBots.find(bot => {
      if (focusTradeId) return bot.id === focusTradeId;
      return bot.strategyId === focusStrategyId;
    });
    if (!target) return;
    const element = document.getElementById(`trade-bot-${target.id}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setFocusedBotId(target.id);
    const timer = window.setTimeout(() => setFocusedBotId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [focusStrategyId, focusTradeId, visibleBots]);

  return (
    <div
      className={`oq-trade ${environment === "live" ? "is-live" : "is-paper"}${isReturningFromDetail ? " is-returning-from-detail" : ""}`}
    >
      <section className="oq-trade-summary-section" aria-labelledby="trade-summary-period-title">
        <div className="oq-trade-summary-header">
          <h2 id="trade-summary-period-title">
            {summaryPeriodLabel}
          </h2>
          <StrategyReportDateControl
            dateLabel={todayLabel}
            dateOptions={[
              todayLabel,
              tr("Past 7 days", "过去 7 天"),
              tr("Past 30 days", "过去 30 天"),
              tr("Past 90 days", "过去 90 天"),
              tr("Past 180 days", "过去 180 天"),
              tr("Past year", "过去 1 年"),
              tr("Custom date range", "自定义时间范围"),
            ]}
            customDateOption={tr("Custom date range", "自定义时间范围")}
            uiLang={uiLang}
            variant="compact"
            triggerMode="switch"
            iconOnly
            onSelectionChange={setActiveSummaryPeriod}
            labels={{
              selectPeriod: tr("Select summary period", "选择汇总周期"),
              customRange: tr("Custom date range", "自定义时间范围"),
              startDate: tr("Start date", "开始日期"),
              endDate: tr("End date", "结束日期"),
              switchPeriod: tr("Switch", "切换"),
            }}
          />
        </div>

        <div className="oq-trade-summary-grid">
          <MaybeExplainTooltip
            enabled={plainExplainEnabled}
            explanation={metricExplanations.activeBots}
          >
            <div className="oq-trade-metric-card">
              <p className="oq-trade-metric-value">{summary.activeBots}</p>
              <div className="oq-trade-metric-label">
                {tr("Running Strategies", "进行中的策略")}
              </div>
            </div>
          </MaybeExplainTooltip>

          <MaybeExplainTooltip
            enabled={plainExplainEnabled}
            explanation={metricExplanations.totalEquity}
          >
            <div className="oq-trade-metric-card">
              <p className="oq-trade-metric-value">
                {summary.totalEquity.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="oq-trade-metric-label">
                {tr("Total Assets (USDT)", "总资产（USDT）")}
              </div>
            </div>
          </MaybeExplainTooltip>

          <MaybeExplainTooltip
            enabled={plainExplainEnabled}
            explanation={metricExplanations.unrealizedPnl}
          >
            <div className="oq-trade-metric-card">
              <p
                className={`oq-trade-metric-value ${getTrendClass(summary.totalUnrealized, chartColorMode)}`}
              >
                {formatSigned(summary.totalUnrealized)}
              </p>
              <div className="oq-trade-metric-label">
                {tr("PnL (USDT)", "盈亏（USDT）")}
              </div>
            </div>
          </MaybeExplainTooltip>

          <MaybeExplainTooltip
            enabled={plainExplainEnabled}
            explanation={metricExplanations.avgRoi}
          >
            <div className="oq-trade-metric-card">
              <p
                className={`oq-trade-metric-value ${getTrendClass(summary.avgRoi, chartColorMode)}`}
              >
                {summary.avgRoi.toFixed(1)}%
              </p>
              <div className="oq-trade-metric-label">
                {tr("Average ROI", "平均收益率")}
              </div>
            </div>
          </MaybeExplainTooltip>
        </div>
      </section>

      <div className="oq-trade-filter-row">
        <div
          className="oq-trade-filter"
          role="group"
          aria-label={tr("Filter strategy status", "筛选策略状态")}
        >
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`oq-trade-filter-button ${statusFilter === "all" ? "is-active" : ""}`}
            aria-pressed={statusFilter === "all"}
          >
            <span>{tr("All", "全部")}</span>
            <span className="oq-trade-filter-count">{visibleBots.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("running")}
            className={`oq-trade-filter-button ${statusFilter === "running" ? "is-active" : ""}`}
            aria-pressed={statusFilter === "running"}
          >
            <span>{tr("Running", "运行中")}</span>
            <span className="oq-trade-filter-count">{summary.activeBots}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("stop")}
            className={`oq-trade-filter-button ${statusFilter === "stop" ? "is-active" : ""}`}
            aria-pressed={statusFilter === "stop"}
          >
            <span>{tr("Stopped", "已停止")}</span>
            <span className="oq-trade-filter-count">
              {visibleBots.length - summary.activeBots}
            </span>
          </button>
        </div>
      </div>

      <div className="oq-trade-section">
        <div
          className="oq-trade-table-scroll"
          role="table"
          aria-label={tr("Trading strategies", "交易策略")}
        >
          <div className="oq-trade-table-head oq-trade-table-grid" role="row">
            <div role="columnheader">{tr("Strategy", "策略")}</div>
            <div role="columnheader" aria-sort={ariaSortFor("equity")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("equity") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("equity")}
                aria-label={sortButtonLabel("equity")}
              >
                <span>{tr("Assets", "资产")}</span>
                {sortIconFor("equity")}
              </button>
            </div>
            <div role="columnheader" aria-sort={ariaSortFor("unrealizedPnl")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("unrealizedPnl") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("unrealizedPnl")}
                aria-label={sortButtonLabel("unrealizedPnl")}
              >
                <span>{tr("PnL", "盈亏")}</span>
                {sortIconFor("unrealizedPnl")}
              </button>
            </div>
            <div role="columnheader" aria-sort={ariaSortFor("roi")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("roi") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("roi")}
                aria-label={sortButtonLabel("roi")}
              >
                <span>{tr("Return", "收益率")}</span>
                {sortIconFor("roi")}
              </button>
            </div>
            <div role="columnheader">{tr("Paper Status", "模拟盘状态")}</div>
            <div role="columnheader" aria-sort={ariaSortFor("updatedAt")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("updatedAt") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("updatedAt")}
                aria-label={sortButtonLabel("updatedAt")}
              >
                <span>{tr("Updated", "更新时间")}</span>
                {sortIconFor("updatedAt")}
              </button>
            </div>
            <div role="columnheader">{tr("Actions", "操作")}</div>
          </div>

          <div className="oq-trade-bot-list" role="rowgroup">
            {sortedVisibleBots.length === 0 ? (
              <div className="oq-trade-empty">
                <p className="oq-trade-empty-title">
                  {tr(
                    tradeSearchQuery
                      ? "No matching paper-trading deployments"
                      : "No paper-trading deployments in this status",
                    tradeSearchQuery
                      ? "未找到匹配的模拟盘"
                      : "当前状态下没有模拟盘"
                  )}
                </p>
                <p className="oq-trade-empty-copy">
                  {tr(
                    tradeSearchQuery
                      ? "Adjust the keyword or status filter."
                      : "Switch the status filter.",
                    tradeSearchQuery
                      ? "请调整关键词或状态筛选。"
                      : "请切换状态筛选。"
                  )}
                </p>
              </div>
            ) : (
              sortedVisibleBots.map(bot => (
                <div
                  key={bot.id}
                  id={`trade-bot-${bot.id}`}
                  className={`oq-trade-bot-row ${focusedBotId === bot.id ? "is-focused" : ""}${refreshingBotIds.has(bot.id) ? " is-refreshing" : ""}`}
                  role="row"
                  aria-busy={refreshingBotIds.has(bot.id)}
                >
                  <Link
                    href={`/trade/${bot.id}?env=${bot.environment}&status=${bot.status}`}
                    className="oq-trade-row-link"
                    aria-label={tr(
                      `Open ${bot.name} details`,
                      `打开 ${bot.name} 详情`,
                      {
                        ja: `${bot.name} の詳細を開く`,
                        ko: `${bot.name} 상세 열기`,
                        es: `Abrir detalles de ${bot.name}`,
                        fr: `Ouvrir les détails de ${bot.name}`,
                      }
                    )}
                  >
                    <div className="oq-trade-bot-identity" role="cell">
                      <div className="oq-trade-bot-title">{bot.name}</div>
                    </div>

                    <div className="oq-trade-bot-metric-value" role="cell">
                      {bot.equity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} USDT
                    </div>
                    <div
                      className={`oq-trade-bot-metric-value ${getTrendClass(bot.unrealizedPnl, chartColorMode)}`}
                      role="cell"
                    >
                      {formatSigned(bot.unrealizedPnl)} USDT
                    </div>
                    <div
                      className={`oq-trade-bot-metric-value ${getTrendClass(bot.unrealizedPnl, chartColorMode)}`}
                      role="cell"
                    >
                      {formatBotRoi(bot)}%
                    </div>

                    <span
                      className={`oq-trade-status ${bot.status === "running" ? "is-running" : "is-paused"}`}
                      role="cell"
                    >
                      <span aria-hidden="true" />
                      {bot.status === "running"
                        ? tr("Running", "运行中")
                        : tr("Stopped", "已停止")}
                    </span>
                    <time className="oq-trade-bot-updated" role="cell">
                      {bot.updatedAt}
                    </time>
                  </Link>

                  <div className="oq-trade-actions" role="cell">
                    {bot.status === "running" ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={`oq-trade-icon-button${refreshingBotIds.has(bot.id) ? " is-refreshing" : ""}`}
                              aria-label={refreshingBotIds.has(bot.id) ? tr("Refreshing", "正在刷新") : tr("Refresh", "刷新")}
                              aria-busy={refreshingBotIds.has(bot.id)}
                              disabled={refreshingBotIds.has(bot.id)}
                              onClick={() => refreshBot(bot.id)}
                            >
                              <RefreshCw aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {refreshingBotIds.has(bot.id) ? tr("Refreshing", "正在刷新") : tr("Refresh", "刷新")}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="oq-trade-icon-button"
                              aria-label={tr("Stop", "停止")}
                              onClick={() =>
                                setPendingAction({ type: "stop", botId: bot.id })
                              }
                            >
                              <svg
                                aria-hidden="true"
                                className="oq-trade-stop-icon"
                                viewBox="-128 -128 1280 1280"
                              >
                                <path
                                  fill="currentColor"
                                  d="M768 960c-26.24 0-48-21.76-48-48V112c0-26.24 21.76-48 48-48s48 21.76 48 48v800c0 26.24-21.76 48-48 48zM256 960c-26.24 0-48-21.76-48-48V112c0-26.24 21.76-48 48-48s48 21.76 48 48v800c0 26.24-21.76 48-48 48z"
                                />
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{tr("Stop", "停止")}</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="oq-trade-icon-button is-restart"
                            aria-label={tr("Restart", "重新启动")}
                            onClick={() => restartBot(bot.id)}
                          >
                            <Play aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{tr("Restart", "重新启动")}</TooltipContent>
                      </Tooltip>
                    )}

                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="oq-trade-icon-button"
                              aria-label={tr("More", "更多")}
                            >
                              <MoreHorizontal aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">{tr("More", "更多")}</TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={6}
                        className="oq-trade-action-menu"
                      >
                        <DropdownMenuItem
                          className="oq-trade-action-menu-item is-destructive"
                          variant="destructive"
                          onSelect={() => setPendingAction({ type: "delete", botId: bot.id })}
                        >
                          <Trash2 aria-hidden="true" />
                          {tr("Delete", "删除")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={open => !open && setPendingAction(null)}
      >
        <AlertDialogContent className="oq-trade-dialog">
          <AlertDialogHeader className="oq-trade-dialog-header">
            <AlertDialogTitle className="oq-trade-dialog-title">
              {pendingAction?.type === "delete"
                ? tr("Delete Paper Trading", "删除模拟盘")
                : tr("Stop Paper Trading", "停止模拟盘")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-trade-dialog-description">
              {pendingAction?.type === "delete"
                ? tr(
                    `Delete the paper-trading deployment for "${pendingBotName ?? "the selected strategy"}"? It will be removed from the current list and cannot be undone on this page.`,
                    `确认删除策略「${pendingBotName ?? "所选策略"}」的模拟盘吗？删除后将从当前列表中移除，且无法在此页面撤销。`,
                    {
                      ja: `「${pendingBotName ?? "選択したストラテジー"}」のペーパートレードを削除しますか？現在の一覧から削除され、このページでは元に戻せません。`,
                      ko: `「${pendingBotName ?? "선택한 전략"}」의 모의 거래 배포를 삭제할까요? 현재 목록에서 제거되며 이 페이지에서는 되돌릴 수 없습니다.`,
                      es: `¿Eliminar el despliegue de paper trading de «${pendingBotName ?? "la estrategia seleccionada"}»? Se quitará de la lista actual y no podrá deshacerse en esta página.`,
                      fr: `Supprimer le déploiement de paper trading de « ${pendingBotName ?? "la stratégie sélectionnée"} » ? Il sera retiré de la liste actuelle et cette action ne pourra pas être annulée sur cette page.`,
                    }
                  )
                : tr(
                    "Are you sure you want to stop this paper-trading deployment? Open positions and its configuration will be kept so you can restart it later.",
                    "确认要停止该模拟盘吗？当前持仓与模拟盘配置将保留，之后可以重新启动。"
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="oq-trade-dialog-footer">
            <AlertDialogCancel className="oq-trade-dialog-button">
              {tr("Cancel", "取消")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="oq-trade-dialog-button is-primary"
              onClick={confirmPendingAction}
            >
              {pendingAction?.type === "delete"
                ? tr("Confirm Delete", "确认删除")
                : tr("Confirm Stop", "确认停止")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
