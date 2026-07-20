import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { factors, strategies } from "@/lib/mockData";
import { parsePercent } from "@/lib/strategyUtils";
import {
  getExchangeVenueMeta,
  readExchangeApiConnections,
  type ExchangeApiConnection,
} from "@/lib/exchangeApiConnections";
import { deployStrategyToTrade, getStrategyDeployment } from "@/lib/tradeDeployments";
import { type UiCopy, useAppLanguage, translateUi } from "@/contexts/AppLanguageContext";
import { toast } from "sonner";
import {
  CHART_COLOR_MODE_STORAGE_KEY,
  PLAIN_EXPLANATION_STORAGE_KEY,
  positionHistory,
  type ChartColorMode,
} from "./StrategyDetailParts";
import {
  LiveDeployDialog,
  OptimizerDialog,
  STRATEGY_VERSION_HISTORY_LIMIT,
  buildStrategyVersionHistory,
  StrategyConfigDialog,
  StrategyDeleteDialog,
  StrategyVersionHistoryDialog,
  type StrategyVersion,
} from "./StrategyDetailDialogs";
import {
  StrategyFigmaReport,
  type ReportMetric,
  type ReportMetricRow,
  type ReportPositionRecord,
} from "./StrategyFigmaReport";
import {
  CreateStrategyComposer,
  type StrategyComposerValues,
} from "./MyStrategies";
import {
  ArrowLeft,
  ArrowUpRight,
  History,
  Layers3,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SHOW_LIVE_DEPLOY_ACTION = false;
const DELETED_STRATEGIES_STORAGE_KEY = "otterquant:mystrategies:deleted-strategies";

function persistDeletedStrategyId(strategyId: string) {
  try {
    const raw = window.localStorage.getItem(DELETED_STRATEGIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const ids = new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
    ids.add(strategyId);
    window.localStorage.setItem(DELETED_STRATEGIES_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // The navigation still completes when storage is unavailable.
  }
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY) !== "false";
}

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown"
    ? stored
    : "greenUpRedDown";
}

function getDrawdownColor(mode: ChartColorMode) {
  return mode === "redUpGreenDown" ? "#10B981" : "#F43F5E";
}

function formatCurrentVersionTimestamp() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const strategyDetailCopy: Record<string, UiCopy> = {
  Optimizer: { ja: "オプティマイザー", ko: "옵티마이저", es: "Optimizador", fr: "Optimiseur" },
  "Run Optimizer": {
    ja: "最適化を実行",
    ko: "옵티마이저 실행",
    es: "Ejecutar optimizador",
    fr: "Lancer l'optimiseur",
  },
  "Optimization Mode": { ja: "最適化モード", ko: "최적화 모드", es: "Modo de optimización", fr: "Mode d'optimisation" },
  Conservative: { ja: "保守的", ko: "보수적", es: "Conservador", fr: "Prudent" },
  Balanced: { ja: "バランス", ko: "균형", es: "Equilibrado", fr: "Équilibré" },
  Aggressive: { ja: "積極的", ko: "공격적", es: "Agresivo", fr: "Agressif" },
  "Expand Detailed Parameters": {
    ja: "詳細パラメータを展開",
    ko: "상세 매개변수 펼치기",
    es: "Mostrar parámetros detallados",
    fr: "Afficher les paramètres détaillés",
  },
  "Collapse Detailed Parameters": {
    ja: "詳細パラメータを折りたたむ",
    ko: "상세 매개변수 접기",
    es: "Ocultar parámetros detallados",
    fr: "Masquer les paramètres détaillés",
  },
  Note: { ja: "メモ", ko: "메모", es: "Nota", fr: "Note" },
  Optional: { ja: "任意", ko: "선택", es: "Opcional", fr: "Facultatif" },
  "Add a note": { ja: "メモを追加", ko: "메모 추가", es: "Añadir una nota", fr: "Ajouter une note" },
  "Optimizer job submitted.": {
    ja: "最適化ジョブを送信しました。",
    ko: "최적화 작업을 제출했습니다.",
    es: "Trabajo de optimización enviado.",
    fr: "Tâche d'optimisation envoyée.",
  },
  Strategy: { ja: "ストラテジー", ko: "전략", es: "Estrategia", fr: "Stratégie" },
  Volatility: { ja: "ボラティリティ", ko: "변동성", es: "Volatilidad", fr: "Volatilité" },
  "Time Series": { ja: "時系列", ko: "시계열", es: "Serie temporal", fr: "Série temporelle" },
  "Cross Section": { ja: "クロスセクション", ko: "횡단면", es: "Cross-section", fr: "Cross-section" },
  "Long-Only": { ja: "ロングオンリー", ko: "롱 전용", es: "Solo largo", fr: "Long-only" },
  "Short-Only": { ja: "ショートオンリー", ko: "숏 전용", es: "Solo corto", fr: "Short-only" },
  "Market-Neutral": { ja: "マーケットニュートラル", ko: "시장중립", es: "Neutral al mercado", fr: "Market neutral" },
  "N/A": { ja: "未設定", ko: "미설정", es: "No configurado", fr: "Non défini" },
  "Equal Weight": { ja: "等ウェイト", ko: "동일 가중", es: "Ponderación igual", fr: "Équipondéré" },
  "Strategy ID": { ja: "ストラテジー ID", ko: "전략 ID", es: "ID de estrategia", fr: "ID de stratégie" },
  "Created Date": { ja: "作成日時", ko: "생성일", es: "Fecha de creación", fr: "Date de création" },
  "Strategy Type": { ja: "ストラテジータイプ", ko: "전략 유형", es: "Tipo de estrategia", fr: "Type de stratégie" },
  Symbol: { ja: "銘柄", ko: "종목", es: "Símbolo", fr: "Symbole" },
  Signal: { ja: "ファクター", ko: "팩터", es: "Factor", fr: "Facteur" },
  "Factor Weights": { ja: "ファクターウェイト", ko: "팩터 가중치", es: "Pesos de factores", fr: "Poids des facteurs" },
  Weight: { ja: "ウェイト", ko: "가중치", es: "Peso", fr: "Poids" },
  "Stop Loss": { ja: "ストップロス", ko: "손절", es: "Stop loss", fr: "Stop loss" },
  Cooldown: { ja: "クールダウン", ko: "쿨다운", es: "Enfriamiento", fr: "Cooldown" },
  "Strategy Side": { ja: "売買方向", ko: "전략 방향", es: "Lado de estrategia", fr: "Sens de stratégie" },
  "Top/Tail Rule": { ja: "Top/Tail ルール", ko: "Top/Tail 규칙", es: "Regla Top/Tail", fr: "Règle Top/Tail" },
  "Basic Info": { ja: "基本情報", ko: "기본 정보", es: "Información básica", fr: "Informations de base" },
  Inputs: { ja: "入力", ko: "입력", es: "Entradas", fr: "Entrées" },
  "Risk & Execution": { ja: "リスク・執行", ko: "리스크 및 실행", es: "Riesgo y ejecución", fr: "Risque et exécution" },
  "Deployed to paper trading.": { ja: "ペーパートレードにデプロイしました。", ko: "모의 거래에 배포되었습니다.", es: "Desplegado en paper trading.", fr: "Déployé en paper trading." },
  "Deployed to live trading.": { ja: "ライブ取引にデプロイしました。", ko: "실거래에 배포되었습니다.", es: "Desplegado en live trading.", fr: "Déployé en live trading." },
  "Select an exchange account before submitting live deployment.": {
    ja: "ライブデプロイ前に取引所アカウントを選択してください。",
    ko: "실거래 배포 전에 거래소 계정을 선택하세요.",
    es: "Selecciona una cuenta de exchange antes de enviar el despliegue live.",
    fr: "Sélectionnez un compte exchange avant d'envoyer le déploiement live.",
  },
  "Enter a valid base capital amount in USDT.": {
    ja: "有効な USDT 建て基礎資金を入力してください。",
    ko: "유효한 USDT 기준 기본 자금을 입력하세요.",
    es: "Introduce un capital base válido en USDT.",
    fr: "Saisissez un capital de base valide en USDT.",
  },
  "Removed from favorites": { ja: "お気に入りから削除しました", ko: "즐겨찾기에서 제거됨", es: "Quitado de favoritos", fr: "Retiré des favoris" },
  "Added to favorites": { ja: "お気に入りに追加しました", ko: "즐겨찾기에 추가됨", es: "Añadido a favoritos", fr: "Ajouté aux favoris" },
  Starred: { ja: "お気に入り済み", ko: "즐겨찾기됨", es: "Favorito", fr: "Favori" },
  Favorite: { ja: "お気に入り", ko: "즐겨찾기", es: "Favorito", fr: "Favori" },
  "Use Template": { ja: "テンプレートを使用", ko: "템플릿 사용", es: "Usar plantilla", fr: "Utiliser le modèle" },
  "Strategy Composition": { ja: "戦略構成", ko: "전략 구성", es: "Composición de estrategia", fr: "Composition de la stratégie" },
  "Version History": { ja: "バージョン履歴", ko: "버전 기록", es: "Historial de versiones", fr: "Historique des versions" },
  Iterations: { ja: "更新履歴", ko: "반복 기록", es: "Iteraciones", fr: "Itérations" },
  versions: { ja: "バージョン", ko: "개 버전", es: "versiones", fr: "versions" },
  "Second edit": { ja: "再編集", ko: "재편집", es: "Edición", fr: "Modification" },
  "Current Version": { ja: "現在のバージョン", ko: "현재 버전", es: "Versión actual", fr: "Version actuelle" },
  Processing: { ja: "処理中", ko: "처리 중", es: "Procesando", fr: "Traitement" },
  Preview: { ja: "プレビュー", ko: "미리보기", es: "Vista previa", fr: "Aperçu" },
  Rollback: { ja: "ロールバック", ko: "롤백", es: "Revertir", fr: "Restaurer" },
  "Rolled back to": { ja: "ロールバック先：", ko: "롤백 완료:", es: "Revertido a", fr: "Restauré vers" },
  "View Latest": { ja: "最新版を表示", ko: "최신 버전 보기", es: "Ver la última", fr: "Voir la plus récente" },
  "Rollback to This Version": { ja: "このバージョンに戻す", ko: "이 버전으로 롤백", es: "Revertir a esta versión", fr: "Restaurer cette version" },
  Edit: { ja: "編集", ko: "편집", es: "Editar", fr: "Modifier" },
  "Edit strategy": { ja: "戦略を編集", ko: "전략 편집", es: "Editar estrategia", fr: "Modifier la stratégie" },
  "Update factors, weights and direction rules for this strategy.": {
    ja: "この戦略のファクター、ウェイト、方向ルールを更新します。",
    ko: "이 전략의 팩터, 가중치 및 방향 규칙을 수정합니다.",
    es: "Actualiza los factores, ponderaciones y reglas de dirección de esta estrategia.",
    fr: "Mettez à jour les facteurs, pondérations et règles de direction de cette stratégie.",
  },
  "Strategy updated.": { ja: "戦略を更新しました。", ko: "전략이 업데이트되었습니다.", es: "Estrategia actualizada.", fr: "Stratégie mise à jour." },
  More: { ja: "その他", ko: "더보기", es: "Más", fr: "Plus" },
  Delete: { ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer" },
  "Delete Strategy": { ja: "戦略を削除", ko: "전략 삭제", es: "Eliminar estrategia", fr: "Supprimer la stratégie" },
  "This action permanently removes the strategy from your workspace.": {
    ja: "この操作により、戦略はワークスペースから完全に削除されます。",
    ko: "이 작업은 워크스페이스에서 전략을 영구적으로 삭제합니다.",
    es: "Esta acción elimina permanentemente la estrategia del espacio de trabajo.",
    fr: "Cette action supprime définitivement la stratégie de votre espace de travail.",
  },
  "View Paper": { ja: "Paper を表示", ko: "모의 보기", es: "Ver paper", fr: "Voir paper" },
  "Deploy Paper": { ja: "Paper デプロイ", ko: "모의 배포", es: "Desplegar paper", fr: "Déployer paper" },
  Deploying: { ja: "デプロイ中", ko: "배포 중", es: "Desplegando", fr: "Déploiement" },
  "Deploy Strategy to Paper Trading": {
    ja: "ストラテジーをペーパートレードへデプロイ",
    ko: "전략을 모의 거래에 배포",
    es: "Desplegar estrategia en paper trading",
    fr: "Déployer la stratégie en paper trading",
  },
  Environment: { ja: "環境", ko: "환경", es: "Entorno", fr: "Environnement" },
  "Paper Trading": { ja: "ペーパートレード", ko: "모의 거래", es: "Paper trading", fr: "Paper trading" },
  "Initial Capital": { ja: "初期資金", ko: "초기 자금", es: "Capital inicial", fr: "Capital initial" },
  Leverage: { ja: "レバレッジ", ko: "레버리지", es: "Apalancamiento", fr: "Effet de levier" },
  "Confirm Paper Deployment": {
    ja: "ペーパーデプロイを確認",
    ko: "모의 배포 확인",
    es: "Confirmar despliegue paper",
    fr: "Confirmer le déploiement paper",
  },
  "View Live": { ja: "Live を表示", ko: "실거래 보기", es: "Ver live", fr: "Voir live" },
  "Live Deploy": { ja: "Live デプロイ", ko: "실거래 배포", es: "Desplegar live", fr: "Déployer live" },
  "Sharpe Ratio": { ja: "シャープレシオ", ko: "샤프 비율", es: "Ratio de Sharpe", fr: "Ratio de Sharpe" },
  "Max DD": { ja: "最大 DD", ko: "최대 DD", es: "Máx. DD", fr: "DD max" },
  "Hit Rate": { ja: "ヒット率", ko: "적중률", es: "Tasa de acierto", fr: "Taux de réussite" },
  Turnover: { ja: "売買回転率", ko: "회전율", es: "Rotación", fr: "Turnover" },
  "Fee Rate (backtest param)": { ja: "手数料率（バックテスト設定）", ko: "수수료율(백테스트 파라미터)", es: "Tasa de comisión (parámetro backtest)", fr: "Taux de frais (paramètre backtest)" },
  "Annual (net)": { ja: "年率リターン（Net）", ko: "연환산 수익률(Net)", es: "Anualizado (neto)", fr: "Annualisé (net)" },
  "Sharpe (net)": { ja: "Sharpe（Net）", ko: "Sharpe(Net)", es: "Sharpe (neto)", fr: "Sharpe (net)" },
  "Annual (gross)": { ja: "年率リターン（Gross）", ko: "연환산 수익률(Gross)", es: "Anualizado (bruto)", fr: "Annualisé (gross)" },
  "Sharpe (gross)": { ja: "Sharpe（Gross）", ko: "Sharpe(Gross)", es: "Sharpe (bruto)", fr: "Sharpe (gross)" },
  "Turnover (avg/bar)": { ja: "売買回転率（平均/bar）", ko: "회전율(평균/bar)", es: "Rotación (media/bar)", fr: "Turnover (moy./bar)" },
  "Turnover Cost (cum, ret)": { ja: "累積取引コスト（リターン）", ko: "누적 거래비용(수익률)", es: "Coste de rotación (acum., ret.)", fr: "Coût de turnover (cum., ret.)" },
  "Total Funding Return": { ja: "累積 Funding リターン", ko: "총 펀딩 수익률", es: "Retorno total de funding", fr: "Rendement total de funding" },
  "Periods": { ja: "期間数", ko: "기간 수", es: "Periodos", fr: "Périodes" },
  "Deploy Strategy to Live Trading": { ja: "ストラテジーをライブ取引へデプロイ", ko: "전략을 실거래에 배포", es: "Desplegar estrategia en live trading", fr: "Déployer la stratégie en live trading" },
  Exchange: { ja: "取引所", ko: "거래소", es: "Exchange", fr: "Exchange" },
  "Manage Connections": { ja: "接続を管理", ko: "연결 관리", es: "Gestionar conexiones", fr: "Gérer les connexions" },
  "No Exchange API Connected": { ja: "取引所 API 未接続", ko: "연결된 거래소 API 없음", es: "No hay API de exchange conectada", fr: "Aucune API exchange connectée" },
  "Connect an exchange API account to enable live deployment.": {
    ja: "ライブデプロイを有効にするには取引所 API アカウントを接続してください。",
    ko: "실거래 배포를 활성화하려면 거래소 API 계정을 연결하세요.",
    es: "Conecta una cuenta API de exchange para habilitar el despliegue live.",
    fr: "Connectez un compte API exchange pour activer le déploiement live.",
  },
  "Connect Exchange": { ja: "取引所を接続", ko: "거래소 연결", es: "Conectar exchange", fr: "Connecter un exchange" },
  "Select exchange account": { ja: "取引所アカウントを選択", ko: "거래소 계정 선택", es: "Selecciona una cuenta de exchange", fr: "Sélectionner un compte exchange" },
  "Base Capital": { ja: "基礎資金", ko: "기본 자금", es: "Capital base", fr: "Capital de base" },
  "Minimum activation capital is 100 USDT. Deployment cannot be initiated below this threshold.": {
    ja: "最低有効化資金は 100 USDT です。このしきい値未満ではデプロイできません。",
    ko: "최소 활성화 자금은 100 USDT입니다. 이 기준 미만으로는 배포할 수 없습니다.",
    es: "El capital mínimo de activación es 100 USDT. No se puede iniciar el despliegue por debajo de este umbral.",
    fr: "Le capital d'activation minimum est de 100 USDT. Le déploiement ne peut pas être lancé sous ce seuil.",
  },
  "Minimum activation capital: 100 USDT.": {
    ja: "最低有効化資金: 100 USDT。",
    ko: "최소 활성화 자금: 100 USDT.",
    es: "Capital mínimo de activación: 100 USDT.",
    fr: "Capital d'activation minimum : 100 USDT.",
  },
  Cancel: { ja: "キャンセル", ko: "취소", es: "Cancelar", fr: "Annuler" },
  "Submit Live Deployment": { ja: "ライブデプロイを送信", ko: "실거래 배포 제출", es: "Enviar despliegue live", fr: "Envoyer le déploiement live" },
  "Strategy Configuration": { ja: "ストラテジー設定", ko: "전략 설정", es: "Configuración de estrategia", fr: "Configuration de stratégie" },
  Close: { ja: "閉じる", ko: "닫기", es: "Cerrar", fr: "Fermer" },
};

export default function StrategyDetail() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string, copy: UiCopy = {}) =>
    translateUi(uiLang, en, zh, { ...strategyDetailCopy[en], ...copy });
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const source = searchParams.get("source");
  const isOfficialLibraryView = source === "official";
  const historicalVersionId = searchParams.get("version");
  const isHistoricalVersionView = Boolean(historicalVersionId);
  const customName = searchParams.get("name");
  const strategyFromStore = strategies.find((item) => item.id === params.id);
  const strategyFromGeneratedId = (() => {
    const match = params.id?.match(/^STR-(\d+)$/);
    if (!match) return undefined;
    const index = Number(match[1]) - 463;
    return index >= 0 ? { ...strategies[index % strategies.length], id: params.id } : undefined;
  })();
  const strategy = strategyFromStore ?? strategyFromGeneratedId ?? {
    id: params.id,
    name: customName || tr("Strategy", "策略"),
    description: "Draft strategy generated from the guided creation flow.",
    factorCount: Number(searchParams.get("signals") || "5"),
    market: "Mixed" as const,
    annualReturn: "29.22%",
    sharpe: 1.92,
    maxDrawdown: "12.8%",
    winRate: "64.5%",
    status: "new" as const,
    subscribers: 0,
    author: "You",
    updatedAt: "2026-04-17",
    tags: ["Draft"],
  };
  const [starred, setStarred] = useState(false);
  const [deploymentVersion, setDeploymentVersion] = useState(0);
  const [isStrategyConfigOpen, setIsStrategyConfigOpen] = useState(false);
  const [isPaperDeploying, setIsPaperDeploying] = useState(false);
  const [isLiveDeployOpen, setIsLiveDeployOpen] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStrategyEditOpen, setIsStrategyEditOpen] = useState(false);
  const [strategyEditValues, setStrategyEditValues] = useState<StrategyComposerValues | null>(null);
  const [sessionStrategyVersions, setSessionStrategyVersions] = useState<StrategyVersion[]>([]);
  const [defaultVersionId, setDefaultVersionId] = useState<string | null>(null);
  const paperDeployTimerRef = useRef<number | null>(null);
  const [connectedExchangeApis, setConnectedExchangeApis] = useState<ExchangeApiConnection[]>(() =>
    readExchangeApiConnections()
  );
  const [selectedExchangeApiId, setSelectedExchangeApiId] = useState<string>("");
  const [liveCapitalInput, setLiveCapitalInput] = useState("1000");
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(readPlainExplanationEnabled);
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(readChartColorMode);

  const strategyId = strategy.id;
  const defaultStrategyDisplayName = customName || (strategyId === "STR-465"
    ? "Overnight VRP"
    : strategyId === "STR-486" ? "MEV Protection Factor" : strategy.name);
  const strategyDisplayName = strategyEditValues?.strategyName || defaultStrategyDisplayName;
  const createdAt = searchParams.get("createdAt") || strategy.updatedAt;
  const baseStrategyVersions = buildStrategyVersionHistory(strategyId, createdAt);
  const strategyVersions = [...sessionStrategyVersions, ...baseStrategyVersions]
    .slice(0, STRATEGY_VERSION_HISTORY_LIMIT);
  const effectiveDefaultVersionId = defaultVersionId
    ?? strategyVersions.find((version) => version.status === "ready")?.id
    ?? null;
  const historicalVersion = historicalVersionId
    ? strategyVersions.find((version) => version.id === historicalVersionId) ?? null
    : null;
  const latestStrategyUrl = (() => {
    const latestParams = new URLSearchParams(searchParams);
    latestParams.delete("version");
    const latestSearch = latestParams.toString();
    return `/strategies/${encodeURIComponent(strategyId)}${latestSearch ? `?${latestSearch}` : ""}`;
  })();
  useEffect(() => {
    setSessionStrategyVersions([]);
    setDefaultVersionId(null);
  }, [strategyId]);
  const paperDeployment = useMemo(
    () => getStrategyDeployment(strategyId, "paper"),
    [deploymentVersion, strategyId]
  );
  const liveDeployment = useMemo(
    () => getStrategyDeployment(strategyId, "live"),
    [deploymentVersion, strategyId]
  );
  const selectedExchange = useMemo(
    () => connectedExchangeApis.find((item) => item.id === selectedExchangeApiId) ?? null,
    [connectedExchangeApis, selectedExchangeApiId]
  );
  useEffect(() => {
    if (connectedExchangeApis.length === 0) {
      setSelectedExchangeApiId("");
      return;
    }
    if (!selectedExchangeApiId || !connectedExchangeApis.some((item) => item.id === selectedExchangeApiId)) {
      setSelectedExchangeApiId(connectedExchangeApis[0].id);
    }
  }, [connectedExchangeApis, selectedExchangeApiId]);
  useEffect(() => {
    const syncPlainExplanation = () => setPlainExplainEnabled(readPlainExplanationEnabled());
    window.addEventListener("storage", syncPlainExplanation);
    window.addEventListener("focus", syncPlainExplanation);
    return () => {
      window.removeEventListener("storage", syncPlainExplanation);
      window.removeEventListener("focus", syncPlainExplanation);
    };
  }, []);
  useEffect(() => () => {
    if (paperDeployTimerRef.current !== null) {
      window.clearTimeout(paperDeployTimerRef.current);
    }
  }, []);
  useEffect(() => {
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);
  const minLiveCapital = 100;
  const parsedLiveCapital = Number(liveCapitalInput);
  const isLiveCapitalNumeric = Number.isFinite(parsedLiveCapital);
  const isCapitalBelowMinimum =
    isLiveCapitalNumeric &&
    parsedLiveCapital > 0 &&
    parsedLiveCapital < minLiveCapital;
  const canSubmitLiveDeploy =
    selectedExchange !== null &&
    isLiveCapitalNumeric &&
    parsedLiveCapital >= minLiveCapital;
  const normalizeConfigValue = (value: string | null | undefined) => {
    if (!value) return null;
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return null;
    const lowered = cleaned.toLowerCase();
    if (
      lowered === "n/a" ||
      lowered === "na" ||
      lowered === "none" ||
      lowered === "not specified" ||
      lowered === "null" ||
      lowered === "undefined"
    ) {
      return null;
    }
    return cleaned;
  };
  const toReadableItems = (value: string | null | undefined, splitter: RegExp) => {
    const normalized = normalizeConfigValue(value);
    if (!normalized) return [];
    return normalized
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const formatConfigDate = (value: string) => {
    const normalized = value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").trim();
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (!match) return normalized;
    return `${match[1]} ${match[2] ?? "00"}:${match[3] ?? "00"}`;
  };
  const formatDecimalWeight = (value: number) => Number(value.toFixed(2)).toString();
  const weightingModeRaw = normalizeConfigValue(
    searchParams.get("weightMode") ?? searchParams.get("weights")
  );
  const executionSideRaw = normalizeConfigValue(
    searchParams.get("crossDirection") ?? searchParams.get("direction")
  );
  const rankValueRaw = normalizeConfigValue(searchParams.get("rankValue"));
  const rankModeRaw = normalizeConfigValue(searchParams.get("rankMode"));
  const signalItems = toReadableItems(searchParams.get("factors"), /\|/);
  const factorWeightItems = (() => {
    const explicitWeights = normalizeConfigValue(searchParams.get("weights"));
    if (explicitWeights) {
      const parsed = explicitWeights
        .split("|")
        .map((item) => {
          const [label, weight] = item.split(":");
          const parsedWeight = Number(weight);
          if (!label?.trim() || !Number.isFinite(parsedWeight)) return null;
          return {
            label: label.trim(),
            value: parsedWeight,
          };
        })
        .filter((item): item is { label: string; value: number } => item !== null);
      if (parsed.length > 0) return parsed;
    }

    if (weightingModeRaw?.toLowerCase() === "equal" && signalItems.length > 0) {
      const equalWeight = 1 / signalItems.length;
      return signalItems.map((label) => ({ label, value: equalWeight }));
    }

    return [];
  })();
  const configuredEditFactorIds = (factorWeightItems.length > 0
    ? factorWeightItems.map((item) => item.label)
    : signalItems
  )
    .map((label) => factors.find((factor) => factor.id === label || factor.name === label)?.id)
    .filter((factorId): factorId is string => Boolean(factorId));
  const defaultEditFactorIds = configuredEditFactorIds.length > 0
    ? configuredEditFactorIds
    : ["AF-001", "AF-004", "AF-005"];
  const configuredEditWeights = factorWeightItems.reduce<Record<string, string>>((weights, item) => {
    const factorId = factors.find((factor) => factor.id === item.label || factor.name === item.label)?.id;
    if (factorId) weights[factorId] = item.value.toFixed(2);
    return weights;
  }, {});
  const defaultStrategyEditValues: StrategyComposerValues = {
    selectedFactorIds: defaultEditFactorIds,
    customWeights: Object.keys(configuredEditWeights).length > 0
      ? configuredEditWeights
      : defaultEditFactorIds.reduce<Record<string, string>>((weights, factorId, index) => {
          weights[factorId] = index === 0 ? "0.34" : "0.33";
          return weights;
        }, {}),
    direction:
      executionSideRaw === "long" || executionSideRaw === "short" || executionSideRaw === "neutral"
        ? executionSideRaw
        : "neutral",
    layerUnit: rankModeRaw?.toLowerCase() === "percent" ? "percent" : "N",
    layerValue: rankValueRaw ?? "5",
    strategyName: defaultStrategyDisplayName,
    strategyNote: searchParams.get("note") ?? "",
  };
  const effectiveComposition = strategyEditValues ?? defaultStrategyEditValues;
  const compositionDirection = effectiveComposition.direction === "long"
    ? tr("Long-Only", "仅做多")
    : effectiveComposition.direction === "short"
      ? tr("Short-Only", "仅做空")
      : tr("Market-Neutral", "中性");
  const compositionTopTailRule = (() => {
    const value = effectiveComposition.layerValue;
    const isPercent = effectiveComposition.layerUnit === "percent";
    if (uiLang === "zh") return `前后${value}${isPercent ? "%" : "名"}`;
    if (uiLang === "ja") return `上位 / 下位それぞれ ${value}${isPercent ? "%" : " 銘柄"}`;
    if (uiLang === "ko") return `상위 / 하위 각각 ${value}${isPercent ? "%" : "개 종목"}`;
    if (uiLang === "es") return `Superior / inferior: ${value}${isPercent ? "%" : " instrumentos"} cada uno`;
    if (uiLang === "fr") return `Haut / bas : ${value}${isPercent ? "%" : " instruments"} chacun`;
    return `Top / tail ${value}${isPercent ? "%" : " instruments"} each`;
  })();
  const compositionFactorWeightItems = effectiveComposition.selectedFactorIds.map((factorId) => {
    const factor = factors.find((item) => item.id === factorId);
    const parsedWeight = Number(effectiveComposition.customWeights[factorId]);
    return {
      id: factorId,
      label: factor?.name ?? factorId,
      value: Number.isFinite(parsedWeight) ? parsedWeight : 0,
    };
  });

  const returnRate = parsePercent(strategy.annualReturn);
  const drawdownPct = parsePercent(strategy.maxDrawdown);
  const calmar = strategy.sharpe > 0 ? strategy.sharpe * 1.89 : 0;
  const winRate = parsePercent(strategy.winRate);
  const tradingDays = 1097;

  const openTradePage = (environment: "paper" | "live", focusTradeId?: string) => {
    const query = new URLSearchParams({
      env: environment,
      focusStrategy: strategyId,
    });
    if (focusTradeId) query.set("focusTradeId", focusTradeId);
    window.location.assign(`/trade?${query.toString()}`);
  };

  const deployStrategy = (
    environment: "paper" | "live",
    options?: { exchangeLabel?: string; capitalUsdt?: number }
  ) => {
    deployStrategyToTrade({
      strategyId,
      strategyName: strategyDisplayName,
      market: strategy.market,
      annualReturn: strategy.annualReturn,
      winRate: strategy.winRate,
      environment,
    });
    setDeploymentVersion((prev) => prev + 1);
    if (environment === "paper") {
      toast.success(tr("Deployed to paper trading.", "已部署到模拟交易。"));
      return;
    }
    if (options?.exchangeLabel && options.capitalUsdt) {
      const capital = options.capitalUsdt.toLocaleString();
      const liveSubmitMessage =
        uiLang === "zh"
          ? `已提交至 ${options.exchangeLabel} 的实盘部署，基础资金 ${capital} USDT。`
          : uiLang === "ja"
            ? `${options.exchangeLabel} へのライブデプロイを送信しました。基礎資金は ${capital} USDT です。`
            : uiLang === "ko"
              ? `${options.exchangeLabel} 실거래 배포를 제출했습니다. 기본 자금은 ${capital} USDT입니다.`
              : uiLang === "es"
                ? `Despliegue live enviado a ${options.exchangeLabel} con ${capital} USDT de capital base.`
                : uiLang === "fr"
                  ? `Déploiement live envoyé vers ${options.exchangeLabel} avec ${capital} USDT de capital de base.`
                  : `Live deployment submitted to ${options.exchangeLabel} with ${capital} USDT base capital.`;
      toast.success(liveSubmitMessage);
      return;
    }
    toast.success(tr("Deployed to live trading.", "已部署到实盘交易。"));
  };

  const openLiveDeployModal = () => {
    const latestExchangeApis = readExchangeApiConnections();
    setConnectedExchangeApis(latestExchangeApis);
    if (latestExchangeApis.length > 0) {
      setSelectedExchangeApiId((current) =>
        latestExchangeApis.some((item) => item.id === current) ? current : latestExchangeApis[0].id
      );
    } else {
      setSelectedExchangeApiId("");
    }
    setIsLiveDeployOpen(true);
  };

  const handlePaperDeployment = () => {
    if (paperDeployment) {
      window.location.assign(`/trade/${encodeURIComponent(paperDeployment.id)}?env=paper`);
      return;
    }
    if (isPaperDeploying) return;

    setIsPaperDeploying(true);
    paperDeployTimerRef.current = window.setTimeout(() => {
      deployStrategy("paper");
      setIsPaperDeploying(false);
      paperDeployTimerRef.current = null;
    }, 900);
  };

  const goToExchangeApi = () => {
    setIsLiveDeployOpen(false);
    window.location.assign("/account?tab=exchangeApi");
  };

  const submitLiveDeployment = () => {
    if (!selectedExchange) {
      toast.error(tr("Select an exchange account before submitting live deployment.", "提交实盘部署前请先选择交易所账户。"));
      return;
    }
    if (!isLiveCapitalNumeric || parsedLiveCapital <= 0) {
      toast.error(tr("Enter a valid base capital amount in USDT.", "请输入有效的 USDT 基础资金金额。"));
      return;
    }
    if (parsedLiveCapital < minLiveCapital) {
      toast.error(
        uiLang === "zh"
          ? `最低启用资金为 ${minLiveCapital} USDT，低于该阈值无法发起部署。`
          : uiLang === "ja"
            ? `最低有効化資金は ${minLiveCapital} USDT です。このしきい値未満ではデプロイできません。`
            : uiLang === "ko"
              ? `최소 활성화 자금은 ${minLiveCapital} USDT입니다. 이 기준 미만으로는 배포할 수 없습니다.`
              : uiLang === "es"
                ? `El capital mínimo de activación es ${minLiveCapital} USDT. No se puede iniciar el despliegue por debajo de este umbral.`
                : uiLang === "fr"
                  ? `Le capital d'activation minimum est de ${minLiveCapital} USDT. Le déploiement ne peut pas être lancé sous ce seuil.`
                  : `Minimum activation capital is ${minLiveCapital} USDT. Deployment cannot be initiated below this threshold.`
      );
      return;
    }
    const venue = getExchangeVenueMeta(selectedExchange.venue);
    deployStrategy("live", {
      exchangeLabel: `${selectedExchange.accountName} (${venue.label})`,
      capitalUsdt: parsedLiveCapital,
    });
    setIsLiveDeployOpen(false);
  };

  const reportHeaderMetrics: ReportMetric[] = [
    {
      label: tr("Sharpe Ratio", "夏普比率"),
      value: strategy.sharpe.toFixed(3),
      tone: strategy.sharpe >= 1.5 ? "good" : "muted",
      explanation: tr(
        "Measures return stability. Higher values generally indicate steadier performance.",
        "衡量收益的稳定性，数值越高通常越稳健。"
      ),
    },
    {
      label: tr("Max DD", "最大回撤"),
      value: `${drawdownPct === 0 ? "" : "-"}${Math.abs(drawdownPct).toFixed(1)}%`,
      tone: Math.abs(drawdownPct) >= 15 ? "warn" : "good",
      valueColor: getDrawdownColor(chartColorMode),
      explanation: tr(
        "Shows the largest historical decline. Lower values indicate less downside risk.",
        "表示历史最大跌幅，数值越低风险越小。"
      ),
    },
    {
      label: tr("Calmar", "卡玛比率"),
      value: calmar.toFixed(3),
      tone: calmar >= 3 ? "good" : "muted",
      explanation: tr(
        "Measures return relative to maximum drawdown. Higher values are better.",
        "衡量收益相对最大回撤的效率，数值越高越好。"
      ),
    },
    {
      label: tr("Hit Rate", "命中率"),
      value: `${winRate.toFixed(1)}%`,
      tone: winRate >= 55 ? "good" : "muted",
      explanation: tr(
        "Shows the percentage of profitable trades.",
        "表示盈利交易占全部交易的比例。"
      ),
    },
    {
      label: tr("Turnover", "换手率"),
      value: "1.231",
      tone: "muted",
      explanation: tr(
        "Shows how often positions change. Higher values mean more frequent trading.",
        "表示持仓调整频率，数值越高交易越频繁。"
      ),
    },
  ];
  const reportMetricRows: ReportMetricRow[] = [
    [
      tr("Fee Rate (backtest param)", "手续费率（回测参数）"),
      "0.0005",
      tr(
        "Fee rate applied to each trade in the backtest.",
        "回测中每次成交使用的手续费率。"
      ),
    ],
    [
      tr("Annual (net)", "年化收益（净）"),
      (returnRate / 100).toFixed(6),
      tr("Annualized return after trading costs.", "扣除交易成本后的年化收益率。"),
    ],
    [
      tr("Sharpe (net)", "夏普（净）"),
      strategy.sharpe.toFixed(5),
      tr(
        "Return stability after trading costs. Higher values generally indicate steadier performance.",
        "扣除交易成本后的收益稳定性，数值越高通常越稳健。"
      ),
    ],
    [
      tr("MDD", "最大回撤"),
      (Math.abs(drawdownPct) / 100).toFixed(6),
      tr(
        "Shows the largest historical decline. Lower values indicate less downside risk.",
        "表示历史最大跌幅，数值越低风险越小。"
      ),
    ],
    [
      tr("Annual (gross)", "年化收益（总）"),
      ((returnRate * 1.65) / 100).toFixed(5),
      tr("Annualized return before trading costs.", "未扣除交易成本的年化收益率。"),
    ],
    [
      tr("Sharpe (gross)", "夏普（总）"),
      (strategy.sharpe * 1.66).toFixed(5),
      tr(
        "Return stability before trading costs. Higher values generally indicate steadier performance.",
        "未扣除交易成本的收益稳定性，数值越高通常越稳健。"
      ),
    ],
    [
      tr("Turnover (avg/bar)", "换手率（平均/bar）"),
      "1.23103",
      tr(
        "Average position turnover per period. Higher values mean more frequent trading.",
        "表示每个周期平均调整仓位的幅度，数值越高交易越频繁。"
      ),
    ],
    [
      tr("Turnover Cost (cum, ret)", "累计换手成本（收益率）"),
      "1.00082",
      tr(
        "Cumulative trading cost from position turnover, expressed as return.",
        "表示换手产生的累计成本占收益的比例。"
      ),
    ],
    [
      tr("Total Funding Return", "累计资金费率收益"),
      "0",
      tr(
        "Cumulative profit or cost from funding fees.",
        "表示资金费率带来的累计收益或成本。"
      ),
    ],
    [
      tr("Periods", "周期数"),
      `${tradingDays + 529}`,
      tr(
        "Number of periods included in this backtest.",
        "表示本次回测包含的统计周期数量。"
      ),
    ],
  ];
  const reportPositions: ReportPositionRecord[] = positionHistory.map((position) => ({
    symbol: position.symbol,
    side: position.side,
    entry: position.entryPrice,
    interest: position.maxOpenInterest,
    opened: position.openedAt,
    closed: position.closedAt,
    pnl: position.pnl,
  }));
  const toggleFavorite = () => {
    const nextStarred = !starred;
    setStarred(nextStarred);
    toast.success(nextStarred ? tr("Added to favorites", "已加入收藏") : tr("Removed from favorites", "已取消收藏"));
  };
  const openStrategyEditor = () => {
    setIsStrategyEditOpen(true);
  };
  const confirmDeleteStrategy = () => {
    persistDeletedStrategyId(strategyId);
    window.location.assign("/strategies");
  };
  const viewLatestVersion = () => navigate(latestStrategyUrl);
  const rollbackToHistoricalVersion = () => {
    if (!historicalVersion || historicalVersion.status !== "ready") return;
    const nextVersionId = appendStrategyVersion(
      historicalVersion.source,
      historicalVersion.note,
      "ready"
    );
    setDefaultVersionId(nextVersionId);
    toast.success(`${tr("Rolled back to", "已回滚至")} V${historicalVersion.number}`);
    navigate(latestStrategyUrl);
  };
  const appendStrategyVersion = (
    sourceType: StrategyVersion["source"],
    note: string,
    status: StrategyVersion["status"]
  ) => {
    const number = String(STRATEGY_VERSION_HISTORY_LIMIT + sessionStrategyVersions.length + 1).padStart(2, "0");
    const nextVersionId = `${strategyId}-V${number}`;
    setSessionStrategyVersions((current) => {
      return [
        {
          id: nextVersionId,
          number,
          createdAt: formatCurrentVersionTimestamp(),
          source: sourceType,
          note,
          status,
        },
        ...current,
      ];
    });
    return nextVersionId;
  };
  const reportActions = isHistoricalVersionView ? (
    <>
      <button
        type="button"
        className="oq-report-action"
        onClick={() => setIsStrategyConfigOpen(true)}
      >
        <Layers3 aria-hidden="true" />
        {tr("Strategy Composition", "策略构成")}
      </button>
      <button type="button" className="oq-report-action" onClick={viewLatestVersion}>
        <ArrowUpRight aria-hidden="true" />
        {tr("View Latest", "查看最新")}
      </button>
      <button
        type="button"
        className="oq-report-action is-primary"
        disabled={!historicalVersion || historicalVersion.status !== "ready"}
        onClick={rollbackToHistoricalVersion}
      >
        <RotateCcw aria-hidden="true" />
        {tr("Rollback to This Version", "回滚到此版本")}
      </button>
    </>
  ) : (
    <>
      {isOfficialLibraryView ? (
        <button
          type="button"
          className="oq-report-action is-primary"
          onClick={() =>
            window.location.assign(
              `/strategies/new?template=${encodeURIComponent(strategyId)}&creationMode=platform&scale=single`
            )
          }
        >
          {tr("Use Template", "使用模板")}
        </button>
      ) : (
        <>
          <button
            type="button"
            className={`oq-report-action is-primary${isPaperDeploying ? " is-deploying" : ""}`}
            disabled={isPaperDeploying}
            aria-busy={isPaperDeploying}
            onClick={handlePaperDeployment}
          >
            {isPaperDeploying
              ? tr("Deploying", "部署中")
              : paperDeployment
                ? tr("View Paper", "查看模拟盘")
                : tr("Deploy Paper", "部署模拟盘")}
          </button>
          {SHOW_LIVE_DEPLOY_ACTION ? (
            <button
              type="button"
              className="oq-report-action is-live"
              onClick={() => {
                if (liveDeployment) {
                  openTradePage("live", liveDeployment.id);
                  return;
                }
                openLiveDeployModal();
              }}
            >
              {liveDeployment ? tr("View Live", "查看实盘") : tr("Live Deploy", "实盘部署")}
            </button>
          ) : null}
        </>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="oq-report-action is-icon"
            aria-label={tr("Strategy Composition", "策略构成")}
            onClick={() => setIsStrategyConfigOpen(true)}
          >
            <Layers3 aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{tr("Strategy Composition", "策略构成")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="oq-report-action is-icon"
            aria-label={tr("Version History", "历史版本")}
            disabled={strategyVersions.length === 0}
            onClick={() => setIsVersionHistoryOpen(true)}
          >
            <History aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{tr("Version History", "历史版本")}</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button type="button" className="oq-report-action is-icon" aria-label={tr("More", "更多")}>
                <MoreHorizontal aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">{tr("More", "更多")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" sideOffset={8} className="oq-report-more-content">
          {!isOfficialLibraryView ? (
            <DropdownMenuItem className="oq-report-more-item" onSelect={openStrategyEditor}>
              <Pencil aria-hidden="true" />
              {tr("Edit", "编辑")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="oq-report-more-item" onSelect={() => setIsOptimizerOpen(true)}>
            <SlidersHorizontal aria-hidden="true" />
            {tr("Optimizer", "优化器")}
          </DropdownMenuItem>
          <DropdownMenuItem className="oq-report-more-item" onSelect={toggleFavorite}>
            <Star className={starred ? "fill-current" : ""} aria-hidden="true" />
            {starred ? tr("Starred", "已收藏") : tr("Favorite", "收藏")}
          </DropdownMenuItem>
          {!isOfficialLibraryView ? (
            <>
              <DropdownMenuSeparator className="oq-report-more-separator" />
              <DropdownMenuItem
                className="oq-report-more-item is-destructive"
                variant="destructive"
                onSelect={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 aria-hidden="true" />
                {tr("Delete", "删除")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
  const reportTitle = strategyDisplayName;
  const reportNo = strategyId.replace(/^STR-/, "") || strategyId;
  const reportHash = "8ade81c02da14b73b656a13bd7fc4379";
  const reportCreatedDate = formatConfigDate(createdAt).split(" ")[0];
  const reportSubtitle = (
    <>
      <span>{tr("Created on", "创建于")} {reportCreatedDate}</span>
      <span>{reportHash}</span>
    </>
  );
  const reportTopAction = (
    <button
      type="button"
      className="oq-report-back-button"
      onClick={() => window.location.assign("/strategies")}
    >
      <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
      <span>{tr("Back to My Strategies", "返回我的策略")}</span>
    </button>
  );

  return (
    <>
      <StrategyFigmaReport
        title={reportTitle}
        subtitle={reportSubtitle}
        titleAction={<span className="oq-report-no-badge">NO.{reportNo}</span>}
        topAction={reportTopAction}
        historicalVersionView={isHistoricalVersionView}
        headerMetrics={reportHeaderMetrics}
        plainExplainEnabled={plainExplainEnabled}
        chartColorMode={chartColorMode}
        metricSectionTitle={tr("Past 30 days", "过去 30 天")}
        dateLabel={tr("Past 30 days", "过去 30 天")}
        dateOptions={[
          tr("Past 30 days", "过去 30 天"),
          tr("Past 90 days", "过去 90 天"),
          tr("Past 180 days", "过去 180 天"),
          tr("Past year", "过去 1 年"),
          tr("Custom start date", "自定义起始时间"),
        ]}
        customDateOption={tr("Custom start date", "自定义起始时间")}
        uiLang={uiLang}
        actions={reportActions}
        metricRows={reportMetricRows}
        positions={reportPositions}
        tr={tr}
      />

      <LiveDeployDialog
        open={isLiveDeployOpen}
        onOpenChange={setIsLiveDeployOpen}
        tr={tr}
        connectedExchangeApis={connectedExchangeApis}
        selectedExchangeApiId={selectedExchangeApiId}
        setSelectedExchangeApiId={setSelectedExchangeApiId}
        goToExchangeApi={goToExchangeApi}
        liveCapitalInput={liveCapitalInput}
        setLiveCapitalInput={setLiveCapitalInput}
        isCapitalBelowMinimum={isCapitalBelowMinimum}
        canSubmitLiveDeploy={canSubmitLiveDeploy}
        submitLiveDeployment={submitLiveDeployment}
      />

      <OptimizerDialog
        open={isOptimizerOpen}
        onOpenChange={setIsOptimizerOpen}
        tr={tr}
        onSubmit={(_, note) => {
          appendStrategyVersion("optimizer", note, "pending");
          toast.success(tr("Optimizer job submitted.", "优化任务已提交。"));
          setIsOptimizerOpen(false);
        }}
      />

      <StrategyVersionHistoryDialog
        open={isVersionHistoryOpen}
        onOpenChange={setIsVersionHistoryOpen}
        strategyName={strategyDisplayName}
        strategyId={strategyId}
        strategyCreatedAt={createdAt}
        versions={strategyVersions}
        defaultVersionId={effectiveDefaultVersionId}
        onViewComposition={() => {
          setIsStrategyConfigOpen(true);
        }}
        onSetDefaultVersion={(version) => {
          const nextVersionId = appendStrategyVersion(version.source, version.note, "ready");
          setDefaultVersionId(nextVersionId);
          toast.success(`${tr("Rolled back to", "已回滚至")} V${version.number}`);
        }}
        title={tr("Version History", "历史版本")}
        tr={tr}
      />

      <Dialog open={isStrategyEditOpen} onOpenChange={setIsStrategyEditOpen}>
        <DialogContent className="oq-strategy-create-dialog gap-0 rounded-2xl border-0 p-0 shadow-2xl">
          <div className="oq-strategy-create-dialog-head">
            <DialogTitle>{tr("Edit strategy", "编辑策略")}</DialogTitle>
            <p>{tr("Update factors, weights and direction rules for this strategy.", "修改此策略的因子、权重和方向规则。")}</p>
          </div>
          <CreateStrategyComposer
            key={isStrategyEditOpen ? "open" : "closed"}
            tr={tr}
            plainExplainEnabled={plainExplainEnabled}
            mode="edit"
            initialValues={strategyEditValues ?? defaultStrategyEditValues}
            onClose={() => setIsStrategyEditOpen(false)}
            onSubmit={(values) => {
              setStrategyEditValues(values);
              appendStrategyVersion(
                "edit",
                values.strategyNote.trim(),
                "ready"
              );
              toast.success(tr("Strategy updated.", "策略已更新。"));
            }}
          />
        </DialogContent>
      </Dialog>

      <StrategyConfigDialog
        open={isStrategyConfigOpen}
        onOpenChange={setIsStrategyConfigOpen}
        title={tr("Strategy Composition", "策略构成")}
        tr={tr}
        direction={compositionDirection}
        topTailRule={compositionTopTailRule}
        factorWeightItems={compositionFactorWeightItems}
        formatDecimalWeight={formatDecimalWeight}
      />

      <StrategyDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteStrategy}
        strategyName={strategyDisplayName}
        tr={tr}
      />
    </>
  );

}
