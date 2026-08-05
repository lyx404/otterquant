import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { toast } from "sonner";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  localizeDateRangeLabel,
  StrategyReportDateControl,
} from "./StrategyReportDateControl";
import {
  buildTradeTrendData,
  TradeTrendChart,
  type TradeTrendMetric,
} from "@/components/TradeTrendChart";
import { TRADE_RETURN_TRANSITION_STORAGE_KEY, tradeCopy } from "./Trade";
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
import {
  formatSigned,
  tradeBots,
  tradeFillRows,
  tradeHistoryRows,
  tradePositionRows,
  type TradeEnvironment,
} from "@/lib/tradeData";
import {
  deleteTradeBotDeployment,
  getTradeBotsWithDeployments,
} from "@/lib/tradeDeployments";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Check,
  MoreHorizontal,
  PieChart,
  Play,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import {
  translateUi,
  type UiCopy,
  useAppLanguage,
} from "@/contexts/AppLanguageContext";
import "./TradeDetail.css";

const tradeDetailCopy: Record<string, UiCopy> = {
  "Back to Trade": { ja: "取引一覧に戻る", ko: "거래로 돌아가기", es: "Volver a Trading", fr: "Retour au trading" },
  "Paper trading deployment not found": { ja: "ペーパートレードが見つかりません", ko: "모의 거래 배포를 찾을 수 없습니다", es: "No se encontró el despliegue de paper trading", fr: "Déploiement de paper trading introuvable" },
  "The selected trade id does not exist in the current workspace.": {
    ja: "選択した取引 ID は現在のワークスペースに存在しません。",
    ko: "선택한 거래 ID가 현재 워크스페이스에 없습니다.",
    es: "El ID de operación seleccionado no existe en el espacio de trabajo actual.",
    fr: "L'ID de transaction sélectionné n'existe pas dans l'espace de travail actuel.",
  },
  "Assets (USDT)": { ja: "資産（USDT）", ko: "자산(USDT)", es: "Activos (USDT)", fr: "Actifs (USDT)" },
  "Shows the current total assets in this strategy account.": {
    ja: "このストラテジー口座の現在の総資産を示します。",
    ko: "이 전략 계정의 현재 총자산을 나타냅니다.",
    es: "Muestra los activos totales actuales de esta cuenta de estrategia.",
    fr: "Indique le total actuel des actifs de ce compte de stratégie.",
  },
  "Shows the total profit or loss over the selected period.": {
    ja: "選択期間の合計損益を示します。",
    ko: "선택한 기간의 총손익을 나타냅니다.",
    es: "Muestra el beneficio o la pérdida total del periodo seleccionado.",
    fr: "Indique le profit ou la perte totale sur la période sélectionnée.",
  },
  "Shows cumulative return over the selected period.": {
    ja: "選択期間の累積リターンを示します。",
    ko: "선택한 기간의 누적 수익률을 나타냅니다.",
    es: "Muestra el retorno acumulado del periodo seleccionado.",
    fr: "Indique le rendement cumulé sur la période sélectionnée.",
  },
  "Sharpe Ratio": { ja: "シャープレシオ", ko: "샤프 비율", es: "Ratio de Sharpe", fr: "Ratio de Sharpe" },
  "Measures return stability. Higher values generally indicate steadier performance.": {
    ja: "リターンの安定性を示します。一般に値が高いほどパフォーマンスは安定しています。",
    ko: "수익 안정성을 나타냅니다. 일반적으로 값이 높을수록 성과가 안정적입니다.",
    es: "Mide la estabilidad del retorno. Los valores más altos suelen indicar un rendimiento más estable.",
    fr: "Mesure la stabilité du rendement. Une valeur élevée indique généralement une performance plus stable.",
  },
  "Max Drawdown": { ja: "最大ドローダウン", ko: "최대 낙폭", es: "Máximo drawdown", fr: "Drawdown maximal" },
  "Shows the largest historical decline. Lower values indicate less downside risk.": {
    ja: "過去最大の下落幅を示します。値が小さいほどダウンサイドリスクが低いことを示します。",
    ko: "과거 최대 하락 폭을 나타냅니다. 값이 낮을수록 하방 위험이 작습니다.",
    es: "Muestra la mayor caída histórica. Los valores más bajos indican un menor riesgo bajista.",
    fr: "Indique la plus forte baisse historique. Une valeur faible signale un risque baissier moindre.",
  },
  "Win Rate": { ja: "勝率", ko: "승률", es: "Tasa de acierto", fr: "Taux de réussite" },
  "Shows the percentage of profitable positions.": {
    ja: "利益となったポジションの割合を示します。",
    ko: "수익 포지션의 비율을 나타냅니다.",
    es: "Muestra el porcentaje de posiciones rentables.",
    fr: "Indique le pourcentage de positions rentables.",
  },
  "Profitable Positions": { ja: "利益ポジション", ko: "수익 포지션", es: "Posiciones rentables", fr: "Positions rentables" },
  "Shows the number of profitable positions in the selected range.": {
    ja: "選択範囲内の利益ポジション数を示します。",
    ko: "선택한 범위의 수익 포지션 수를 나타냅니다.",
    es: "Muestra el número de posiciones rentables en el rango seleccionado.",
    fr: "Indique le nombre de positions rentables dans la plage sélectionnée.",
  },
  "Total Positions": { ja: "総ポジション数", ko: "총 포지션 수", es: "Posiciones totales", fr: "Nombre total de positions" },
  "Shows the total number of positions in the selected range.": {
    ja: "選択範囲内の総ポジション数を示します。",
    ko: "선택한 범위의 총 포지션 수를 나타냅니다.",
    es: "Muestra el número total de posiciones en el rango seleccionado.",
    fr: "Indique le nombre total de positions dans la plage sélectionnée.",
  },
  Paper: { ja: "ペーパー", ko: "모의", es: "Paper", fr: "Paper" },
  Live: { ja: "ライブ", ko: "실거래", es: "Live", fr: "Live" },
  "Trade controls": { ja: "取引操作", ko: "거래 제어", es: "Controles de trading", fr: "Contrôles de trading" },
  "Strategy overview": { ja: "ストラテジー概要", ko: "전략 개요", es: "Resumen de estrategia", fr: "Vue d'ensemble de la stratégie" },
  "Select performance period": { ja: "パフォーマンス期間を選択", ko: "성과 기간 선택", es: "Seleccionar periodo de rendimiento", fr: "Sélectionner la période de performance" },
  "Performance Trend": { ja: "パフォーマンス推移", ko: "성과 추이", es: "Tendencia de rendimiento", fr: "Évolution de la performance" },
  "Trend metric": { ja: "推移指標", ko: "추이 지표", es: "Métrica de tendencia", fr: "Indicateur de tendance" },
  "Asset Preference": { ja: "資産配分", ko: "자산 배분", es: "Asignación de activos", fr: "Allocation des actifs" },
  Allocation: { ja: "配分", ko: "배분", es: "Asignación", fr: "Allocation" },
  Other: { ja: "その他", ko: "기타", es: "Otros", fr: "Autres" },
  assets: { ja: "資産", ko: "자산", es: "activos", fr: "actifs" },
  "Asset allocation details": { ja: "資産配分の詳細", ko: "자산 배분 상세", es: "Detalles de asignación de activos", fr: "Détails de l'allocation des actifs" },
  "No open positions": { ja: "オープンポジションなし", ko: "미결제 포지션 없음", es: "No hay posiciones abiertas", fr: "Aucune position ouverte" },
  "No open positions to allocate.": { ja: "配分対象のオープンポジションがありません。", ko: "배분할 미결제 포지션이 없습니다.", es: "No hay posiciones abiertas para asignar.", fr: "Aucune position ouverte à allouer." },
  "Allocation will appear after a position is opened.": { ja: "ポジションを建てると資産配分が表示されます。", ko: "포지션을 개설하면 자산 배분이 표시됩니다.", es: "La asignación aparecerá al abrir una posición.", fr: "L'allocation apparaîtra après l'ouverture d'une position." },
  "Position workspace": { ja: "ポジションワークスペース", ko: "포지션 워크스페이스", es: "Espacio de posiciones", fr: "Espace des positions" },
  "Position views": { ja: "ポジション表示", ko: "포지션 보기", es: "Vistas de posiciones", fr: "Vues des positions" },
  "Current Positions": { ja: "現在のポジション", ko: "현재 포지션", es: "Posiciones actuales", fr: "Positions actuelles" },
  "Position History": { ja: "ポジション履歴", ko: "포지션 내역", es: "Historial de posiciones", fr: "Historique des positions" },
  "Activity Log": { ja: "取引履歴", ko: "활동 기록", es: "Registro de actividad", fr: "Journal d'activité" },
  "Current positions": { ja: "現在のポジション", ko: "현재 포지션", es: "Posiciones actuales", fr: "Positions actuelles" },
  Symbol: { ja: "銘柄", ko: "종목", es: "Símbolo", fr: "Symbole" },
  Size: { ja: "数量", ko: "수량", es: "Tamaño", fr: "Taille" },
  Entry: { ja: "エントリー価格", ko: "진입가", es: "Entrada", fr: "Entrée" },
  Mark: { ja: "マーク価格", ko: "표시 가격", es: "Precio de marca", fr: "Prix repère" },
  Margin: { ja: "証拠金", ko: "증거금", es: "Margen", fr: "Marge" },
  "Unrealized PnL (USDT)": { ja: "未実現 PnL（USDT）", ko: "미실현 PnL(USDT)", es: "PnL no realizado (USDT)", fr: "PnL latent (USDT)" },
  "No current positions": { ja: "現在のポジションはありません", ko: "현재 포지션이 없습니다", es: "No hay posiciones actuales", fr: "Aucune position actuelle" },
  Long: { ja: "ロング", ko: "롱", es: "Largo", fr: "Long" },
  Short: { ja: "ショート", ko: "숏", es: "Corto", fr: "Short" },
  Perp: { ja: "無期限", ko: "무기한", es: "Perpetuo", fr: "Perpétuel" },
  Cross: { ja: "クロス", ko: "교차", es: "Cruzado", fr: "Cross" },
  Isolated: { ja: "分離", ko: "격리", es: "Aislado", fr: "Isolée" },
  "Position history": { ja: "ポジション履歴", ko: "포지션 내역", es: "Historial de posiciones", fr: "Historique des positions" },
  "Opened At": { ja: "開始日時", ko: "개시 시간", es: "Apertura", fr: "Ouverture" },
  "Entry Price": { ja: "エントリー価格", ko: "진입가", es: "Precio de entrada", fr: "Prix d'entrée" },
  "Closed At": { ja: "決済日時", ko: "종료 시간", es: "Cierre", fr: "Clôture" },
  "Maximum Position Size": { ja: "最大ポジションサイズ", ko: "최대 포지션 규모", es: "Tamaño máximo de posición", fr: "Taille maximale de position" },
  "Exit Average": { ja: "平均決済価格", ko: "평균 청산가", es: "Precio medio de salida", fr: "Prix moyen de sortie" },
  "Realized PnL": { ja: "実現 PnL", ko: "실현 PnL", es: "PnL realizado", fr: "PnL réalisé" },
  "No position history": { ja: "ポジション履歴はありません", ko: "포지션 내역이 없습니다", es: "No hay historial de posiciones", fr: "Aucun historique de positions" },
  Spot: { ja: "現物", ko: "현물", es: "Spot", fr: "Spot" },
  Closed: { ja: "決済済み", ko: "청산됨", es: "Cerrada", fr: "Clôturée" },
  "Activity log": { ja: "取引履歴", ko: "활동 기록", es: "Registro de actividad", fr: "Journal d'activité" },
  "Open Long": { ja: "ロングを建てる", ko: "롱 진입", es: "Abrir largo", fr: "Ouvrir un long" },
  "Close Long": { ja: "ロングを決済", ko: "롱 청산", es: "Cerrar largo", fr: "Fermer le long" },
  "Open Short": { ja: "ショートを建てる", ko: "숏 진입", es: "Abrir corto", fr: "Ouvrir un short" },
  "Close Short": { ja: "ショートを決済", ko: "숏 청산", es: "Cerrar corto", fr: "Fermer le short" },
  "No activity records": { ja: "取引履歴はありません", ko: "활동 기록이 없습니다", es: "No hay registros de actividad", fr: "Aucun journal d'activité" },
  "Asset Curve": { ja: "資産曲線", ko: "자산 곡선", es: "Curva de activos", fr: "Courbe des actifs" },
  Strategy: { ja: "ストラテジー", ko: "전략", es: "Estrategia", fr: "Stratégie" },
  Benchmark: { ja: "ベンチマーク", ko: "벤치마크", es: "Benchmark", fr: "Benchmark" },
  "Strategy return over the selected period.": { ja: "選択期間におけるストラテジーのリターン。", ko: "선택한 기간의 전략 수익률입니다.", es: "Retorno de la estrategia durante el periodo seleccionado.", fr: "Rendement de la stratégie sur la période sélectionnée." },
  "Benchmark return over the selected period.": { ja: "選択期間におけるベンチマークのリターン。", ko: "선택한 기간의 벤치마크 수익률입니다.", es: "Retorno del benchmark durante el periodo seleccionado.", fr: "Rendement du benchmark sur la période sélectionnée." },
  Excess: { ja: "超過リターン", ko: "초과수익", es: "Exceso", fr: "Surperformance" },
  "Return above the benchmark. Excess return = strategy return - benchmark return.": {
    ja: "ベンチマークを上回るリターンです。超過リターン = ストラテジーリターン - ベンチマークリターン。",
    ko: "벤치마크를 초과한 수익입니다. 초과수익 = 전략 수익률 - 벤치마크 수익률.",
    es: "Retorno por encima del benchmark. Retorno excedente = retorno de estrategia - retorno del benchmark.",
    fr: "Rendement supérieur au benchmark. Surperformance = rendement de la stratégie - rendement du benchmark.",
  },
  "Asset Preferences": { ja: "資産配分", ko: "자산 배분", es: "Asignación de activos", fr: "Allocation des actifs" },
  "Top Asset": { ja: "主要資産", ko: "주요 자산", es: "Activo principal", fr: "Actif principal" },
  allocation: { ja: "配分", ko: "배분", es: "asignación", fr: "allocation" },
  "Daily Returns": { ja: "日次リターン", ko: "일간 수익률", es: "Retornos diarios", fr: "Rendements quotidiens" },
  Avg: { ja: "平均", ko: "평균", es: "Media", fr: "Moy." },
  "Average daily return in the selected period.": { ja: "選択期間の日次平均リターン。", ko: "선택한 기간의 일평균 수익률입니다.", es: "Retorno diario medio del periodo seleccionado.", fr: "Rendement quotidien moyen sur la période sélectionnée." },
  "Number of days with positive returns in the selected period.": { ja: "選択期間内でリターンがプラスとなった日数。", ko: "선택한 기간에 수익률이 양수인 일수입니다.", es: "Número de días con retornos positivos en el periodo seleccionado.", fr: "Nombre de jours avec un rendement positif sur la période sélectionnée." },
  "Number of days with negative returns in the selected period.": { ja: "選択期間内でリターンがマイナスとなった日数。", ko: "선택한 기간에 수익률이 음수인 일수입니다.", es: "Número de días con retornos negativos en el periodo seleccionado.", fr: "Nombre de jours avec un rendement négatif sur la période sélectionnée." },
  W: { ja: "勝", ko: "승", es: "G", fr: "G" },
  L: { ja: "敗", ko: "패", es: "P", fr: "P" },
};

