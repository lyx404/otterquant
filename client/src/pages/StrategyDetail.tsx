import { useEffect, useMemo, useState } from "react";
import { useParams, useSearch } from "wouter";
import { strategies } from "@/lib/mockData";
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
  PLAIN_EXPLANATION_STORAGE_KEY,
  positionHistory,
  type StrategyConfigRow,
} from "./StrategyDetailParts";
import {
  LiveDeployDialog,
  OPTIMIZATION_HISTORY_LIMIT,
  OptimizerDialog,
  StrategyConfigDialog,
  type OptimizedStrategyVersion,
} from "./StrategyDetailDialogs";
import {
  StrategyFigmaReport,
  type ReportMetric,
  type ReportMetricRow,
  type ReportPositionRecord,
} from "./StrategyFigmaReport";
import {
  ArrowLeft,
  SlidersHorizontal,
  Star,
} from "lucide-react";

const SHOW_LIVE_DEPLOY_ACTION = false;

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY) !== "false";
}

function subtractIsoDays(value: string, days: number) {
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!isoDate) return value;
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const strategyDetailCopy: Record<string, UiCopy> = {
  Optimizer: { ja: "オプティマイザー", ko: "옵티마이저", es: "Optimizador", fr: "Optimiseur" },
  "Run Optimizer": {
    ja: "最適化を実行",
    ko: "옵티마이저 실행",
    es: "Ejecutar optimizador",
    fr: "Lancer l'optimiseur",
  },
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
  "View Paper": { ja: "Paper を表示", ko: "모의 보기", es: "Ver paper", fr: "Voir paper" },
  "Paper Deploy": { ja: "Paper デプロイ", ko: "모의 배포", es: "Desplegar paper", fr: "Déployer paper" },
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
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const source = searchParams.get("source");
  const isOfficialLibraryView = source === "official";
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
  const [isLiveDeployOpen, setIsLiveDeployOpen] = useState(false);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [connectedExchangeApis, setConnectedExchangeApis] = useState<ExchangeApiConnection[]>(() =>
    readExchangeApiConnections()
  );
  const [selectedExchangeApiId, setSelectedExchangeApiId] = useState<string>("");
  const [liveCapitalInput, setLiveCapitalInput] = useState("1000");
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(readPlainExplanationEnabled);

  const strategyName = customName || strategy.name;
  const strategyId = strategy.id;
  const strategyDisplayName = strategyId === "STR-465"
    ? "Overnight VRP"
    : strategyId === "STR-486" ? "MEV Protection Factor" : strategyName;
  const isOptimizedStrategy = Boolean(searchParams.get("optimizedFrom")) || /-OPT-\d+$/.test(strategyId);
  const createdAt = searchParams.get("createdAt") || strategy.updatedAt;
  const optimizedVersionCreatedAt = createdAt.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? createdAt;
  const optimizedVersionNumber = Number(strategyId.replace(/^STR-/, ""));
  const optimizedVersions: OptimizedStrategyVersion[] = isOptimizedStrategy
    ? []
    : Array.from({ length: OPTIMIZATION_HISTORY_LIMIT }, (_, index) => {
        const number = Number.isFinite(optimizedVersionNumber)
          ? String(Math.max(1, optimizedVersionNumber - index)).padStart(3, "0")
          : String(index + 1).padStart(3, "0");
        return {
          id: `STR-${number}`,
          number,
          createdAt: subtractIsoDays(optimizedVersionCreatedAt, index),
          status: index === 0 ? "pending" : "ready",
        };
      });
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
  const toReadableList = (value: string | null | undefined, splitter: RegExp) => {
    const normalized = normalizeConfigValue(value);
    if (!normalized) return null;
    const items = normalized
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
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
  const formatCooldown = (value: string | null) => {
    if (!value) return null;
    const hours = value.match(/[\d.]+/)?.[0];
    if (!hours) return value;
    if (uiLang === "zh") return `${hours} 小时`;
    if (uiLang === "ja") return `${hours} 時間`;
    if (uiLang === "ko") return `${hours}시간`;
    if (uiLang === "es") return `${hours} ${Number(hours) === 1 ? "hora" : "horas"}`;
    if (uiLang === "fr") return `${hours} ${Number(hours) === 1 ? "heure" : "heures"}`;
    return `${hours} ${Number(hours) === 1 ? "hour" : "hours"}`;
  };
  const inferSymbolFromName = (value: string) => {
    const upperName = value.toUpperCase();
    if (upperName.includes("BTC")) return "BTCUSDT";
    if (upperName.includes("ETH")) return "ETHUSDT";
    return null;
  };

  const strategyTypeRaw = normalizeConfigValue(
    searchParams.get("strategyType") ?? searchParams.get("type")
  );
  const weightingModeRaw = normalizeConfigValue(
    searchParams.get("weightMode") ?? searchParams.get("weights")
  );
  const executionSideRaw = normalizeConfigValue(
    searchParams.get("crossDirection") ?? searchParams.get("direction")
  );
  const rankValueRaw = normalizeConfigValue(searchParams.get("rankValue"));
  const rankModeRaw = normalizeConfigValue(searchParams.get("rankMode"));
  const sortingRuleRaw = normalizeConfigValue(searchParams.get("sorting"));
  const stopLossRaw = normalizeConfigValue(
    searchParams.get("stopLoss") ?? searchParams.get("risk")
  );
  const cooldownRaw = normalizeConfigValue(searchParams.get("cooldown"));
  const symbolScopeRaw = toReadableList(
    searchParams.get("symbols") ??
      searchParams.get("symbolGroup") ??
      searchParams.get("symbol"),
    /,/
  );
  const signalItems = toReadableItems(searchParams.get("factors"), /\|/);
  const signalSelectionRaw = signalItems.length > 0 ? signalItems.join(", ") : null;
  const strategyTypeKey = strategyTypeRaw?.toLowerCase().replace(/\s+/g, "-");
  const isCrossSectionStrategy =
    strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section";
  const strategyTypeLabel =
    strategyTypeKey === "time-series"
      ? tr("Time Series", "时序策略")
      : strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section"
        ? tr("Cross Section", "截面策略")
        : strategyTypeRaw;
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
  const factorWeightSummary =
    factorWeightItems.length > 0
      ? factorWeightItems
          .map((item) => `${item.label} ${formatDecimalWeight(item.value)}`)
          .join(" | ")
      : null;
  const factorWeightTotal = factorWeightItems.reduce((sum, item) => sum + item.value, 0);
  const factorWeightColors = ["#ebbc47", "#479ef5", "#29d668", "#f4ae34", "#e44444"];
  const strategySideValue =
    executionSideRaw === "long"
      ? tr("Long-Only", "仅做多")
      : executionSideRaw === "short"
        ? tr("Short-Only", "仅做空")
        : executionSideRaw === "neutral"
          ? tr("Market-Neutral", "市场中性")
          : executionSideRaw;
  const topTailRuleValue =
    rankValueRaw && isCrossSectionStrategy
      ? uiLang === "zh"
        ? `头部/尾部 ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " 个交易对"}`
        : uiLang === "ja"
          ? `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " 銘柄"}`
          : uiLang === "ko"
            ? `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : "개 종목"}`
            : uiLang === "es"
              ? `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " instrumentos"}`
              : uiLang === "fr"
                ? `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " instruments"}`
                : `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " instruments"}`
      : sortingRuleRaw;
  const stopLossValue = stopLossRaw ? (stopLossRaw.includes("%") ? stopLossRaw : `${stopLossRaw}%`) : null;
  const cooldownValue = formatCooldown(cooldownRaw);
  const unsetConfigValue = tr("N/A", "未设置");
  const factorWeightValue =
    factorWeightSummary ??
    (weightingModeRaw?.toLowerCase() === "equal" ? tr("Equal Weight", "等权") : null);
  const strategyConfigRows: StrategyConfigRow[] = [
    { key: "strategy-id", label: tr("Strategy ID", "策略 ID"), value: strategyId },
    { key: "created-date", label: tr("Created Date", "创建时间"), value: formatConfigDate(createdAt) },
    { key: "strategy-type", label: tr("Strategy Type", "策略类型"), value: strategyTypeLabel ?? unsetConfigValue },
    {
      key: "symbol",
      label: tr("Symbol", "交易对"),
      value: symbolScopeRaw ?? inferSymbolFromName(strategyName) ?? unsetConfigValue,
    },
    { key: "signal", label: tr("Signal", "因子"), value: signalSelectionRaw ?? unsetConfigValue },
    { key: "factor-weights", label: tr("Factor Weights", "因子权重"), value: factorWeightValue ?? unsetConfigValue },
    { key: "stop-loss", label: tr("Stop Loss", "止损"), value: stopLossValue ?? unsetConfigValue },
    { key: "cooldown", label: tr("Cooldown", "冷却时间"), value: cooldownValue ?? unsetConfigValue },
    { key: "strategy-side", label: tr("Strategy Side", "策略方向"), value: strategySideValue ?? unsetConfigValue },
    { key: "top-tail-rule", label: tr("Top/Tail Rule", "头尾分层规则"), value: topTailRuleValue ?? unsetConfigValue },
  ];
  const getStrategyConfigRow = (key: string) => strategyConfigRows.find((row) => row.key === key);
  const strategyConfigGroups = [
    {
      title: tr("Basic Info", "基础信息"),
      rows: ["strategy-id", "created-date", "strategy-type"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
    {
      title: tr("Inputs", "策略输入"),
      rows: ["symbol", "signal", "factor-weights"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
    {
      title: tr("Risk & Execution", "风控与执行"),
      rows: ["stop-loss", "cooldown", "strategy-side", "top-tail-rule"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
  ].filter((group) => group.rows.length > 0);

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
      strategyName,
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
      value: `${Math.abs(drawdownPct).toFixed(1)}%`,
      tone: Math.abs(drawdownPct) >= 15 ? "warn" : "good",
      explanation: tr(
        "Shows the largest historical decline. Lower values indicate less downside risk.",
        "表示历史最大跌幅，数值越低风险越小。"
      ),
    },
    {
      label: "Calmar",
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
  const reportActions = (
    <>
      <button
        type="button"
        className="oq-report-action"
        onClick={() => {
          setStarred((prev) => !prev);
          toast.success(starred ? tr("Removed from favorites", "已取消收藏") : tr("Added to favorites", "已加入收藏"));
        }}
      >
        <Star className={`h-3 w-3 ${starred ? "fill-current" : ""}`} />
        {starred ? tr("Starred", "已收藏") : tr("Favorite", "收藏")}
      </button>
      <button
        type="button"
        className="oq-report-action"
        onClick={() => setIsOptimizerOpen(true)}
      >
        <SlidersHorizontal className="h-3 w-3" />
        {tr("Optimizer", "优化器")}
      </button>
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
            className="oq-report-action is-primary"
            onClick={() => {
              if (paperDeployment) {
                openTradePage("paper", paperDeployment.id);
                return;
              }
              deployStrategy("paper");
            }}
          >
            {paperDeployment ? tr("View Paper", "查看模拟") : tr("Paper Deploy", "模拟部署")}
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
        headerMetrics={reportHeaderMetrics}
        plainExplainEnabled={plainExplainEnabled}
        dateLabel={tr("Past 30 days", "过去30天")}
        dateOptions={[
          tr("Past 30 days", "过去30天"),
          tr("Past 90 days", "过去90天"),
          tr("Past 180 days", "过去180天"),
          tr("Past year", "过去1年"),
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
        strategyName={strategyDisplayName}
        strategyId={strategyId}
        optimizedVersions={optimizedVersions}
        tr={tr}
        onSubmit={() => {
          toast.success(tr("Optimizer job submitted.", "优化任务已提交。"));
          setIsOptimizerOpen(false);
        }}
      />

      <StrategyConfigDialog
        open={isStrategyConfigOpen}
        onOpenChange={setIsStrategyConfigOpen}
        strategyName={strategyName}
        strategyId={strategyId}
        tr={tr}
        strategyConfigGroups={strategyConfigGroups}
        factorWeightItems={factorWeightItems}
        factorWeightTotal={factorWeightTotal}
        factorWeightColors={factorWeightColors}
        formatDecimalWeight={formatDecimalWeight}
      />
    </>
  );

}
