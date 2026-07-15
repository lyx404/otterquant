import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { UiCopy, UiLang } from "@/contexts/AppLanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyReportDateControl } from "./StrategyReportDateControl";
import {
  autocorrDecayDomain,
  autocorrDecayLabels,
  autocorrDecayLagLabels,
  autocorrDecayTicks,
  autocorrDecayValues,
  barraCorrelationDateTicks,
  barraCorrelationDomain,
  barraCorrelationTicks,
  barraStyleReturnDateTicks,
  barraStyleReturnDomain,
  barraStyleReturnLabels,
  barraStyleReturnTicks,
  decileReturnDateTicks,
  decileReturnDomain,
  decileReturnLabels,
  decileReturnTicks,
  denseRepresentativeSymbol,
  denseSymbolUniverse,
  getAutocorrDecayColor,
  getBarraStyleReturnColor,
  getDecileReturnColor,
  getTurnoverRateColor,
  makeBarraCorrelationSeries,
  makeBarraStyleReturnSeries,
  makeDecileReturnSeries,
  makeTurnoverRateSeries,
  portfolioNavData,
  portfolioPeakIndex,
  portfolioTroughIndex,
  turnoverRateDateTicks,
  turnoverRateDomain,
  turnoverRateLabels,
  turnoverRateTicks,
} from "./StrategyFigmaReport.data";
import "./StrategyFigmaReport.css";
import "./StrategyFigmaReportCharts.css";
import { ChartCard, ChartLegendItem, ChartTooltip, useContainerNarrow } from "./StrategyFigmaReportChartPrimitives";
import { MaybeExplainTooltip } from "./StrategyDetailParts";

type MetricTone = "good" | "warn" | "muted";
type ChartSeriesKey = "net" | "gross" | "drawdown";
type Tr = (en: string, zh: string, copy?: UiCopy) => string;
type PortfolioPoint = { x: number; y: number; value: number };
type SymbolPnlRankGroup = "top" | "bottom";
type SymbolPnlRankRow = {
  symbol: string;
  total: number;
  color: string;
  group: SymbolPnlRankGroup;
};
type BarraExposureFactor = { factor: string; long: number; short: number };

export type ReportMetric = { label: string; value: string; tone: MetricTone; explanation?: string };
export type ReportMetricRow = [metric: string, value: string, explanation?: string];

export type ReportPositionRecord = {
  symbol: string;
  side: "Cross Long" | "Cross Short";
  entry: string;
  interest: string;
  opened: string;
  closed: string;
  pnl: string;
};

const defaultHeaderMetrics: ReportMetric[] = [
  { label: "Sharpe Ratio", value: "2.054", tone: "good" },
  { label: "Max DD", value: "20.8%", tone: "warn" },
  { label: "Calmar", value: "4.800", tone: "good" },
  { label: "Hit Rate", value: "—", tone: "muted" },
  { label: "Turnover", value: "1.231", tone: "muted" },
];

const navMetrics: ReportMetricRow[] = [
  ["fee_rate (backtest param)", "0.0005"],
  ["Annual (net)", "0.996769"],
  ["Sharpe (net)", "2.05374"],
  ["MDD", "0.207646"],
  ["Annual (gross)", "2.16376"],
  ["Sharpe (gross)", "3.41495"],
  ["Turnover (avg/bar)", "1.23103"],
  ["Turnover cost (cum, ret)", "1.00082"],
  ["total_funding_ret", "0"],
  ["n_periods", "1626"],
];

const exposureRows = [
  { label: "Meme", long: 0.021, short: 0.018 },
  { label: "Internet of Things (IOT)", long: 0.029, short: 0.026 },
  { label: "Avalanche Ecosystem", long: 0.035, short: 0.029 },
  { label: "UNKNOWN", long: 0.038, short: 0.033 },
  { label: "Near Protocol Ecosystem", long: 0.043, short: 0.036 },
  { label: "Fantom Ecosystem", long: 0.047, short: 0.04 },
  { label: "Automated Market Maker (AMM)", long: 0.052, short: 0.045 },
  { label: "Entertainment", long: 0.057, short: 0.05 },
  { label: "Huobi ECO Chain Ecosystem", long: 0.063, short: 0.054 },
  { label: "Cosmos Ecosystem", long: 0.067, short: 0.061 },
  { label: "Bridged-Tokens", long: 0.071, short: 0.066 },
  { label: "Cross-chain Communication", long: 0.077, short: 0.071 },
  { label: "Masternodes", long: 0.082, short: 0.074 },
  { label: "Linea Ecosystem", long: 0.087, short: 0.08 },
  { label: "Infrastructure", long: 0.094, short: 0.083 },
  { label: "Storage", long: 0.1, short: 0.089 },
  { label: "Gaming (GameFi)", long: 0.108, short: 0.096 },
  { label: "Artificial Intelligence (AI)", long: 0.113, short: 0.103 },
  { label: "Decentralized Exchange (DEX)", long: 0.121, short: 0.109 },
  { label: "Crypto-Backed Tokens", long: 0.126, short: 0.116 },
  { label: "Solana Ecosystem", long: 0.133, short: 0.121 },
  { label: "BNB Chain Ecosystem", long: 0.139, short: 0.127 },
  { label: "Decentralized Finance (DeFi)", long: 0.146, short: 0.134 },
  { label: "Smart Contract Platform", long: 0.15, short: 0.142 },
];

const sectorRankRows: Array<[string, number]> = [
  ["Gaming (GameFi)", -0.23],
  ["NFT", -0.17],
  ["Automated Market Maker (AMM)", -0.04],
  ["GMT", 0.01],
  ["Huobi ECO Chain Ecosystem", 0.03],
  ["Fantom Ecosystem", 0.05],
  ["Solana Ecosystem", 0.07],
  ["Linea Ecosystem", 0.08],
  ["Cosmos Ecosystem", 0.09],
  ["Avalanche Ecosystem", 0.11],
  ["IoT", 0.12],
  ["Masternodes", 0.14],
  ["Bridged-Tokens", 0.16],
  ["Internet of Things (IOT)", 0.2],
  ["UNKNOWN", 0.23],
  ["Cross-chain Communication", 0.29],
  ["Crypto-Backed Tokens", 0.36],
  ["Decentralized Finance (DeFi)", 0.43],
  ["Decentralized Exchange (DEX)", 0.54],
  ["Smart Contract Platform", 0.78],
];

const exposureDomain = { min: -0.15, max: 0.15 };
const rankDomain = { min: -0.23, max: 0.78 };
const barraExposureDomain = { min: -0.69, max: 0.69 };
const barraExposureTicks = [-0.69, -0.34, 0, 0.34, 0.69];
const barraExposureRows: BarraExposureFactor[] = [
  { factor: "beta", long: -0.11, short: 0.12 },
  { factor: "momentum", long: -0.19, short: 0.36 },
  { factor: "reversal", long: 0.43, short: -0.69 },
  { factor: "volatility", long: -0.08, short: 0.45 },
  { factor: "size", long: 0.06, short: -0.05 },
  { factor: "liquidity", long: 0.04, short: 0.02 },
  { factor: "carry", long: -0.01, short: -0.01 },
];

const defaultPositions: ReportPositionRecord[] = [
  {
    symbol: "FILUSDT",
    side: "Cross Short",
    entry: "0.885",
    interest: "451.4 FIL",
    opened: "2026-02-10 22:17:26",
    closed: "2026-02-10 23:08:11",
    pnl: "+1.35 USDT",
  },
  {
    symbol: "ICPUSDT",
    side: "Cross Long",
    entry: "2.375",
    interest: "168 ICP",
    opened: "2026-02-10 22:17:26",
    closed: "2026-02-10 23:08:08",
    pnl: "+2.52 USDT",
  },
  {
    symbol: "DOTUSDT",
    side: "Cross Short",
    entry: "1.278",
    interest: "312.8 DOT",
    opened: "2026-02-10 18:02:43",
    closed: "2026-02-10 21:44:43",
    pnl: "-2.50 USDT",
  },
  {
    symbol: "KSMUSDT",
    side: "Cross Long",
    entry: "4.153",
    interest: "96.3 KSM",
    opened: "2026-02-11 04:32:33",
    closed: "2026-02-11 11:54:24",
    pnl: "+2.82 USDT",
  },
];

