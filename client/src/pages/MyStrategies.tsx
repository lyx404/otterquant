/*
 * MyStrategies — Figma-aligned strategy list page
 * Structure: Header + Summary cards + Toolbar + Strategy cards (grid/list)
 * Visual style stays aligned with existing My Alphas dark design tokens.
 */
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { factors, strategies, submissions, type Factor } from "@/lib/mockData";
import { buildSeries, parsePercent } from "@/lib/strategyUtils";
import { portfolioGrossNavValues } from "./StrategyFigmaReport.data";
import {
  translateUi,
  type UiCopy,
  type UiLang,
  useAppLanguage,
} from "@/contexts/AppLanguageContext";
import { toast } from "sonner";
import {
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Circle,
  Columns3,
  Download,
  GitCompareArrows,
  Grid2x2,
  List,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from "lucide-react";
import "./MyStrategies.css";

type SortKey = "updated" | "name" | "roi" | "winRate" | "sharpe" | "rankIc" | "maxDd" | "turn";
type ViewMode = "grid" | "list";
type MetricKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type DisplayItemKey = MetricKey | "createdAt" | "id";
type StrategyFilter = "all" | "favorites" | "trading" | "idle";
type ExecutionMode = "paper" | "live" | "idle";
type StrategyDirection = "long" | "short" | "neutral";
type StrategyLayerUnit = "N" | "percent";
type StrategyFactorSource = "official" | "my";

export type StrategyComposerValues = {
  selectedFactorIds: string[];
  customWeights: Record<string, string>;
  direction: StrategyDirection;
  layerUnit: StrategyLayerUnit;
  layerValue: string;
  strategyName: string;
  strategyNote: string;
};

const MAX_STRATEGY_FACTOR_COUNT = 20;
const MAX_COMPARE_STRATEGY_COUNT = 2;

type StrategyTr = (en: string, zh: string, copy?: UiCopy) => string;

const strategyCopy: Record<string, UiCopy> = {
  "Live Trading": { ja: "ライブ運用", ko: "실거래", es: "Trading real", fr: "Trading reel" },
  "Paper Trading": { ja: "ペーパートレード", ko: "모의 거래", es: "Simulacion", fr: "Simulation" },
  "Not Running": { ja: "未稼働", ko: "미실행", es: "Inactiva", fr: "A l'arret" },
  "for reference": { ja: "参考値", ko: "참고용", es: "de referencia", fr: "indicatif" },
  high: { ja: "高水準", ko: "높음", es: "alto", fr: "eleve" },
  moderate: { ja: "中程度", ko: "보통", es: "moderado", fr: "modere" },
  low: { ja: "低水準", ko: "낮음", es: "bajo", fr: "faible" },
  "well controlled": { ja: "良好に管理", ko: "양호하게 통제됨", es: "bien controlado", fr: "bien maitrise" },
  noticeable: { ja: "要注意", ko: "주의 필요", es: "a vigilar", fr: "a surveiller" },
  "high risk": { ja: "高リスク", ko: "고위험", es: "riesgo alto", fr: "risque eleve" },
  "very steady": { ja: "非常に安定", ko: "매우 안정적", es: "muy estable", fr: "tres stable" },
  "relatively steady": { ja: "比較的安定", ko: "비교적 안정적", es: "relativamente estable", fr: "relativement stable" },
  usable: { ja: "実用水準", ko: "활용 가능", es: "utilizable", fr: "exploitable" },
  "less steady": { ja: "安定性が低い", ko: "안정성 낮음", es: "poco estable", fr: "peu stable" },
  "Equal weight": { ja: "等ウェイト", ko: "동일 가중", es: "Ponderacion igual", fr: "Ponderation egale" },
  "Custom weight": { ja: "カスタムウェイト", ko: "사용자 지정 가중", es: "Ponderacion personalizada", fr: "Ponderation personnalisee" },
  "Long only": { ja: "ロングのみ", ko: "롱 전용", es: "Solo largo", fr: "Long uniquement" },
  "Short only": { ja: "ショートのみ", ko: "숏 전용", es: "Solo corto", fr: "Short uniquement" },
  Neutral: { ja: "マーケットニュートラル", ko: "시장 중립", es: "Neutral al mercado", fr: "Neutre au marche" },
  "Untitled strategy": { ja: "無題の戦略", ko: "제목 없는 전략", es: "Estrategia sin titulo", fr: "Strategie sans titre" },
  "Factor selection": { ja: "ファクター選択", ko: "팩터 선택", es: "Seleccion de factores", fr: "Selection des facteurs" },
  "Choose factors from official library or my factors.": { ja: "公式ライブラリまたはマイファクターから選択してください。", ko: "공식 라이브러리 또는 내 팩터에서 선택하세요.", es: "Elige factores de la biblioteca oficial o de Mis factores.", fr: "Choisissez des facteurs dans la bibliotheque officielle ou Mes facteurs." },
  "Select at least one factor.": { ja: "少なくとも1つのファクターを選択してください。", ko: "팩터를 하나 이상 선택하세요.", es: "Selecciona al menos un factor.", fr: "Selectionnez au moins un facteur." },
  "Factor weight": { ja: "ファクターウェイト", ko: "팩터 가중치", es: "Ponderacion de factores", fr: "Ponderation des facteurs" },
  "Select factors before setting custom weights.": { ja: "カスタムウェイトを設定する前にファクターを選択してください。", ko: "사용자 지정 가중치를 설정하기 전에 팩터를 선택하세요.", es: "Selecciona factores antes de definir ponderaciones personalizadas.", fr: "Selectionnez des facteurs avant de definir les ponderations personnalisees." },
  "Weight total": { ja: "ウェイト合計", ko: "가중치 합계", es: "Ponderacion total", fr: "Total des ponderations" },
  Valid: { ja: "有効", ko: "유효", es: "Valido", fr: "Valide" },
  "Must equal 1.00": { ja: "合計は1.00", ko: "합계 1.00 필요", es: "Debe ser 1,00", fr: "Doit etre egal a 1,00" },
  "Custom weights must total 1.00.": { ja: "カスタムウェイトの合計は1.00にしてください。", ko: "사용자 지정 가중치 합계는 1.00이어야 합니다.", es: "Las ponderaciones personalizadas deben sumar 1,00.", fr: "Les ponderations personnalisees doivent totaliser 1,00." },
  "Strategy direction": { ja: "戦略方向", ko: "전략 방향", es: "Direccion de la estrategia", fr: "Direction de la strategie" },
  "Head/tail grouping rule": { ja: "上位・下位グループ規則", ko: "상·하위 그룹 규칙", es: "Regla de grupos superior/inferior", fr: "Regle des groupes tete/queue" },
  "Head/tail grouping value": { ja: "上位・下位グループ値", ko: "상·하위 그룹 값", es: "Valor de grupos superior/inferior", fr: "Valeur des groupes tete/queue" },
  "Enter a percentage from 0 to 50.": { ja: "0より大きく50以下の割合を入力してください。", ko: "0보다 크고 50 이하인 비율을 입력하세요.", es: "Introduce un porcentaje mayor que 0 y hasta 50.", fr: "Saisissez un pourcentage superieur a 0 et inferieur ou egal a 50." },
  "Enter a positive integer.": { ja: "正の整数を入力してください。", ko: "양의 정수를 입력하세요.", es: "Introduce un numero entero positivo.", fr: "Saisissez un entier positif." },
  "Strategy name": { ja: "戦略名", ko: "전략명", es: "Nombre de la estrategia", fr: "Nom de la strategie" },
  Note: { ja: "メモ", ko: "메모", es: "Nota", fr: "Note" },
  Optional: { ja: "任意", ko: "선택", es: "Opcional", fr: "Facultatif" },
  "Add a note": { ja: "メモを追加", ko: "메모 추가", es: "Añadir una nota", fr: "Ajouter une note" },
  Cancel: { ja: "キャンセル", ko: "취소", es: "Cancelar", fr: "Annuler" },
  "Create strategy": { ja: "戦略を作成", ko: "전략 생성", es: "Crear estrategia", fr: "Creer une strategie" },
  "Select factors": { ja: "ファクターを選択", ko: "팩터 선택", es: "Seleccionar factores", fr: "Selectionner des facteurs" },
  "Official library": { ja: "公式ライブラリ", ko: "공식 라이브러리", es: "Biblioteca oficial", fr: "Bibliotheque officielle" },
  "My factors": { ja: "マイファクター", ko: "내 팩터", es: "Mis factores", fr: "Mes facteurs" },
  "Search name, ID or tag": { ja: "名前、ID、タグを検索", ko: "이름, ID 또는 태그 검색", es: "Buscar por nombre, ID o etiqueta", fr: "Rechercher par nom, ID ou etiquette" },
  "OOS Sharpe": { ja: "OOS Sharpe", ko: "OOS Sharpe", es: "Sharpe OOS", fr: "Sharpe OOS" },
  "No factors match the current filter.": { ja: "現在のフィルターに一致するファクターはありません。", ko: "현재 필터와 일치하는 팩터가 없습니다.", es: "Ningun factor coincide con el filtro actual.", fr: "Aucun facteur ne correspond au filtre actuel." },
  "No factors selected": { ja: "ファクター未選択", ko: "선택된 팩터 없음", es: "Ningun factor seleccionado", fr: "Aucun facteur selectionne" },
  Done: { ja: "完了", ko: "완료", es: "Listo", fr: "Termine" },
  Created: { ja: "作成日", ko: "생성일", es: "Creada", fr: "Creee" },
  "Asset Curve": { ja: "資産曲線", ko: "자산 곡선", es: "Curva patrimonial", fr: "Courbe de capital" },
  "Win Rate": { ja: "勝率", ko: "승률", es: "Tasa de acierto", fr: "Taux de reussite" },
  Sharpe: { ja: "Sharpe", ko: "Sharpe", es: "Sharpe", fr: "Sharpe" },
  "Max DD": { ja: "MaxDD", ko: "MaxDD", es: "MaxDD", fr: "MaxDD" },
  "More actions": { ja: "その他の操作", ko: "추가 작업", es: "Mas acciones", fr: "Plus d'actions" },
  Delete: { ja: "削除", ko: "삭제", es: "Eliminar", fr: "Supprimer" },
  "Toggle favorite": { ja: "お気に入りを切替", ko: "즐겨찾기 전환", es: "Alternar favorito", fr: "Basculer le favori" },
  View: { ja: "表示", ko: "보기", es: "Ver", fr: "Voir" },
  "Synced with your Codex agent": { ja: "Codexエージェントと同期済み", ko: "Codex 에이전트와 동기화됨", es: "Sincronizado con tu agente Codex", fr: "Synchronise avec votre agent Codex" },
  "Mine in Codex — alphas land here automatically. Last sync 2 min ago.": { ja: "CodexでマイニングしたAlphaは自動的にここへ反映されます。最終同期: 2分前。", ko: "Codex에서 발굴한 Alpha가 여기에 자동 반영됩니다. 마지막 동기화: 2분 전.", es: "Los alphas extraidos en Codex aparecen aqui automaticamente. Ultima sincronizacion: hace 2 min.", fr: "Les alphas explores dans Codex arrivent ici automatiquement. Derniere synchronisation: il y a 2 min." },
  Live: { ja: "ライブ", ko: "실시간", es: "En vivo", fr: "En direct" },
  "My Favorites": { ja: "お気に入り", ko: "즐겨찾기", es: "Mis favoritos", fr: "Mes favoris" },
  All: { ja: "すべて", ko: "전체", es: "Todas", fr: "Toutes" },
  Sort: { ja: "並べ替え", ko: "정렬", es: "Ordenar", fr: "Trier" },
  "Updated Time": { ja: "更新日時", ko: "업데이트 시간", es: "Fecha de actualizacion", fr: "Date de mise a jour" },
  "Download all": { ja: "すべてダウンロード", ko: "전체 다운로드", es: "Descargar todo", fr: "Tout telecharger" },
  "Tick rows to compare ·": { ja: "比較する行を選択 ·", ko: "비교할 행 선택 ·", es: "Marca filas para comparar ·", fr: "Cochez les lignes a comparer ·" },
  "Toggle compare": { ja: "比較対象を切替", ko: "비교 선택 전환", es: "Alternar comparacion", fr: "Basculer la comparaison" },
  "No matching strategies": { ja: "一致する戦略がありません", ko: "일치하는 전략이 없습니다", es: "No hay estrategias coincidentes", fr: "Aucune strategie correspondante" },
  "Adjust the keyword or filter.": { ja: "キーワードまたはフィルターを調整してください。", ko: "키워드 또는 필터를 조정하세요.", es: "Ajusta la palabra clave o el filtro.", fr: "Ajustez le mot-cle ou le filtre." },
  Rows: { ja: "行", ko: "행", es: "Filas", fr: "Lignes" },
  "Strategy list pagination": { ja: "戦略一覧のページ切替", ko: "전략 목록 페이지 이동", es: "Paginacion de estrategias", fr: "Pagination de la liste des strategies" },
  "First page": { ja: "最初のページ", ko: "첫 페이지", es: "Primera pagina", fr: "Premiere page" },
  "Previous page": { ja: "前のページ", ko: "이전 페이지", es: "Pagina anterior", fr: "Page precedente" },
  "Next page": { ja: "次のページ", ko: "다음 페이지", es: "Pagina siguiente", fr: "Page suivante" },
  "Last page": { ja: "最後のページ", ko: "마지막 페이지", es: "Ultima pagina", fr: "Derniere page" },
  "Compare strategy": { ja: "戦略比較", ko: "전략 비교", es: "Comparar estrategias", fr: "Comparer les strategies" },
  "Remove from compare": { ja: "比較から削除", ko: "비교에서 제거", es: "Quitar de la comparacion", fr: "Retirer de la comparaison" },
  "Build a strategy from selected factors, weights and direction rules.": { ja: "選択したファクター、ウェイト、方向ルールから戦略を構築します。", ko: "선택한 팩터, 가중치 및 방향 규칙으로 전략을 구성합니다.", es: "Crea una estrategia con los factores, ponderaciones y reglas de direccion seleccionados.", fr: "Construisez une strategie a partir des facteurs, ponderations et regles de direction selectionnes." },
  "Delete Strategy": { ja: "戦略を削除", ko: "전략 삭제", es: "Eliminar estrategia", fr: "Supprimer la strategie" },
  "Confirm deleting this strategy? This action cannot be undone.": { ja: "この戦略を削除しますか？この操作は取り消せません。", ko: "이 전략을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.", es: "¿Confirmas que quieres eliminar esta estrategia? Esta accion no se puede deshacer.", fr: "Confirmer la suppression de cette strategie ? Cette action est irreversible." },
  "Search by name or ID...": { ja: "名前またはIDで検索...", ko: "이름 또는 ID 검색...", es: "Buscar por nombre o ID...", fr: "Rechercher par nom ou ID..." },
  Name: { ja: "名前", ko: "이름", es: "Nombre", fr: "Nom" },
  Descending: { ja: "降順", ko: "내림차순", es: "Descendente", fr: "Decroissant" },
  Ascending: { ja: "昇順", ko: "오름차순", es: "Ascendente", fr: "Croissant" },
  "Display Items": { ja: "表示項目", ko: "표시 항목", es: "Elementos visibles", fr: "Elements affiches" },
  "Max Drawdown": { ja: "最大ドローダウン", ko: "최대 낙폭", es: "Maximo drawdown", fr: "Drawdown maximal" },
  "Created Date": { ja: "作成日", ko: "생성일", es: "Fecha de creacion", fr: "Date de creation" },
  "Restore defaults": { ja: "既定値に戻す", ko: "기본값 복원", es: "Restaurar valores predeterminados", fr: "Restaurer les valeurs par defaut" },
  Status: { ja: "ステータス", ko: "상태", es: "Estado", fr: "Statut" },
  Action: { ja: "操作", ko: "작업", es: "Accion", fr: "Action" },
  "No strategies match your filters.": { ja: "フィルターに一致する戦略はありません。", ko: "필터와 일치하는 전략이 없습니다.", es: "Ninguna estrategia coincide con los filtros.", fr: "Aucune strategie ne correspond aux filtres." },
  "List view": { ja: "リスト表示", ko: "목록 보기", es: "Vista de lista", fr: "Vue en liste" },
  "Grid view": { ja: "グリッド表示", ko: "그리드 보기", es: "Vista de cuadricula", fr: "Vue en grille" },
  Strategy: { ja: "戦略", ko: "전략", es: "Estrategia", fr: "Strategie" },
  RankIC: { ja: "RankIC", ko: "RankIC", es: "RankIC", fr: "RankIC" },
  MaxDD: { ja: "MaxDD", ko: "MaxDD", es: "MaxDD", fr: "MaxDD" },
  Turn: { ja: "売買回転率", ko: "회전율", es: "Rotacion", fr: "Rotation" },
  "90-day": { ja: "90日", ko: "90일", es: "90 dias", fr: "90 jours" },
  Pending: { ja: "バックテスト中", ko: "백테스트 중", es: "En backtest", fr: "Backtest en cours" },
  Paused: { ja: "一時停止", ko: "일시 중지", es: "En pausa", fr: "En pause" },
  "Not Started": { ja: "未開始", ko: "시작 안 함", es: "No iniciada", fr: "Non demarree" },
  Stopped: { ja: "停止済み", ko: "중지됨", es: "Detenida", fr: "Arretee" },
  Running: { ja: "稼働中", ko: "실행 중", es: "En ejecucion", fr: "En cours" },
  Performance: { ja: "パフォーマンス", ko: "성과", es: "Rendimiento", fr: "Performance" },
  "CS Sharpe": { ja: "クロスセクショナルSharpe", ko: "횡단면 Sharpe", es: "Sharpe transversal", fr: "Sharpe transversal" },
  Best: { ja: "最高", ko: "최고", es: "Mejor", fr: "Meilleur" },
  "Risk & details": { ja: "リスクと詳細", ko: "위험 및 상세", es: "Riesgo y detalles", fr: "Risque et details" },
  "Max drawdown": { ja: "最大ドローダウン", ko: "최대 낙폭", es: "Maximo drawdown", fr: "Drawdown maximal" },
  Lowest: { ja: "最低", ko: "최저", es: "Menor", fr: "Le plus faible" },
  Turnover: { ja: "売買回転率", ko: "회전율", es: "Rotacion", fr: "Rotation" },
  Total: { ja: "合計", ko: "전체", es: "Total", fr: "Total" },
  Trading: { ja: "運用中", ko: "거래 중", es: "En trading", fr: "En trading" },
};

function makeStrategyTranslator(uiLang: UiLang): StrategyTr {
  return (en, zh, copy = strategyCopy[en]) => translateUi(uiLang, en, zh, copy);
}

function formatBacktestSubmitted(strategyName: string, tr: StrategyTr) {
  return tr(
    `${strategyName} submitted. Backtesting takes about 3–4 minutes.`,
    `${strategyName} 已提交，回测预计需要 3–4 分钟。`,
    {
      ja: `${strategyName}を送信しました。バックテストには約3〜4分かかります。`,
      ko: `${strategyName} 제출이 완료되었습니다. 백테스트에는 약 3~4분이 소요됩니다.`,
      es: `${strategyName} enviada. El backtest tarda unos 3-4 minutos.`,
      fr: `${strategyName} soumise. Le backtest prend environ 3 a 4 minutes.`,
    }
  );
}

function formatFactorSelectionCount(count: number, tr: StrategyTr, continueSelection = false) {
  if (continueSelection) {
    return tr(
      `${count} factors selected. Click to continue selecting.`,
      `已选择 ${count} 个因子，点击继续选择。`,
      {
        ja: `${count}個のファクターを選択済み。クリックして選択を続けます。`,
        ko: `${count}개 팩터를 선택했습니다. 클릭하여 계속 선택하세요.`,
        es: `${count} factores seleccionados. Haz clic para seguir seleccionando.`,
        fr: `${count} facteurs selectionnes. Cliquez pour poursuivre la selection.`,
      }
    );
  }
  return tr(`${count} factors selected`, `已选择 ${count} 个因子`, {
    ja: `${count}個のファクターを選択済み`,
    ko: `${count}개 팩터 선택됨`,
    es: `${count} factores seleccionados`,
    fr: `${count} facteurs selectionnes`,
  });
}

function formatStrategySelectionCount(count: number, tr: StrategyTr) {
  return tr(`${count} selected`, `已选 ${count} 个`, {
    ja: `${count}件選択`,
    ko: `${count}개 선택됨`,
    es: `${count} seleccionadas`,
    fr: `${count} selectionnees`,
  });
}

function formatCompareSummary(count: number, tr: StrategyTr) {
  return tr(
    `${count} selected · scroll down to see every stat side-by-side`,
    `已选 ${count} 个 · 向下查看指标对比`,
    {
      ja: `${count}件選択 · 下にスクロールして指標を並べて比較`,
      ko: `${count}개 선택됨 · 아래로 스크롤하여 모든 지표 비교`,
      es: `${count} seleccionadas · desplaza para comparar todas las metricas`,
      fr: `${count} selectionnees · faites defiler pour comparer toutes les statistiques`,
    }
  );
}

function formatFactorPickerHelp(maxCount: number, tr: StrategyTr) {
  return tr(
    `Choose up to ${maxCount} factors from the official library or your factors.`,
    `从官方库或我的因子中选择，最多 ${maxCount} 个。`,
    {
      ja: `公式ライブラリまたはマイファクターから最大${maxCount}個選択できます。`,
      ko: `공식 라이브러리 또는 내 팩터에서 최대 ${maxCount}개를 선택하세요.`,
      es: `Elige hasta ${maxCount} factores de la biblioteca oficial o de Mis factores.`,
      fr: `Choisissez jusqu'a ${maxCount} facteurs dans la bibliotheque officielle ou Mes facteurs.`,
    }
  );
}

function formatDeleteConfirmation(row: StrategyViewRow | null, tr: StrategyTr) {
  if (!row?.name) return tr("Confirm deleting this strategy? This action cannot be undone.", "确认删除该策略？删除后无法恢复。");
  return tr(
    `Confirm deleting ${row.name} (${row.id})? This action cannot be undone.`,
    `确认删除 ${row.name}（${row.id}）？删除后无法恢复。`,
    {
      ja: `${row.name}（${row.id}）を削除しますか？この操作は取り消せません。`,
      ko: `${row.name} (${row.id}) 전략을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      es: `¿Confirmas que quieres eliminar ${row.name} (${row.id})? Esta accion no se puede deshacer.`,
      fr: `Confirmer la suppression de ${row.name} (${row.id}) ? Cette action est irreversible.`,
    }
  );
}

function formatViewStrategyLabel(strategyName: string, tr: StrategyTr) {
  return tr(`View ${strategyName}`, `查看 ${strategyName}`, {
    ja: `${strategyName}を表示`,
    ko: `${strategyName} 보기`,
    es: `Ver ${strategyName}`,
    fr: `Voir ${strategyName}`,
  });
}

function formatStrategyCreatedDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRemoveFactorLabel(factorName: string, tr: StrategyTr) {
  return tr(`Remove ${factorName}`, `移除 ${factorName}`, {
    ja: `${factorName}を削除`,
    ko: `${factorName} 제거`,
    es: `Quitar ${factorName}`,
    fr: `Retirer ${factorName}`,
  });
}

function formatFactorWeightLabel(factorName: string, tr: StrategyTr) {
  return tr(`${factorName} weight`, `${factorName} 权重`, {
    ja: `${factorName}のウェイト`,
    ko: `${factorName} 가중치`,
    es: `Ponderacion de ${factorName}`,
    fr: `Ponderation de ${factorName}`,
  });
}

function formatPageSummary(start: number, end: number, total: number, tr: StrategyTr) {
  return tr(`${start}–${end} of ${total}`, `${start}–${end}，共 ${total} 条`, {
    ja: `${start}〜${end} / ${total}件`,
    ko: `${start}~${end} / 총 ${total}개`,
    es: `${start}-${end} de ${total}`,
    fr: `${start}-${end} sur ${total}`,
  });
}

function buildStrategyDefaultWeights(factorIds: string[]) {
  if (factorIds.length === 0) return {} as Record<string, string>;

  const base = Math.floor(100 / factorIds.length);
  const remainder = 100 - base * factorIds.length;
  return factorIds.reduce<Record<string, string>>((weights, factorId, index) => {
    weights[factorId] = ((base + (index < remainder ? 1 : 0)) / 100).toFixed(2);
    return weights;
  }, {});
}

function normalizeStrategyWeightInput(input: string) {
  const sanitized = input.replace(/[^\d.]/g, "");
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex === -1) return sanitized;
  const integerPart = sanitized.slice(0, dotIndex);
  const decimalPart = sanitized.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
  return `${integerPart}.${decimalPart}`;
}

function formatStrategyFactorId(factorId: string) {
  return factorId.replace(/^AF-/, "NO.");
}

function getStrategyFactorTagLabel(tag: string, tr: StrategyTr) {
  const labels: Record<string, { en: string; zh: string; copy: UiCopy }> = {
    ALL: { en: "All", zh: "全部", copy: strategyCopy.All },
    MOMENTUM: { en: "Momentum", zh: "动量", copy: { ja: "モメンタム", ko: "모멘텀", es: "Momentum", fr: "Momentum" } },
    VOLUME: { en: "Volume", zh: "成交量", copy: { ja: "出来高", ko: "거래량", es: "Volumen", fr: "Volume" } },
    ARBITRAGE: { en: "Arbitrage", zh: "套利", copy: { ja: "アービトラージ", ko: "차익거래", es: "Arbitraje", fr: "Arbitrage" } },
    DERIVATIVES: { en: "Derivatives", zh: "衍生品", copy: { ja: "デリバティブ", ko: "파생상품", es: "Derivados", fr: "Derives" } },
    "RISK-ADJUSTED": { en: "Risk-adjusted", zh: "风险调整", copy: { ja: "リスク調整", ko: "위험 조정", es: "Ajustado por riesgo", fr: "Ajuste du risque" } },
    "ON-CHAIN": { en: "On-chain", zh: "链上", copy: { ja: "オンチェーン", ko: "온체인", es: "On-chain", fr: "On-chain" } },
    OTHER: { en: "Other", zh: "其他", copy: { ja: "その他", ko: "기타", es: "Otros", fr: "Autres" } },
  };
  const label = labels[tag];
  return label ? tr(label.en, label.zh, label.copy) : tag;
}

interface StrategyViewRow {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  statusLabel: "Paper Trading" | "Live Trading" | "Not Running";
  executionMode: ExecutionMode;
  statusClass: string;
  roi: string;
  winRate: string;
  sharpe: string;
  maxDrawdown: string;
  backtestStatus?: "pending" | "ready";
}

const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";
const DELETED_STRATEGIES_STORAGE_KEY = "otterquant:mystrategies:deleted-strategies";
const CREATED_STRATEGIES_STORAGE_KEY = "otterquant:mystrategies:created-strategies";
const STRATEGY_BACKTEST_DURATION_MS = 3.5 * 60 * 1000;
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";

interface CreatedStrategyRecord {
  id: string;
  name: string;
  note?: string;
  createdAt: string;
  readyAt: number;
}

function readCreatedStrategyRecords(): CreatedStrategyRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(CREATED_STRATEGIES_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is CreatedStrategyRecord =>
        typeof record?.id === "string" &&
        typeof record?.name === "string" &&
        (record?.note === undefined || typeof record.note === "string") &&
        typeof record?.createdAt === "string" &&
        typeof record?.readyAt === "number"
    );
  } catch {
    return [];
  }
}

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

type ChartColorTokens = ReturnType<typeof getChartColorTokens>;

function strategyMetricColor(key: MetricKey, value: string, chartColors: ChartColorTokens) {
  const numericValue = parsePercent(value);
  if (!Number.isFinite(numericValue)) return undefined;
  if (key === "roi") return numericValue < 0 ? chartColors.downHex : chartColors.upHex;
  if (key === "maxDrawdown") return numericValue === 0 ? undefined : chartColors.downHex;
  return undefined;
}

const strategyCardEquityValues = buildSeries(64, 99100, 138, 260);
const strategyCardCurveValues = strategyCardEquityValues.map((value) =>
  Number((value - strategyCardEquityValues[0]).toFixed(2))
);

function buildSparklinePoints(values: number[], width: number, height: number, padding = 6, includeZero = true) {
  const min = includeZero ? Math.min(0, ...values) : Math.min(...values);
  const max = includeZero ? Math.max(0, ...values) : Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / Math.max(1, values.length - 1);

  return values.map((value, index) => ({
    x: padding + index * step,
    y: height - padding - ((value - min) / range) * (height - padding * 2),
    value,
  }));
}

function buildSparklineAreaPath(points: Array<{ x: number; y: number }>, zeroY: number) {
  if (points.length < 2) return "";
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${zeroY.toFixed(2)} L ${first.x.toFixed(2)} ${zeroY.toFixed(2)} Z`;
}

function buildSparklineAreaRuns(
  points: Array<{ x: number; y: number; value: number }>,
  upColor: string,
  downColor: string,
  zeroY: number
) {
  if (points.length < 2) return [];

  const runs: Array<{ color: string; points: typeof points }> = [];
  const appendRun = (color: string, segmentPoints: typeof points) => {
    if (segmentPoints.length < 2) return;
    const previous = runs[runs.length - 1];
    if (previous?.color === color) {
      previous.points.push(...segmentPoints.slice(1));
      return;
    }
    runs.push({ color, points: segmentPoints });
  };

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const previousIsPositive = previous.value >= 0;
    const pointIsPositive = point.value >= 0;

    if (previousIsPositive === pointIsPositive || previous.value === 0 || point.value === 0) {
      appendRun(pointIsPositive ? upColor : downColor, [previous, point]);
      continue;
    }

    const ratio = (0 - previous.value) / (point.value - previous.value);
    const zeroPoint = {
      value: 0,
      x: previous.x + (point.x - previous.x) * ratio,
      y: zeroY,
    };
    appendRun(previousIsPositive ? upColor : downColor, [previous, zeroPoint]);
    appendRun(pointIsPositive ? upColor : downColor, [zeroPoint, point]);
  }

  return runs.filter((run) => run.points.length > 1);
}

function StrategyCurveSparkline({
  values,
  label,
  upColor,
  downColor,
}: {
  values: number[];
  label: string;
  upColor: string;
  downColor: string;
}) {
  const svgId = useId().replace(/:/g, "");
  const width = 420;
  const height = 86;
  const points = buildSparklinePoints(values, width, height);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const zeroY = height - 6 - ((0 - min) / range) * (height - 12);
  const runs = buildSparklineAreaRuns(points, upColor, downColor, zeroY);

  return (
    <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[62px] w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => (
          <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}-${run.color}`}>
            <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${svgId}-strategy-curve-fill-${index})`} />
            <path
              d={run.points
                .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
                .join(" ")}
              stroke={run.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <defs>
          {runs.map((run, index) => {
            const isPositiveRun = run.points.some((point) => point.value > 0);
            const lineEdgeY = isPositiveRun
              ? Math.min(...run.points.map((point) => point.y))
              : Math.max(...run.points.map((point) => point.y));
            return (
              <linearGradient
                key={`${svgId}-strategy-curve-fill-${index}`}
                id={`${svgId}-strategy-curve-fill-${index}`}
                x1="0"
                x2="0"
                y1={isPositiveRun ? lineEdgeY : zeroY}
                y2={isPositiveRun ? zeroY : lineEdgeY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={run.color} stopOpacity="0.58" />
                <stop offset="100%" stopColor={run.color} stopOpacity="0.12" />
              </linearGradient>
            );
          })}
        </defs>
      </svg>
    </div>
  );
}

function StrategyTableCurveSparkline({
  values,
  upColor,
  downColor,
  label,
}: {
  values: number[];
  upColor: string;
  downColor: string;
  label: string;
}) {
  const svgId = useId().replace(/:/g, "");
  const width = 108;
  const height = 42;
  const points = buildSparklinePoints(values, width, height, 4);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const zeroY = height - 4 - ((0 - min) / range) * (height - 8);
  const runs = buildSparklineAreaRuns(points, upColor, downColor, zeroY);

  return (
    <div className="flex h-full min-h-[42px] w-[108px] items-center" aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" fill="none" aria-hidden="true">
        {runs.map((run, index) => (
          <g key={`${run.points[0].x}-${run.points[run.points.length - 1].x}-${run.color}`}>
            <path d={buildSparklineAreaPath(run.points, zeroY)} fill={`url(#${svgId}-strategy-table-curve-fill-${index})`} />
            <path
              d={run.points
                .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
                .join(" ")}
              stroke={run.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
        <defs>
          {runs.map((run, index) => {
            const isPositiveRun = run.points.some((point) => point.value > 0);
            const lineEdgeY = isPositiveRun
              ? Math.min(...run.points.map((point) => point.y))
              : Math.max(...run.points.map((point) => point.y));
            return (
              <linearGradient
                key={`${svgId}-strategy-table-curve-fill-${index}`}
                id={`${svgId}-strategy-table-curve-fill-${index}`}
                x1="0"
                x2="0"
                y1={isPositiveRun ? lineEdgeY : zeroY}
                y2={isPositiveRun ? zeroY : lineEdgeY}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={run.color} stopOpacity="0.58" />
                <stop offset="100%" stopColor={run.color} stopOpacity="0.12" />
              </linearGradient>
            );
          })}
        </defs>
      </svg>
    </div>
  );
}

const sortLabels: Record<SortKey, { en: string; zh: string }> = {
  updated: { en: "Updated Time", zh: "更新时间" },
  name: { en: "Name", zh: "名称" },
  roi: { en: "ROI", zh: "ROI" },
  winRate: { en: "Win Rate", zh: "胜率" },
  sharpe: { en: "Sharpe", zh: "夏普比率" },
  rankIc: { en: "RankIC", zh: "RankIC" },
  maxDd: { en: "MaxDD", zh: "最大回撤" },
  turn: { en: "Turn", zh: "换手率" },
};

function getSortLabel(key: SortKey, tr: StrategyTr) {
  const label = sortLabels[key];
  return tr(label.en, label.zh);
}

const defaultVisibleItems: Record<DisplayItemKey, boolean> = {
  roi: true,
  winRate: true,
  sharpe: true,
  maxDrawdown: true,
  createdAt: true,
  id: true,
};

function toStrategyViewRow(index: number): StrategyViewRow {
  const strategy = strategies[index % strategies.length];
  const baseExecutionMode: ExecutionMode =
    strategy.status === "live"
      ? "live"
      : (strategy.status as string) === "paper"
        ? "paper"
        : "idle";
  const id = `STR-${463 + index}`;
  const statusSamples: Partial<Record<string, ExecutionMode>> = {
    "STR-467": "idle",
    "STR-471": "live",
    "STR-473": "paper",
    "STR-477": "idle",
  };
  const demoStatusSequence: ExecutionMode[] = ["idle", "live", "paper", "idle"];
  const executionMode = statusSamples[id] ?? demoStatusSequence[index % demoStatusSequence.length] ?? baseExecutionMode;

  const statusLabel =
    executionMode === "live"
      ? "Live Trading"
      : executionMode === "paper"
        ? "Paper Trading"
        : "Not Running";

  const statusClass =
    executionMode === "live"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
      : executionMode === "paper"
        ? "border-primary/25 bg-primary/10 text-primary"
        : "border-slate-400/25 bg-slate-500/10 text-slate-600 dark:text-slate-300";

  return {
    id,
    name: strategy.name,
    description: strategy.description,
    updatedAt: strategy.updatedAt,
    statusLabel,
    executionMode,
    statusClass,
    roi: strategy.annualReturn,
    winRate: strategy.winRate,
    sharpe: strategy.sharpe.toFixed(2),
    maxDrawdown: strategy.maxDrawdown,
  };
}

const strategyRows: StrategyViewRow[] = Array.from({ length: 20 }, (_, index) => toStrategyViewRow(index));

type WorkbenchStatus = "not-started" | "running" | "stopped";

interface WorkbenchMeta {
  title: string;
  category: string;
  sharpe: string;
  rankIc: string;
  maxDd: string;
  turn: string;
  status: WorkbenchStatus;
}

const workbenchSamples: WorkbenchMeta[] = [
  { title: "Smooth Momentum Quality", category: "Momentum", sharpe: "1.64", rankIc: "0.041", maxDd: "-8.2%", turn: "31%", status: "running" },
  { title: "Funding Crowding Fade", category: "Funding", sharpe: "1.22", rankIc: "0.031", maxDd: "-11.4%", turn: "68%", status: "stopped" },
  { title: "Overnight VRP", category: "Volatility", sharpe: "1.41", rankIc: "0.052", maxDd: "-9.9%", turn: "140%", status: "running" },
  { title: "Order Imbalance Reversion", category: "Order flow", sharpe: "0.98", rankIc: "0.024", maxDd: "-6.1%", turn: "12%", status: "running" },
  { title: "Liquidity Fragility Short", category: "Liquidity", sharpe: "1.33", rankIc: "0.040", maxDd: "-10.3%", turn: "96%", status: "running" },
  { title: "Volume Shock Continuation", category: "Volume", sharpe: "1.07", rankIc: "0.029", maxDd: "-7.7%", turn: "42%", status: "running" },
  { title: "Overnight VRP", category: "Volatility", sharpe: "0.62", rankIc: "0.014", maxDd: "-14.8%", turn: "24%", status: "running" },
  { title: "Overnight VRP", category: "Volatility", sharpe: "0.88", rankIc: "0.022", maxDd: "-12.1%", turn: "118%", status: "running" },
];

const workbenchTitleCopy: Record<string, { zh: string; copy: UiCopy }> = {
  "Smooth Momentum Quality": {
    zh: "平滑动量质量",
    copy: { ja: "平滑化モメンタム品質", ko: "스무딩 모멘텀 퀄리티", es: "Calidad de momentum suavizado", fr: "Qualite momentum lissee" },
  },
  "Funding Crowding Fade": {
    zh: "资金费率拥挤反转",
    copy: { ja: "資金調達率混雑リバーサル", ko: "펀딩 혼잡 반전", es: "Reversion de saturacion de funding", fr: "Retournement de concentration du funding" },
  },
  "Overnight VRP": {
    zh: "隔夜波动率风险溢价",
    copy: { ja: "オーバーナイトVRP", ko: "오버나이트 VRP", es: "VRP nocturno", fr: "VRP overnight" },
  },
  "Order Imbalance Reversion": {
    zh: "订单不平衡反转",
    copy: { ja: "注文不均衡リバーサル", ko: "주문 불균형 반전", es: "Reversion del desequilibrio de ordenes", fr: "Retournement du desequilibre d'ordres" },
  },
  "Liquidity Fragility Short": {
    zh: "流动性脆弱性空头",
    copy: { ja: "流動性脆弱性ショート", ko: "유동성 취약성 숏", es: "Corto de fragilidad de liquidez", fr: "Short sur fragilite de liquidite" },
  },
  "Volume Shock Continuation": {
    zh: "成交量冲击延续",
    copy: { ja: "出来高ショック継続", ko: "거래량 충격 지속", es: "Continuacion del choque de volumen", fr: "Continuation du choc de volume" },
  },
};

const workbenchCategoryCopy: Record<string, { zh: string; copy: UiCopy }> = {
  Momentum: { zh: "动量", copy: { ja: "モメンタム", ko: "모멘텀", es: "Momentum", fr: "Momentum" } },
  Funding: { zh: "资金费率", copy: { ja: "資金調達率", ko: "펀딩", es: "Funding", fr: "Funding" } },
  Volatility: { zh: "波动率", copy: { ja: "ボラティリティ", ko: "변동성", es: "Volatilidad", fr: "Volatilite" } },
  "Order flow": { zh: "订单流", copy: { ja: "注文フロー", ko: "주문 흐름", es: "Flujo de ordenes", fr: "Flux d'ordres" } },
  Liquidity: { zh: "流动性", copy: { ja: "流動性", ko: "유동성", es: "Liquidez", fr: "Liquidite" } },
  Volume: { zh: "成交量", copy: { ja: "出来高", ko: "거래량", es: "Volumen", fr: "Volume" } },
  Composite: { zh: "复合策略", copy: { ja: "複合戦略", ko: "복합 전략", es: "Estrategia compuesta", fr: "Strategie composite" } },
};

function translateWorkbenchTitle(title: string, tr: StrategyTr) {
  const localized = workbenchTitleCopy[title];
  return localized ? tr(title, localized.zh, localized.copy) : title;
}

function translateWorkbenchCategory(category: string, tr: StrategyTr) {
  const localized = workbenchCategoryCopy[category];
  return localized ? tr(category, localized.zh, localized.copy) : category;
}

function getWorkbenchMeta(index: number): WorkbenchMeta {
  return workbenchSamples[index % workbenchSamples.length];
}

function getStrategyRowIndex(row: StrategyViewRow) {
  const index = Number(row.id.replace("STR-", "")) - 463;
  return Number.isFinite(index) ? index : 0;
}

function getWorkbenchMetaForRow(row: StrategyViewRow) {
  if (row.backtestStatus) {
    const pending = row.backtestStatus === "pending";
    return {
      title: row.name,
      category: "Composite",
      sharpe: pending ? "—" : "1.18",
      rankIc: pending ? "—" : "0.036",
      maxDd: pending ? "—" : "-7.6%",
      turn: pending ? "—" : "48%",
      status: "not-started",
    } satisfies WorkbenchMeta;
  }
  const meta = getWorkbenchMeta(getStrategyRowIndex(row));
  return row.executionMode === "idle" ? { ...meta, status: "not-started" as const } : meta;
}

function toCreatedStrategyViewRow(record: CreatedStrategyRecord, now: number): StrategyViewRow {
  const pending = now < record.readyAt;
  return {
    id: record.id,
    name: record.name,
    description: record.note || "Composite strategy created from selected factors.",
    updatedAt: record.createdAt,
    statusLabel: "Not Running",
    executionMode: "idle",
    statusClass: "border-slate-400/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
    roi: pending ? "—" : "12.8%",
    winRate: pending ? "—" : "58.2%",
    sharpe: pending ? "—" : "1.18",
    maxDrawdown: pending ? "—" : "-7.6%",
    backtestStatus: pending ? "pending" : "ready",
  };
}

function getWorkbenchSortValue(row: StrategyViewRow, key: SortKey) {
  if (key === "updated") return new Date(row.updatedAt).getTime();
  if (key === "roi") return parsePercent(row.roi);
  if (key === "winRate") return parsePercent(row.winRate);
  if (key === "name") return 0;
  const meta = getWorkbenchMetaForRow(row);
  if (key === "sharpe") return Number(meta.sharpe);
  if (key === "rankIc") return Number(meta.rankIc);
  if (key === "maxDd") return parsePercent(meta.maxDd);
  return parsePercent(meta.turn);
}

function WorkbenchSparkline({
  values,
  color,
}: {
  values: number[];
  color?: string;
}) {
  const width = 120;
  const height = 26;
  const points = buildSparklinePoints(values, width, height, 3, false);
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const isPositive = values[values.length - 1] >= values[0];
  const strokeColor = color ?? (isPositive ? "var(--os-success)" : "var(--os-risk)");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="oq-strategy-sparkline" fill="none" aria-hidden="true">
      <path d={linePath} stroke={strokeColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function getStatusLabel(label: StrategyViewRow["statusLabel"], tr: StrategyTr) {
  if (label === "Live Trading") return tr("Live Trading", "实盘交易");
  if (label === "Paper Trading") return tr("Paper Trading", "模拟交易");
  return tr("Not Running", "未运行");
}

function readDeletedStrategyIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(DELETED_STRATEGIES_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled?: boolean;
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

function percentLevel(value: string, tr: StrategyTr, higherIsBetter = true) {
  const parsed = Math.abs(parsePercent(value));
  if (Number.isNaN(parsed)) return tr("for reference", "仅供参考");

  if (higherIsBetter) {
    if (parsed >= 20) return tr("high", "较高");
    if (parsed >= 10) return tr("moderate", "中等");
    return tr("low", "较低");
  }

  if (parsed <= 5) return tr("well controlled", "控制较好");
  if (parsed <= 12) return tr("noticeable", "需要关注");
  return tr("high risk", "风险较高");
}

function sharpeLevel(value: string, tr: StrategyTr) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return tr("for reference", "仅供参考");
  if (parsed >= 3) return tr("very steady", "非常稳定");
  if (parsed >= 1.5) return tr("relatively steady", "相对稳定");
  if (parsed >= 1) return tr("usable", "可用");
  return tr("less steady", "不够稳定");
}

function getMetricExplanation(
  key: MetricKey,
  row: StrategyViewRow,
  tr: StrategyTr
) {
  if (key === "roi") {
    const level = percentLevel(row.roi, tr);
    return tr(
      `ROI shows return. ${row.roi} is ${level}.`,
      `ROI 表示收益率，${row.roi} 属于${level}。`,
      {
        ja: `ROIは収益率を示します。${row.roi}は${level}です。`,
        ko: `ROI는 수익률을 나타냅니다. ${row.roi}는 ${level} 수준입니다.`,
        es: `El ROI muestra la rentabilidad. ${row.roi} se considera ${level}.`,
        fr: `Le ROI mesure le rendement. ${row.roi} est considere comme ${level}.`,
      }
    );
  }
  if (key === "winRate") {
    const level = percentLevel(row.winRate, tr);
    return tr(
      `Win rate is profitable trades divided by total trades. ${row.winRate} is ${level}.`,
      `盈利交易次数占总交易次数的比例，${row.winRate} 属于${level}。`,
      {
        ja: `勝率は利益取引数を総取引数で割った比率です。${row.winRate}は${level}です。`,
        ko: `승률은 수익 거래 수를 전체 거래 수로 나눈 비율입니다. ${row.winRate}는 ${level} 수준입니다.`,
        es: `La tasa de acierto divide las operaciones rentables entre el total. ${row.winRate} se considera ${level}.`,
        fr: `Le taux de reussite rapporte les trades gagnants au total. ${row.winRate} est considere comme ${level}.`,
      }
    );
  }
  if (key === "sharpe") {
    const level = sharpeLevel(row.sharpe, tr);
    return tr(
      `Sharpe measures return stability. ${row.sharpe} is ${level}.`,
      `夏普比率衡量收益稳定性，${row.sharpe} 属于${level}。`,
      {
        ja: `Sharpeはリスク調整後リターンの安定性を示します。${row.sharpe}は${level}です。`,
        ko: `Sharpe는 위험 조정 수익의 안정성을 측정합니다. ${row.sharpe}는 ${level} 수준입니다.`,
        es: `El Sharpe mide la estabilidad del rendimiento ajustado al riesgo. ${row.sharpe} se considera ${level}.`,
        fr: `Le Sharpe mesure la stabilite du rendement ajuste du risque. ${row.sharpe} est considere comme ${level}.`,
      }
    );
  }
  const level = percentLevel(row.maxDrawdown, tr, false);
  return tr(
    `Max drawdown is the largest decline. ${row.maxDrawdown} risk is ${level}.`,
    `最大回撤表示期间最大下跌幅度，${row.maxDrawdown} 风险${level}。`,
    {
      ja: `最大ドローダウンは期間中の最大下落幅です。${row.maxDrawdown}のリスクは${level}です。`,
      ko: `최대 낙폭은 기간 중 가장 큰 하락 폭입니다. ${row.maxDrawdown}의 위험 수준은 ${level}입니다.`,
      es: `El maximo drawdown es la mayor caida del periodo. El riesgo de ${row.maxDrawdown} es ${level}.`,
      fr: `Le drawdown maximal est la plus forte baisse de la periode. Le risque de ${row.maxDrawdown} est ${level}.`,
    }
  );
}

function MetricBox({
  label,
  value,
  tone = "neutral",
  valueColor,
  explanation,
  explainEnabled,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
  valueColor?: string;
  explanation?: string;
  explainEnabled?: boolean;
}) {
  const content = (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold font-mono tabular-nums ${
          valueColor
            ? ""
            : tone === "positive"
            ? "text-emerald-600 dark:text-[#00d492]"
            : tone === "negative"
              ? "text-rose-500 dark:text-[#ff637e]"
              : "text-foreground"
        }`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  );

  return (
    <MaybeExplainTooltip enabled={explainEnabled && Boolean(explanation)} explanation={explanation ?? ""}>
      {content}
    </MaybeExplainTooltip>
  );
}

export function CreateStrategyComposer({
  tr,
  plainExplainEnabled,
  mode = "create",
  initialValues,
  onClose,
  onSubmit,
}: {
  tr: StrategyTr;
  plainExplainEnabled: boolean;
  mode?: "create" | "edit";
  initialValues?: Partial<StrategyComposerValues>;
  onClose: () => void;
  onSubmit: (values: StrategyComposerValues) => void;
}) {
  const initialFactorIds = initialValues?.selectedFactorIds ?? [];
  const [selectedFactorIds, setSelectedFactorIds] = useState<string[]>(initialFactorIds);
  const [customWeights, setCustomWeights] = useState<Record<string, string>>(
    initialValues?.customWeights ?? buildStrategyDefaultWeights(initialFactorIds)
  );
  const [direction, setDirection] = useState<StrategyDirection>(initialValues?.direction ?? "neutral");
  const [layerUnit, setLayerUnit] = useState<StrategyLayerUnit>(initialValues?.layerUnit ?? "percent");
  const [layerValue, setLayerValue] = useState(initialValues?.layerValue ?? "10");
  const [strategyName, setStrategyName] = useState(initialValues?.strategyName ?? "BTC Alpha Composite");
  const [strategyNote, setStrategyNote] = useState(initialValues?.strategyNote ?? "");
  const [factorPickerOpen, setFactorPickerOpen] = useState(false);
  const [factorSource, setFactorSource] = useState<StrategyFactorSource>("official");
  const [factorQuery, setFactorQuery] = useState("");
  const [factorCategory, setFactorCategory] = useState("ALL");
  const [showValidation, setShowValidation] = useState(false);
  const initialWeightEffectRef = useRef(true);

  const officialFactors = useMemo(
    () => factors.filter((factor) => factor.category === "official" || factor.category === "graduated"),
    []
  );
  const myFactors = useMemo(() => {
    const submittedFactorIds = new Set(submissions.map((submission) => submission.factorId));
    return factors.filter((factor) => submittedFactorIds.has(factor.id));
  }, []);
  const sourceFactors = factorSource === "official" ? officialFactors : myFactors;
  const factorCategories = useMemo(
    () => ["ALL", ...Array.from(new Set(sourceFactors.map((factor) => factor.tag || "OTHER")))],
    [sourceFactors]
  );
  const filteredFactors = useMemo(() => {
    const keyword = factorQuery.trim().toLowerCase();
    return sourceFactors.filter((factor) => {
      const matchesCategory = factorCategory === "ALL" || factor.tag === factorCategory;
      const matchesQuery =
        !keyword ||
        factor.name.toLowerCase().includes(keyword) ||
        factor.id.toLowerCase().includes(keyword) ||
        (factor.tag || "").toLowerCase().includes(keyword);
      return matchesCategory && matchesQuery;
    });
  }, [factorCategory, factorQuery, sourceFactors]);
  const selectedFactors = useMemo(
    () =>
      selectedFactorIds
        .map((factorId) => factors.find((factor) => factor.id === factorId))
        .filter((factor): factor is Factor => Boolean(factor)),
    [selectedFactorIds]
  );
  const weightSum = useMemo(
    () => selectedFactorIds.reduce((sum, factorId) => sum + Number(customWeights[factorId] || 0), 0),
    [customWeights, selectedFactorIds]
  );
  const customWeightValid = selectedFactorIds.length === 0 || Math.abs(weightSum - 1) <= 0.0001;
  const layerNumber = Number(layerValue);
  const layerValueValid =
    Number.isFinite(layerNumber) &&
    layerNumber > 0 &&
    (layerUnit === "percent" ? layerNumber <= 50 : Number.isInteger(layerNumber));

  useEffect(() => {
    if (initialWeightEffectRef.current) {
      initialWeightEffectRef.current = false;
      return;
    }
    setCustomWeights(buildStrategyDefaultWeights(selectedFactorIds));
  }, [selectedFactorIds]);

  const toggleFactor = (factorId: string) => {
    setSelectedFactorIds((current) => {
      if (current.includes(factorId)) return current.filter((id) => id !== factorId);
      if (current.length >= MAX_STRATEGY_FACTOR_COUNT) return current;
      return [...current, factorId];
    });
  };

  const changeFactorSource = (source: StrategyFactorSource) => {
    setFactorSource(source);
    setFactorCategory("ALL");
  };

  const directionOptions: Array<{ key: StrategyDirection; label: string }> = [
    { key: "neutral", label: tr("Neutral", "中性") },
    { key: "long", label: tr("Long only", "仅做多") },
    { key: "short", label: tr("Short only", "仅做空") },
  ];
  const layerUnitOptions: Array<{ key: StrategyLayerUnit; label: string }> = [
    { key: "N", label: "N" },
    { key: "percent", label: "%" },
  ];

  return (
    <form
      className="oq-strategy-create-form"
      onSubmit={(event) => {
        event.preventDefault();
        setShowValidation(true);
        if (selectedFactorIds.length === 0 || !customWeightValid || !layerValueValid) return;
        const submittedStrategyName = strategyName.trim() || tr("Untitled strategy", "未命名策略");
        onSubmit({
          selectedFactorIds,
          customWeights,
          direction,
          layerUnit,
          layerValue,
          strategyName: submittedStrategyName,
          strategyNote: strategyNote.trim(),
        });
        onClose();
      }}
    >
      <div className="oq-strategy-form-field is-wide">
        <span>
          {tr("Factor selection", "因子选择")}
          <b>*</b>
        </span>
        <div
          className={`oq-strategy-factor-selection ${selectedFactors.length > 0 ? "has-selection" : ""} ${
            selectedFactors.length > 0 ? "has-multiple" : ""
          } ${showValidation && selectedFactorIds.length === 0 ? "is-invalid" : ""}`}
        >
          <button
            type="button"
            className="oq-strategy-form-control oq-strategy-factor-picker"
            onClick={() => setFactorPickerOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className={selectedFactorIds.length > 0 ? "sr-only" : undefined}>
              {selectedFactorIds.length > 0
                ? formatFactorSelectionCount(selectedFactorIds.length, tr, true)
                : tr("Choose factors from official library or my factors.", "点击从官方库或我的因子中选择因子。")}
            </span>
            <span className="oq-strategy-factor-count">
              {selectedFactorIds.length}/{MAX_STRATEGY_FACTOR_COUNT}
            </span>
          </button>
          {selectedFactors.length > 0 ? (
            <div className="oq-strategy-factor-chips">
              {selectedFactors.map((factor) => (
                <button
                  key={factor.id}
                  type="button"
                  onClick={() => toggleFactor(factor.id)}
                  aria-label={formatRemoveFactorLabel(factor.name, tr)}
                >
                  <span>{factor.name}</span>
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {showValidation && selectedFactorIds.length === 0 ? (
          <small className="oq-strategy-field-error">{tr("Select at least one factor.", "请至少选择一个因子。")}</small>
        ) : null}
        {selectedFactors.length > 0 ? (
          <div className="oq-strategy-weight-editor">
            <div className="oq-strategy-weight-list">
              {selectedFactors.map((factor) => (
                <label key={factor.id}>
                  <span>
                    <strong>{factor.name}</strong>
                    <small>{formatStrategyFactorId(factor.id)}</small>
                  </span>
                  <input
                    value={customWeights[factor.id] ?? ""}
                    inputMode="decimal"
                    onChange={(event) =>
                      setCustomWeights((current) => ({
                        ...current,
                        [factor.id]: normalizeStrategyWeightInput(event.target.value),
                      }))
                    }
                    aria-label={formatFactorWeightLabel(factor.name, tr)}
                  />
                </label>
              ))}
            </div>
            <div className={`oq-strategy-weight-total ${customWeightValid ? "is-valid" : "is-invalid"}`}>
              <span>{tr("Weight total", "权重总和")}</span>
              <strong>{weightSum.toFixed(2)}</strong>
              <small>{customWeightValid ? tr("Valid", "有效") : tr("Must equal 1.00", "必须等于 1.00")}</small>
            </div>
          </div>
        ) : null}
        {showValidation && !customWeightValid ? (
          <small className="oq-strategy-field-error">{tr("Custom weights must total 1.00.", "自定义权重总和必须为 1.00。")}</small>
        ) : null}
      </div>

      <fieldset className="oq-strategy-form-field is-wide">
        <legend>
          <MaybeExplainTooltip
            enabled={plainExplainEnabled}
            explanation={tr(
              "Neutral: holds both long and short positions; Long only: holds assets expected to rise; Short only: holds assets expected to fall.",
              "中性：同时配置多头和空头；仅做多：只持有预期上涨的标的；仅做空：只持有预期下跌的标的。",
            )}
          >
            <span tabIndex={plainExplainEnabled ? 0 : undefined}>{tr("Strategy direction", "策略方向")}</span>
          </MaybeExplainTooltip>
          <b>*</b>
        </legend>
        <div className="oq-strategy-segment-group is-three">
          {directionOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={direction === item.key ? "is-active" : ""}
              onClick={() => setDirection(item.key)}
              aria-pressed={direction === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="oq-strategy-form-field is-wide">
        <span>
          <MaybeExplainTooltip
            enabled={plainExplainEnabled}
            explanation={tr(
              "The value sets the size selected from each end of the ranking. N selects that many assets from both the top and bottom; % selects that percentage from each end.",
              "数值表示每端选取的规模；选择 N 时，从排名头部和尾部各选 N 个标的；选择 % 时，从两端各选相同比例的标的。",
            )}
          >
            <span tabIndex={plainExplainEnabled ? 0 : undefined}>{tr("Head/tail grouping rule", "头尾分层规则")}</span>
          </MaybeExplainTooltip>
          <b>*</b>
        </span>
        <div className="oq-strategy-layer-row">
          <input
            className={`oq-strategy-form-control ${showValidation && !layerValueValid ? "is-invalid" : ""}`}
            value={layerValue}
            inputMode="decimal"
            onChange={(event) => setLayerValue(event.target.value.replace(/[^\d.]/g, ""))}
            aria-label={tr("Head/tail grouping value", "头尾分层数值")}
          />
          {layerUnitOptions.map((item) => (
            <button
              key={item.key}
              type="button"
              className={layerUnit === item.key ? "is-active" : ""}
              onClick={() => setLayerUnit(item.key)}
              aria-pressed={layerUnit === item.key}
            >
              {item.label}
            </button>
          ))}
        </div>
        {showValidation && !layerValueValid ? (
          <small className="oq-strategy-field-error">
            {layerUnit === "percent"
              ? tr("Enter a percentage from 0 to 50.", "请输入大于 0 且不超过 50 的百分比。")
              : tr("Enter a positive integer.", "请输入正整数。")}
          </small>
        ) : null}
      </div>

      <label className="oq-strategy-form-field is-wide">
        <span>{tr("Strategy name", "策略名称")}</span>
        <input
          className="oq-strategy-form-control"
          value={strategyName}
          onChange={(event) => setStrategyName(event.target.value)}
        />
      </label>

      <label className="oq-strategy-form-field is-wide">
        <span>{tr("Note", "备注")}</span>
        <textarea
          className="oq-strategy-form-control oq-strategy-note-input"
          value={strategyNote}
          maxLength={300}
          placeholder={tr("Add a note", "添加备注")}
          onChange={(event) => setStrategyNote(event.target.value)}
        />
      </label>

      <div className="oq-strategy-create-actions">
        <button type="button" className="oq-strategy-form-secondary" onClick={onClose}>
          {tr("Cancel", "取消")}
        </button>
        <button type="submit" className="oq-strategy-form-primary">
          {mode === "edit"
            ? tr("Save changes", "保存编辑", {
                ja: "変更を保存",
                ko: "변경 사항 저장",
                es: "Guardar cambios",
                fr: "Enregistrer les modifications",
              })
            : tr("Create strategy", "创建策略")}
        </button>
      </div>

      <Dialog
        open={factorPickerOpen}
        onOpenChange={(open) => {
          setFactorPickerOpen(open);
          if (!open) setFactorQuery("");
        }}
      >
        <DialogContent className="oq-strategy-factor-dialog gap-0 rounded-2xl border-0 p-0 shadow-2xl">
          <div className="oq-strategy-factor-dialog-head">
            <div>
              <DialogTitle>{tr("Select factors", "选择因子")}</DialogTitle>
              <p>
                {formatFactorPickerHelp(MAX_STRATEGY_FACTOR_COUNT, tr)}
              </p>
            </div>
          </div>

          <div className="oq-strategy-factor-dialog-tools">
            <div className="oq-strategy-factor-source-tabs">
              {([
                { key: "official", label: tr("Official library", "官方库"), count: officialFactors.length },
                { key: "my", label: tr("My factors", "我的因子"), count: myFactors.length },
              ] as Array<{ key: StrategyFactorSource; label: string; count: number }>).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={factorSource === item.key ? "is-active" : ""}
                  onClick={() => changeFactorSource(item.key)}
                >
                  {item.label}
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
            <label className="oq-strategy-factor-search">
              <Search className="h-3.5 w-3.5" />
              <input
                value={factorQuery}
                onChange={(event) => setFactorQuery(event.target.value)}
                placeholder={tr("Search name, ID or tag", "搜索名称、ID 或标签")}
              />
            </label>
          </div>

          <div className="oq-strategy-factor-browser">
            <aside>
              {factorCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={factorCategory === category ? "is-active" : ""}
                  onClick={() => setFactorCategory(category)}
                >
                  {getStrategyFactorTagLabel(category, tr)}
                </button>
              ))}
            </aside>
            <div className="oq-strategy-factor-list">
              {filteredFactors.length > 0 ? (
                filteredFactors.map((factor) => {
                  const selected = selectedFactorIds.includes(factor.id);
                  const reachedLimit = !selected && selectedFactorIds.length >= MAX_STRATEGY_FACTOR_COUNT;
                  return (
                    <button
                      key={`${factorSource}-${factor.id}`}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      disabled={reachedLimit}
                      onClick={() => toggleFactor(factor.id)}
                    >
                      <span className="oq-strategy-factor-check">
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="oq-strategy-factor-card-copy">
                        <strong>{factor.name}</strong>
                        <small>
                          {formatStrategyFactorId(factor.id)} · {getStrategyFactorTagLabel(factor.tag || "OTHER", tr)}
                        </small>
                      </span>
                      <span className="oq-strategy-factor-metric">
                        <small>{tr("OOS Sharpe", "样本外夏普")}</small>
                        <strong>{factor.osSharpe.toFixed(2)}</strong>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="oq-strategy-factor-empty">
                  {tr("No factors match the current filter.", "没有符合当前筛选条件的因子。")}
                </div>
              )}
            </div>
          </div>

          <div className="oq-strategy-factor-dialog-footer">
            <span>
              {selectedFactorIds.length === 0
                ? tr("No factors selected", "尚未选择因子")
                : formatFactorSelectionCount(selectedFactorIds.length, tr)}
            </span>
            <button type="button" onClick={() => setFactorPickerOpen(false)}>
              {tr("Done", "完成")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

const strategyDescriptionCopy: Record<string, { zh: string; copy: UiCopy }> = {
  "Cross-Exchange Arb Pro": {
    zh: "利用主流 CEX 平台间的价格偏差，并结合价差分析与订单簿深度进行套利。",
    copy: {
      ja: "主要CEX間の価格差を、スプレッド分析と板の厚みを組み合わせて裁定します。",
      ko: "주요 CEX 간 가격 괴리를 스프레드 분석과 오더북 깊이를 결합해 차익거래합니다.",
      es: "Arbitra diferencias de precio entre los principales CEX mediante analisis de spreads y profundidad del libro de ordenes.",
      fr: "Arbitre les ecarts de prix entre les principaux CEX a l'aide de l'analyse des spreads et de la profondeur du carnet d'ordres.",
    },
  },
  "Stable Yield Optimizer": {
    zh: "聚焦资金费率套利与基差交易的低风险策略，并通过受控敞口提升收益稳定性。",
    copy: {
      ja: "資金調達率アービトラージとベーシス取引に注力し、管理されたエクスポージャーで収益の安定性を高めます。",
      ko: "펀딩 차익거래와 베이시스 거래에 집중하고 통제된 익스포저로 수익 안정성을 높이는 저위험 전략입니다.",
      es: "Estrategia de bajo riesgo centrada en arbitraje de funding y basis trading, con exposicion controlada para estabilizar el rendimiento.",
      fr: "Strategie a faible risque axee sur l'arbitrage du funding et le basis trading, avec une exposition controlee pour stabiliser le rendement.",
    },
  },
  "BTC Alpha Composite": {
    zh: "结合 RSI 交叉、成交量背离与资金费率信号的多因子动量策略，适用于 BTC 永续合约。",
    copy: {
      ja: "RSIクロス、出来高ダイバージェンス、資金調達率シグナルを組み合わせたBTC無期限先物向けマルチファクター・モメンタム戦略です。",
      ko: "RSI 교차, 거래량 다이버전스, 펀딩 시그널을 결합한 BTC 무기한 선물용 멀티팩터 모멘텀 전략입니다.",
      es: "Estrategia multifactor de momentum para perpetuos de BTC que combina cruces de RSI, divergencia de volumen y senales de funding.",
      fr: "Strategie momentum multifactorielle pour les perpetuels BTC combinant croisements RSI, divergence de volume et signaux de funding.",
    },
  },
  "DeFi Yield Hunter": {
    zh: "从 TVL 资金流、LP 行为和 Gas 费模式中提取 Alpha，覆盖主要 DeFi 协议。",
    copy: {
      ja: "主要DeFiプロトコルを対象に、TVLフロー、LP行動、ガス代パターンからAlphaを抽出します。",
      ko: "주요 DeFi 프로토콜의 TVL 자금 흐름, LP 행동, 가스비 패턴에서 Alpha를 추출합니다.",
      es: "Extrae alpha de flujos de TVL, comportamiento de LP y patrones de gas en los principales protocolos DeFi.",
      fr: "Extrait de l'alpha des flux de TVL, du comportement des LP et des schemas de frais de gas sur les principaux protocoles DeFi.",
    },
  },
  "Altcoin Rotation": {
    zh: "基于动量、巨鲸跟踪与链上指标，在前 50 大山寨币之间进行系统化轮动。",
    copy: {
      ja: "モメンタム、クジラ追跡、オンチェーン指標に基づき、上位50のアルトコインを体系的にローテーションします。",
      ko: "모멘텀, 고래 추적, 온체인 지표를 기반으로 상위 50개 알트코인을 체계적으로 순환합니다.",
      es: "Rota de forma sistematica entre las 50 principales altcoins usando momentum, seguimiento de ballenas y metricas on-chain.",
      fr: "Effectue une rotation systematique parmi les 50 principaux altcoins a partir du momentum, du suivi des baleines et de metriques on-chain.",
    },
  },
  "MEV Protection Alpha": {
    zh: "通过识别并规避 MEV 攻击，同时捕捉具备抗 Sandwich 特征的机会来生成 Alpha。",
    copy: {
      ja: "MEV攻撃を検知・回避しつつ、サンドイッチ耐性のある機会を捉えてAlphaを創出します。",
      ko: "MEV 공격을 식별하고 회피하는 동시에 샌드위치 공격에 강한 기회를 포착해 Alpha를 생성합니다.",
      es: "Genera alpha identificando y evitando ataques MEV mientras captura oportunidades resistentes a sandwich attacks.",
      fr: "Genere de l'alpha en identifiant et en evitant les attaques MEV tout en capturant des opportunites resistantes aux sandwich attacks.",
    },
  },
};

function translateStrategyDescription(row: StrategyViewRow, tr: StrategyTr) {
  const localized = strategyDescriptionCopy[row.name];
  if (localized) return tr(row.description, localized.zh, localized.copy);
  if (row.description === "Composite strategy created from selected factors.") {
    return tr(row.description, "由所选因子创建的复合策略。", {
      ja: "選択したファクターから作成した複合戦略です。",
      ko: "선택한 팩터로 생성한 복합 전략입니다.",
      es: "Estrategia compuesta creada a partir de los factores seleccionados.",
      fr: "Strategie composite creee a partir des facteurs selectionnes.",
    });
  }
  return row.description;
}

function StrategyCard({
  row,
  starred,
  onToggleStar,
  onRequestDelete,
  visibleItems,
  plainExplainEnabled,
  tr,
  chartColors,
}: {
  row: StrategyViewRow;
  starred: boolean;
  onToggleStar: () => void;
  onRequestDelete: () => void;
  visibleItems: Record<DisplayItemKey, boolean>;
  plainExplainEnabled: boolean;
  tr: StrategyTr;
  chartColors: ChartColorTokens;
}) {
  const translatedDescription = translateStrategyDescription(row, tr);
  const metaItems = [
    visibleItems.createdAt ? { label: tr("Created", "创建日期"), value: row.updatedAt } : null,
    visibleItems.id ? { label: "ID", value: row.id } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div className="surface-card overflow-hidden border border-border/70">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <p className="min-w-0 truncate text-lg font-semibold leading-7 text-foreground">{row.name}</p>
        </div>
        {metaItems.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {metaItems.map((item) => (
              <div key={item.label} className="inline-flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">{item.label}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="px-5 pb-4 pt-1">
        <p className="text-xs leading-5 text-muted-foreground">{translatedDescription}</p>

        <StrategyCurveSparkline
          values={strategyCardCurveValues}
          label={tr("Asset Curve", "资产曲线")}
          upColor={chartColors.upHex}
          downColor={chartColors.downHex}
        />

        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 xl:grid-cols-4">
          {visibleItems.roi ? <MetricBox label="ROI" value={row.roi} valueColor={strategyMetricColor("roi", row.roi, chartColors)} explanation={getMetricExplanation("roi", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
          {visibleItems.winRate ? <MetricBox label={tr("Win Rate", "胜率")} value={row.winRate} explanation={getMetricExplanation("winRate", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
          {visibleItems.sharpe ? <MetricBox label={tr("Sharpe", "夏普比率")} value={row.sharpe} explanation={getMetricExplanation("sharpe", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
          {visibleItems.maxDrawdown ? <MetricBox label={tr("Max DD", "最大回撤")} value={row.maxDrawdown} valueColor={strategyMetricColor("maxDrawdown", row.maxDrawdown, chartColors)} explanation={getMetricExplanation("maxDrawdown", row, tr)} explainEnabled={plainExplainEnabled} /> : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-3">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-accent/50 hover:text-foreground"
                aria-label={tr("More actions", "更多操作")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-32 rounded-xl p-1" align="end">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                onClick={onRequestDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tr("Delete", "删除")}
              </button>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
              starred
                ? "border-amber-400/70 bg-amber-400/20 text-amber-600 dark:border-[#ffb900]/60 dark:bg-[#ffb900]/30 dark:text-[#ffb900]"
                : "border-border/70 bg-card text-amber-500 hover:border-amber-400/60 dark:border-border/60 dark:bg-background/30 dark:text-[#ffb900]"
            }`}
            onClick={onToggleStar}
            aria-label={tr("Toggle favorite", "切换收藏")}
          >
            <Star className={`h-[14px] w-[14px] ${starred ? "fill-current" : ""}`} />
          </button>

          <Link href={`/strategies/${row.id}`}>
            <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              {tr("View", "查看")}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyStrategies() {
  const { uiLang } = useAppLanguage();
  const [, navigate] = useLocation();
  const search = useSearch();
  const query = useMemo(() => new URLSearchParams(search).get("q") ?? "", [search]);
  const setQuery = (nextQuery: string) => {
    const nextSearchParams = new URLSearchParams(search);
    if (nextQuery) {
      nextSearchParams.set("q", nextQuery);
    } else {
      nextSearchParams.delete("q");
    }
    const nextSearch = nextSearchParams.toString();
    navigate(`/strategies${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  };
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Record<DisplayItemKey, boolean>>(defaultVisibleItems);
  const [starred, setStarred] = useState<Set<string>>(new Set(["STR-463", "STR-470"]));
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<Set<string>>(new Set(["STR-463", "STR-465"]));
  const [deletedStrategyIds, setDeletedStrategyIds] = useState<Set<string>>(() => readDeletedStrategyIds());
  const [pendingDeleteStrategy, setPendingDeleteStrategy] = useState<StrategyViewRow | null>(null);
  const [showCreateStrategy, setShowCreateStrategy] = useState(false);
  const [createdStrategies, setCreatedStrategies] = useState<CreatedStrategyRecord[]>(() => readCreatedStrategyRecords());
  const [backtestClock, setBacktestClock] = useState(() => Date.now());
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const tr = makeStrategyTranslator(uiLang);
  const shouldShowPlainExplanations = plainExplainEnabled;
  const chartColors = useMemo(() => getChartColorTokens(chartColorMode), [chartColorMode]);

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setShowFilterMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(target)) {
        setShowColumnsMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
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
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DELETED_STRATEGIES_STORAGE_KEY, JSON.stringify(Array.from(deletedStrategyIds)));
  }, [deletedStrategyIds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CREATED_STRATEGIES_STORAGE_KEY, JSON.stringify(createdStrategies));
  }, [createdStrategies]);

  useEffect(() => {
    const now = Date.now();
    const nextReadyAt = createdStrategies.reduce<number | null>((next, strategy) => {
      if (strategy.readyAt <= now) return next;
      return next === null ? strategy.readyAt : Math.min(next, strategy.readyAt);
    }, null);

    if (nextReadyAt === null) return;
    const timeout = window.setTimeout(
      () => setBacktestClock(Date.now()),
      Math.max(0, nextReadyAt - now + 50)
    );
    return () => window.clearTimeout(timeout);
  }, [backtestClock, createdStrategies]);

  const activeStrategyRows = useMemo(
    () =>
      [
        ...createdStrategies.map((strategy) => toCreatedStrategyViewRow(strategy, backtestClock)),
        ...strategyRows,
      ].filter((row) => !deletedStrategyIds.has(row.id)),
    [backtestClock, createdStrategies, deletedStrategyIds]
  );

  const filtered = useMemo(() => {
    const byTopFilter = activeStrategyRows.filter((row) => {
      if (strategyFilter === "favorites") return starred.has(row.id);
      if (strategyFilter === "trading") return row.executionMode === "paper" || row.executionMode === "live";
      if (strategyFilter === "idle") return row.executionMode === "idle";
      return true;
    });

    const keyword = query.trim().toLowerCase();
    if (!keyword) return byTopFilter;
    return byTopFilter.filter((row) => {
      const meta = getWorkbenchMetaForRow(row);
      const visibleTitle = translateWorkbenchTitle(meta.title, tr).toLowerCase();
      const visibleCategory = translateWorkbenchCategory(meta.category, tr).toLowerCase();
      return [visibleTitle, visibleCategory, row.name, row.id].some((value) => value.toLowerCase().includes(keyword));
    });
  }, [activeStrategyRows, query, strategyFilter, starred, uiLang]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const rows = [...filtered];
    rows.sort((a, b) => {
      const comp = sortKey === "name"
        ? a.name.localeCompare(b.name)
        : getWorkbenchSortValue(a, sortKey) - getWorkbenchSortValue(b, sortKey);
      return sortDesc ? -comp : comp;
    });
    return rows;
  }, [filtered, sortDesc, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, sorted]
  );

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, strategyFilter, sortKey, sortDesc, pageSize]);

  const getPageRange = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const toggleWorkbenchSort = (key: Extract<SortKey, "updated" | "sharpe" | "maxDd" | "turn">) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDesc(true);
      return;
    }

    if (sortDesc) {
      setSortDesc(false);
      return;
    }

    setSortKey(null);
    setSortDesc(true);
  };

  const renderWorkbenchSortHeader = (
    key: Extract<SortKey, "updated" | "sharpe" | "maxDd" | "turn">,
    label: string
  ) => {
    const isActive = sortKey === key;
    const sortState = !isActive ? "default" : sortDesc ? "descending" : "ascending";
    const nextState = sortState === "default"
      ? tr("Descending", "降序")
      : sortState === "descending"
        ? tr("Ascending", "升序")
        : tr("Restore defaults", "恢复默认");

    return (
      <button
        type="button"
        className={`oq-strategy-sort-heading ${isActive ? "is-active" : ""}`}
        onClick={() => toggleWorkbenchSort(key)}
        aria-label={`${label} · ${nextState}`}
        data-sort-state={sortState}
      >
        <span>{label}</span>
        {isActive ? (
          sortDesc ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />
        ) : (
          <ArrowUpDown aria-hidden="true" />
        )}
      </button>
    );
  };

  const tradingCount = useMemo(
    () => activeStrategyRows.filter((row) => row.executionMode === "paper" || row.executionMode === "live").length,
    [activeStrategyRows]
  );
  const idleCount = useMemo(
    () => activeStrategyRows.filter((row) => row.executionMode === "idle").length,
    [activeStrategyRows]
  );
  const favoriteCount = useMemo(
    () => activeStrategyRows.filter((row) => starred.has(row.id)).length,
    [activeStrategyRows, starred]
  );

  const requestDeleteStrategy = (row: StrategyViewRow) => {
    setPendingDeleteStrategy(row);
  };

  const toggleSelectedStrategy = (strategyId: string) => {
    setSelectedStrategyIds((prev) => {
      const next = new Set(prev);
      if (next.has(strategyId)) next.delete(strategyId);
      else if (next.size < MAX_COMPARE_STRATEGY_COUNT) next.add(strategyId);
      return next;
    });
  };

  const createPendingStrategy = (name: string, note: string) => {
    const createdAt = new Date();
    setCreatedStrategies((current) => {
      const nextId = Math.max(
        482,
        ...current.map((strategy) => Number(strategy.id.replace("STR-", "")) || 0)
      ) + 1;
      return [
        {
          id: `STR-${nextId}`,
          name,
          note: note || undefined,
          createdAt: createdAt.toISOString(),
          readyAt: createdAt.getTime() + STRATEGY_BACKTEST_DURATION_MS,
        },
        ...current,
      ];
    });
    setBacktestClock(createdAt.getTime());
    setPage(1);
  };

  const confirmDeleteStrategy = () => {
    if (!pendingDeleteStrategy) return;
    const strategyId = pendingDeleteStrategy.id;
    setDeletedStrategyIds((prev) => {
      const next = new Set(prev);
      next.add(strategyId);
      return next;
    });
    setStarred((prev) => {
      if (!prev.has(strategyId)) return prev;
      const next = new Set(prev);
      next.delete(strategyId);
      return next;
    });
    setSelectedStrategyIds((prev) => {
      if (!prev.has(strategyId)) return prev;
      const next = new Set(prev);
      next.delete(strategyId);
      return next;
    });
    setPendingDeleteStrategy(null);
    setPage(1);
  };

  const topStats = [
    {
      key: "all" as const,
      label: tr("Total", "全部策略"),
      value: String(activeStrategyRows.length),
      icon: <List className="h-3.5 w-3.5 text-slate-400" />,
      tone: "text-foreground",
      labelClass: "text-muted-foreground",
    },
    {
      key: "favorites" as const,
      label: tr("My Favorites", "我的收藏"),
      value: String(favoriteCount),
      icon: <Star className="h-3.5 w-3.5 text-[#ffb900]" />,
      tone: "text-[#ffb900]",
      labelClass: "text-[#ffb900]",
    },
    {
      key: "trading" as const,
      label: tr("Trading", "交易中"),
      value: String(tradingCount),
      icon: <ArrowUpDown className="h-3.5 w-3.5 text-primary" />,
      tone: "text-primary",
      labelClass: "text-primary",
    },
    {
      key: "idle" as const,
      label: tr("Not Running", "未运行"),
      value: String(idleCount),
      icon: <Circle className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />,
      tone: "text-slate-600 dark:text-slate-300",
      labelClass: "text-slate-600 dark:text-slate-300",
    },
  ];

  const workbenchRows = paginated;
  const selectedCompareRows = activeStrategyRows.filter((row) => selectedStrategyIds.has(row.id)).slice(0, 2);
  const hasCompareRows = selectedCompareRows.length > 0;
  const hasPairComparison = selectedCompareRows.length > 1;
  const useFigmaWorkbenchLayout: boolean = true;

  if (useFigmaWorkbenchLayout) {
    return (
      <div className="oq-strategy-workbench">
        <section className="oq-strategy-sync">
          <div className="oq-strategy-sync-icon"><RefreshCw className="h-3.5 w-3.5" /></div>
          <div className="oq-strategy-sync-copy">
            <div className="oq-strategy-sync-title">{tr("Synced with your Codex agent", "已与 Codex Agent 同步")}</div>
            <div className="oq-strategy-sync-text">{tr("Mine in Codex — alphas land here automatically. Last sync 2 min ago.", "在 Codex 中挖掘，因子会自动流入这里。上次同步 2 分钟前。")}</div>
          </div>
          <span className="oq-strategy-live-pill"><span />{tr("Live", "实时")}</span>
        </section>

        <div className="oq-strategy-controls">
          <div className="oq-strategy-create-row">
            <button type="button" className="oq-strategy-create-button" onClick={() => setShowCreateStrategy(true)}>
              <Plus className="h-3.5 w-3.5" />
              {tr("Create strategy", "创建策略")}
            </button>
          </div>

          <section className="oq-strategy-toolbar">
            <div className="oq-strategy-toolbar-left">
            <div className="relative" ref={filterMenuRef}>
              <button type="button" className="oq-strategy-pill-button" onClick={() => { setShowFilterMenu((prev) => !prev); setShowSortMenu(false); }}>
                <span>{strategyFilter === "favorites" ? tr("My Favorites", "我的收藏") : tr("All", "全部")}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {showFilterMenu ? (
                <div className="oq-strategy-menu">
                  {([
                    { key: "all", label: tr("All", "全部") },
                    { key: "favorites", label: tr("My Favorites", "我的收藏") },
                  ] as Array<{ key: StrategyFilter; label: string }>).map((item) => (
                    <button key={item.key} type="button" className={strategyFilter === item.key ? "is-active" : ""} onClick={() => { setStrategyFilter(item.key); setShowFilterMenu(false); }}>
                      <span>{item.label}</span>
                      {strategyFilter === item.key ? <Check className="h-3 w-3" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="button" className="oq-strategy-download oq-strategy-pill-button">
              <Download className="h-3.5 w-3.5" />
              {tr("Download all", "下载全部")}
            </button>
            <div className="oq-strategy-compare-note">
              <GitCompareArrows className="h-3.5 w-3.5" />
              <span>{tr("Tick rows to compare ·", "勾选行以比较 ·")}</span>
              <strong>{formatStrategySelectionCount(selectedStrategyIds.size, tr)}</strong>
            </div>
            </div>
          </section>
        </div>

        <section className="oq-strategy-table-card">
          <div className="oq-strategy-table-head oq-strategy-table-grid">
            <div />
            <div>{tr("Strategy", "策略")}</div>
            <div>{renderWorkbenchSortHeader("sharpe", tr("Sharpe", "夏普比率"))}</div>
            <div>{renderWorkbenchSortHeader("maxDd", tr("MaxDD", "最大回撤"))}</div>
            <div>{renderWorkbenchSortHeader("turn", tr("Turn", "换手率"))}</div>
            <div>NAV</div>
            <div>{tr("Paper Status", "模拟盘状态")}</div>
            <div>{renderWorkbenchSortHeader("updated", tr("Created Date", "创建时间"))}</div>
          </div>
          {sorted.length === 0 ? (
            <div className="oq-strategy-table-empty" role="status">
              <p className="oq-strategy-table-empty-title">{tr("No matching strategies", "未找到匹配的策略")}</p>
              <p className="oq-strategy-table-empty-copy">{tr("Adjust the keyword or filter.", "请调整关键词或筛选条件。")}</p>
            </div>
          ) : workbenchRows.map((row, index) => {
            const meta = getWorkbenchMetaForRow(row);
            const localizedTitle = translateWorkbenchTitle(meta.title, tr);
            const isSelected = selectedStrategyIds.has(row.id);
            const isPending = row.backtestStatus === "pending";
            const isCompareDisabled = isPending || (!isSelected && selectedStrategyIds.size >= MAX_COMPARE_STRATEGY_COUNT);
            return (
              <div key={row.id} className={`oq-strategy-table-row oq-strategy-table-grid ${isSelected ? "is-selected" : ""} ${isPending ? "is-pending" : ""} ${index === workbenchRows.length - 1 ? "is-page-last" : ""}`}>
                <button type="button" className={`oq-strategy-check ${isSelected ? "is-checked" : ""}`} disabled={isCompareDisabled} onClick={() => toggleSelectedStrategy(row.id)} aria-label={tr("Toggle compare", "切换比较")}>
                  {isSelected ? <Check className="h-3 w-3" /> : null}
                </button>
                {!isPending ? (
                  <Link
                    href={`/strategies/${row.id}`}
                    className="oq-strategy-row-link"
                    aria-label={formatViewStrategyLabel(localizedTitle, tr)}
                  />
                ) : null}
                <div className="oq-strategy-name-cell">
                  <div>{localizedTitle}</div>
                </div>
                <div className="oq-strategy-mono">{meta.sharpe}</div>
                <div
                  className="oq-strategy-mono"
                  style={{ color: strategyMetricColor("maxDrawdown", meta.maxDd, chartColors) }}
                >
                  {meta.maxDd}
                </div>
                <div className="oq-strategy-mono">{meta.turn}</div>
                {isPending ? (
                  <span className="oq-strategy-sparkline is-pending" aria-hidden="true" />
                ) : (
                  <WorkbenchSparkline values={portfolioGrossNavValues} color="#2a6fdb" />
                )}
                <span className={`oq-strategy-status is-${meta.status}`}>
                  {meta.status !== "not-started" ? <span /> : null}
                  {meta.status === "not-started" ? tr("Not Started", "未启动") : meta.status === "stopped" ? tr("Stopped", "已停止") : tr("Running", "运行中")}
                </span>
                <span className="oq-strategy-created-at">{formatStrategyCreatedDate(row.updatedAt)}</span>
              </div>
            );
          })}
          {sorted.length > 0 ? <div className="oq-strategy-table-pagination">
            <div className="oq-strategy-page-summary">
              <span>{tr("Rows", "行")}</span>
              <strong>
                {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}
              </strong>
              <span>/ {sorted.length}</span>
            </div>
            <div className="oq-strategy-page-controls" aria-label={tr("Strategy list pagination", "策略列表分页")}>
              <button type="button" aria-label={tr("First page", "第一页")} disabled={page <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={tr("Previous page", "上一页")} disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {getPageRange().map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === page ? "is-active" : ""}
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button type="button" aria-label={tr("Next page", "下一页")} disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={tr("Last page", "最后一页")} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div> : null}
        </section>

        {hasCompareRows ? (
        <section className={`oq-strategy-compare-card ${hasPairComparison ? "" : "is-single"}`}>
          <div className="oq-strategy-compare-header">
            <GitCompareArrows className="h-4 w-4" />
            <div>
              <h2>{tr("Compare strategy", "比较策略")}</h2>
              <p>{formatCompareSummary(selectedCompareRows.length, tr)}</p>
            </div>
          </div>
          <div className={`oq-strategy-compare-grid ${hasPairComparison ? "" : "is-single"}`}>
            <div className="oq-strategy-compare-label" />
            {selectedCompareRows.map((row, index) => {
              const meta = getWorkbenchMetaForRow(row);
              const localizedTitle = translateWorkbenchTitle(meta.title, tr);
              const localizedCategory = translateWorkbenchCategory(meta.category, tr);
              return (
                <div key={row.id} className="oq-strategy-compare-title">
                  <button type="button" onClick={() => toggleSelectedStrategy(row.id)} aria-label={tr("Remove from compare", "从比较中移除")}>×</button>
                  <span className={index === 0 ? "is-orange" : "is-blue"} />
                  <strong>{localizedTitle}</strong>
                  <small>{localizedCategory}</small>
                </div>
              );
            })}
            <div className="oq-strategy-compare-section">{tr("Performance", "表现")}</div>
            <div className="oq-strategy-compare-label">{tr("90-day", "近 90 日")}</div>
            {selectedCompareRows.map((row, index) => <div key={`${row.id}-curve`} className="oq-strategy-compare-cell"><WorkbenchSparkline color={index === 0 ? "#ff7a1a" : "#2a6fdb"} values={strategyCardCurveValues.map((value, i) => value + index * 220 + i * 4)} /></div>)}
            <div className="oq-strategy-compare-label">{tr("CS Sharpe", "截面夏普比率")}</div>
            {selectedCompareRows.map((row, index) => {
              const meta = getWorkbenchMetaForRow(row);
              return <div key={`${row.id}-sharpe`} className={`oq-strategy-compare-cell ${hasPairComparison && index === 0 ? "is-best" : ""}`}><strong>{meta.sharpe}</strong>{hasPairComparison && index === 0 ? <small>{tr("Best", "最佳")}</small> : null}</div>;
            })}
            <div className="oq-strategy-compare-section">{tr("Risk & details", "风险与详情")}</div>
            <div className="oq-strategy-compare-label">{tr("Max drawdown", "最大回撤")}</div>
            {selectedCompareRows.map((row, index) => {
              const meta = getWorkbenchMetaForRow(row);
              const isBest = hasPairComparison && index === 0;

              return (
                <div
                  key={`${row.id}-dd`}
                  className={`oq-strategy-compare-cell ${isBest ? "is-best" : ""}`}
                >
                  <strong style={{ color: strategyMetricColor("maxDrawdown", meta.maxDd, chartColors) }}>
                    {meta.maxDd}
                  </strong>
                  {isBest ? <small>{tr("Lowest", "最低")}</small> : null}
                </div>
              );
            })}
            <div className="oq-strategy-compare-label">{tr("Turnover", "换手率")}</div>
            {selectedCompareRows.map((row, index) => {
              const meta = getWorkbenchMetaForRow(row);
              return <div key={`${row.id}-turn`} className={`oq-strategy-compare-cell ${hasPairComparison && index === 0 ? "is-best" : ""}`}><strong>{meta.turn}</strong>{hasPairComparison && index === 0 ? <small>{tr("Lowest", "最低")}</small> : null}</div>;
            })}
          </div>
        </section>
        ) : null}

        <Dialog open={showCreateStrategy} onOpenChange={setShowCreateStrategy}>
          <DialogContent className="oq-strategy-create-dialog gap-0 rounded-2xl border-0 p-0 shadow-2xl">
            <div className="oq-strategy-create-dialog-head">
              <DialogTitle>{tr("Create strategy", "创建策略")}</DialogTitle>
              <p>{tr("Build a strategy from selected factors, weights and direction rules.", "选择因子、权重和方向规则，生成新的策略组合。")}</p>
            </div>
            <CreateStrategyComposer
              tr={tr}
              plainExplainEnabled={shouldShowPlainExplanations}
              onClose={() => setShowCreateStrategy(false)}
              onSubmit={(values) => {
                createPendingStrategy(values.strategyName, values.strategyNote);
                toast.success(formatBacktestSubmitted(values.strategyName, tr));
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(pendingDeleteStrategy)} onOpenChange={(open) => !open && setPendingDeleteStrategy(null)}>
          <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 text-foreground">
            <div className="border-b border-border/60 px-5 py-4">
              <DialogTitle className="text-base font-semibold">{tr("Delete Strategy", "删除策略")}</DialogTitle>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm leading-6 text-foreground">
                {formatDeleteConfirmation(pendingDeleteStrategy, tr)}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
              <Button variant="outline" className="h-8 rounded-full border-border bg-card px-3 text-xs" onClick={() => setPendingDeleteStrategy(null)}>{tr("Cancel", "取消")}</Button>
              <Button className="h-8 rounded-full bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90" onClick={confirmDeleteStrategy}>{tr("Delete", "删除")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <div className="relative w-full max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
                placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
              className="h-8 w-full rounded-xl border border-border bg-accent/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setShowFilterMenu((prev) => !prev);
                setShowSortMenu(false);
                setShowColumnsMenu(false);
              }}
            >
              <span>{strategyFilter === "favorites" ? tr("My Favorites", "我的收藏") : tr("All", "全部")}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showFilterMenu ? (
              <div className="absolute right-0 z-40 mt-2 w-36 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-dropdown)]">
                {([
                  { key: "all", label: tr("All", "全部") },
                  { key: "favorites", label: tr("My Favorites", "我的收藏") },
                ] as Array<{ key: StrategyFilter; label: string }>).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      strategyFilter === item.key
                        ? "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    onClick={() => {
                      setStrategyFilter(item.key);
                      setShowFilterMenu(false);
                      setPage(1);
                    }}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
                        strategyFilter === item.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card"
                      }`}
                    >
                      {strategyFilter === item.key ? <Check className="h-2.5 w-2.5" /> : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSortMenu((prev) => !prev)}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {tr("Sort", "排序")}
            </button>

            {showSortMenu ? (
              <div className="absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-dropdown)]">
                {(["updated", "name", "roi", "winRate", "sharpe"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      sortKey === key ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    onClick={() => {
                      if (sortKey === key) {
                        setSortDesc((prev) => !prev);
                      } else {
                        setSortKey(key);
                        setSortDesc(true);
                      }
                    }}
                  >
                    <span>
                      {key === "updated"
                        ? tr("Updated Time", "更新时间")
                        : key === "name"
                          ? tr("Name", "名称")
                          : key === "roi"
                            ? "ROI"
                            : key === "winRate"
                              ? tr("Win Rate", "胜率")
                              : tr("Sharpe", "夏普比率")}
                    </span>
                    {sortKey === key ? <span>{sortDesc ? tr("Descending", "降序") : tr("Ascending", "升序")}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowColumnsMenu((prev) => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
                {tr("Display Items", "显示项")}
            </button>

            {showColumnsMenu ? (
              <div className="absolute right-0 z-40 mt-2 w-44 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-[var(--shadow-dropdown)]">
                {([
                  { key: "roi", label: "ROI" },
                  { key: "winRate", label: tr("Win Rate", "胜率") },
                  { key: "sharpe", label: tr("Sharpe", "夏普比率") },
                  { key: "maxDrawdown", label: tr("Max Drawdown", "最大回撤") },
                  { key: "createdAt", label: tr("Created Date", "创建日期") },
                  { key: "id", label: "ID" },
                ] as Array<{ key: DisplayItemKey; label: string }>).map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleItems[item.key]}
                      onChange={() =>
                        setVisibleItems((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </label>
                ))}
                <div className="mt-1 border-t border-border/60 pt-1">
                  <button
                    type="button"
                    className="flex w-full items-center rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => setVisibleItems({ ...defaultVisibleItems })}
                  >
                    {tr("Restore defaults", "恢复默认")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="inline-flex h-[34px] items-center overflow-hidden rounded-xl border border-border bg-card p-px">
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center ${
                viewMode === "list" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("list")}
              aria-label={tr("List view", "列表视图")}
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center ${
                viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("grid")}
              aria-label={tr("Grid view", "网格视图")}
            >
              <Grid2x2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {sorted.slice(0, 8).map((row) => (
            <StrategyCard
              key={row.id}
              row={row}
              starred={starred.has(row.id)}
              onToggleStar={() =>
                setStarred((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.id)) next.delete(row.id);
                  else next.add(row.id);
                  return next;
                })
              }
              onRequestDelete={() => requestDeleteStrategy(row)}
              visibleItems={visibleItems}
              plainExplainEnabled={shouldShowPlainExplanations}
              tr={tr}
              chartColors={chartColors}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card overflow-hidden border border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-border/60">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Name", "名称")}</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Status", "状态")}</th>
                  <th className="w-[126px] px-4 py-3 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Asset Curve", "资产曲线")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ROI</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Win Rate", "胜率")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Sharpe", "夏普比率")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Max Drawdown", "最大回撤")}</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Created", "创建日期")}</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-t border-border/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setStarred((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            })
                          }
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-[#ffb900]"
                          aria-label={tr("Toggle favorite", "切换收藏")}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${starred.has(row.id) ? "fill-[#ffb900] text-[#ffb900]" : ""}`}
                          />
                        </button>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                          <p className="text-xs text-muted-foreground">ID:{row.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${row.statusClass}`}>
                        {getStatusLabel(row.statusLabel, tr)}
                      </span>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex justify-center">
                        <StrategyTableCurveSparkline
                          values={strategyCardCurveValues}
                          upColor={chartColors.upHex}
                          downColor={chartColors.downHex}
                          label={tr("Asset Curve", "资产曲线")}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm" style={{ color: strategyMetricColor("roi", row.roi, chartColors) }}>
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("roi", row, tr)}>
                        <span>{row.roi}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-foreground">
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("winRate", row, tr)}>
                        <span>{row.winRate}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-foreground">
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("sharpe", row, tr)}>
                        <span>{row.sharpe}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-sm" style={{ color: strategyMetricColor("maxDrawdown", row.maxDrawdown, chartColors) }}>
                      <MaybeExplainTooltip enabled={shouldShowPlainExplanations} explanation={getMetricExplanation("maxDrawdown", row, tr)}>
                        <span>{row.maxDrawdown}</span>
                      </MaybeExplainTooltip>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{row.updatedAt}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-accent/50 hover:text-foreground"
                              aria-label={tr("More actions", "更多操作")}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-32 rounded-xl p-1" align="end">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                              onClick={() => requestDeleteStrategy(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {tr("Delete", "删除")}
                            </button>
                          </PopoverContent>
                        </Popover>
                        <Link href={`/strategies/${row.id}`}>
                          <Button className="h-8 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
                            {tr("View", "查看")}
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      {tr("No strategies match your filters.", "没有符合当前筛选条件的策略。")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 bg-card/40 px-6 py-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {formatPageSummary(
                  sorted.length === 0 ? 0 : (page - 1) * pageSize + 1,
                  Math.min(page * pageSize, sorted.length),
                  sorted.length,
                  tr
                )}
              </span>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                  <span>{tr("Rows", "行数")}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-6 w-16 rounded-lg border-border bg-transparent text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                aria-label={tr("First page", "第一页")}
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                aria-label={tr("Previous page", "上一页")}
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {getPageRange().map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 rounded-lg p-0 text-xs font-mono tabular-nums ${
                    p === page ? "bg-primary text-primary-foreground" : "border-border"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                aria-label={tr("Next page", "下一页")}
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                aria-label={tr("Last page", "最后一页")}
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={Boolean(pendingDeleteStrategy)} onOpenChange={(open) => !open && setPendingDeleteStrategy(null)}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0 text-foreground">
          <div className="border-b border-border/60 px-5 py-4">
            <DialogTitle className="text-base font-semibold">{tr("Delete Strategy", "删除策略")}</DialogTitle>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm leading-6 text-foreground">
              {formatDeleteConfirmation(pendingDeleteStrategy, tr)}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-4">
            <Button
              variant="outline"
              className="h-8 rounded-full border-border bg-card px-3 text-xs"
              onClick={() => setPendingDeleteStrategy(null)}
            >
              {tr("Cancel", "取消")}
            </Button>
            <Button
              className="h-8 rounded-full bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteStrategy}
            >
              {tr("Delete", "删除")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