const MAX_VISIBLE_ALLOCATION_ASSETS = 10;

const ALLOCATION_PALETTE = [
  "var(--td-allocation-1)",
  "var(--td-allocation-2)",
  "var(--td-allocation-3)",
  "var(--td-allocation-4)",
  "var(--td-allocation-5)",
  "var(--td-allocation-6)",
  "var(--td-allocation-7)",
  "var(--td-allocation-8)",
  "var(--td-allocation-9)",
  "var(--td-allocation-10)",
];

const PREFERRED_ALLOCATION_COLOR_INDEX: Record<string, number> = {
  ETH: 0,
  BTC: 1,
  SKL: 2,
  FIL: 3,
  SOL: 4,
  DOGE: 5,
  XRP: 6,
  BNB: 7,
  ETC: 8,
  PAXG: 9,
};

type TradeAllocationDatum = {
  asset: string;
  value: number;
  percent: number;
  color: string;
  isOther: boolean;
  memberCount: number;
};

function getAllocationColor(asset: string) {
  const preferredIndex = PREFERRED_ALLOCATION_COLOR_INDEX[asset];

  if (preferredIndex !== undefined) return ALLOCATION_PALETTE[preferredIndex];

  const hash = Array.from(asset).reduce((value, character) => (
    ((value << 5) - value + character.charCodeAt(0)) | 0
  ), 0);
  return ALLOCATION_PALETTE[Math.abs(hash) % ALLOCATION_PALETTE.length];
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

function isTradeEnvironment(value: string | null): value is TradeEnvironment {
  return value === "paper" || value === "live";
}

type TradeViewMode = "trading" | "analysis";
type AnalysisRange = "7D" | "30D" | "90D" | "365D";
type CurvePoint = { x: number; y: number; value: number };
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
type PendingTradeAction = "stop" | "delete" | null;

const analysisRanges: AnalysisRange[] = ["7D", "30D", "90D", "365D"];
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
const analysisCurveConfig: Record<AnalysisRange, { points: number; slope: number; volatility: number; labels: string[] }> = {
  "7D": { points: 18, slope: 46, volatility: 22, labels: ["04-12", "04-14", "04-16", "04-18"] },
  "30D": { points: 30, slope: 84, volatility: 38, labels: ["03-20", "03-27", "04-03", "04-10", "04-17"] },
  "90D": { points: 44, slope: 132, volatility: 65, labels: ["01-20", "02-10", "03-03", "03-24", "04-14"] },
  "365D": { points: 62, slope: 182, volatility: 104, labels: ["May", "Jul", "Sep", "Nov", "Jan", "Mar"] },
};
const analysisReturnConfig: Record<AnalysisRange, { points: number; labels: string[]; amplitude: number }> = {
  "7D": { points: 14, labels: ["04-12", "04-14", "04-16", "04-18"], amplitude: 0.48 },
  "30D": { points: 30, labels: ["03-20", "03-27", "04-03", "04-10", "04-17"], amplitude: 0.78 },
  "90D": { points: 52, labels: ["01-20", "02-03", "02-17", "03-02", "03-16", "03-30", "04-13"], amplitude: 1.14 },
  "365D": { points: 72, labels: ["May", "Jul", "Sep", "Nov", "Jan", "Mar"], amplitude: 1.36 },
};

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown" ? stored : "greenUpRedDown";
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return true;
}

function getChartColorTokens(mode: ChartColorMode) {
  return mode === "redUpGreenDown"
    ? {
        upHex: "#F43F5E",
        downHex: "#10B981",
      }
    : {
        upHex: "#10B981",
        downHex: "#F43F5E",
      };
}