const linePalette = ["#ebbc47", "#479ef5", "#29d668", "#e44444", "#b36af5", "#12c8b1", "#ff7a1a", "#d946ef"];
const symbolRankPalette = ["#ebbc47", "#479ef5", "#29d668", "#e44444", "#b36af5", "#12c8b1", "#ff7a1a", "#d946ef", "#7dd3fc", "#f97316"];
const defaultTr: Tr = en => en;
const reportCopy: Record<string, UiCopy> = {
  "No chart data available": {
    ja: "チャートデータがありません",
    ko: "차트 데이터가 없습니다",
    es: "No hay datos de gráfico",
    fr: "Aucune donnée de graphique",
  },
  "Check filters or choose another period.": {
    ja: "フィルターを確認するか、別の期間を選択してください。",
    ko: "필터를 확인하거나 다른 기간을 선택하세요.",
    es: "Revisa los filtros o elige otro periodo.",
    fr: "Vérifiez les filtres ou choisissez une autre période.",
  },
  "No metrics available": {
    ja: "指標データがありません",
    ko: "지표 데이터가 없습니다",
    es: "No hay métricas disponibles",
    fr: "Aucune métrique disponible",
  },
  "No exposure data available": {
    ja: "エクスポージャーデータがありません",
    ko: "익스포저 데이터가 없습니다",
    es: "No hay datos de exposición",
    fr: "Aucune donnée d'exposition",
  },
  "No sector rank data available": {
    ja: "セクターランキングデータがありません",
    ko: "섹터 순위 데이터가 없습니다",
    es: "No hay ranking sectorial",
    fr: "Aucun classement sectoriel disponible",
  },
  "No series to display": {
    ja: "表示する系列がありません",
    ko: "표시할 시계열이 없습니다",
    es: "No hay series para mostrar",
    fr: "Aucune série à afficher",
  },
  "Portfolio chart series": {
    ja: "ポートフォリオチャート系列",
    ko: "포트폴리오 차트 시리즈",
    es: "Series del gráfico de cartera",
    fr: "Séries du graphique de portefeuille",
  },
  "Portfolio net NAV, gross NAV and drawdown over time, with maximum drawdown peak and trough markers": {
    ja: "Net NAV、Gross NAV、Drawdown の時系列。最大ドローダウンのピークとボトムを表示。",
    ko: "Net NAV, Gross NAV, Drawdown 시계열과 최대 낙폭의 피크/저점 표시.",
    es: "Net NAV, Gross NAV y Drawdown en el tiempo, con marcadores de pico y valle del máximo drawdown.",
    fr: "Net NAV, Gross NAV et Drawdown dans le temps, avec marqueurs de pic et creux du drawdown maximal.",
  },
  "Net NAV": { ja: "Net NAV", ko: "Net NAV", es: "Net NAV", fr: "Net NAV" },
  "Gross NAV": {
    ja: "Gross NAV",
    ko: "Gross NAV",
    es: "Gross NAV",
    fr: "Gross NAV",
  },
  Drawdown: { ja: "Drawdown", ko: "Drawdown", es: "Drawdown", fr: "Drawdown" },
  "Max DD peak": {
    ja: "最大 DD ピーク",
    ko: "최대 DD 피크",
    es: "Pico máx. DD",
    fr: "Pic DD max",
  },
  "Max DD trough": {
    ja: "最大 DD ボトム",
    ko: "최대 DD 저점",
    es: "Valle máx. DD",
    fr: "Creux DD max",
  },
  "Drawdown · worst -20.99%": {
    ja: "Drawdown · 最悪 -20.99%",
    ko: "Drawdown · 최저 -20.99%",
    es: "Drawdown · peor -20.99%",
    fr: "Drawdown · pire -20.99%",
  },
  "Portfolio metrics": {
    ja: "ポートフォリオ指標",
    ko: "포트폴리오 지표",
    es: "Métricas de cartera",
    fr: "Métriques du portefeuille",
  },
  Metric: { ja: "指標", ko: "지표", es: "Métrica", fr: "Métrique" },
  Value: { ja: "値", ko: "값", es: "Valor", fr: "Valeur" },
  Long: { ja: "ロング", ko: "롱", es: "Largo", fr: "Long" },
  Short: { ja: "ショート", ko: "숏", es: "Corto", fr: "Short" },
  "Average sector exposure": {
    ja: "平均セクターエクスポージャー",
    ko: "평균 섹터 익스포저",
    es: "Exposición sectorial media",
    fr: "Exposition sectorielle moyenne",
  },
  "abs weight": {
    ja: "絶対ウェイト",
    ko: "절대 가중치",
    es: "peso abs.",
    fr: "poids abs.",
  },
  "Positive contribution": {
    ja: "プラス寄与",
    ko: "양의 기여",
    es: "Contribución positiva",
    fr: "Contribution positive",
  },
  "Negative contribution": {
    ja: "マイナス寄与",
    ko: "음의 기여",
    es: "Contribución negativa",
    fr: "Contribution négative",
  },
  "Sector return rank": {
    ja: "セクターリターン順位",
    ko: "섹터 수익률 순위",
    es: "Ranking de retorno sectorial",
    fr: "Classement du rendement sectoriel",
  },
  "pnl contribution": {
    ja: "PnL 寄与",
    ko: "PnL 기여",
    es: "contribución PnL",
    fr: "contribution PnL",
  },
  "Line chart legend": {
    ja: "折れ線チャート凡例",
    ko: "라인 차트 범례",
    es: "Leyenda del gráfico de líneas",
    fr: "Légende du graphique en lignes",
  },
  "Representative series": {
    ja: "代表系列",
    ko: "대표 시리즈",
    es: "Serie representativa",
    fr: "Série représentative",
  },
  "Peer series": {
    ja: "比較系列",
    ko: "피어 시리즈",
    es: "Series pares",
    fr: "Séries comparables",
  },
  Series: { ja: "系列", ko: "시리즈", es: "Serie", fr: "Série" },
  "visible time series": {
    ja: "表示中の時系列",
    ko: "표시된 시계열",
    es: "series temporales visibles",
    fr: "séries temporelles visibles",
  },
  "cum pnl": {
    ja: "累積 PnL",
    ko: "누적 PnL",
    es: "PnL acum.",
    fr: "PnL cumulé",
  },
  "Cum PnL": {
    ja: "累積 PnL",
    ko: "누적 PnL",
    es: "PnL acum.",
    fr: "PnL cumulé",
  },
  "Peer symbols": {
    ja: "比較銘柄",
    ko: "피어 종목",
    es: "Símbolos pares",
    fr: "Symboles comparables",
  },
  "symbol cumulative PnL lines": {
    ja: "銘柄別累積 PnL ライン",
    ko: "종목별 누적 PnL 라인",
    es: "líneas de PnL acumulado por símbolo",
    fr: "lignes de PnL cumulé par symbole",
  },
  "Top 10 symbols by total PnL": {
    ja: "総 PnL 上位 10 銘柄",
    ko: "총 PnL 상위 10개 종목",
    es: "10 símbolos principales por PnL total",
    fr: "Top 10 symboles par PnL total",
  },
  "Bottom 10 symbols by total PnL": {
    ja: "総 PnL 下位 10 銘柄",
    ko: "총 PnL 하위 10개 종목",
    es: "10 símbolos inferiores por PnL total",
    fr: "Bottom 10 symboles par PnL total",
  },
  "Top 10 symbols": {
    ja: "上位 10 銘柄",
    ko: "상위 10개 종목",
    es: "10 símbolos principales",
    fr: "Top 10 symboles",
  },
  "Bottom 10 symbols": {
    ja: "下位 10 銘柄",
    ko: "하위 10개 종목",
    es: "10 símbolos inferiores",
    fr: "Bottom 10 symboles",
  },
  "Total PnL": { ja: "総 PnL", ko: "총 PnL", es: "PnL total", fr: "PnL total" },
  "ranked symbol cumulative PnL lines": {
    ja: "順位付き銘柄累積 PnL ライン",
    ko: "순위별 종목 누적 PnL 라인",
    es: "líneas de PnL acumulado por símbolo clasificado",
    fr: "lignes de PnL cumulé par symbole classé",
  },
  "10 symbols": {
    ja: "10 銘柄",
    ko: "10개 종목",
    es: "10 símbolos",
    fr: "10 symboles",
  },
  "Mean daily Barra exposure bars": {
    ja: "日次平均 Barra エクスポージャーバー",
    ko: "일평균 Barra 익스포저 막대",
    es: "Barras de exposición diaria media Barra",
    fr: "Barres d'exposition Barra quotidienne moyenne",
  },
  "Barra factor long and short mean exposure": {
    ja: "Barra ファクターのロング/ショート平均エクスポージャー",
    ko: "Barra 팩터 롱/숏 평균 익스포저",
    es: "Exposición media larga y corta por factor Barra",
    fr: "Exposition moyenne long/short par facteur Barra",
  },
  "Mean exposure": {
    ja: "平均エクスポージャー",
    ko: "평균 익스포저",
    es: "Exposición media",
    fr: "Exposition moyenne",
  },
  "Long mean": {
    ja: "ロング平均",
    ko: "롱 평균",
    es: "Media larga",
    fr: "Moyenne long",
  },
  "Short mean": {
    ja: "ショート平均",
    ko: "숏 평균",
    es: "Media corta",
    fr: "Moyenne short",
  },
  Factor: { ja: "ファクター", ko: "팩터", es: "Factor", fr: "Facteur" },
  "Positive exposure": {
    ja: "プラスエクスポージャー",
    ko: "양의 익스포저",
    es: "Exposición positiva",
    fr: "Exposition positive",
  },
  "Negative exposure": {
    ja: "マイナスエクスポージャー",
    ko: "음의 익스포저",
    es: "Exposición negativa",
    fr: "Exposition négative",
  },
  "factor exposure": {
    ja: "ファクターエクスポージャー",
    ko: "팩터 익스포저",
    es: "exposición de factor",
    fr: "exposition facteur",
  },
  "Prediction Decile Returns (cum)": {
    ja: "予測十分位リターン（累積）",
    ko: "예측 분위 수익률(누적)",
    es: "Retornos por decil predictivo (acum.)",
    fr: "Rendements par décile prédictif (cum.)",
  },
  "Barra Style Long-Short Returns (cum)": {
    ja: "Barra スタイル Long-Short リターン（累積）",
    ko: "Barra 스타일 롱숏 수익률(누적)",
    es: "Retornos long-short de estilos Barra (acum.)",
    fr: "Rendements long-short des styles Barra (cum.)",
  },
  "Mean Daily Barra Exposure": {
    ja: "日次平均 Barra エクスポージャー",
    ko: "일평균 Barra 익스포저",
    es: "Exposición diaria media Barra",
    fr: "Exposition Barra quotidienne moyenne",
  },
  "Prediction Return Autocorr Decay": {
    ja: "予測リターン自己相関減衰",
    ko: "예측 수익률 자기상관 감쇠",
    es: "Decaimiento de autocorr. del retorno predictivo",
    fr: "Décroissance autocorr. du rendement prédictif",
  },
  "Prediction-Barra Correlation (EMA250)": {
    ja: "予測-Barra 相関（EMA250）",
    ko: "예측-Barra 상관(EMA250)",
    es: "Correlación predicción-Barra (EMA250)",
    fr: "Corrélation prédiction-Barra (EMA250)",
  },
  "Daily Turnover Rate": {
    ja: "日次売買回転率",
    ko: "일간 회전율",
    es: "Tasa de rotación diaria",
    fr: "Taux de turnover quotidien",
  },
  "Position History": {
    ja: "ポジション履歴",
    ko: "포지션 이력",
    es: "Historial de posiciones",
    fr: "Historique des positions",
  },
  "Closed positions from the latest strategy replay": {
    ja: "最新ストラテジーリプレイのクローズ済みポジション",
    ko: "최신 전략 리플레이의 청산 포지션",
    es: "Posiciones cerradas del último replay de estrategia",
    fr: "Positions clôturées du dernier replay de stratégie",
  },
  Position: { ja: "ポジション", ko: "포지션", es: "Posición", fr: "Position" },
  "Entry Price": {
    ja: "エントリー価格",
    ko: "진입가",
    es: "Precio de entrada",
    fr: "Prix d'entrée",
  },
  "Max Open Interest": {
    ja: "最大建玉",
    ko: "최대 미결제약정",
    es: "Interés abierto máx.",
    fr: "Open interest max",
  },
  Opened: { ja: "オープン", ko: "개시", es: "Apertura", fr: "Ouverture" },
  Closed: { ja: "クローズ", ko: "청산", es: "Cierre", fr: "Clôture" },
  Perp: { ja: "無期限", ko: "무기한", es: "Perp", fr: "Perp" },
  "Cross Long": {
    ja: "クロスマージン ロング",
    ko: "교차 롱",
    es: "Largo cruzado",
    fr: "Cross long",
  },
  "Cross Short": {
    ja: "クロスマージン ショート",
    ko: "교차 숏",
    es: "Corto cruzado",
    fr: "Cross short",
  },
  "Select backtest period": {
    ja: "バックテスト期間を選択",
    ko: "백테스트 기간 선택",
    es: "Seleccionar periodo de backtest",
    fr: "Sélectionner la période de backtest",
  },
  "Custom date range": {
    ja: "カスタム期間",
    ko: "사용자 지정 기간",
    es: "Rango personalizado",
    fr: "Période personnalisée",
  },
  "Start date": { ja: "開始日", ko: "시작일", es: "Fecha de inicio", fr: "Date de début" },
  "End date": { ja: "終了日", ko: "종료일", es: "Fecha de fin", fr: "Date de fin" },
  "Portfolio NAV · Drawdown": {
    ja: "ポートフォリオ NAV · Drawdown",
    ko: "포트폴리오 NAV · Drawdown",
    es: "NAV de cartera · Drawdown",
    fr: "NAV portefeuille · Drawdown",
  },
  "net & gross NAV · 1500 pts": {
    ja: "Net/Gross NAV · 1500 点",
    ko: "Net/Gross NAV · 1500 포인트",
    es: "Net/Gross NAV · 1500 pts",
    fr: "Net/Gross NAV · 1500 pts",
  },
  "Average Sector Exposure": {
    ja: "平均セクターエクスポージャー",
    ko: "평균 섹터 익스포저",
    es: "Exposición sectorial media",
    fr: "Exposition sectorielle moyenne",
  },
  "long (+) / short (-) avg abs weight": {
    ja: "ロング (+) / ショート (-) 平均絶対ウェイト",
    ko: "롱(+) / 숏(-) 평균 절대 가중치",
    es: "largo (+) / corto (-), peso abs. medio",
    fr: "long (+) / short (-), poids abs. moyen",
  },
  "Sector Return Rank": {
    ja: "セクターリターン順位",
    ko: "섹터 수익률 순위",
    es: "Ranking de retorno sectorial",
    fr: "Classement du rendement sectoriel",
  },
  "total pnl contribution · top + bottom": {
    ja: "総 PnL 寄与 · 上位 + 下位",
    ko: "총 PnL 기여 · 상위 + 하위",
    es: "contribución PnL total · top + bottom",
    fr: "contribution PnL totale · top + bottom",
  },
  "Single-Symbol Cumulative PnL (All)": {
    ja: "単一銘柄累積 PnL（全体）",
    ko: "단일 종목 누적 PnL(전체)",
    es: "PnL acumulado por símbolo (todos)",
    fr: "PnL cumulé par symbole (tous)",
  },
  "99 symbols": {
    ja: "99 銘柄",
    ko: "99개 종목",
    es: "99 símbolos",
    fr: "99 symboles",
  },
  "Single-Symbol PnL Rank": {
    ja: "単一銘柄 PnL 順位",
    ko: "단일 종목 PnL 순위",
    es: "Ranking PnL por símbolo",
    fr: "Classement PnL par symbole",
  },
  "ranked by total pnl": {
    ja: "総 PnL 順",
    ko: "총 PnL 기준",
    es: "ordenado por PnL total",
    fr: "classé par PnL total",
  },
  "CS Attribution Overview": {
    ja: "CS アトリビューション概要",
    ko: "CS 기여도 개요",
    es: "Resumen de atribución CS",
    fr: "Vue d'ensemble attribution CS",
  },
  "7 Barra factors · attribution dashboard": {
    ja: "7 Barra ファクター · アトリビューションダッシュボード",
    ko: "7개 Barra 팩터 · 기여도 대시보드",
    es: "7 factores Barra · panel de atribución",
    fr: "7 facteurs Barra · tableau d'attribution",
  },
};
const tReport = (tr: Tr, en: string, zh: string) => tr(en, zh, reportCopy[en]);
const portfolioSeriesMeta: Record<ChartSeriesKey, { label: string; color: string; mark?: "bar" | "cross" }> = {
  net: { label: "Net NAV", color: "#dc4900" },
  gross: { label: "Gross NAV", color: "#2a6fdb" },
  drawdown: { label: "Drawdown", color: "#d64550" },
};
const portfolioDrawdownEventColors = {
  peak: "var(--report-red)",
  trough: "var(--report-green)",
} as const;
const portfolioSeriesKeys: ChartSeriesKey[] = ["net", "gross", "drawdown"];
const portfolioNavTicks = [3.57, 2.88, 2.2, 1.51, 0.82];
const portfolioDrawdownTicks = [0, -0.1, -0.2];
const portfolioTimeTicks = ["2021-01", "2021-04", "2021-07", "2021-10", "2021-12", "2022-03", "2022-06"];
const portfolioNavDomain = { min: 0.82, max: 3.57 };
const portfolioDrawdownDomain = { min: -0.25, max: 0 };
const denseSymbolPnlDomain = { min: -0.24, max: 0.24 };
const denseSymbolPnlTicks = [-0.2, -0.1, 0, 0.1, 0.2];
const denseSymbolDateTicks = ["2021-01", "2021-04", "2021-07", "2021-10", "2021-12", "2022-03", "2022-06"];
const denseSymbolCount = 99;
const densePointCount = 160;
const symbolRankPnlDomain = { min: -0.18, max: 0.18 };
const symbolRankPnlTicks = [-0.15, -0.075, 0, 0.075, 0.15];
const topSymbolPnlRankRows: SymbolPnlRankRow[] = [
  {
    symbol: "BANDUSDT",
    total: 0.1642,
    color: symbolRankPalette[0],
    group: "top",
  },
  {
    symbol: "API3USDT",
    total: 0.1475,
    color: symbolRankPalette[1],
    group: "top",
  },
  {
    symbol: "LPTUSDT",
    total: 0.1328,
    color: symbolRankPalette[2],
    group: "top",
  },
  {
    symbol: "MANAUSDT",
    total: 0.1186,
    color: symbolRankPalette[3],
    group: "top",
  },
  {
    symbol: "AAVEUSDT",
    total: 0.1034,
    color: symbolRankPalette[4],
    group: "top",
  },
  {
    symbol: "INJUSDT",
    total: 0.0941,
    color: symbolRankPalette[5],
    group: "top",
  },
  {
    symbol: "RNDRUSDT",
    total: 0.0827,
    color: symbolRankPalette[6],
    group: "top",
  },
  {
    symbol: "SOLUSDT",
    total: 0.0713,
    color: symbolRankPalette[7],
    group: "top",
  },
  {
    symbol: "GMXUSDT",
    total: 0.0608,
    color: symbolRankPalette[8],
    group: "top",
  },
  {
    symbol: "MAGICUSDT",
    total: 0.0526,
    color: symbolRankPalette[9],
    group: "top",
  },
];
const bottomSymbolPnlRankRows: SymbolPnlRankRow[] = [
  {
    symbol: "BATUSDT",
    total: -0.1514,
    color: symbolRankPalette[0],
    group: "bottom",
  },
  {
    symbol: "ZILUSDT",
    total: -0.1342,
    color: symbolRankPalette[1],
    group: "bottom",
  },
  {
    symbol: "ALGOUSDT",
    total: -0.1196,
    color: symbolRankPalette[2],
    group: "bottom",
  },
  {
    symbol: "QTUMUSDT",
    total: -0.1038,
    color: symbolRankPalette[3],
    group: "bottom",
  },
  {
    symbol: "DASHUSDT",
    total: -0.0915,
    color: symbolRankPalette[4],
    group: "bottom",
  },
  {
    symbol: "KAVAUSDT",
    total: -0.0782,
    color: symbolRankPalette[5],
    group: "bottom",
  },
  {
    symbol: "SUSHIUSDT",
    total: -0.0664,
    color: symbolRankPalette[6],
    group: "bottom",
  },
  {
    symbol: "ENJUSDT",
    total: -0.0547,
    color: symbolRankPalette[7],
    group: "bottom",
  },
  {
    symbol: "MASKUSDT",
    total: -0.0435,
    color: symbolRankPalette[8],
    group: "bottom",
  },
  {
    symbol: "YFIUSDT",
    total: -0.0349,
    color: symbolRankPalette[9],
    group: "bottom",
  },
];
const portfolioChartFrame = {
  width: 1000,
  height: 470,
  left: 44,
  right: 40,
  navTop: 24,
  navHeight: 236,
  drawdownTop: 310,
  drawdownHeight: 126,
};
const portfolioTooltipEdgeInset = 158;
const portfolioPlotWidth = portfolioChartFrame.width - portfolioChartFrame.left - portfolioChartFrame.right;

function scalePortfolioX(index: number) {
  return portfolioChartFrame.left + (index / Math.max(1, portfolioNavData.length - 1)) * portfolioPlotWidth;
}

function scalePortfolioNav(value: number) {
  return portfolioChartFrame.navTop + portfolioChartFrame.navHeight - ((value - portfolioNavDomain.min) / (portfolioNavDomain.max - portfolioNavDomain.min)) * portfolioChartFrame.navHeight;
}

function scalePortfolioDrawdown(value: number) {
  return (
    portfolioChartFrame.drawdownTop +
    portfolioChartFrame.drawdownHeight -
    ((value - portfolioDrawdownDomain.min) / (portfolioDrawdownDomain.max - portfolioDrawdownDomain.min)) * portfolioChartFrame.drawdownHeight
  );
}

function indexForPortfolioDateTick(tick: string) {
  const target = new Date(`${tick}-01T00:00:00.000Z`).getTime();
  const first = new Date(`${portfolioNavData[0].date}T00:00:00.000Z`).getTime();
  const last = new Date(`${portfolioNavData[portfolioNavData.length - 1].date}T00:00:00.000Z`).getTime();
  const index = Math.round(((target - first) / (last - first)) * (portfolioNavData.length - 1));
  return Math.max(0, Math.min(portfolioNavData.length - 1, index));
}

function dateForDensePoint(index: number, total = densePointCount) {
  const start = Date.UTC(2021, 0, 1);
  const end = Date.UTC(2022, 5, 1);
  const progress = index / Math.max(1, total - 1);
  return new Date(start + (end - start) * progress);
}

function formatDenseDate(index: number, total = densePointCount) {
  return dateForDensePoint(index, total).toISOString().slice(0, 10);
}

function indexForDenseDateTick(tick: string, total = densePointCount) {
  const target = new Date(`${tick}-01T00:00:00.000Z`).getTime();
  const first = dateForDensePoint(0, total).getTime();
  const last = dateForDensePoint(total - 1, total).getTime();
  const index = Math.round(((target - first) / (last - first)) * (total - 1));
  return Math.max(0, Math.min(total - 1, index));
}

function formatDensePnlValue(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) < 0.0005) return "0.0000";
  return value.toFixed(4);
}

function formatDecileReturnValue(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) < 0.005) return "0.00";
  return value.toFixed(2);
}

function portfolioPointFor(key: ChartSeriesKey, index: number): PortfolioPoint {
  const point = portfolioNavData[index];
  return {
    x: scalePortfolioX(index),
    y: key === "drawdown" ? scalePortfolioDrawdown(point.drawdown) : scalePortfolioNav(point[key]),
    value: point[key],
  };
}