function parseNumeric(text: string) {
  const value = Number(text.replace(/,/g, "").replace(/[A-Z ]+/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function formatAnalysisRangeLabel(range: AnalysisRange, uiLang: string) {
  if (uiLang !== "zh") return range;
  switch (range) {
    case "7D":
      return "7日";
    case "30D":
      return "30日";
    case "90D":
      return "90日";
    case "365D":
      return "365日";
    default:
      return range;
  }
}

function buildSeries(points: number, start: number, slope: number, volatility: number) {
  return Array.from({ length: points }, (_, index) => {
    const trend = (index / Math.max(1, points - 1)) * slope;
    const wave = Math.sin(index * 0.29) * volatility * 0.68;
    const pulse = Math.cos(index * 0.63) * volatility * 0.41;
    return Number((start + trend + wave + pulse).toFixed(2));
  });
}

function buildCurvePoints(
  values: number[],
  width: number,
  height: number,
  padding: number,
  min: number,
  max: number
): CurvePoint[] {
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values.map((value, index) => ({
    x: padding + (index * innerWidth) / Math.max(1, values.length - 1),
    y: height - padding - ((value - min) / range) * innerHeight,
    value,
  }));
}

function curvePath(points: CurvePoint[]) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function curveArea(points: CurvePoint[], height: number, padding: number) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${curvePath(points)} L ${last.x.toFixed(2)} ${(height - padding).toFixed(2)} L ${first.x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;
}

function classForTone(tone?: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-[var(--semantic-up)]";
  if (tone === "negative") return "text-[var(--semantic-down)]";
  return "text-foreground";
}

type TradeDetailProps = {
  mode?: "trade" | "marketplace";
  tradeOverride?: (typeof tradeBots)[number] | null;
};

export default function TradeDetail({ mode = "trade", tradeOverride }: TradeDetailProps = {}) {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string, copy: UiCopy = {}) =>
    translateUi(uiLang, en, zh, {
      ...tradeCopy[en],
      ...tradeDetailCopy[en],
      ...copy,
    });
  const performanceDateLabel = tr("Today", "今天");
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const [viewMode] = useState<TradeViewMode>("trading");
  const [activePerformancePeriod, setActivePerformancePeriod] = useState(performanceDateLabel);
  const [overviewMetric, setOverviewMetric] = useState<TradeTrendMetric>("return");
  const [activeAllocationAsset, setActiveAllocationAsset] = useState<string | null>(null);
  const [analysisCurveRange, setAnalysisCurveRange] = useState<AnalysisRange>("90D");
  const [analysisReturnRange, setAnalysisReturnRange] = useState<AnalysisRange>("30D");
  const [analysisCurveHoverIndex, setAnalysisCurveHoverIndex] = useState<number | null>(null);
  const [analysisReturnHoverIndex, setAnalysisReturnHoverIndex] = useState<number | null>(null);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const [pendingAction, setPendingAction] = useState<PendingTradeAction>(null);
  const [isReturningToTrade, setIsReturningToTrade] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [executionStatusOverride, setExecutionStatusOverride] = useState<{ tradeId: string; status: "running" | "paused" } | null>(null);
  const [refreshedAtByTrade, setRefreshedAtByTrade] = useState<Record<string, string>>({});
  const returnNavigationTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const tradeId = params?.id ?? "";
  const isMarketplaceDetail = mode === "marketplace";
  const trade = useMemo(
    () => tradeOverride ?? getTradeBotsWithDeployments(tradeBots).find((item) => item.id === tradeId),
    [tradeId, tradeOverride]
  );
  useEffect(() => {
    document.documentElement.classList.add("oq-trade-detail-active");
    return () => document.documentElement.classList.remove("oq-trade-detail-active");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);
  useEffect(() => {
    setActivePerformancePeriod(performanceDateLabel);
  }, [performanceDateLabel]);
  useEffect(() => () => {
    if (returnNavigationTimerRef.current !== null) {
      window.clearTimeout(returnNavigationTimerRef.current);
    }
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncPlainExplanation = () => setPlainExplainEnabled(readPlainExplanationEnabled());
    window.addEventListener("storage", syncPlainExplanation);
    window.addEventListener("focus", syncPlainExplanation);
    return () => {
      window.removeEventListener("storage", syncPlainExplanation);
      window.removeEventListener("focus", syncPlainExplanation);
    };
  }, []);
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);
  const semanticColorVars = useMemo(
    () =>
      ({
        "--semantic-up": chartColors.upHex,
        "--semantic-down": chartColors.downHex,
      }) as CSSProperties,
    [chartColors]
  );

  if (!trade) {
    return (
      <div className="space-y-6 min-w-0">
        <div className="surface-card border border-border/70 p-6">
          <p className="text-lg font-semibold text-foreground">{tr("Paper trading deployment not found", "未找到模拟盘")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {tr("The selected trade id does not exist in the current workspace.", "当前工作区中不存在所选交易 ID。")}
          </p>
          <Link href={isMarketplaceDetail ? "/marketplace" : "/trade"}>
            <Button className="mt-4 h-8 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
              {isMarketplaceDetail ? tr("Back to Marketplace", "返回广场") : tr("Back to Trade", "返回交易页")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const envFromQuery = searchParams.get("env");
  const runtimeEnvironment = isTradeEnvironment(envFromQuery) ? envFromQuery : trade.environment;
  const statusFromQuery = searchParams.get("status");
  const queriedStatus = statusFromQuery === "paused" ? "paused" : "running";
  const runtimeStatus = executionStatusOverride?.tradeId === tradeId
    ? executionStatusOverride.status
    : queriedStatus;
  const displayedUpdatedAt = refreshedAtByTrade[tradeId] ?? trade.updatedAt;
  const refreshTrade = () => {
    if (refreshTimerRef.current !== null) return;

    const updateTimestamp = () => {
      setRefreshedAtByTrade((current) => ({
        ...current,
        [tradeId]: formatRefreshTimestamp(new Date()),
      }));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      updateTimestamp();
      return;
    }

    setIsRefreshing(true);
    refreshTimerRef.current = window.setTimeout(() => {
      updateTimestamp();
      setIsRefreshing(false);
      refreshTimerRef.current = null;
    }, 620);
  };
  const returnToTrade = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (isMarketplaceDetail) return;
    event.preventDefault();
    if (returnNavigationTimerRef.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate("/trade");
      return;
    }

    setIsReturningToTrade(true);
    returnNavigationTimerRef.current = window.setTimeout(() => {
      window.sessionStorage.setItem(TRADE_RETURN_TRANSITION_STORAGE_KEY, "true");
      returnNavigationTimerRef.current = null;
      navigate("/trade");
    }, 220);
  };
  const toggleMarketplaceSubscription = () => {
    const nextSubscribed = !isSubscribed;
    setIsSubscribed(nextSubscribed);
    toast.success(
      nextSubscribed
        ? tr(`Telegram updates enabled for ${trade.name}.`, `已通过 Telegram 订阅「${trade.name}」交易动态。`)
        : tr(`Telegram updates disabled for ${trade.name}.`, `已取消「${trade.name}」的 Telegram 交易动态。`)
    );
  };
  const stopTrade = () => {
    setExecutionStatusOverride({ tradeId, status: "paused" });
    const nextSearchParams = new URLSearchParams(window.location.search);
    nextSearchParams.set("status", "paused");
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}?${nextSearchParams.toString()}`
    );
  };
  const confirmPendingAction = () => {
    if (pendingAction === "stop") stopTrade();
    if (pendingAction === "delete") {
      deleteTradeBotDeployment(tradeId);
      toast.success(tr("Paper trading deployment deleted", "模拟盘已删除"));
      navigate("/trade");
    }
    setPendingAction(null);
  };

  const visiblePositions = tradePositionRows.filter(
    (row) => row.environment === runtimeEnvironment
  );
  const currentPositionRows = visiblePositions.map((row) => {
    const margin = parseNumeric(row.margin);

    return {
      ...row,
      roi: margin > 0 ? (row.pnl / margin) * 100 : 0,
      signedSize: row.side === "short" && !row.size.startsWith("-") ? `-${row.size}` : row.size,
    };
  });
  const visibleFills = tradeFillRows.filter((row) => row.environment === runtimeEnvironment);
  const historicalPositions = tradeHistoryRows.filter((row) => row.environment === runtimeEnvironment);
  const realizedPnl = Number((trade.unrealizedPnl * 2.65).toFixed(2));
  const totalPnl = realizedPnl + trade.unrealizedPnl;
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const estimatedSharpe = Number((0.45 + trade.winRate / 32).toFixed(2));
  const maxDrawdown = Number((3.5 + (100 - trade.winRate) * 0.23).toFixed(2));
  const profitablePositions = visiblePositions.filter((row) => row.pnl > 0).length;
  const performanceMetrics = [
    {
      label: tr("Assets (USDT)", "资产（USDT）"),
      value: trade.equity.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      explanation: tr(
        "Shows the current total assets in this strategy account.",
        "表示当前策略账户的资产总额。"
      ),
    },
    {
      label: tr("PnL (USDT)", "盈亏（USDT）"),
      value: formatSigned(totalPnl),
      className: totalPnl >= 0 ? "is-positive" : "is-negative",
      explanation: tr(
        "Shows the total profit or loss over the selected period.",
        "表示所选周期内累计赚取或亏损的金额。"
      ),
    },
    {
      label: tr("Return", "收益率"),
      value: `${formatSigned(roi)}%`,
      className: roi >= 0 ? "is-positive" : "is-negative",
      explanation: tr(
        "Shows cumulative return over the selected period.",
        "表示所选周期内的累计收益比例。"
      ),
    },
    {
      label: tr("Sharpe Ratio", "夏普比率"),
      value: estimatedSharpe.toFixed(2),
      explanation: tr(
        "Measures return stability. Higher values generally indicate steadier performance.",
        "衡量收益的稳定性，数值越高通常越稳健。"
      ),
    },
    {
      label: tr("Max Drawdown", "最大回撤"),
      value: `${maxDrawdown.toFixed(2)}%`,
      explanation: tr(
        "Shows the largest historical decline. Lower values indicate less downside risk.",
        "表示历史最大跌幅，数值越低风险越小。"
      ),
    },
    {
      label: tr("Win Rate", "胜率"),
      value: `${trade.winRate.toFixed(2)}%`,
      explanation: tr(
        "Shows the percentage of profitable positions.",
        "表示盈利仓位占全部仓位的比例。"
      ),
    },
    {
      label: tr("Profitable Positions", "盈利仓位"),
      value: String(profitablePositions),
      explanation: tr(
        "Shows the number of profitable positions in the selected range.",
        "表示统计范围内盈利仓位的数量。"
      ),
    },
    {
      label: tr("Total Positions", "总仓位数量"),
      value: String(visiblePositions.length),
      explanation: tr(
        "Shows the total number of positions in the selected range.",
        "表示统计范围内的仓位总数。"
      ),
    },
  ];

  const overviewTrendData = useMemo(() => {
    return buildTradeTrendData({ returnRate: roi, pnl: totalPnl, updatedAt: trade.updatedAt });
  }, [roi, totalPnl, trade.updatedAt]);

  const overviewAllocation = useMemo(() => {
    const totals = new Map<string, number>();
    const configuredAllocation = trade.assetAllocation?.filter((item) => item.weight > 0) ?? [];

    if (configuredAllocation.length > 0) {
      configuredAllocation.forEach(({ asset, weight }) => totals.set(asset, weight));
    } else {
      visiblePositions.forEach((row) => {
        const asset = row.symbol.replace(/USDT$/, "");
        const margin = parseNumeric(row.margin);

        if (margin > 0) {
          totals.set(asset, (totals.get(asset) ?? 0) + margin);
        }
      });
    }

    const sortedAssets = Array.from(totals.entries()).sort(([, a], [, b]) => b - a);
    const assetCount = sortedAssets.length;

    if (assetCount === 0) {
      return { assetCount, items: [] as TradeAllocationDatum[] };
    }

    const visibleAssets = sortedAssets.slice(0, MAX_VISIBLE_ALLOCATION_ASSETS);
    const otherAssets = sortedAssets.slice(MAX_VISIBLE_ALLOCATION_ASSETS);
    const otherValue = otherAssets.reduce((sum, [, value]) => sum + value, 0);
    const groupedAssets = visibleAssets.map(([asset, value]) => ({ asset, value, memberCount: 1 }));

    if (otherValue > 0) {
      groupedAssets.push({ asset: "Other", value: otherValue, memberCount: otherAssets.length });
    }

    const total = groupedAssets.reduce((sum, item) => sum + item.value, 0);
    const items = groupedAssets.map(({ asset, value, memberCount }) => ({
      asset,
      value,
      percent: Number(((value / total) * 100).toFixed(2)),
      color: asset === "Other"
        ? "var(--td-chart-other)"
        : getAllocationColor(asset),
      isOther: asset === "Other",
      memberCount,
    }));
    const roundingDelta = Number((100 - items.reduce((sum, item) => sum + item.percent, 0)).toFixed(2));

    if (roundingDelta !== 0) {
      items[0] = { ...items[0], percent: Number((items[0].percent + roundingDelta).toFixed(2)) };
    }

    return { assetCount, items, usesConfiguredWeights: configuredAllocation.length > 0 };
  }, [trade.assetAllocation, visiblePositions]);
  const overviewAllocationData = overviewAllocation.items;
  const overviewAllocationAriaLabel = overviewAllocationData.length === 0
    ? tr("No open positions to allocate.", "当前没有可用于计算资产占比的持仓。")
    : overviewAllocation.usesConfiguredWeights
      ? tr(
          `Asset preference spans ${overviewAllocation.assetCount} assets: ${overviewAllocationData
            .map((item) => `${item.asset} ${item.percent.toFixed(2)}%`)
            .join(", ")}.`,
          `资产偏好包含 ${overviewAllocation.assetCount} 个资产：${overviewAllocationData
            .map((item) => `${item.asset} ${item.percent.toFixed(2)}%`)
            .join("，")}。`,
          {
            ja: `資産配分は ${overviewAllocation.assetCount} 資産：${overviewAllocationData
              .map((item) => `${item.isOther ? "その他" : item.asset} ${item.percent.toFixed(2)}%`)
              .join("、")}。`,
            ko: `자산 배분은 ${overviewAllocation.assetCount}개 자산으로 구성됩니다: ${overviewAllocationData
              .map((item) => `${item.isOther ? "기타" : item.asset} ${item.percent.toFixed(2)}%`)
              .join(", ")}.`,
            es: `La asignación abarca ${overviewAllocation.assetCount} activos: ${overviewAllocationData
              .map((item) => `${item.isOther ? "Otros" : item.asset} ${item.percent.toFixed(2)}%`)
              .join(", ")}.`,
            fr: `L'allocation couvre ${overviewAllocation.assetCount} actifs : ${overviewAllocationData
              .map((item) => `${item.isOther ? "Autres" : item.asset} ${item.percent.toFixed(2)} %`)
              .join(", ")}.`,
          }
        )
    : tr(
        `Current margin is allocated across ${overviewAllocation.assetCount} assets: ${overviewAllocationData
          .map((item) => `${item.asset} ${item.value.toFixed(2)} USDT, ${item.percent.toFixed(2)}%`)
          .join(", ")}.`,
        `当前保证金分布于 ${overviewAllocation.assetCount} 个资产：${overviewAllocationData
          .map((item) => `${item.isOther ? "其他" : item.asset} ${item.value.toFixed(2)} USDT，占比 ${item.percent.toFixed(2)}%`)
          .join("，")}。`,
        {
          ja: `現在の証拠金は ${overviewAllocation.assetCount} 資産に配分されています：${overviewAllocationData
            .map((item) => `${item.isOther ? "その他" : item.asset} ${item.value.toFixed(2)} USDT、${item.percent.toFixed(2)}%`)
            .join("、")}。`,
          ko: `현재 증거금은 ${overviewAllocation.assetCount}개 자산에 배분되어 있습니다: ${overviewAllocationData
            .map((item) => `${item.isOther ? "기타" : item.asset} ${item.value.toFixed(2)} USDT, ${item.percent.toFixed(2)}%`)
            .join(", ")}.`,
          es: `El margen actual se distribuye entre ${overviewAllocation.assetCount} activos: ${overviewAllocationData
            .map((item) => `${item.isOther ? "Otros" : item.asset} ${item.value.toFixed(2)} USDT, ${item.percent.toFixed(2)}%`)
            .join(", ")}.`,
          fr: `La marge actuelle est répartie sur ${overviewAllocation.assetCount} actifs : ${overviewAllocationData
            .map((item) => `${item.isOther ? "Autres" : item.asset} ${item.value.toFixed(2)} USDT, ${item.percent.toFixed(2)} %`)
            .join(", ")}.`,
        }
      );

  const analysisCurve = useMemo(() => {
    const cfg = analysisCurveConfig[analysisCurveRange];
    const width = 960;
    const height = 300;
    const padding = 24;
    const strategyValues = buildSeries(cfg.points, trade.equity * 0.84, cfg.slope, cfg.volatility);
    const benchmarkValues = buildSeries(cfg.points, trade.equity * 0.81, cfg.slope * 0.56, cfg.volatility * 0.45);
    const min = Math.min(...strategyValues, ...benchmarkValues) - 45;
    const max = Math.max(...strategyValues, ...benchmarkValues) + 45;
    const strategyPoints = buildCurvePoints(strategyValues, width, height, padding, min, max);
    const benchmarkPoints = buildCurvePoints(benchmarkValues, width, height, padding, min, max);
    const strategyReturn =
      ((strategyValues[strategyValues.length - 1] - strategyValues[0]) / Math.max(strategyValues[0], 1)) * 100;
    const benchmarkReturn =
      ((benchmarkValues[benchmarkValues.length - 1] - benchmarkValues[0]) / Math.max(benchmarkValues[0], 1)) * 100;
    return {
      width,
      height,
      padding,
      strategyValues,
      benchmarkValues,
      strategyPoints,
      benchmarkPoints,
      strategyPath: curvePath(strategyPoints),
      benchmarkPath: curvePath(benchmarkPoints),
      strategyArea: curveArea(strategyPoints, height, padding),
      labels: cfg.labels,
      strategyReturn,
      benchmarkReturn,
      excessReturn: strategyReturn - benchmarkReturn,
    };
  }, [analysisCurveRange, trade.equity]);
  const analysisCurveHoverPoint =
    analysisCurveHoverIndex !== null
      ? analysisCurve.strategyPoints[analysisCurveHoverIndex] ?? null
      : null;
  const analysisBenchmarkHoverPoint =
    analysisCurveHoverIndex !== null
      ? analysisCurve.benchmarkPoints[analysisCurveHoverIndex] ?? null
      : null;
  const equityCurveColor = analysisCurve.strategyReturn >= 0 ? "var(--semantic-up)" : "var(--semantic-down)";
  const analysisReturns = useMemo(() => {
    const cfg = analysisReturnConfig[analysisReturnRange];
    return Array.from({ length: cfg.points }, (_, index) => {
      const wave = Math.sin(index * 0.35) * cfg.amplitude * 0.62;
      const wobble = Math.cos(index * 0.78) * cfg.amplitude * 0.38;
      const pulse = (index % 9 === 0 ? -1 : 1) * cfg.amplitude * 0.11;
      return Number((wave + wobble + pulse).toFixed(3));
    });
  }, [analysisReturnRange]);
  const analysisReturnSummary = useMemo(() => {
    const avg = analysisReturns.reduce((acc, value) => acc + value, 0) / Math.max(1, analysisReturns.length);
    const wins = analysisReturns.filter((value) => value > 0).length;
    const losses = analysisReturns.filter((value) => value < 0).length;
    return { avg, wins, losses };
  }, [analysisReturns]);
  const analysisReturnHoverSlot = analysisReturnHoverIndex !== null ? 1064 / analysisReturns.length : 0;
  const analysisReturnHoverGeometry =
    analysisReturnHoverIndex !== null
      ? (() => {
          const value = analysisReturns[analysisReturnHoverIndex];
          const x = 28 + analysisReturnHoverIndex * analysisReturnHoverSlot + analysisReturnHoverSlot / 2;
          const magnitude = Math.min(105, (Math.abs(value) / 1.4) * 105);
          const barTop = value >= 0 ? 140 - magnitude : 140;
          const barBottom = value >= 0 ? 140 : 140 + magnitude;
          const y = value >= 0 ? Math.max(24, barTop - 8) : Math.min(252, barBottom + 8);
          return { x, y, value };
        })()
      : null;
  const assetPreferences = useMemo(() => {
    const baseSymbol = trade.symbol.replace("USDT", "");
    return [
      { label: baseSymbol, value: 36.2, color: "#5A73FF" },
      { label: "ETH", value: 18.4, color: "#43C6A3" },
      { label: "SOL", value: 12.1, color: "#F3B35A" },
      { label: "DOGE", value: 8.7, color: "#E1667C" },
      { label: "Other", value: 24.6, color: "#7A89A6" },
    ];
  }, [trade.symbol]);
  const translateMonthLabel = (label: string) => {
    const monthLabels: Record<string, UiCopy> = {
      May: { zh: "5月", ja: "5月", ko: "5월", es: "may.", fr: "mai" },
      Jul: { zh: "7月", ja: "7月", ko: "7월", es: "jul.", fr: "juil." },
      Sep: { zh: "9月", ja: "9月", ko: "9월", es: "sept.", fr: "sept." },
      Nov: { zh: "11月", ja: "11月", ko: "11월", es: "nov.", fr: "nov." },
      Jan: { zh: "1月", ja: "1月", ko: "1월", es: "ene.", fr: "janv." },
      Mar: { zh: "3月", ja: "3月", ko: "3월", es: "mar.", fr: "mars" },
    };
    return monthLabels[label]?.[uiLang] ?? label;
  };
  const translatePreferenceLabel = (label: string) => (label === "Other" ? tr("Other", "其他") : label);
  const translateFillAction = (action: string) => {
    switch (action) {
      case "Open Long":
        return tr("Open Long", "开多");
      case "Close Long":
        return tr("Close Long", "平多");
      case "Open Short":
        return tr("Open Short", "开空");
      case "Close Short":
        return tr("Close Short", "平空");
      default:
        return action;
    }
  };
  const renderFillSummary = (row: (typeof visibleFills)[number]) => {
    const parts: Record<string, ReactNode> = {
      en: <>Filled at an average price of <strong>{row.price} USDT</strong>, quantity <strong>{row.qty}</strong>, value <strong>{row.value}</strong></>,
      zh: <>以均价 <strong>{row.price} USDT</strong> 成交，数量 <strong>{row.qty}</strong>，成交额 <strong>{row.value}</strong></>,
      ja: <>平均価格 <strong>{row.price} USDT</strong> で約定、数量 <strong>{row.qty}</strong>、約定代金 <strong>{row.value}</strong></>,
      ko: <>평균 가격 <strong>{row.price} USDT</strong>에 체결, 수량 <strong>{row.qty}</strong>, 체결 금액 <strong>{row.value}</strong></>,
      es: <>Ejecutada a un precio medio de <strong>{row.price} USDT</strong>, cantidad <strong>{row.qty}</strong>, valor <strong>{row.value}</strong></>,
      fr: <>Exécutée au prix moyen de <strong>{row.price} USDT</strong>, quantité <strong>{row.qty}</strong>, valeur <strong>{row.value}</strong></>,
    };
    return parts[uiLang];
  };
  return (
    <div className={`oq-trade-detail min-w-0${isMarketplaceDetail ? " is-marketplace-detail" : ""}${isReturningToTrade ? " is-returning" : ""}${isRefreshing ? " is-refreshing" : ""}`} style={semanticColorVars}>
      <div className="oq-trade-detail-heading">
        <Link href={isMarketplaceDetail ? "/marketplace" : "/trade"} className="oq-trade-detail-back" onClick={returnToTrade}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          <span>{isMarketplaceDetail ? tr("Back to Marketplace", "返回广场") : tr("Back to Trade", "返回交易")}</span>
        </Link>

        <header className="oq-trade-detail-hero">
          <div className="oq-trade-detail-title-copy">
            <div className="oq-trade-detail-title-line">
              {!isMarketplaceDetail ? <span className="oq-trade-detail-id">{trade.id}</span> : null}
              <h1>{trade.name}</h1>
            </div>
            <div className="oq-trade-detail-meta">
              <span aria-live="polite">{tr("Updated", "更新于")} {displayedUpdatedAt}</span>
              <span className="oq-trade-detail-record-id">{trade.recordId}</span>
              {!isMarketplaceDetail ? <div className="oq-trade-detail-title-tags">
                <span className={`oq-trade-detail-mode ${runtimeEnvironment === "paper" ? "is-paper" : "is-live"}`}>
                  {runtimeEnvironment === "paper" ? tr("Paper", "模拟") : tr("Live", "实盘")}
                </span>
                <span
                  className={`oq-trade-detail-status ${runtimeStatus === "running" ? "is-running" : "is-paused"}`}
                  aria-live="polite"
                >
                  <span aria-hidden="true" />
                  {runtimeStatus === "running" ? tr("Running", "运行中") : tr("Stopped", "已停止")}
                </span>
              </div> : null}
            </div>
          </div>

          <div className="oq-trade-detail-statuses" aria-label={tr("Trade controls", "交易控制")}>
            {isMarketplaceDetail ? (
              <button
                type="button"
                className={`oq-trade-detail-subscribe${isSubscribed ? " is-subscribed" : ""}`}
                aria-pressed={isSubscribed}
                aria-label={isSubscribed ? tr("Subscribed on Telegram", "已通过 Telegram 订阅") : tr("Subscribe on Telegram", "通过 Telegram 订阅")}
                onClick={toggleMarketplaceSubscription}
              >
                {isSubscribed ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
                {isSubscribed ? tr("Subscribed", "已订阅") : tr("Subscribe", "订阅")}
              </button>
            ) : runtimeStatus === "running" ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`oq-trade-detail-action${isRefreshing ? " is-refreshing" : ""}`}
                      aria-label={isRefreshing ? tr("Refreshing", "正在刷新") : tr("Refresh", "刷新")}
                      aria-busy={isRefreshing}
                      disabled={isRefreshing}
                      onClick={refreshTrade}
                    >
                      <RefreshCw aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isRefreshing ? tr("Refreshing", "正在刷新") : tr("Refresh", "刷新")}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={tr("Stop", "停止")}
                      onClick={() => setPendingAction("stop")}
                    >
                      <svg
                        aria-hidden="true"
                        className="oq-trade-detail-stop-icon"
                        viewBox="-128 -128 1280 1280"
                      >
                        <path
                          fill="currentColor"
                          d="M768 960c-26.24 0-48-21.76-48-48V112c0-26.24 21.76-48 48-48s48 21.76 48 48v800c0 26.24-21.76 48-48 48zM256 960c-26.24 0-48-21.76-48-48V112c0-26.24 21.76-48 48-48s48 21.76 48 48v800c0 26.24-21.76 48-48 48z"
                        />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tr("Stop", "停止")}</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="oq-trade-detail-action"
                    aria-label={tr("Restart", "重新启动")}
                    onClick={() => {
                      setExecutionStatusOverride({ tradeId, status: "running" });

                      if (typeof window !== "undefined") {
                        const nextSearchParams = new URLSearchParams(window.location.search);
                        nextSearchParams.set("status", "running");
                        window.history.replaceState(
                          window.history.state,
                          "",
                          `${window.location.pathname}?${nextSearchParams.toString()}`
                        );
                      }
                    }}
                  >
                    <Play aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{tr("Restart", "重新启动")}</TooltipContent>
              </Tooltip>
            )}

            {!isMarketplaceDetail ? <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={tr("More", "更多")}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">{tr("More", "更多")}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="oq-trade-detail-action-menu"
              >
                <DropdownMenuItem
                  className="oq-trade-detail-action-menu-item is-destructive"
                  variant="destructive"
                  onSelect={() => setPendingAction("delete")}
                >
                  <Trash2 aria-hidden="true" />
                  {tr("Delete", "删除")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> : null}
          </div>
        </header>
      </div>

      <Tabs defaultValue="trade" className="oq-trade-detail-view">
        {isMarketplaceDetail ? (
          <div className="oq-marketplace-detail-tabs-bar">
            <TabsList
              className="oq-marketplace-detail-tabs-list"
              aria-label={tr("Strategy detail views", "策略详情视图")}
            >
              <TabsTrigger value="trade">{tr("Trading", "交易")}</TabsTrigger>
              <TabsTrigger value="backtest">{tr("Backtest", "回测")}</TabsTrigger>
            </TabsList>
          </div>
        ) : null}

        <TabsContent value="trade" className="oq-trade-detail-view-content">
          <section className="oq-trade-overview" aria-label={tr("Strategy overview", "策略概览")}>
        <div className="oq-trade-overview-grid">
          <article className="oq-trade-overview-card oq-trade-performance-card" aria-labelledby="trade-performance-period-title">
            <div className="oq-trade-performance-header">
              <h2 id="trade-performance-period-title">
                {localizeDateRangeLabel(activePerformancePeriod, uiLang)}
              </h2>
              <StrategyReportDateControl
                dateLabel={performanceDateLabel}
                dateOptions={[
                  performanceDateLabel,
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
                onSelectionChange={setActivePerformancePeriod}
                labels={{
                  selectPeriod: tr("Select performance period", "选择表现周期"),
                  customRange: tr("Custom date range", "自定义时间范围"),
                  startDate: tr("Start date", "开始日期"),
                  endDate: tr("End date", "结束日期"),
                  switchPeriod: tr("Switch", "切换"),
                }}
              />
            </div>

            <dl className="oq-trade-performance-metrics">
              {performanceMetrics.map((metric) => (
                <MaybeExplainTooltip
                  enabled={plainExplainEnabled}
                  explanation={metric.explanation}
                  key={metric.label}
                >
                  <div tabIndex={plainExplainEnabled ? 0 : undefined}>
                    <dt>{metric.label}</dt>
                    <dd className={metric.className}>{metric.value}</dd>
                  </div>
                </MaybeExplainTooltip>
              ))}
            </dl>
          </article>

          <article className="oq-trade-overview-card oq-trade-trend-card" aria-labelledby="trade-trend-title">
            <header className="oq-trade-overview-card-header oq-trade-trend-header">
              <h2 id="trade-trend-title">{tr("Performance Trend", "收益走势")}</h2>
              <div className="oq-trade-trend-selector" role="group" aria-label={tr("Trend metric", "走势指标")}>
                <button
                  type="button"
                  className={overviewMetric === "return" ? "is-active" : ""}
                  aria-pressed={overviewMetric === "return"}
                  onClick={() => setOverviewMetric("return")}
                >
                  {tr("Return", "收益率")}
                </button>
                <button
                  type="button"
                  className={overviewMetric === "pnl" ? "is-active" : ""}
                  aria-pressed={overviewMetric === "pnl"}
                  onClick={() => setOverviewMetric("pnl")}
                >
                  {tr("PnL", "盈亏")}
                </button>
              </div>
            </header>

            <TradeTrendChart
              data={overviewTrendData}
              metric={overviewMetric}
              metricLabel={overviewMetric === "return" ? tr("Return", "收益率") : tr("PnL", "盈亏")}
              year={trade.updatedAt.slice(0, 4)}
              ariaLabel={
                overviewMetric === "return"
                  ? tr(`30-day return trend ending at ${formatSigned(roi)}%.`, `近 30 天收益率走势，期末为 ${formatSigned(roi)}%。`)
                  : tr(`30-day PnL trend ending at ${formatSigned(totalPnl)} USDT.`, `近 30 天盈亏走势，期末为 ${formatSigned(totalPnl)} USDT。`)
              }
            />
          </article>

          <article className="oq-trade-overview-card oq-trade-allocation-card" aria-labelledby="trade-allocation-title">
            <header className="oq-trade-overview-card-header">
              <h2 id="trade-allocation-title">{tr("Asset Preference", "资产偏好")}</h2>
            </header>

            {overviewAllocationData.length > 0 ? (
              <div
                className="oq-trade-allocation-body"
                onMouseLeave={() => setActiveAllocationAsset(null)}
                onPointerLeave={() => setActiveAllocationAsset(null)}
              >
                <div className="oq-trade-allocation-visual">
                  <ChartContainer
                    className="oq-trade-allocation-chart"
                    config={{ allocation: { label: tr("Allocation", "资产占比") } }}
                    role="img"
                    aria-label={overviewAllocationAriaLabel}
                  >
                    <RechartsPieChart accessibilityLayer>
                      <RechartsTooltip
                        cursor={false}
                        wrapperStyle={{ zIndex: 4, pointerEvents: "none" }}
                        content={(
                          <TradeAllocationTooltip
                            otherLabel={tr("Other", "其他")}
                            itemUnitLabel={tr("assets", "项")}
                          />
                        )}
                      />
                      <Pie
                        data={overviewAllocationData}
                        dataKey="percent"
                        nameKey="asset"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={overviewAllocationData.length > 6 ? 0.75 : 2}
                        stroke="var(--td-bg)"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {overviewAllocationData.map((item) => (
                          <Cell
                            key={item.asset}
                            className="oq-trade-allocation-cell"
                            fill={item.color}
                            opacity={activeAllocationAsset === null || activeAllocationAsset === item.asset ? 1 : 0.18}
                            strokeWidth={activeAllocationAsset === item.asset ? 3 : 2}
                            onMouseEnter={() => setActiveAllocationAsset(item.asset)}
                          />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                </div>

                <div
                  className="oq-trade-allocation-legend"
                  role="group"
                  aria-label={tr("Asset allocation details", "资产占比明细")}
                >
                  {overviewAllocationData.map((item) => (
                    <button
                      type="button"
                      key={item.asset}
                      aria-pressed={activeAllocationAsset === item.asset}
                      aria-label={`${item.isOther ? tr("Other", "其他") : item.asset}: ${item.percent.toFixed(2)}%`}
                      onFocus={() => setActiveAllocationAsset(item.asset)}
                      onBlur={() => setActiveAllocationAsset(null)}
                      onMouseEnter={() => setActiveAllocationAsset(item.asset)}
                      onPointerEnter={() => setActiveAllocationAsset(item.asset)}
                    >
                      <span className="oq-trade-allocation-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                      <span title={item.isOther ? tr("Other", "其他") : item.asset}>
                        {item.isOther ? tr("Other", "其他") : item.asset}
                      </span>
                      <strong>{item.percent.toFixed(2)}%</strong>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="oq-trade-allocation-empty" role="status">
                <PieChart aria-hidden="true" />
                <strong>{tr("No open positions", "暂无当前仓位")}</strong>
                <span>{tr("Allocation will appear after a position is opened.", "开仓后将在这里显示资产占比。")}</span>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="oq-trade-workspace" aria-label={tr("Position workspace", "仓位工作台")}>
        <Tabs defaultValue="current" className="oq-trade-workspace-tabs">
          <div className="oq-trade-workspace-tabs-header">
            <TabsList className="oq-trade-workspace-tabs-list" aria-label={tr("Position views", "仓位视图")}>
              <TabsTrigger value="current">{tr("Current Positions", "当前仓位")}</TabsTrigger>
              <TabsTrigger value="history">{tr("Position History", "历史仓位")}</TabsTrigger>
              <TabsTrigger value="activity">{tr("Activity Log", "操作记录")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="current" className="oq-trade-workspace-tab-panel">
            <TradeWorkspaceTable
              label={tr("Current positions", "当前仓位")}
              className="is-current-positions"
              headers={[
                tr("Symbol", "交易对"),
                tr("Size", "数量"),
                tr("Entry", "开仓均价"),
                tr("Mark", "标记价格"),
                tr("Margin", "保证金"),
                tr("Unrealized PnL (USDT)", "未实现盈亏（USDT）"),
                tr("Return", "收益率"),
              ]}
              isEmpty={currentPositionRows.length === 0}
              emptyMessage={tr("No current positions", "暂无当前仓位")}
            >
              {currentPositionRows.map((row) => (
                <tr key={row.id}>
                  <td className="oq-trade-position-symbol">
                    <div className="oq-trade-position-symbol-line">
                      <strong>{row.symbol}</strong>
                    </div>
                    <div className="oq-trade-position-meta">
                      <span className={`oq-trade-position-direction is-${row.side}`}>
                        {row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}
                      </span>
                      <span>{tr("Perp", "永续")}</span>
                      <span>{row.leverage}</span>
                    </div>
                  </td>
                  <td className={`oq-trade-position-size is-${row.side}`}>
                    {row.signedSize}
                  </td>
                  <td className="oq-trade-position-number">{row.entry}</td>
                  <td className="oq-trade-position-number">{row.mark}</td>
                  <td className="oq-trade-position-stack">
                    <strong>{row.margin}</strong>
                    <span className="oq-trade-position-margin-mode">
                      {row.marginMode === "cross" ? tr("Cross", "全仓") : tr("Isolated", "逐仓")}
                    </span>
                  </td>
                  <td className={`oq-trade-workspace-value ${row.pnl >= 0 ? "is-positive" : "is-negative"}`}>
                    <strong>{formatSigned(row.pnl)} USDT</strong>
                  </td>
                  <td className={`oq-trade-workspace-value ${row.roi >= 0 ? "is-positive" : "is-negative"}`}>
                    <strong>{formatSigned(row.roi)}%</strong>
                  </td>
                </tr>
              ))}
            </TradeWorkspaceTable>
          </TabsContent>

          <TabsContent value="history" className="oq-trade-workspace-tab-panel">
            <TradeWorkspaceTable
              label={tr("Position history", "历史仓位")}
              className="is-history-positions"
              headers={[
                tr("Symbol", "交易对"),
                tr("Opened At", "开仓时间"),
                tr("Entry Price", "开仓价格"),
                tr("Closed At", "全部平仓"),
                tr("Maximum Position Size", "最大持仓量"),
                tr("Exit Average", "平仓均价"),
                tr("Realized PnL", "平仓盈亏"),
              ]}
              isEmpty={historicalPositions.length === 0}
              emptyMessage={tr("No position history", "暂无历史仓位")}
            >
              {historicalPositions.map((row) => {
                const [openedDate, openedTime] = row.openedAt.split(" ");
                const [closedDate, closedTime] = row.closedAt.split(" ");

                return (
                  <tr key={row.id}>
                    <td className="oq-trade-position-symbol">
                      <div className="oq-trade-position-symbol-line">
                        <strong>{row.symbol}</strong>
                      </div>
                      <div className="oq-trade-position-meta">
                        <span className={`oq-trade-position-direction is-${row.side}`}>
                          {row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}
                        </span>
                        <span>{row.marginMode === "cross" ? tr("Cross", "全仓") : tr("Isolated", "逐仓")}</span>
                        <span>{row.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")}</span>
                        <span>{row.leverage}</span>
                      </div>
                    </td>
                    <td className="oq-trade-history-time">
                      <strong>{openedDate}</strong>
                      <span>{openedTime}</span>
                    </td>
                    <td className="oq-trade-position-number">{row.entryPrice}</td>
                    <td className="oq-trade-history-time">
                      <strong>{closedDate}</strong>
                      <span>{closedTime}</span>
                    </td>
                    <td className="oq-trade-position-stack">
                      <strong>{row.maxSize}</strong>
                      <div className="oq-trade-history-closed-line">
                        <span>{tr("Closed", "已平仓")}</span>
                        <strong>{row.closedSize}</strong>
                      </div>
                    </td>
                    <td className="oq-trade-position-number">{row.exitPrice}</td>
                    <td className={`oq-trade-workspace-value ${row.realizedPnl >= 0 ? "is-positive" : "is-negative"}`}>
                      {formatSigned(row.realizedPnl)} USDT
                    </td>
                  </tr>
                );
              })}
            </TradeWorkspaceTable>
          </TabsContent>

          <TabsContent value="activity" className="oq-trade-workspace-tab-panel">
            {visibleFills.length > 0 ? (
              <ol className="oq-trade-activity-list" aria-label={tr("Activity log", "操作记录")}>
                {visibleFills.map((row) => {
                  const [date, clock] = row.time.split(" ");
                  const isOpen = row.action.startsWith("Open");
                  const directionClass = row.action.endsWith("Long") ? "is-long" : "is-short";

                  return (
                    <li key={row.id} className={`oq-trade-activity-item ${isOpen ? "is-open" : "is-close"}`}>
                      <time className="oq-trade-activity-time" dateTime={`2026-${row.time.replace(" ", "T")}`}>
                        <span>{date},</span>
                        <strong>{clock}</strong>
                      </time>

                      <div className="oq-trade-activity-marker" aria-hidden="true">
                        <span />
                      </div>

                      <div className="oq-trade-activity-content">
                        <header className="oq-trade-activity-header">
                          <div className="oq-trade-activity-identity">
                            <strong>{row.symbol}</strong>
                            <span className={`oq-trade-position-direction ${directionClass}`}>
                              {translateFillAction(row.action)}
                            </span>
                            <span className="oq-trade-activity-market">
                              {row.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")}
                            </span>
                          </div>
                        </header>

                        <p className="oq-trade-activity-summary">
                          <span className="oq-trade-activity-fill-detail">
                            {renderFillSummary(row)}
                          </span>
                          {row.realizedPnl !== undefined ? (
                            <span className={`oq-trade-activity-pnl ${row.realizedPnl >= 0 ? "is-positive" : "is-negative"}`}>
                              <span>{tr("Realized PnL", "，已实现盈亏")}</span>
                              <strong>{formatSigned(row.realizedPnl)} USDT</strong>
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="oq-trade-workspace-empty">{tr("No activity records", "暂无操作记录")}</div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {viewMode === "analysis" ? (
        <>
          <div className="grid grid-cols-1 gap-5">
            <DashboardPanel
              title={tr("Asset Curve", "资产曲线")}
              icon={BarChart3}
              showHeaderDivider={false}
              flushHeaderBottom
              actions={
                <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
                  {analysisRanges.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setAnalysisCurveRange(item);
                        setAnalysisCurveHoverIndex(null);
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors ${
                        analysisCurveRange === item
                          ? "border border-primary/45 bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {formatAnalysisRangeLabel(item, uiLang)}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="flex min-h-[285px] flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <ChartLegendItem color={equityCurveColor} label={tr("Strategy", "策略")} />
                    <ChartLegendItem color="var(--chart-1)" label={tr("Benchmark", "基准")} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <ExplainStat
                      label={tr("Strategy", "策略")}
                      value={`${formatSigned(analysisCurve.strategyReturn)}%`}
                      tone={analysisCurve.strategyReturn >= 0 ? "positive" : "negative"}
                      explanation={tr("Strategy return over the selected period.", "所选周期内策略自身的收益率。")}
                      explainEnabled={plainExplainEnabled}
                    />
                    <ExplainStat
                      label={tr("Benchmark", "基准")}
                      value={`${formatSigned(analysisCurve.benchmarkReturn)}%`}
                      tone={analysisCurve.benchmarkReturn >= 0 ? "positive" : "negative"}
                      explanation={tr("Benchmark return over the selected period.", "所选周期内基准资产或参考组合的收益率。")}
                      explainEnabled={plainExplainEnabled}
                    />
                    <ExplainStat
                      label={tr("Excess", "超额")}
                      value={`${formatSigned(analysisCurve.excessReturn)}%`}
                      tone={analysisCurve.excessReturn >= 0 ? "positive" : "negative"}
                      explanation={tr("Return above the benchmark. Excess return = strategy return - benchmark return.", "相对基准多获得的收益，超额收益 = 策略收益 - 基准收益。")}
                      explainEnabled={plainExplainEnabled}
                    />
                  </div>
                </div>

                <div className="relative h-[205px] sm:h-[225px]">
                  <svg
                    viewBox={`0 0 ${analysisCurve.width} ${analysisCurve.height}`}
                    preserveAspectRatio="none"
                    className="block h-full w-full"
                    onMouseMove={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const ratio = (event.clientX - rect.left) / rect.width;
                      const index = Math.round(
                        Math.max(0, Math.min(1, ratio)) * (analysisCurve.strategyValues.length - 1)
                      );
                      setAnalysisCurveHoverIndex(index);
                    }}
                    onMouseLeave={() => setAnalysisCurveHoverIndex(null)}
                  >
                    <defs>
                      <linearGradient id="trade-curve-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={equityCurveColor} stopOpacity="0.24" />
                        <stop offset="100%" stopColor={equityCurveColor} stopOpacity="0.03" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width={analysisCurve.width}
                      height={analysisCurve.height}
                      rx="14"
                      fill="var(--muted)"
                      opacity="0.38"
                    />
                    {Array.from({ length: 6 }, (_, index) => (
                      <line
                        key={`curve-grid-${index}`}
                        x1={analysisCurve.padding}
                        y1={analysisCurve.padding + index * ((analysisCurve.height - analysisCurve.padding * 2) / 5)}
                        x2={analysisCurve.width - analysisCurve.padding}
                        y2={analysisCurve.padding + index * ((analysisCurve.height - analysisCurve.padding * 2) / 5)}
                        stroke="var(--border)"
                        opacity="0.72"
                        strokeDasharray="3 8"
                      />
                    ))}
                    <path d={analysisCurve.strategyArea} fill="url(#trade-curve-fill)" />
                    <path
                      d={analysisCurve.strategyPath}
                      fill="none"
                      stroke={equityCurveColor}
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <path
                      d={analysisCurve.benchmarkPath}
                      fill="none"
                      stroke="var(--chart-1)"
                      strokeWidth="2.3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    {analysisCurveHoverPoint ? (
                      <line
                        x1={analysisCurveHoverPoint.x}
                        y1={analysisCurve.padding}
                        x2={analysisCurveHoverPoint.x}
                        y2={analysisCurve.height - analysisCurve.padding}
                        stroke="var(--muted-foreground)"
                        opacity="0.35"
                        strokeDasharray="4 6"
                      />
                    ) : null}
                  </svg>

                  {analysisCurveHoverPoint ? (
                    <>
                      <span
                        className="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm"
                        style={{
                          left: `${(analysisCurveHoverPoint.x / analysisCurve.width) * 100}%`,
                          top: `${(analysisCurveHoverPoint.y / analysisCurve.height) * 100}%`,
                          backgroundColor: equityCurveColor,
                        }}
                      />
                      {analysisBenchmarkHoverPoint ? (
                        <span
                          className="pointer-events-none absolute z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--chart-1)] shadow-sm"
                          style={{
                            left: `${(analysisBenchmarkHoverPoint.x / analysisCurve.width) * 100}%`,
                            top: `${(analysisBenchmarkHoverPoint.y / analysisCurve.height) * 100}%`,
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}

                  {analysisCurveHoverIndex !== null ? (
                    <div
                      className="pointer-events-none absolute z-30 w-max min-w-[148px] rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                      style={{
                        left: `${(analysisCurve.strategyPoints[analysisCurveHoverIndex].x / analysisCurve.width) * 100}%`,
                        transform:
                          analysisCurveHoverIndex === 0
                            ? "translateX(0)"
                            : analysisCurveHoverIndex === analysisCurve.strategyPoints.length - 1
                              ? "translateX(-100%)"
                              : "translateX(-50%)",
                        top: 18,
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {translateMonthLabel(analysisCurve.labels[
                          Math.min(
                            analysisCurve.labels.length - 1,
                            Math.floor((analysisCurveHoverIndex / Math.max(1, analysisCurve.strategyValues.length - 1)) * analysisCurve.labels.length)
                          )
                        ])}
                      </div>
                      <div className="mt-1 grid grid-cols-[auto_auto_1fr] items-center gap-2 whitespace-nowrap">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: equityCurveColor }} />
                        <span className="text-muted-foreground">{tr("Strategy", "策略")}</span>
                        <span className="text-right font-semibold text-foreground">
                          {analysisCurve.strategyValues[analysisCurveHoverIndex].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-[auto_auto_1fr] items-center gap-2 whitespace-nowrap">
                        <span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />
                        <span className="text-muted-foreground">{tr("Benchmark", "基准")}</span>
                        <span className="text-right font-semibold text-foreground">
                          {analysisCurve.benchmarkValues[analysisCurveHoverIndex].toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-between text-[11px] text-muted-foreground">
                  {analysisCurve.labels.map((label) => (
                    <span key={label}>{translateMonthLabel(label)}</span>
                  ))}
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title={tr("Asset Preferences", "资产偏好")} icon={PieChart} showHeaderDivider={false} flushHeaderBottom>
              <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[0.75fr_1.25fr]">
                <div className="flex items-center justify-center">
                  <div className="relative h-[244px] w-[244px] sm:h-[272px] sm:w-[272px]">
                    <svg viewBox="0 0 260 260" className="h-full w-full">
                      <circle cx="130" cy="130" r="84" fill="none" stroke="var(--border)" strokeWidth="34" opacity="0.65" />
                      {(() => {
                        const circumference = 2 * Math.PI * 84;
                        let offset = 0;
                        return assetPreferences.map((slice) => {
                          const length = (slice.value / 100) * circumference;
                          const node = (
                            <circle
                              key={slice.label}
                              cx="130"
                              cy="130"
                              r="84"
                              fill="none"
                              stroke={slice.color}
                              strokeWidth="34"
                              strokeDasharray={`${length} ${circumference - length}`}
                              strokeDashoffset={-offset}
                              transform="rotate(-90 130 130)"
                              opacity="0.9"
                            />
                          );
                          offset += length;
                          return node;
                        });
                      })()}
                    </svg>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{tr("Top Asset", "核心资产")}</div>
                      <div className="mt-1 max-w-[86px] truncate text-lg font-semibold leading-none text-foreground">
                        {translatePreferenceLabel(assetPreferences[0]?.label ?? "")}
                      </div>
                      <div className="mt-1 max-w-[96px] text-[11px] leading-4 text-muted-foreground">
                        {assetPreferences[0]?.value.toFixed(2)}% {tr("allocation", "仓位占比")}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
                  {assetPreferences.map((slice) => (
                    <div key={slice.label} className="flex min-h-8 items-center justify-between rounded-lg px-2.5 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        <span className="font-medium text-muted-foreground">{translatePreferenceLabel(slice.label)}</span>
                      </span>
                      <span className="font-semibold text-foreground">{slice.value.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </div>

          <DashboardPanel
            title={tr("Daily Returns", "日收益")}
            icon={Activity}
            showHeaderDivider={false}
            flushHeaderBottom
            actions={
              <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-muted-foreground">
                <ExplainStat
                  label={tr("Avg", "均值")}
                  value={`${formatSigned(analysisReturnSummary.avg)}%`}
                  tone={analysisReturnSummary.avg >= 0 ? "positive" : "negative"}
                  explanation={tr("Average daily return in the selected period.", "所选周期内每日收益率的平均值。")}
                  explainEnabled={plainExplainEnabled}
                />
                <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={tr("Number of days with positive returns in the selected period.", "所选周期内收益为正的交易日数量。")}>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--semantic-up)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-up)]" />
                    {tr("W", "胜")}{analysisReturnSummary.wins}
                  </span>
                </MaybeExplainTooltip>
                <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={tr("Number of days with negative returns in the selected period.", "所选周期内收益为负的交易日数量。")}>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[var(--semantic-down)]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--semantic-down)]" />
                    {tr("L", "负")}{analysisReturnSummary.losses}
                  </span>
                </MaybeExplainTooltip>
                <div className="ml-1 flex items-center gap-1 rounded-lg border border-border/70 bg-accent/35 p-1">
                  {analysisRanges.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setAnalysisReturnRange(item);
                        setAnalysisReturnHoverIndex(null);
                      }}
                      className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium tracking-[0.08em] transition-colors ${
                        analysisReturnRange === item
                          ? "border border-primary/45 bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {formatAnalysisRangeLabel(item, uiLang)}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            <div className="relative">
              <svg
                viewBox="0 0 1120 280"
                preserveAspectRatio="none"
                className="block h-[220px] w-full sm:h-[240px]"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const svgX = ((event.clientX - rect.left) / rect.width) * 1120;
                  const plotX = Math.max(28, Math.min(1092, svgX));
                  const slot = 1064 / analysisReturns.length;
                  const index = Math.max(0, Math.min(analysisReturns.length - 1, Math.floor((plotX - 28) / slot)));
                  setAnalysisReturnHoverIndex(index);
                }}
                onMouseLeave={() => setAnalysisReturnHoverIndex(null)}
              >
                <rect x="0" y="0" width="1120" height="280" rx="14" fill="var(--muted)" opacity="0.38" />
                {Array.from({ length: 5 }, (_, index) => (
                  <line
                    key={`ret-grid-${index}`}
                    x1="28"
                    y1={32 + index * 54}
                    x2="1092"
                    y2={32 + index * 54}
                    stroke="var(--border)"
                    opacity="0.72"
                    strokeDasharray="3 8"
                  />
                ))}
                <line x1="28" y1="140" x2="1092" y2="140" stroke="var(--muted-foreground)" opacity="0.28" />
                {analysisReturns.map((value, index) => {
                  const slot = 1064 / analysisReturns.length;
                  const barWidth = Math.max(8, slot - 6);
                  const x = 28 + index * slot + (slot - barWidth) / 2;
                  const magnitude = Math.min(105, (Math.abs(value) / 1.4) * 105);
                  const y = value >= 0 ? 140 - magnitude : 140;
                  return (
                    <rect
                      key={`ret-bar-${index}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(3, magnitude)}
                      rx="2"
                      fill={value >= 0 ? "var(--semantic-up)" : "var(--semantic-down)"}
                      opacity={analysisReturnHoverIndex === index ? 1 : 0.92}
                    />
                  );
                })}
                {analysisReturnHoverIndex !== null ? (
                  (() => {
                    const slot = 1064 / analysisReturns.length;
                    const x = 28 + analysisReturnHoverIndex * slot + slot / 2;
                    return (
                      <line
                        x1={x}
                        y1="24"
                        x2={x}
                        y2="252"
                        stroke="var(--muted-foreground)"
                        opacity="0.35"
                        strokeDasharray="4 6"
                      />
                    );
                  })()
                ) : null}
              </svg>

              {analysisReturnHoverIndex !== null ? (
                <div
                  className="pointer-events-none absolute rounded-lg border border-border/80 bg-background/95 px-3 py-2 text-xs shadow-xl"
                  style={{
                    left: `${(((analysisReturnHoverGeometry?.x ?? 28) / 1120) * 100)}%`,
                    transform:
                      analysisReturnHoverIndex === 0
                        ? `translate(0, ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`
                        : analysisReturnHoverIndex === analysisReturns.length - 1
                          ? `translate(-100%, ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`
                          : `translate(-50%, ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "calc(-100% - 8px)" : "8px"})`,
                    top: `${(((analysisReturnHoverGeometry?.y ?? 24) / 280) * 100)}%`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {translateMonthLabel(analysisReturnConfig[analysisReturnRange].labels[
                      Math.min(
                        analysisReturnConfig[analysisReturnRange].labels.length - 1,
                        Math.floor(
                          (analysisReturnHoverIndex / Math.max(1, analysisReturns.length - 1)) *
                            analysisReturnConfig[analysisReturnRange].labels.length
                        )
                      )
                    ])}
                  </div>
                  <div className={`mt-1 font-semibold ${analysisReturns[analysisReturnHoverIndex] >= 0 ? "text-[var(--semantic-up)]" : "text-[var(--semantic-down)]"}`}>
                    {formatSigned(analysisReturns[analysisReturnHoverIndex])}%
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              {analysisReturnConfig[analysisReturnRange].labels.map((label) => (
                <span key={label}>{translateMonthLabel(label)}</span>
              ))}
            </div>
          </DashboardPanel>

        </>
      ) : null}
        </TabsContent>

        {isMarketplaceDetail ? (
          <TabsContent
            value="backtest"
            className="oq-marketplace-detail-backtest"
            aria-label={tr("Backtest", "回测")}
          />
        ) : null}
      </Tabs>

      {!isMarketplaceDetail ? <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <AlertDialogContent className="oq-trade-detail-dialog">
          <AlertDialogHeader className="oq-trade-detail-dialog-header">
            <AlertDialogTitle className="oq-trade-detail-dialog-title">
              {pendingAction === "delete"
                ? tr("Delete Paper Trading", "删除模拟盘")
                : tr("Stop Paper Trading", "停止模拟盘")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-trade-detail-dialog-description">
              {pendingAction === "delete"
                ? tr(
                    `Delete the paper-trading deployment for "${trade.name}"? It will be removed from the current list and cannot be undone on this page.`,
                    `确认删除策略「${trade.name}」的模拟盘吗？删除后将从当前列表中移除，且无法在此页面撤销。`,
                    {
                      ja: `「${trade.name}」のペーパートレードを削除しますか？現在の一覧から削除され、このページでは元に戻せません。`,
                      ko: `「${trade.name}」의 모의 거래 배포를 삭제할까요? 현재 목록에서 제거되며 이 페이지에서는 되돌릴 수 없습니다.`,
                      es: `¿Eliminar el despliegue de paper trading de «${trade.name}»? Se quitará de la lista actual y no podrá deshacerse en esta página.`,
                      fr: `Supprimer le déploiement de paper trading de « ${trade.name} » ? Il sera retiré de la liste actuelle et cette action ne pourra pas être annulée sur cette page.`,
                    }
                  )
                : tr(
                    "Are you sure you want to stop this paper-trading deployment? Open positions and its configuration will be kept so you can restart it later.",
                    "确认要停止该模拟盘吗？当前持仓与模拟盘配置将保留，之后可以重新启动。"
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="oq-trade-detail-dialog-footer">
            <AlertDialogCancel className="oq-trade-detail-dialog-button">
              {tr("Cancel", "取消")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="oq-trade-detail-dialog-button is-primary"
              onClick={confirmPendingAction}
            >
              {pendingAction === "delete"
                ? tr("Confirm Delete", "确认删除")
                : tr("Confirm Stop", "确认停止")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> : null}
    </div>
  );
}

function TradeWorkspaceTable({
  label,
  className,
  headers,
  isEmpty,
  emptyMessage,
  children,
}: {
  label: string;
  className?: string;
  headers: string[];
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (isEmpty) {
    return <div className="oq-trade-workspace-empty">{emptyMessage}</div>;
  }

  return (
    <div className="oq-trade-workspace-table-scroll">
      <table className={`oq-trade-workspace-table${className ? ` ${className}` : ""}`} aria-label={label}>
        <thead>
          <tr>
            {headers.map(header => <th key={header} scope="col">{header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TradeAllocationTooltip({
  active,
  payload,
  otherLabel,
  itemUnitLabel,
}: {
  active?: boolean;
  payload?: readonly { payload?: TradeAllocationDatum }[];
  otherLabel: string;
  itemUnitLabel: string;
}) {
  const item = payload?.[0]?.payload;

  if (!active || !item) return null;

  return (
    <div className="oq-trade-allocation-tooltip">
      <div className="oq-trade-allocation-tooltip-head">
        <span>
          <i style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.isOther ? `${otherLabel} · ${item.memberCount} ${itemUnitLabel}` : item.asset}
        </span>
        <strong>{item.percent.toFixed(2)}%</strong>
      </div>
    </div>
  );
}

function ExplainStat({
  label,
  value,
  tone = "neutral",
  explanation,
  explainEnabled = false,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  explanation?: string;
  explainEnabled?: boolean;
}) {
  return (
    <MaybeExplainTooltip enabled={explainEnabled && Boolean(explanation)} explanation={explanation ?? ""}>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        {label}
        <span className={`font-semibold ${classForTone(tone)}`}>{value}</span>
      </span>
    </MaybeExplainTooltip>
  );
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

function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DashboardPanel({
  title,
  icon: Icon,
  actions,
  contentClassName = "h-full p-4",
  showHeaderDivider = true,
  flushHeaderBottom = false,
  children,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  contentClassName?: string;
  showHeaderDivider?: boolean;
  flushHeaderBottom?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="surface-card h-full overflow-hidden p-0">
      <div className={`flex items-center justify-between px-4 pt-3 ${flushHeaderBottom ? "pb-0" : "pb-3"} ${showHeaderDivider ? "border-b border-border/60" : ""}`}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </h2>
        </div>
        {actions}
      </div>
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