function portfolioPathFor(key: ChartSeriesKey) {
  return portfolioNavData
    .map((point, index) => {
      const x = scalePortfolioX(index);
      const y = key === "drawdown" ? scalePortfolioDrawdown(point.drawdown) : scalePortfolioNav(point[key]);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function portfolioDrawdownAreaPath() {
  const zeroY = scalePortfolioDrawdown(0);
  const line = portfolioNavData.map((point, index) => `${index === 0 ? "M" : "L"} ${scalePortfolioX(index).toFixed(1)} ${scalePortfolioDrawdown(point.drawdown).toFixed(1)}`).join(" ");
  return `${line} L ${scalePortfolioX(portfolioNavData.length - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${scalePortfolioX(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;
}

function makeSeries(count: number, seed: number, drift = 0.7, amp = 0.2) {
  return Array.from({ length: count }, (_, index) => {
    const x = index / Math.max(1, count - 1);
    const wave = Math.sin(index * (0.27 + seed * 0.015)) * amp;
    const wobble = Math.cos(index * (0.13 + seed * 0.01)) * amp * 0.4;
    return 0.7 + x * drift + wave + wobble + seed * 0.015;
  });
}

function makeDenseSymbolPnlSeries(count: number, seed: number) {
  if (seed === 0) {
    return Array.from({ length: count }, (_, index) => {
      const progress = index / Math.max(1, count - 1);
      const runUp = 0.135 * (1 - Math.exp(-progress * 8));
      const fade = 0.062 * progress;
      const cycle = Math.sin(index * 0.11) * 0.008 + Math.sin(index * 0.37) * 0.0035;
      const midLift = Math.exp(-Math.pow((progress - 0.56) / 0.085, 2)) * 0.025;
      const lateDrag = Math.exp(-Math.pow((progress - 0.9) / 0.13, 2)) * 0.035;
      return Math.max(denseSymbolPnlDomain.min, Math.min(denseSymbolPnlDomain.max, 0.012 + runUp - fade + cycle + midLift - lateDrag));
    });
  }

  let value = ((seed % 9) - 4) * 0.012;
  const drift = ((seed % 13) - 5) * 0.00018;
  const shockDirection = seed % 2 === 0 ? 1 : -1;
  const shockCenter = 0.1 + ((seed * 17) % 75) / 100;
  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const noise = Math.sin(index * (0.19 + seed * 0.003)) * 0.0028 + Math.cos(index * (0.071 + seed * 0.004)) * 0.0017;
    const regime = Math.exp(-Math.pow((progress - shockCenter) / 0.045, 2)) * shockDirection * (0.004 + (seed % 5) * 0.0012);
    const meanRevert = -value * 0.006;
    value += drift + noise + regime + meanRevert;
    return Math.max(denseSymbolPnlDomain.min, Math.min(denseSymbolPnlDomain.max, value));
  });
}

function makeSymbolRankPnlSeries(row: SymbolPnlRankRow, seed: number, count = densePointCount) {
  const direction = row.total >= 0 ? 1 : -1;
  const magnitude = Math.max(0.02, Math.abs(row.total));
  const speed = 1.9 + (seed % 4) * 0.28;
  const shockCenter = 0.18 + ((seed * 11) % 54) / 100;
  const rawValues = Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const eased = (1 - Math.exp(-progress * speed)) / (1 - Math.exp(-speed));
    const wave = Math.sin(index * (0.08 + seed * 0.004)) * magnitude * 0.12 + Math.cos(index * (0.19 + seed * 0.006)) * magnitude * 0.055;
    const regime = Math.exp(-Math.pow((progress - shockCenter) / 0.07, 2)) * direction * magnitude * (0.12 + (seed % 3) * 0.035);
    const lateReversion = Math.exp(-Math.pow((progress - 0.82) / 0.16, 2)) * -direction * magnitude * (0.035 + (seed % 2) * 0.02);
    return row.total * eased + wave * (1 - progress * 0.35) + regime + lateReversion;
  });
  const first = rawValues[0] ?? 0;
  const last = rawValues.at(-1) ?? row.total;

  return rawValues.map((value, index) => {
    const progress = index / Math.max(1, count - 1);
    const adjusted = value - first * (1 - progress) + (row.total - last) * progress;
    return Math.max(symbolRankPnlDomain.min, Math.min(symbolRankPnlDomain.max, adjusted));
  });
}

function formatChartValue(value: number, unit: "nav" | "percent" | "score" = "score") {
  if (!Number.isFinite(value)) return "--";
  if (unit === "percent") return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
  return value.toFixed(4);
}

function formatAxisTick(value: number) {
  if (Math.abs(value) < 0.005) return "0.00";
  return value.toFixed(2);
}

function getDomainPercent(value: number, domain: { min: number; max: number }) {
  const range = domain.max - domain.min || 1;
  const percent = ((value - domain.min) / range) * 100;
  return Math.min(100, Math.max(0, percent));
}

function getDivergingBarStyle(value: number, domain: { min: number; max: number }) {
  const zero = getDomainPercent(0, domain);
  const point = getDomainPercent(value, domain);
  const width = Math.abs(point - zero);
  return {
    left: `${Math.min(zero, point)}%`,
    width: `${value === 0 ? 0 : Math.max(2, width)}%`,
  };
}

function formatPortfolioPeriod(index: number, total: number) {
  const start = new Date(Date.UTC(2021, 0, 1));
  const monthOffset = Math.round((index / Math.max(1, total - 1)) * 17);
  start.setUTCMonth(start.getUTCMonth() + monthOffset);
  return `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatPortfolioDate(value: string) {
  return value;
}

function formatCompactAxisValue(value: number) {
  if (!Number.isFinite(value)) return "--";
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}K`;
  return `${Math.round(value)}`;
}

function toPathFromPoints(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function ChartEmptyState({ message, tr = defaultTr }: { message?: string; tr?: Tr }) {
  return (
    <div className="oq-chart-empty" role="status">
      <strong>{message ?? tReport(tr, "No chart data available", "暂无图表数据")}</strong>
      <span>{tReport(tr, "Check filters or choose another period.", "检查筛选条件或选择其他周期。")}</span>
    </div>
  );
}

function getPortfolioSeriesLabel(key: ChartSeriesKey, tr: Tr) {
  if (key === "net") return tReport(tr, "Net NAV", "净 NAV");
  if (key === "gross") return tReport(tr, "Gross NAV", "总 NAV");
  return tReport(tr, "Drawdown", "回撤");
}

function PortfolioNavChart({ tr = defaultTr }: { tr?: Tr }) {
  const [visibleSeries, setVisibleSeries] = useState<Set<ChartSeriesKey>>(() => new Set(portfolioSeriesKeys));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartStackRef = useRef<HTMLDivElement>(null);
  const activeDatum = activeIndex === null ? null : portfolioNavData[activeIndex];
  const isVisible = (key: ChartSeriesKey) => visibleSeries.has(key);
  const toggleSeries = (key: ChartSeriesKey) => {
    setActiveIndex(null);
    setVisibleSeries(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next.size > 0 ? next : current;
    });
  };
  const clearInteraction = () => setActiveIndex(null);
  useEffect(() => {
    if (activeIndex === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartStackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) clearInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeIndex]);
  const showTooltipForIndex = (index: number) => setActiveIndex(index);
  const showNearestTooltip = (event: PointerEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const pointer = svgPoint.matrixTransform(matrix.inverse());
    const nearestIndex = Math.max(0, Math.min(portfolioNavData.length - 1, Math.round(((pointer.x - portfolioChartFrame.left) / portfolioPlotWidth) * (portfolioNavData.length - 1))));
    showTooltipForIndex(nearestIndex);
  };
  const showKeyboardTooltip = (direction: "start" | "previous" | "next" | "end") => {
    const current = activeIndex ?? portfolioTroughIndex;
    const next =
      direction === "start" ? 0 : direction === "end" ? portfolioNavData.length - 1 : direction === "previous" ? Math.max(0, current - 1) : Math.min(portfolioNavData.length - 1, current + 1);
    showTooltipForIndex(next);
  };
  const peakPoint = portfolioPointFor("net", portfolioPeakIndex);
  const troughPoint = portfolioPointFor("net", portfolioTroughIndex);
  const drawdownPeakPoint = portfolioPointFor("drawdown", portfolioPeakIndex);
  const drawdownTroughPoint = portfolioPointFor("drawdown", portfolioTroughIndex);
  const activeX = activeIndex === null ? null : scalePortfolioX(activeIndex);
  const tooltipRows = activeDatum
    ? portfolioSeriesKeys.filter(isVisible).map(key => ({
        label: getPortfolioSeriesLabel(key, tr),
        value: key === "drawdown" ? formatChartValue(activeDatum.drawdown, "percent") : formatChartValue(activeDatum[key], "nav"),
        color: portfolioSeriesMeta[key].color,
        active: true,
      }))
    : [];
  if (portfolioNavData.length === 0) return <ChartEmptyState />;

  return (
    <div ref={chartStackRef} className="oq-chart-stack">
      <div className="oq-chart-toolbar">
        <div className="oq-report-legend" aria-label={tReport(tr, "Portfolio chart series", "组合图表序列")}>
          {portfolioSeriesKeys.map(key => (
            <ChartLegendItem
              key={key}
              color={portfolioSeriesMeta[key].color}
              label={getPortfolioSeriesLabel(key, tr)}
              active={isVisible(key)}
              pressed={isVisible(key)}
              onToggle={() => toggleSeries(key)}
            />
          ))}
          <ChartLegendItem color={portfolioDrawdownEventColors.peak} label={tReport(tr, "Max DD peak", "最大回撤峰值")} mark="cross" />
          <ChartLegendItem color={portfolioDrawdownEventColors.trough} label={tReport(tr, "Max DD trough", "最大回撤谷值")} mark="cross" />
        </div>
      </div>
      <div className="oq-nav-chart" onMouseLeave={clearInteraction} onPointerLeave={clearInteraction}>
        <div className="oq-nav-chart-canvas">
          <svg
            viewBox={`0 0 ${portfolioChartFrame.width} ${portfolioChartFrame.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            tabIndex={0}
            aria-label={tReport(
              tr,
              "Portfolio net NAV, gross NAV and drawdown over time, with maximum drawdown peak and trough markers",
              "组合净 NAV、总 NAV 与回撤的时间序列，并标记最大回撤的峰值和谷值"
            )}
            onFocus={() => showTooltipForIndex(portfolioTroughIndex)}
            onBlur={clearInteraction}
            onKeyDown={event => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                showKeyboardTooltip("previous");
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                showKeyboardTooltip("next");
              }
              if (event.key === "Home") {
                event.preventDefault();
                showKeyboardTooltip("start");
              }
              if (event.key === "End") {
                event.preventDefault();
                showKeyboardTooltip("end");
              }
            }}
          >
            <defs>
              <linearGradient id="oq-drawdown-area-gradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#d64550" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#d64550" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <g className="oq-chart-grid" aria-hidden="true">
              {portfolioNavTicks.map(tick => (
                <line key={`nav-${tick}`} x1={portfolioChartFrame.left} x2={portfolioChartFrame.width - portfolioChartFrame.right} y1={scalePortfolioNav(tick)} y2={scalePortfolioNav(tick)} />
              ))}
              {portfolioDrawdownTicks.map(tick => (
                <line key={`dd-${tick}`} x1={portfolioChartFrame.left} x2={portfolioChartFrame.width - portfolioChartFrame.right} y1={scalePortfolioDrawdown(tick)} y2={scalePortfolioDrawdown(tick)} />
              ))}
              {portfolioTimeTicks.map(tick => {
                const x = scalePortfolioX(indexForPortfolioDateTick(tick));
                return (
                  <line
                    className="oq-chart-vertical-grid"
                    key={`time-${tick}`}
                    x1={x}
                    x2={x}
                    y1={portfolioChartFrame.navTop}
                    y2={portfolioChartFrame.drawdownTop + portfolioChartFrame.drawdownHeight}
                  />
                );
              })}
            </g>
            {isVisible("drawdown") ? <path d={portfolioDrawdownAreaPath()} className="oq-drawdown-area" aria-hidden="true" /> : null}
            {isVisible("gross") ? <path d={portfolioPathFor("gross")} className="oq-line-blue oq-chart-series" /> : null}
            {isVisible("net") ? <path d={portfolioPathFor("net")} className="oq-line-gold oq-chart-series" /> : null}
            {isVisible("drawdown") ? <path d={portfolioPathFor("drawdown")} className="oq-line-drawdown oq-chart-series" /> : null}
            <g className="oq-chart-axis" aria-hidden="true">
              {portfolioNavTicks.map(tick => (
                <text key={tick} x={portfolioChartFrame.left - 14} y={scalePortfolioNav(tick) + 4} textAnchor="end">
                  {tick.toFixed(2)}
                </text>
              ))}
              {portfolioDrawdownTicks.map(tick => (
                <text key={tick} x={portfolioChartFrame.left - 14} y={scalePortfolioDrawdown(tick) + 4} textAnchor="end">{`${Math.round(tick * 100)}%`}</text>
              ))}
              {portfolioTimeTicks.map(tick => (
                <text key={tick} x={scalePortfolioX(indexForPortfolioDateTick(tick))} y={portfolioChartFrame.height - 6} textAnchor="middle">
                  {tick}
                </text>
              ))}
              <text className="oq-drawdown-note" x={portfolioChartFrame.left} y={portfolioChartFrame.drawdownTop - 18}>
                {tReport(tr, "Drawdown · worst -20.99%", "回撤 · 最深 -20.99%")}
              </text>
            </g>
            <g aria-hidden="true">
              <line
                className="oq-drawdown-zero-line"
                x1={portfolioChartFrame.left}
                x2={portfolioChartFrame.width - portfolioChartFrame.right}
                y1={scalePortfolioDrawdown(0)}
                y2={scalePortfolioDrawdown(0)}
              />
              <text className="oq-event-marker is-peak" x={peakPoint.x} y={peakPoint.y - 8} textAnchor="middle" style={{ fill: portfolioDrawdownEventColors.peak }}>
                ×
              </text>
              <text className="oq-event-marker is-trough" x={troughPoint.x} y={troughPoint.y + 20} textAnchor="middle" style={{ fill: portfolioDrawdownEventColors.trough }}>
                ×
              </text>
              <circle className="oq-event-dot is-peak" cx={drawdownPeakPoint.x} cy={drawdownPeakPoint.y} r="5" style={{ fill: portfolioDrawdownEventColors.peak }} />
              <circle className="oq-event-dot is-trough" cx={drawdownTroughPoint.x} cy={drawdownTroughPoint.y} r="5" style={{ fill: portfolioDrawdownEventColors.trough }} />
            </g>
            {activeX !== null ? (
              <g aria-hidden="true">
                <line className="oq-chart-crosshair" x1={activeX} x2={activeX} y1={portfolioChartFrame.navTop} y2={portfolioChartFrame.drawdownTop + portfolioChartFrame.drawdownHeight} />
                {portfolioSeriesKeys.filter(isVisible).map(key => {
                  const point = portfolioPointFor(key, activeIndex ?? 0);
                  return <circle className="oq-chart-active-marker" cx={point.x} cy={point.y} key={key} r="4" style={{ color: portfolioSeriesMeta[key].color }} />;
                })}
              </g>
            ) : null}
            <rect
              className="oq-chart-hit-area"
              x={portfolioChartFrame.left}
              y={portfolioChartFrame.navTop}
              width={portfolioPlotWidth}
              height={portfolioChartFrame.drawdownTop + portfolioChartFrame.drawdownHeight - portfolioChartFrame.navTop}
              onPointerMove={showNearestTooltip}
              onPointerEnter={showNearestTooltip}
              onPointerDown={event => {
                event.preventDefault();
                showNearestTooltip(event);
              }}
              onPointerLeave={clearInteraction}
            />
          </svg>
          {activeDatum && activeX !== null ? (
            <div
              className="oq-chart-tooltip is-dense"
              style={{
                left: `clamp(${portfolioTooltipEdgeInset}px, ${(activeX / portfolioChartFrame.width) * 100}%, calc(100% - ${portfolioTooltipEdgeInset}px))`,
                top: "44%",
              }}
              role="status"
            >
              <ChartTooltip title={formatPortfolioDate(activeDatum.date)} rows={tooltipRows} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetricsTable({
  rows = navMetrics,
  tr = defaultTr,
  plainExplainEnabled = true,
}: {
  rows?: ReportMetricRow[];
  tr?: Tr;
  plainExplainEnabled?: boolean;
}) {
  if (rows.length === 0) return <ChartEmptyState message={tReport(tr, "No metrics available", "暂无指标数据")} tr={tr} />;

  return (
    <div className="oq-report-metrics-table" role="table" aria-label={tReport(tr, "Portfolio metrics", "组合指标")}>
      <div className="oq-report-table-row is-head">
        <span>{tReport(tr, "Metric", "指标")}</span>
        <span>{tReport(tr, "Value", "数值")}</span>
      </div>
      {rows.map(([metric, value, explanation]) => (
        <MaybeExplainTooltip
          enabled={plainExplainEnabled}
          explanation={explanation}
          key={metric}
        >
          <div
            className="oq-report-table-row"
            tabIndex={explanation && plainExplainEnabled ? 0 : undefined}
          >
            <span>{metric}</span>
            <strong>{value}</strong>
          </div>
        </MaybeExplainTooltip>
      ))}
    </div>
  );
}

function ExposureChart({ tr = defaultTr }: { tr?: Tr }) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<"long" | "short" | null>(null);
  const [visibleSides, setVisibleSides] = useState<Set<"long" | "short">>(() => new Set<"long" | "short">(["long", "short"]));
  const [tooltipPoint, setTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const activeRow = exposureRows.find(row => row.label === activeLabel) ?? null;
  const exposureZeroPercent = getDomainPercent(0, exposureDomain);
  const exposurePlotStyle = {
    "--zero-pct": `${exposureZeroPercent}%`,
  } as CSSProperties;
  const clearInteraction = () => {
    setActiveLabel(null);
    setActiveSide(null);
    setTooltipPoint(null);
  };
  const toggleSide = (side: "long" | "short") => {
    clearInteraction();
    setVisibleSides(current => {
      const next = new Set(current);
      if (next.has(side)) next.delete(side);
      else next.add(side);
      return next.size > 0 ? next : current;
    });
  };
  const setTooltipFromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const shouldFlip = localX > rect.width - 314 || event.clientX > window.innerWidth - 314;
    setTooltipPoint({
      x: shouldFlip ? localX - 304 : localX + 14,
      y: event.clientY - rect.top + 14,
    });
  };
  const setTooltipFromRow = (rowElement: HTMLElement) => {
    const chartRect = chartRef.current?.getBoundingClientRect();
    const rowRect = rowElement.getBoundingClientRect();
    if (!chartRect) return;
    setTooltipPoint({
      x: rowRect.right - chartRect.left - 304,
      y: rowRect.top - chartRect.top + rowRect.height / 2 + 10,
    });
  };
  const showTooltip = (label: string, side: "long" | "short", event: PointerEvent<HTMLElement>) => {
    setActiveLabel(label);
    setActiveSide(side);
    setTooltipFromPointer(event);
  };
  useEffect(() => {
    if (activeLabel === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) clearInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeLabel]);
  if (exposureRows.length === 0) return <ChartEmptyState message={tReport(tr, "No exposure data available", "暂无行业暴露数据")} tr={tr} />;

  return (
    <div
      ref={chartRef}
      className="oq-exposure-chart"
      style={{ "--chart-row-count": exposureRows.length } as CSSProperties}
    >
      <div className="oq-chart-toolbar is-subtle">
        <div className="oq-report-legend">
          <ChartLegendItem color="#1f8a5b" label={tReport(tr, "Long", "多头")} active={visibleSides.has("long")} pressed={visibleSides.has("long")} onToggle={() => toggleSide("long")} />
          <ChartLegendItem color="#d64550" label={tReport(tr, "Short", "空头")} active={visibleSides.has("short")} pressed={visibleSides.has("short")} onToggle={() => toggleSide("short")} />
        </div>
      </div>
      <div className="oq-diverging-rows">
        {exposureRows.map(row => {
          const shortValue = -row.short;
          return (
            <div
              className="oq-exposure-row"
              key={row.label}
              tabIndex={0}
              role="img"
              aria-label={`${row.label}: ${tReport(tr, "Long", "多头")} ${formatChartValue(row.long, "score")}, ${tReport(tr, "Short", "空头")} ${formatChartValue(shortValue, "score")}`}
              onMouseDown={event => event.preventDefault()}
              onFocus={event => {
                setActiveLabel(row.label);
                setActiveSide(visibleSides.has("long") ? "long" : "short");
                setTooltipFromRow(event.currentTarget);
              }}
              onBlur={clearInteraction}
              onMouseLeave={clearInteraction}
            >
              <span title={row.label}>{row.label}</span>
              <div className="oq-diverging-plot" style={exposurePlotStyle}>
                {visibleSides.has("short") ? (
                  <i
                    aria-hidden="true"
                    style={getDivergingBarStyle(shortValue, exposureDomain)}
                    onPointerEnter={event => showTooltip(row.label, "short", event)}
                    onPointerMove={event => showTooltip(row.label, "short", event)}
                    onPointerLeave={clearInteraction}
                  />
                ) : null}
                {visibleSides.has("long") ? (
                  <b
                    aria-hidden="true"
                    style={getDivergingBarStyle(row.long, exposureDomain)}
                    onPointerEnter={event => showTooltip(row.label, "long", event)}
                    onPointerMove={event => showTooltip(row.label, "long", event)}
                    onPointerLeave={clearInteraction}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {activeRow && activeSide && tooltipPoint ? (
        <div
          className="oq-bar-floating-tooltip"
          style={{
            left: `clamp(12px, ${tooltipPoint.x}px, calc(100% - 312px))`,
            top: `clamp(46px, ${tooltipPoint.y}px, calc(100% - 98px))`,
          }}
        >
          <ChartTooltip
            title={activeRow.label.toUpperCase()}
            rows={[
              {
                label: activeSide === "long" ? tReport(tr, "Long", "多头") : tReport(tr, "Short", "空头"),
                value: (activeSide === "long" ? activeRow.long : activeRow.short).toFixed(4),
                color: activeSide === "long" ? "var(--report-green)" : "var(--report-red)",
                active: true,
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function SectorRankChart({ tr = defaultTr }: { tr?: Tr }) {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [visibleTones, setVisibleTones] = useState<Set<"positive" | "negative">>(() => new Set<"positive" | "negative">(["positive", "negative"]));
  const [tooltipPoint, setTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const activeRankRow = sectorRankRows.find(([label]) => label === activeLabel) ?? null;
  const rankZeroPercent = getDomainPercent(0, rankDomain);
  const rankPlotStyle = {
    "--zero-pct": `${rankZeroPercent}%`,
  } as CSSProperties;
  const clearInteraction = () => {
    setActiveLabel(null);
    setTooltipPoint(null);
  };
  const toggleTone = (tone: "positive" | "negative") => {
    clearInteraction();
    setVisibleTones(current => {
      const next = new Set(current);
      if (next.has(tone)) next.delete(tone);
      else next.add(tone);
      return next.size > 0 ? next : current;
    });
  };
  const setTooltipFromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    const localX = event.clientX - rect.left;
    const shouldFlip = localX > rect.width - 314 || event.clientX > window.innerWidth - 314;
    setTooltipPoint({
      x: shouldFlip ? localX - 304 : localX + 14,
      y: event.clientY - rect.top + 14,
    });
  };
  const setTooltipFromRow = (rowElement: HTMLElement) => {
    const chartRect = chartRef.current?.getBoundingClientRect();
    const rowRect = rowElement.getBoundingClientRect();
    if (!chartRect) return;
    setTooltipPoint({
      x: rowRect.right - chartRect.left - 304,
      y: rowRect.top - chartRect.top + rowRect.height / 2 + 10,
    });
  };
  const showTooltip = (label: string, event: PointerEvent<HTMLElement>) => {
    setActiveLabel(label);
    setTooltipFromPointer(event);
  };
  useEffect(() => {
    if (activeLabel === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) clearInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeLabel]);
  if (sectorRankRows.length === 0) return <ChartEmptyState message={tReport(tr, "No sector rank data available", "暂无行业收益排名数据")} tr={tr} />;

  return (
    <div
      ref={chartRef}
      className="oq-rank-chart"
      style={{ "--chart-row-count": sectorRankRows.length } as CSSProperties}
    >
      <div className="oq-chart-toolbar is-subtle">
        <div className="oq-report-legend">
          <ChartLegendItem
            color="#1f8a5b"
            label={tReport(tr, "Positive contribution", "正向贡献")}
            active={visibleTones.has("positive")}
            pressed={visibleTones.has("positive")}
            onToggle={() => toggleTone("positive")}
          />
          <ChartLegendItem
            color="#d64550"
            label={tReport(tr, "Negative contribution", "负向贡献")}
            active={visibleTones.has("negative")}
            pressed={visibleTones.has("negative")}
            onToggle={() => toggleTone("negative")}
          />
        </div>
      </div>
      <div className="oq-diverging-rows">
        {sectorRankRows.map(([label, value]) => (
          <div
            className="oq-rank-row"
            key={label}
            tabIndex={0}
            role="img"
            aria-label={`${label}: ${formatChartValue(value, "score")}`}
            onMouseDown={event => event.preventDefault()}
            onFocus={event => {
              setActiveLabel(label);
              setTooltipFromRow(event.currentTarget);
            }}
            onBlur={clearInteraction}
            onMouseLeave={clearInteraction}
          >
            <span title={label}>{label}</span>
            <div className="oq-diverging-plot" style={rankPlotStyle}>
              {visibleTones.has(value < 0 ? "negative" : "positive") ? (
                <b
                  aria-hidden="true"
                  className={value < 0 ? "is-negative" : ""}
                  style={getDivergingBarStyle(value, rankDomain)}
                  onPointerEnter={event => showTooltip(label, event)}
                  onPointerMove={event => showTooltip(label, event)}
                  onPointerLeave={clearInteraction}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {activeRankRow && tooltipPoint ? (
        <div
          className="oq-bar-floating-tooltip"
          style={{
            left: `clamp(12px, ${tooltipPoint.x}px, calc(100% - 312px))`,
            top: `clamp(46px, ${tooltipPoint.y}px, calc(100% - 98px))`,
          }}
        >
          <ChartTooltip
            title={activeRankRow[0].toUpperCase()}
            rows={[
              {
                label: tReport(tr, "Total PnL", "总 PnL"),
                value: activeRankRow[1].toFixed(4),
                color: activeRankRow[1] < 0 ? "var(--report-red)" : "var(--report-green)",
                active: true,
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function DenseLines({
  count = 42,
  height = 260,
  compact = false,
  variant = "default",
  tr = defaultTr,
}: {
  count?: number;
  height?: number;
  compact?: boolean;
  variant?: "default" | "decile" | "barra-style" | "autocorr-decay" | "barra-correlation" | "turnover-rate";
  tr?: Tr;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hiddenIndexes, setHiddenIndexes] = useState<Set<number>>(() => new Set());
  const [tooltipPoint, setTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activePoint, setActivePoint] = useState<{
    pointIndex: number;
    value: number;
    xValue: string;
    x: number;
    y: number;
    color: string;
    symbol: string;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [responsiveViewBox, setResponsiveViewBox] = useState<{ width: number; height: number } | null>(null);
  const isDecileReturn = variant === "decile";
  const isBarraStyleReturn = variant === "barra-style";
  const isAutocorrDecay = variant === "autocorr-decay";
  const isBarraCorrelation = variant === "barra-correlation";
  const isTurnoverRate = variant === "turnover-rate";
  const isReturnChart = isDecileReturn || isBarraStyleReturn || isAutocorrDecay || isBarraCorrelation || isTurnoverRate;
  useEffect(() => {
    const node = svgRef.current;
    if (!node || !isReturnChart || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
        setResponsiveViewBox(current =>
          current?.width === next.width && current.height === next.height ? current : next,
        );
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isReturnChart]);
  const returnDomain = isAutocorrDecay
    ? autocorrDecayDomain
    : isTurnoverRate
      ? turnoverRateDomain
      : isBarraCorrelation
        ? barraCorrelationDomain
        : isBarraStyleReturn
          ? barraStyleReturnDomain
          : decileReturnDomain;
  const isSymbolCumulative = !compact && count > 20;
  const renderCount = isAutocorrDecay
    ? autocorrDecayLabels.length
    : isDecileReturn
      ? decileReturnLabels.length
      : isTurnoverRate
        ? turnoverRateLabels.length
        : isBarraStyleReturn || isBarraCorrelation
          ? barraStyleReturnLabels.length
          : isSymbolCumulative
            ? Math.min(Math.max(count, denseSymbolCount), denseSymbolCount)
            : compact
              ? Math.min(count, 8)
              : Math.min(count, count > 20 ? 18 : count);
  const isSmallMultiple = compact || count <= 12;
  const isNarrowSymbolChart = useContainerNarrow(chartRef, 560, isSymbolCumulative);
  const viewBox = responsiveViewBox && isReturnChart
    ? responsiveViewBox
    : {
        width: isNarrowSymbolChart ? 560 : isSmallMultiple ? 720 : 1000,
        height,
      };
  const usesFilledReturnFrame = isDecileReturn || isBarraStyleReturn;
  const margin = usesFilledReturnFrame
    ? { top: 8, right: 36, bottom: 18, left: 44 }
    : isSymbolCumulative
      ? { top: 6, right: 24, bottom: 24, left: 60 }
      : compact
        ? { top: 20, right: 20, bottom: 40, left: 56 }
        : isSmallMultiple
          ? { top: 24, right: 24, bottom: 44, left: 56 }
          : { top: 24, right: 24, bottom: 44, left: 60 };
  const plotWidth = viewBox.width - margin.left - margin.right;
  const plotHeight = viewBox.height - margin.top - margin.bottom;
  const pointCount = isAutocorrDecay ? autocorrDecayLagLabels.length : isTurnoverRate ? densePointCount : isReturnChart ? 120 : isSymbolCumulative ? densePointCount : 70;
  const yMin = isReturnChart ? returnDomain.min : isSymbolCumulative ? denseSymbolPnlDomain.min : 0;
  const yMax = isReturnChart ? returnDomain.max : isSymbolCumulative ? denseSymbolPnlDomain.max : compact ? 18000 : 30000;
  const yTicks = isAutocorrDecay
    ? autocorrDecayTicks
    : isTurnoverRate
      ? turnoverRateTicks
      : isBarraCorrelation
        ? barraCorrelationTicks
        : isBarraStyleReturn
          ? barraStyleReturnTicks
          : isDecileReturn
            ? decileReturnTicks
            : isSymbolCumulative
              ? denseSymbolPnlTicks
              : compact
                ? [0, 9000, 18000]
                : [0, 10000, 20000, 30000];
  const dateTickLabels = isAutocorrDecay
    ? autocorrDecayLagLabels.map(String)
    : isTurnoverRate
      ? turnoverRateDateTicks
      : isBarraCorrelation
        ? barraCorrelationDateTicks
        : isBarraStyleReturn
          ? barraStyleReturnDateTicks
          : isDecileReturn
            ? decileReturnDateTicks
            : denseSymbolDateTicks;
  const xTickIndexes = isAutocorrDecay
    ? autocorrDecayLagLabels.map((_, index) => index)
    : isReturnChart || isSymbolCumulative
      ? dateTickLabels.map(tick => indexForDenseDateTick(tick, pointCount))
      : [0, 17, 34, 52, 69];
  const denseValueLabel = isAutocorrDecay
    ? tReport(tr, "Autocorrelation", "自相关")
    : isTurnoverRate
      ? tReport(tr, "Turnover rate", "换手率")
      : isBarraCorrelation
        ? tReport(tr, "EMA250 correlation", "EMA250 相关")
        : isReturnChart
          ? tReport(tr, "Cumulative return", "累计收益")
          : isSymbolCumulative
            ? "Cum Pnl"
            : tReport(tr, "Cum PnL", "累计 PnL");
  const formatDenseValue = (value: number) =>
    isAutocorrDecay
      ? value.toFixed(4)
      : isReturnChart
        ? value.toFixed(4)
          : isSymbolCumulative
            ? formatDensePnlValue(value)
            : formatCompactAxisValue(value);
  const baselineValue = isBarraStyleReturn ? -0.22 : 0;
  const denseSeries = useMemo(() => {
    return Array.from({ length: renderCount }, (_, index) => {
      const symbol =
        (isAutocorrDecay
          ? autocorrDecayLabels[index]
          : isTurnoverRate
            ? turnoverRateLabels[index]
            : isDecileReturn
              ? decileReturnLabels[index]
              : isBarraStyleReturn || isBarraCorrelation
                ? barraStyleReturnLabels[index]
                : denseSymbolUniverse[index]) ?? `${tReport(tr, "Series", "序列")} ${index + 1}`;
      const isRepresentative = isSymbolCumulative && index === 0;
      const isLongShort = isDecileReturn && index === decileReturnLabels.length - 1;
      const isAutocorrLongShort = isAutocorrDecay && index === autocorrDecayLabels.length - 1;
      const isTurnoverAverage = isTurnoverRate && index === 1;
      const values = isAutocorrDecay
        ? (autocorrDecayValues[index] ?? [])
        : isTurnoverRate
          ? makeTurnoverRateSeries(pointCount, index)
          : isDecileReturn
            ? makeDecileReturnSeries(pointCount, index)
            : isBarraStyleReturn
              ? makeBarraStyleReturnSeries(pointCount, index)
              : isBarraCorrelation
                ? makeBarraCorrelationSeries(pointCount, index)
                : isSymbolCumulative
                  ? makeDenseSymbolPnlSeries(pointCount, index)
                  : makeSeries(pointCount, index, 0.08 - (index % 7) * 0.035, 0.08 + (index % 4) * 0.03).map((value, valueIndex) => {
                      const trend = valueIndex / Math.max(1, pointCount - 1);
                      return Math.max(0, Math.min(yMax, value * (compact ? 8200 : 12200) + trend * (compact ? 2400 : 5200) + index * (compact ? 160 : 260)));
                    });
      const points = values.map((value, pointIndex) => {
        const x = margin.left + (pointIndex / Math.max(1, values.length - 1)) * plotWidth;
        const y = margin.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
        return { x, y, value };
      });
      return {
        index,
        path: toPathFromPoints(points),
        points,
        value: values.at(-1),
        symbol,
        color: isAutocorrDecay
          ? getAutocorrDecayColor(index)
          : isTurnoverRate
            ? getTurnoverRateColor(index)
            : isDecileReturn
              ? getDecileReturnColor(index)
              : isBarraStyleReturn || isBarraCorrelation
                ? getBarraStyleReturnColor(index)
                : isRepresentative
                  ? "var(--report-gold)"
                  : linePalette[index % linePalette.length],
        isPrimary: isRepresentative || isLongShort || isAutocorrLongShort || isTurnoverAverage || (!isDecileReturn && !isBarraCorrelation && !isTurnoverRate && !isSymbolCumulative && index === 0),
      };
    });
  }, [
    compact,
    isAutocorrDecay,
    isBarraCorrelation,
    isBarraStyleReturn,
    isDecileReturn,
    isSymbolCumulative,
    isTurnoverRate,
    margin.left,
    margin.top,
    plotHeight,
    plotWidth,
    pointCount,
    renderCount,
    tr,
    yMin,
    yMax,
  ]);
  const activeSeries = activeIndex === null ? null : (denseSeries.find(series => series.index === activeIndex) ?? null);
  const turnoverDeviation = isTurnoverRate && activePoint ? (denseSeries[0]?.points[activePoint.pointIndex]?.value ?? 0) - (denseSeries[1]?.points[activePoint.pointIndex]?.value ?? 0) : null;
  const denseTooltipLimit = isBarraStyleReturn || isBarraCorrelation ? barraStyleReturnLabels.length : compact ? 4 : 6;
  const denseTooltipBottom = isBarraStyleReturn || isBarraCorrelation ? "calc(100% - 214px)" : "calc(100% - 92px)";
  const tooltipRows =
    activeIndex !== null && activePoint
      ? isSymbolCumulative
        ? [
            {
              label: denseValueLabel,
              value: formatDenseValue(activePoint.value),
              color: activePoint.color,
              active: true,
            },
          ]
        : denseSeries
            .filter(series => !hiddenIndexes.has(series.index))
            .map(series => ({
              label: series.symbol,
              value: formatDenseValue(series.points[activePoint.pointIndex]?.value ?? 0),
              color: series.color,
              active: series.index === activeIndex,
              sortDistance: series.index === activeIndex ? -1 : Math.abs(series.index - activeIndex),
            }))
            .sort((left, right) => left.sortDistance - right.sortDistance)
            .slice(0, denseTooltipLimit)
            .concat(
              turnoverDeviation === null
                ? []
                : [
                    {
                      label: tReport(tr, "Delta vs EMA30", "偏离 EMA30"),
                      value: `${turnoverDeviation >= 0 ? "+" : ""}${formatDenseValue(turnoverDeviation)}`,
                      color: "var(--report-muted)",
                      active: false,
                      sortDistance: Number.POSITIVE_INFINITY,
                    },
                  ]
            )
      : [];
  const clearDenseInteraction = () => {
    setActiveIndex(null);
    setTooltipPoint(null);
    setActivePoint(null);
  };
  const toggleDenseSeries = (index: number) => {
    clearDenseInteraction();
    setHiddenIndexes(current => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else if (next.size < denseSeries.length - 1) next.add(index);
      return next;
    });
  };
  useEffect(() => {
    if (activeIndex === null && activePoint === null && tooltipPoint === null) return;

    const clearIfPointerOutside = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (chartRef.current?.contains(document.activeElement)) return;
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) clearDenseInteraction();
    };
    const clear = () => clearDenseInteraction();

    window.addEventListener("pointermove", clearIfPointerOutside, true);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointermove", clearIfPointerOutside, true);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("blur", clear);
    };
  }, [activeIndex, activePoint, tooltipPoint]);
  const showDenseTooltip = (index: number, pointIndex: number, value: number, event: PointerEvent<SVGElement>) => {
    const chart = event.currentTarget.closest(".oq-dense-chart");
    const rect = chart?.getBoundingClientRect();
    const series = denseSeries.find(item => item.index === index);
    const point = series?.points[pointIndex];
    if (!series || !point) return;
    setActiveIndex(index);
    setActivePoint({
      pointIndex,
      value,
      xValue: isSymbolCumulative
        ? `${series.symbol} · ${formatDenseDate(pointIndex, pointCount)}`
        : isAutocorrDecay
          ? `Lag ${autocorrDecayLagLabels[pointIndex] ?? pointIndex + 1}`
          : isReturnChart
            ? formatDenseDate(pointIndex, pointCount)
            : formatPortfolioPeriod(pointIndex, pointCount),
      x: point.x,
      y: point.y,
      color: series.color,
      symbol: series.symbol,
    });
    if (!rect) return;
    setTooltipPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };
  const showNearestDenseTooltip = (event: PointerEvent<SVGElement>) => {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const pointer = svgPoint.matrixTransform(matrix.inverse());
    const pointIndex = Math.max(0, Math.min(pointCount - 1, Math.round(((pointer.x - margin.left) / plotWidth) * (pointCount - 1))));
    const candidates = denseSeries
      .filter(series => !hiddenIndexes.has(series.index))
      .map(series => {
        const point = series.points[pointIndex];
        return {
          index: series.index,
          pointIndex,
          value: point?.value ?? 0,
          distance: point ? Math.abs(point.y - pointer.y) : Number.POSITIVE_INFINITY,
        };
      });
    const nearest = candidates.slice(1).reduce((best, item) => (item.distance < best.distance ? item : best), candidates[0]);
    showDenseTooltip(nearest.index, nearest.pointIndex, nearest.value, event);
  };
  const showDenseFocusTooltip = (series: (typeof denseSeries)[number]) => {
    const lastPoint = series.points.at(-1);
    if (!lastPoint) return;
    const rect = chartRef.current?.getBoundingClientRect();
    setActiveIndex(series.index);
    setActivePoint({
      pointIndex: series.points.length - 1,
      value: lastPoint.value,
      xValue: isSymbolCumulative
        ? `${series.symbol} · ${formatDenseDate(series.points.length - 1, pointCount)}`
        : isAutocorrDecay
          ? `Lag ${autocorrDecayLagLabels[series.points.length - 1] ?? series.points.length}`
          : isReturnChart
            ? formatDenseDate(series.points.length - 1, pointCount)
            : formatPortfolioPeriod(series.points.length - 1, pointCount),
      x: lastPoint.x,
      y: lastPoint.y,
      color: series.color,
      symbol: series.symbol,
    });
    if (rect) {
      setTooltipPoint({
        x: (lastPoint.x / viewBox.width) * rect.width,
        y: (lastPoint.y / viewBox.height) * rect.height,
      });
    }
  };
  if (count <= 0) return <ChartEmptyState message={tReport(tr, "No series to display", "暂无可展示序列")} tr={tr} />;

  return (
    <div
      ref={chartRef}
      className={`oq-dense-chart ${compact ? "is-compact" : ""} ${isSymbolCumulative ? "is-symbol-cumulative" : ""} ${isDecileReturn ? "is-decile" : ""} ${isBarraStyleReturn ? "is-barra-style" : ""} ${isAutocorrDecay ? "is-autocorr" : ""} ${isBarraCorrelation ? "is-barra-correlation" : ""} ${isTurnoverRate ? "is-turnover-rate" : ""}`}
    >
      {isReturnChart ? (
        <div className={`oq-dense-legend ${isDecileReturn ? "is-decile" : "is-factor"}`} aria-label={tReport(tr, "Line chart legend", "折线图图例")}>
          {denseSeries.map(series => (
            <button
              type="button"
              aria-pressed={!hiddenIndexes.has(series.index)}
              data-active={activeIndex === series.index}
              data-visible={!hiddenIndexes.has(series.index)}
              key={series.index}
              onClick={() => toggleDenseSeries(series.index)}
              onFocus={() => showDenseFocusTooltip(series)}
              onBlur={clearDenseInteraction}
              onMouseEnter={() => showDenseFocusTooltip(series)}
              onMouseLeave={clearDenseInteraction}
            >
              <i style={{ background: series.color }} />
              {series.symbol}
            </button>
          ))}
        </div>
      ) : !compact ? (
        <div className="oq-chart-toolbar is-subtle">
          <div className="oq-dense-legend" aria-label={tReport(tr, "Line chart legend", "折线图图例")}>
            <button
              type="button"
              aria-pressed="true"
              data-active={activeIndex === (activeSeries?.index ?? 0)}
              data-visible="true"
              onMouseDown={event => event.preventDefault()}
              onClick={event => {
                showDenseFocusTooltip(denseSeries[0]);
                event.currentTarget.focus();
              }}
              onFocus={() => {
                requestAnimationFrame(() => showDenseFocusTooltip(denseSeries[0]));
              }}
              onBlur={clearDenseInteraction}
              onMouseEnter={() => showDenseFocusTooltip(denseSeries[0])}
              onPointerEnter={() => showDenseFocusTooltip(denseSeries[0])}
              onMouseLeave={clearDenseInteraction}
            >
              <i
                style={{
                  background: activeIndex === null ? linePalette[0] : linePalette[activeIndex % linePalette.length],
                }}
              />
              {activeIndex === null ? denseRepresentativeSymbol : (activeSeries?.symbol ?? `${tReport(tr, "Series", "序列")} ${activeIndex + 1}`)}
            </button>
            {!isSymbolCumulative ? (
              <span>
                <i className="is-muted" />
                {tReport(tr, "Peer series", "同组序列")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <svg
        ref={svgRef}
        className="oq-dense-lines"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={
          isDecileReturn
            ? `${renderCount} ${tReport(tr, "decile cumulative return lines", "条分位累计收益曲线")}`
            : isAutocorrDecay
              ? `${renderCount} ${tReport(tr, "prediction return autocorrelation decay lines", "条预测收益自相关衰减曲线")}`
              : isBarraCorrelation
                ? `${renderCount} ${tReport(tr, "Prediction-Barra EMA250 correlation lines", "条预测-Barra EMA250 相关曲线")}`
                : isTurnoverRate
                  ? `${renderCount} ${tReport(tr, "daily turnover rate lines", "条日换手率曲线")}`
                  : isBarraStyleReturn
                    ? `${renderCount} ${tReport(tr, "Barra style cumulative return lines", "条 Barra 风格累计收益曲线")}`
                    : isSymbolCumulative
                      ? `${renderCount} ${tReport(tr, "symbol cumulative PnL lines", "条交易对累计 PnL 曲线")}`
                      : `${renderCount} ${tReport(tr, "visible time series", "条可见时间序列")}`
        }
        onPointerEnter={showNearestDenseTooltip}
        onPointerMove={showNearestDenseTooltip}
        onPointerDown={showNearestDenseTooltip}
        onPointerLeave={clearDenseInteraction}
        onPointerCancel={clearDenseInteraction}
      >
        <g className="oq-chart-grid" aria-hidden="true">
          {isSymbolCumulative || isReturnChart
            ? xTickIndexes.map(pointIndex => {
                const x = margin.left + (pointIndex / Math.max(1, pointCount - 1)) * plotWidth;
                return <line className="oq-chart-vertical-grid" key={`x-${pointIndex}`} x1={x} x2={x} y1={margin.top} y2={margin.top + plotHeight} />;
              })
            : null}
          {isReturnChart ? (
            <line
              className="oq-dense-zero-line"
              x1={margin.left}
              x2={viewBox.width - margin.right}
              y1={margin.top + plotHeight - ((baselineValue - yMin) / (yMax - yMin)) * plotHeight}
              y2={margin.top + plotHeight - ((baselineValue - yMin) / (yMax - yMin)) * plotHeight}
            />
          ) : null}
          {yTicks.map(tick => {
            const y = margin.top + plotHeight - ((tick - yMin) / (yMax - yMin)) * plotHeight;
            return <line key={tick} x1={margin.left} x2={viewBox.width - margin.right} y1={y} y2={y} />;
          })}
        </g>
        <g className="oq-chart-axis" aria-hidden="true">
          {yTicks.map(tick => {
            const y = margin.top + plotHeight - ((tick - yMin) / (yMax - yMin)) * plotHeight;
            return (
              <text key={tick} x={margin.left - 18} y={y + 4} textAnchor="end">
                {isAutocorrDecay ? tick.toFixed(1) : isReturnChart ? formatDecileReturnValue(tick) : isSymbolCumulative ? formatDensePnlValue(tick) : formatCompactAxisValue(tick)}
              </text>
            );
          })}
          {xTickIndexes.map(pointIndex => {
            const x = margin.left + (pointIndex / Math.max(1, pointCount - 1)) * plotWidth;
            return (
              <text key={pointIndex} x={x} y={isSymbolCumulative ? viewBox.height : isReturnChart ? viewBox.height - 3 : viewBox.height - 18} textAnchor="middle">
                {isSymbolCumulative || isReturnChart ? dateTickLabels[xTickIndexes.findIndex(index => index === pointIndex)] : formatPortfolioPeriod(pointIndex, pointCount)}
              </text>
            );
          })}
        </g>
        {denseSeries.map(series => {
          if (hiddenIndexes.has(series.index)) return null;
          const isDimmed = activeIndex !== null && activeIndex !== series.index;
          return (
            <path
              key={series.index}
              d={series.path}
              stroke={series.color}
              className={`oq-dense-series ${series.isPrimary ? "is-primary" : ""} ${isDimmed ? "is-muted" : ""} ${activeIndex === series.index ? "is-highlighted" : ""}`}
              tabIndex={series.isPrimary ? 0 : -1}
              aria-label={`${series.symbol}: ${denseValueLabel} ${formatDenseValue(series.value ?? 0)}`}
              onMouseDown={event => event.preventDefault()}
              onFocus={() => showDenseFocusTooltip(series)}
              onBlur={clearDenseInteraction}
              onMouseEnter={() => showDenseFocusTooltip(series)}
            >
              <title>{series.symbol}</title>
            </path>
          );
        })}
        {isAutocorrDecay
          ? denseSeries.flatMap(series =>
              series.points.map((point, pointIndex) => (
                <circle
                  className={`oq-dense-lag-point ${activeIndex !== null && activeIndex !== series.index ? "is-muted" : ""}`}
                  cx={point.x}
                  cy={point.y}
                  key={`${series.index}-${pointIndex}`}
                  r={series.isPrimary ? 3.25 : 2.75}
                  style={{ color: series.color }}
                />
              ))
            )
          : null}
        {activePoint ? (
          <g aria-hidden="true">
            <line className="oq-dense-crosshair" x1={activePoint.x} x2={activePoint.x} y1={margin.top} y2={margin.top + plotHeight} />
            <circle className="oq-dense-active-marker" cx={activePoint.x} cy={activePoint.y} r={isSymbolCumulative ? 4.5 : 4} style={{ color: activePoint.color }} />
          </g>
        ) : null}
        <rect
          className="oq-dense-hit-area"
          x="0"
          y="0"
          width={viewBox.width}
          height={viewBox.height}
          aria-hidden="true"
          onPointerEnter={showNearestDenseTooltip}
          onPointerMove={showNearestDenseTooltip}
          onPointerLeave={clearDenseInteraction}
          onPointerCancel={clearDenseInteraction}
          onMouseLeave={clearDenseInteraction}
        />
      </svg>
      {activeIndex !== null && activePoint && tooltipPoint ? (
        <div
          className="oq-dense-floating-tooltip"
          style={{
            left: `clamp(12px, ${tooltipPoint.x}px, calc(100% - 312px))`,
            top: `clamp(40px, ${tooltipPoint.y}px, ${denseTooltipBottom})`,
          }}
        >
          <ChartTooltip title={activePoint.xValue} unit={isReturnChart ? denseValueLabel : isSymbolCumulative ? "" : tReport(tr, "cum pnl", "累计 PnL")} rows={tooltipRows} />
        </div>
      ) : null}
    </div>
  );
}

function SymbolPnlRankChart({ group, tr = defaultTr }: { group: SymbolPnlRankGroup; tr?: Tr }) {
  const config =
    group === "top"
      ? {
          title: tReport(tr, "Top 10 symbols by total PnL", "总 PnL 前 10 交易对"),
          rows: topSymbolPnlRankRows,
        }
      : {
          title: tReport(tr, "Bottom 10 symbols by total PnL", "总 PnL 后 10 交易对"),
          rows: bottomSymbolPnlRankRows,
        };

  if (config.rows.length === 0) {
    return <ChartEmptyState message={tReport(tr, "No series to display", "暂无可展示序列")} tr={tr} />;
  }

  return (
    <div className="oq-symbol-rank-chart">
      <SymbolPnlRankPanel title={config.title} rows={config.rows} tr={tr} />
    </div>
  );
}

function SymbolPnlRankSection({ tr = defaultTr }: { tr?: Tr }) {
  const [activeGroup, setActiveGroup] = useState<SymbolPnlRankGroup>("top");
  const options: Array<{ key: SymbolPnlRankGroup; label: string }> = [
    { key: "top", label: tReport(tr, "Top 10 symbols", "前 10 交易对") },
    { key: "bottom", label: tReport(tr, "Bottom 10 symbols", "后 10 交易对") },
  ];
  return (
    <Tabs value={activeGroup} onValueChange={value => setActiveGroup(value as SymbolPnlRankGroup)}>
      <ChartCard
        title={tReport(tr, "Single-Symbol PnL Rank", "单币种 PnL 排名")}
        className="is-symbol-rank"
        headerActions={
          <TabsList className="oq-attribution-switch" aria-label={tReport(tr, "Switch symbol PnL rank chart", "切换单币种 PnL 排名图表")}>
            {options.map(option => (
              <TabsTrigger key={option.key} value={option.key}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      >
        {options.map(option => (
          <TabsContent className="oq-chart-tab-panel" key={option.key} value={option.key}>
            <SymbolPnlRankChart group={option.key} tr={tr} />
          </TabsContent>
        ))}
      </ChartCard>
    </Tabs>
  );
}

function SymbolPnlRankPanel({ title, rows, tr = defaultTr }: { title: string; rows: SymbolPnlRankRow[]; tr?: Tr }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [activePoint, setActivePoint] = useState<{
    symbol: string;
    date: string;
    value: number;
    total: number;
    x: number;
    y: number;
    color: string;
  } | null>(null);
  const isNarrowRankChart = useContainerNarrow(plotRef, 620);
  const viewBoxWidth = isNarrowRankChart ? 560 : 880;
  const [viewBoxHeight, setViewBoxHeight] = useState(300);

  useEffect(() => {
    const node = plotRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const nextHeight = Math.max(300, Math.round((viewBoxWidth * rect.height) / rect.width));
        setViewBoxHeight(current => (current === nextHeight ? current : nextHeight));
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [viewBoxWidth]);

  const viewBox = { width: viewBoxWidth, height: viewBoxHeight };
  const margin = { top: 8, right: 16, bottom: 18, left: 56 };
  const plotWidth = viewBox.width - margin.left - margin.right;
  const plotHeight = viewBox.height - margin.top - margin.bottom;
  const xTickIndexes = denseSymbolDateTicks.map(tick => indexForDenseDateTick(tick, densePointCount));
  const series = useMemo(() => {
    return rows.map((row, rowIndex) => {
      const values = makeSymbolRankPnlSeries(row, rowIndex, densePointCount);
      const points = values.map((value, pointIndex) => {
        const x = margin.left + (pointIndex / Math.max(1, values.length - 1)) * plotWidth;
        const y = margin.top + plotHeight - ((value - symbolRankPnlDomain.min) / (symbolRankPnlDomain.max - symbolRankPnlDomain.min)) * plotHeight;
        return { x, y, value };
      });
      return {
        ...row,
        points,
        path: toPathFromPoints(points),
      };
    });
  }, [margin.left, margin.top, plotHeight, plotWidth, rows]);
  const activeSeries = activeSymbol === null ? null : (series.find(item => item.symbol === activeSymbol) ?? null);
  const tooltipRows = activePoint
    ? [
        {
          label: tReport(tr, "Cum PnL", "累计 PnL"),
          value: formatDensePnlValue(activePoint.value),
          color: activePoint.color,
          active: true,
        },
        {
          label: tReport(tr, "Total PnL", "总 PnL"),
          value: formatDensePnlValue(activePoint.total),
          color: activePoint.color,
          active: false,
        },
      ]
    : [];
  const clearRankInteraction = () => {
    setActiveSymbol(null);
    setTooltipPoint(null);
    setActivePoint(null);
  };

  useEffect(() => {
    if (activeSymbol === null) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) clearRankInteraction();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    return () => window.removeEventListener("pointermove", handleWindowPointerMove, true);
  }, [activeSymbol]);

  const showRankPoint = (symbol: string, pointIndex: number, event: PointerEvent<SVGElement>) => {
    const panel = event.currentTarget.closest(".oq-symbol-rank-panel");
    const rect = panel?.getBoundingClientRect();
    const item = series.find(candidate => candidate.symbol === symbol);
    const point = item?.points[pointIndex];
    if (!item || !point) return;
    setActiveSymbol(symbol);
    setActivePoint({
      symbol,
      date: formatDenseDate(pointIndex, densePointCount),
      value: point.value,
      total: item.total,
      x: point.x,
      y: point.y,
      color: item.color,
    });
    if (!rect) return;
    setTooltipPoint({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const showNearestRankPoint = (event: PointerEvent<SVGElement>) => {
    const svg = event.currentTarget instanceof SVGSVGElement ? event.currentTarget : event.currentTarget.ownerSVGElement;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix || series.length === 0) return;

    const svgPoint = svg.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    const pointer = svgPoint.matrixTransform(matrix.inverse());
    const pointIndex = Math.max(0, Math.min(densePointCount - 1, Math.round(((pointer.x - margin.left) / plotWidth) * (densePointCount - 1))));
    const nearest = series
      .map(item => {
        const point = item.points[pointIndex];
        return {
          symbol: item.symbol,
          distance: point ? Math.abs(point.y - pointer.y) : Number.POSITIVE_INFINITY,
        };
      })
      .reduce((best, item) => (item.distance < best.distance ? item : best));
    showRankPoint(nearest.symbol, pointIndex, event);
  };

  const showRankFocusTooltip = (item: (typeof series)[number]) => {
    const lastPoint = item.points.at(-1);
    const rect = chartRef.current?.getBoundingClientRect();
    if (!lastPoint) return;
    setActiveSymbol(item.symbol);
    setActivePoint({
      symbol: item.symbol,
      date: formatDenseDate(item.points.length - 1, densePointCount),
      value: lastPoint.value,
      total: item.total,
      x: lastPoint.x,
      y: lastPoint.y,
      color: item.color,
    });
    if (rect) {
      setTooltipPoint({
        x: (lastPoint.x / viewBox.width) * rect.width,
        y: (lastPoint.y / viewBox.height) * rect.height,
      });
    }
  };

  if (rows.length === 0) {
    return <ChartEmptyState message={tReport(tr, "No series to display", "暂无可展示序列")} tr={tr} />;
  }

  return (
    <section ref={chartRef} className="oq-symbol-rank-panel" onMouseLeave={clearRankInteraction} onPointerLeave={clearRankInteraction}>
      <div className="oq-symbol-rank-panel-body">
        <div ref={plotRef} className="oq-symbol-rank-plot">
          <svg
            className="oq-symbol-rank-lines"
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`${title}: ${rows.length} ${tReport(tr, "ranked symbol cumulative PnL lines", "条排名交易对累计 PnL 曲线")}`}
            onPointerEnter={showNearestRankPoint}
            onPointerMove={showNearestRankPoint}
            onPointerLeave={clearRankInteraction}
            onPointerCancel={clearRankInteraction}
          >
            <g className="oq-chart-grid" aria-hidden="true">
              {xTickIndexes.map(pointIndex => {
                const x = margin.left + (pointIndex / Math.max(1, densePointCount - 1)) * plotWidth;
                return <line className="oq-chart-vertical-grid" key={`x-${pointIndex}`} x1={x} x2={x} y1={margin.top} y2={margin.top + plotHeight} />;
              })}
              {symbolRankPnlTicks.map(tick => {
                const y = margin.top + plotHeight - ((tick - symbolRankPnlDomain.min) / (symbolRankPnlDomain.max - symbolRankPnlDomain.min)) * plotHeight;
                return <line key={tick} className={tick === 0 ? "oq-symbol-rank-zero-line" : ""} x1={margin.left} x2={viewBox.width - margin.right} y1={y} y2={y} />;
              })}
            </g>
            <g className="oq-chart-axis" aria-hidden="true">
              {symbolRankPnlTicks.map(tick => {
                const y = margin.top + plotHeight - ((tick - symbolRankPnlDomain.min) / (symbolRankPnlDomain.max - symbolRankPnlDomain.min)) * plotHeight;
                return (
                  <text key={tick} x={margin.left - 16} y={y + 4} textAnchor="end">
                    {formatDensePnlValue(tick)}
                  </text>
                );
              })}
              {xTickIndexes.map((pointIndex, tickIndex) => {
                const x = margin.left + (pointIndex / Math.max(1, densePointCount - 1)) * plotWidth;
                return (
                  <text key={pointIndex} x={x} y={viewBox.height - 3} textAnchor="middle">
                    {denseSymbolDateTicks[tickIndex]}
                  </text>
                );
              })}
            </g>
            {series.map(item => {
              const isDimmed = activeSymbol !== null && activeSymbol !== item.symbol;
              return (
                <path
                  key={item.symbol}
                  d={item.path}
                  stroke={item.color}
                  className={`oq-symbol-rank-series ${isDimmed ? "is-muted" : ""} ${activeSymbol === item.symbol ? "is-highlighted" : ""}`}
                  tabIndex={0}
                  aria-label={`${item.symbol}: ${tReport(tr, "Total PnL", "总 PnL")} ${formatDensePnlValue(item.total)}`}
                  onMouseDown={event => event.preventDefault()}
                  onFocus={() => showRankFocusTooltip(item)}
                  onBlur={clearRankInteraction}
                  onMouseEnter={() => showRankFocusTooltip(item)}
                >
                  <title>{item.symbol}</title>
                </path>
              );
            })}
            {activePoint ? (
              <g aria-hidden="true">
                <line className="oq-dense-crosshair" x1={activePoint.x} x2={activePoint.x} y1={margin.top} y2={margin.top + plotHeight} />
                <circle className="oq-dense-active-marker" cx={activePoint.x} cy={activePoint.y} r="4" style={{ color: activePoint.color }} />
              </g>
            ) : null}
            <rect
              className="oq-dense-hit-area"
              x="0"
              y="0"
              width={viewBox.width}
              height={viewBox.height}
              aria-hidden="true"
              onPointerEnter={showNearestRankPoint}
              onPointerMove={showNearestRankPoint}
              onPointerLeave={clearRankInteraction}
              onPointerCancel={clearRankInteraction}
            />
          </svg>
          {activeSeries && activePoint && tooltipPoint ? (
            <div
              className="oq-symbol-rank-floating-tooltip"
              style={{
                left: `clamp(10px, ${tooltipPoint.x}px, calc(100% - 312px))`,
                top: `clamp(44px, ${tooltipPoint.y}px, calc(100% - 96px))`,
              }}
            >
              <ChartTooltip title={`${activePoint.symbol} · ${activePoint.date}`} unit="" rows={tooltipRows} />
            </div>
          ) : null}
        </div>
        <div className="oq-symbol-rank-legend" aria-label={tReport(tr, "Line chart legend", "折线图图例")}>
          {series.map(item => (
            <button
              type="button"
              key={item.symbol}
              aria-pressed={activeSymbol === item.symbol}
              aria-label={`${item.symbol}: ${tReport(tr, "Total PnL", "总 PnL")} ${formatDensePnlValue(item.total)}`}
              onFocus={() => showRankFocusTooltip(item)}
              onBlur={clearRankInteraction}
              onMouseEnter={() => showRankFocusTooltip(item)}
              onPointerEnter={() => showRankFocusTooltip(item)}
            >
              <i style={{ background: item.color }} aria-hidden="true" />
              <span>{item.symbol}</span>
              <strong>{formatDensePnlValue(item.total)}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BarraExposureBars({ rows = barraExposureRows, tr = defaultTr }: { rows?: BarraExposureFactor[]; tr?: Tr }) {
  const [visibleSides, setVisibleSides] = useState<Set<"long" | "short">>(() => new Set<"long" | "short">(["long", "short"]));
  const [activePoint, setActivePoint] = useState<{
    factor: string;
    side: "long" | "short";
    value: number;
    x: number;
    y: number;
  } | null>(null);
  const [tooltipPoint, setTooltipPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [responsiveViewBox, setResponsiveViewBox] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const node = svgRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
        setResponsiveViewBox(current =>
          current?.width === next.width && current.height === next.height ? current : next,
        );
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);
  const viewBox = responsiveViewBox ?? { width: 720, height: 250 };
  const margin = { top: 16, right: 18, bottom: 54, left: 56 };
  const plotWidth = viewBox.width - margin.left - margin.right;
  const plotHeight = viewBox.height - margin.top - margin.bottom;
  const zeroY = margin.top + plotHeight - ((0 - barraExposureDomain.min) / (barraExposureDomain.max - barraExposureDomain.min)) * plotHeight;
  const groupWidth = plotWidth / Math.max(1, rows.length);
  const barWidth = Math.min(18, groupWidth * 0.22);
  const scaleY = (value: number) => margin.top + plotHeight - ((value - barraExposureDomain.min) / (barraExposureDomain.max - barraExposureDomain.min)) * plotHeight;
  const clearBarraExposure = () => {
    setActivePoint(null);
    setTooltipPoint(null);
  };
  const toggleBarraSide = (side: "long" | "short") => {
    clearBarraExposure();
    setVisibleSides(current => {
      const next = new Set(current);
      if (next.has(side)) next.delete(side);
      else next.add(side);
      return next.size > 0 ? next : current;
    });
  };
  useEffect(() => {
    if (activePoint === null && tooltipPoint === null) return;

    const clearIfPointerOutside = (event: globalThis.PointerEvent) => {
      const rect = chartRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isOutside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (isOutside) clearBarraExposure();
    };
    const clear = () => clearBarraExposure();

    window.addEventListener("pointermove", clearIfPointerOutside, true);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("pointermove", clearIfPointerOutside, true);
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("blur", clear);
    };
  }, [activePoint, tooltipPoint]);

  const showBarraTooltip = (row: BarraExposureFactor, side: "long" | "short", x: number, y: number, event?: { clientX: number; clientY: number }) => {
    const rect = chartRef.current?.getBoundingClientRect();
    setActivePoint({
      factor: row.factor,
      side,
      value: row[side],
      x,
      y,
    });
    if (event && rect) {
      setTooltipPoint({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      return;
    }
    if (rect) {
      setTooltipPoint({
        x: (x / viewBox.width) * rect.width,
        y: (y / viewBox.height) * rect.height,
      });
    }
  };

  if (rows.length === 0) {
    return <ChartEmptyState message={tReport(tr, "No chart data available", "暂无图表数据")} tr={tr} />;
  }

  return (
    <div ref={chartRef} className="oq-barra-exposure-chart" onMouseLeave={clearBarraExposure} onPointerLeave={clearBarraExposure}>
      <div className="oq-report-legend oq-barra-exposure-legend" aria-label={tReport(tr, "Line chart legend", "图表图例")}>
        <ChartLegendItem color="#1f8a5b" label={tReport(tr, "Long", "多头")} active={visibleSides.has("long")} pressed={visibleSides.has("long")} onToggle={() => toggleBarraSide("long")} />
        <ChartLegendItem color="#d64550" label={tReport(tr, "Short", "空头")} active={visibleSides.has("short")} pressed={visibleSides.has("short")} onToggle={() => toggleBarraSide("short")} />
      </div>
      <svg
        ref={svgRef}
        className="oq-barra-exposure-svg"
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={tReport(tr, "Barra factor long and short mean exposure", "Barra 因子多空平均暴露")}
      >
        <g className="oq-chart-grid" aria-hidden="true">
          {barraExposureTicks.map(tick => {
            const y = scaleY(tick);
            return <line key={tick} className={tick === 0 ? "oq-barra-zero-line" : ""} x1={margin.left} x2={viewBox.width - margin.right} y1={y} y2={y} />;
          })}
          {rows.map((row, index) => {
            const x = margin.left + groupWidth * index + groupWidth / 2;
            return <line key={row.factor} className="oq-chart-vertical-grid" x1={x} x2={x} y1={margin.top} y2={margin.top + plotHeight} />;
          })}
        </g>
        <g className="oq-chart-axis" aria-hidden="true">
          {barraExposureTicks.map(tick => (
            <text key={tick} x={margin.left - 14} y={scaleY(tick) + 4} textAnchor="end">
              {formatAxisTick(tick)}
            </text>
          ))}
          {rows.map((row, index) => {
            const x = margin.left + groupWidth * index + groupWidth / 2;
            return (
              <text key={row.factor} x={x} y={viewBox.height - 18} textAnchor="end" transform={`rotate(-36 ${x} ${viewBox.height - 18})`}>
                {row.factor}
              </text>
            );
          })}
        </g>
        {rows.map((row, index) => {
          const centerX = margin.left + groupWidth * index + groupWidth / 2;
          return (["long", "short"] as const)
            .filter(side => visibleSides.has(side))
            .map(side => {
              const value = row[side];
              const y = scaleY(value);
              const rectY = Math.min(y, zeroY);
              const height = Math.max(2, Math.abs(zeroY - y));
              const x = centerX + (side === "long" ? -barWidth - 3 : 3);
              return (
                <rect
                  key={`${row.factor}-${side}`}
                  className={`oq-barra-exposure-bar is-${side}`}
                  x={x}
                  y={rectY}
                  width={barWidth}
                  height={height}
                  rx="3"
                  tabIndex={0}
                  aria-label={`${row.factor}: ${side === "long" ? tReport(tr, "Long mean", "多头均值") : tReport(tr, "Short mean", "空头均值")} ${formatChartValue(value)}`}
                  onMouseDown={event => event.preventDefault()}
                  onFocus={() => showBarraTooltip(row, side, x + barWidth / 2, y)}
                  onBlur={clearBarraExposure}
                  onPointerEnter={event => showBarraTooltip(row, side, x + barWidth / 2, y, event)}
                  onPointerMove={event => showBarraTooltip(row, side, x + barWidth / 2, y, event)}
                  onPointerLeave={clearBarraExposure}
                >
                  <title>{`${row.factor} · ${formatChartValue(value)}`}</title>
                </rect>
              );
            });
        })}
      </svg>
      {activePoint && tooltipPoint ? (
        <div
          className="oq-barra-floating-tooltip"
          style={{
            left: `clamp(8px, ${tooltipPoint.x}px, calc(100% - 312px))`,
            top: `clamp(38px, ${tooltipPoint.y}px, calc(100% - 104px))`,
          }}
        >
          <ChartTooltip
            title={activePoint.factor.toUpperCase()}
            rows={[
              {
                label: activePoint.side === "long" ? tReport(tr, "Long mean", "多头均值") : tReport(tr, "Short mean", "空头均值"),
                value: activePoint.value.toFixed(4),
                color: activePoint.side === "long" ? "var(--report-green)" : "var(--report-red)",
                active: true,
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function AttributionSection({ tr = defaultTr }: { tr?: Tr }) {
  const [activeTab, setActiveTab] = useState("decile");
  const switchRef = useRef<HTMLDivElement>(null);
  const scrollAttributionTabIntoView = (tabKey: string) => {
    const container = switchRef.current;
    if (!container) return;

    const trigger = container.querySelector<HTMLButtonElement>(
      `[data-attribution-tab="${tabKey}"]`
    );
    if (!trigger) return;

    const containerRect = container.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const edgePadding = 8;
    const isFullyVisible = triggerRect.left >= containerRect.left + edgePadding
      && triggerRect.right <= containerRect.right - edgePadding;
    if (isFullyVisible) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trigger.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  };
  const handleAttributionTabChange = (value: string) => {
    setActiveTab(value);
    window.setTimeout(() => scrollAttributionTabIntoView(value), 0);
  };
  const tabs = [
    {
      key: "decile",
      label: tReport(tr, "Prediction decile cumulative return", "预测分位累计收益"),
      chart: <DenseLines tr={tr} count={decileReturnLabels.length} height={360} variant="decile" />,
    },
    {
      key: "style-return",
      label: tReport(tr, "Style long-short cumulative return", "风格多空累计收益"),
      chart: <DenseLines tr={tr} count={barraStyleReturnLabels.length} height={360} variant="barra-style" />,
    },
    {
      key: "style-exposure",
      label: tReport(tr, "Style exposure", "风格暴露"),
      chart: <BarraExposureBars tr={tr} />,
    },
    {
      key: "decay",
      label: tReport(tr, "Prediction decay", "预测衰减"),
      chart: <DenseLines tr={tr} count={autocorrDecayLabels.length} height={360} variant="autocorr-decay" />,
    },
    {
      key: "correlation",
      label: tReport(tr, "Prediction style correlation", "预测风格相关"),
      chart: <DenseLines tr={tr} count={barraStyleReturnLabels.length} height={360} variant="barra-correlation" />,
    },
    {
      key: "turnover",
      label: tReport(tr, "Daily turnover rate", "日换手率"),
      chart: <DenseLines tr={tr} count={turnoverRateLabels.length} height={360} variant="turnover-rate" />,
    },
  ];
  return (
    <Tabs value={activeTab} onValueChange={handleAttributionTabChange}>
      <ChartCard
        title={tReport(tr, "CS Attribution Overview", "截面归因概览")}
        className="is-attribution"
        headerActions={
          <TabsList ref={switchRef} className="oq-attribution-switch" aria-label={tReport(tr, "Switch attribution chart", "切换归因图表")}>
            {tabs.map(tab => (
              <TabsTrigger data-attribution-tab={tab.key} key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      >
        <div className="oq-attribution-panel">
          {tabs.map(tab => (
            <TabsContent className="oq-mini-card oq-chart-tab-panel" key={tab.key} value={tab.key}>
              {tab.chart}
            </TabsContent>
          ))}
        </div>
      </ChartCard>
    </Tabs>
  );
}

function PositionHistory({ rows = defaultPositions, tr = defaultTr }: { rows?: ReportPositionRecord[]; tr?: Tr }) {
  return (
    <section className="oq-position-card">
      <header>
        <div>
          <h2>{tReport(tr, "Position History", "仓位历史")}</h2>
        </div>
      </header>
      <div className="oq-position-table">
        <div className="oq-position-head">
          <span>{tReport(tr, "Position", "仓位")}</span>
          <span>{tReport(tr, "Entry Price", "入场价")}</span>
          <span>{tReport(tr, "Max Open Interest", "最大持仓")}</span>
          <span>{tReport(tr, "Opened", "开仓时间")}</span>
          <span>{tReport(tr, "Closed", "平仓时间")}</span>
          <span>PnL</span>
        </div>
        {rows.map(position => (
          <article key={position.symbol}>
            <div className="oq-position-symbol">
              <strong>{position.symbol}</strong>
              <span>{tReport(tr, "Perp", "永续")}</span>
              <span>{tReport(tr, position.side, position.side === "Cross Long" ? "全仓做多" : "全仓做空")}</span>
              <small>{tReport(tr, "Closed", "已平仓")}</small>
            </div>
            <span>{position.entry}</span>
            <span>{position.interest}</span>
            <span>{position.opened}</span>
            <span>{position.closed}</span>
            <b className={position.pnl.startsWith("-") ? "is-loss" : ""}>{position.pnl}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

export function StrategyFigmaReport({
  title = "20260608_020653",
  subtitle = "combo · x_demedian_y_rank",
  headerMetrics = defaultHeaderMetrics,
  dateLabel = "2020-01-01_2020-12-31",
  dateOptions,
  customDateOption,
  uiLang = "en",
  plainExplainEnabled = true,
  topAction,
  titleAction,
  actions,
  metricRows = navMetrics,
  positions = defaultPositions,
  tr = defaultTr,
}: {
  title?: string;
  subtitle?: ReactNode;
  headerMetrics?: ReportMetric[];
  dateLabel?: string;
  dateOptions?: string[];
  customDateOption?: string;
  uiLang?: UiLang;
  plainExplainEnabled?: boolean;
  topAction?: ReactNode;
  titleAction?: ReactNode;
  actions?: ReactNode;
  metricRows?: ReportMetricRow[];
  positions?: ReportPositionRecord[];
  tr?: Tr;
}) {
  return (
    <div className="oq-strategy-figma-report">
      {topAction ? <div className="oq-report-top-action">{topAction}</div> : null}
      <header className="oq-report-top">
        <div className="oq-report-title-block">
          <div className="oq-report-title-row">
            <div className="oq-report-title-copy">
              <div className="oq-report-title-line">
                {titleAction}
                <h1>{title}</h1>
              </div>
              <p className="oq-report-title-meta">{subtitle}</p>
            </div>
            <div className="oq-report-head-controls">{actions ? <div className="oq-report-actions">{actions}</div> : null}</div>
          </div>
        </div>
      </header>

      <section className="oq-report-metric-panel" aria-label={tReport(tr, "Strategy summary metrics", "策略概览指标")}>
        <StrategyReportDateControl
          dateLabel={dateLabel}
          dateOptions={dateOptions}
          customDateOption={customDateOption}
          uiLang={uiLang}
          variant="compact"
          labels={{
            selectPeriod: tReport(tr, "Select backtest period", "选择回测周期"),
            customRange: tReport(tr, "Custom date range", "自定义时间范围"),
            startDate: tReport(tr, "Start date", "开始日期"),
            endDate: tReport(tr, "End date", "结束日期"),
          }}
        />
        <div className="oq-report-metric-strip">
          {headerMetrics.map(metric => (
            <MaybeExplainTooltip
              enabled={plainExplainEnabled}
              explanation={metric.explanation}
              key={metric.label}
            >
              <div
                className="oq-report-metric"
                data-tone={metric.tone}
                tabIndex={metric.explanation && plainExplainEnabled ? 0 : undefined}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            </MaybeExplainTooltip>
          ))}
        </div>
      </section>

      <ChartCard title={tReport(tr, "Portfolio NAV · Drawdown", "组合 NAV · 回撤")} className="is-nav">
        <PortfolioNavChart tr={tr} />
        <MetricsTable rows={metricRows} tr={tr} plainExplainEnabled={plainExplainEnabled} />
      </ChartCard>

      <div className="oq-report-two-col">
        <ChartCard title={tReport(tr, "Average Sector Exposure", "行业暴露")}>
          <ExposureChart tr={tr} />
        </ChartCard>
        <ChartCard title={tReport(tr, "Sector Return Rank", "行业收益排名")}>
          <SectorRankChart tr={tr} />
        </ChartCard>
      </div>

      <ChartCard title={tReport(tr, "Single-Symbol Cumulative PnL (All)", "单币种累计 PnL（全部）")} className="is-symbol-cumulative">
        <DenseLines count={denseSymbolCount} height={360} tr={tr} />
      </ChartCard>

      <SymbolPnlRankSection tr={tr} />

      <AttributionSection tr={tr} />

      <PositionHistory rows={positions} tr={tr} />
    </div>
  );
}
