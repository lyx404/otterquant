import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Folder,
  GripVertical,
  Star,
  GitCompareArrows,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type UiCopy, translateUi, useAppLanguage } from "@/contexts/AppLanguageContext";
import { syncFactorCreationTaskCompletion } from "@/lib/factorOnboarding";
import "./MyAlphas.css";

type Factor = {
  id: string;
  name: string;
  grade: "S" | "A" | "B";
  sharpe: string;
  returnRate: string;
  drawdown: string;
  created: string;
  favorite?: boolean;
  points: string;
};

const FACTORS: Factor[] = [
  { id: "AF-021", name: "Earnings Revision Momentum", grade: "S", sharpe: "1.42", returnRate: "28.4%", drawdown: "−11.2%", created: "2026-08-21", favorite: true, points: "0,23 10,20 20,25 30,19 40,21 50,15 60,17 70,11 80,13 90,7 100,4" },
  { id: "AF-018", name: "Liquidity-Adjusted Reversal", grade: "A", sharpe: "1.16", returnRate: "21.3%", drawdown: "−14.7%", created: "2026-08-19", points: "0,25 10,28 20,23 30,25 40,19 50,21 60,15 70,18 80,11 90,8 100,3" },
  { id: "AF-014", name: "Order Flow Imbalance", grade: "B", sharpe: "0.87", returnRate: "15.4%", drawdown: "−18.6%", created: "2026-08-16", points: "0,24 10,22 20,29 30,21 40,25 50,17 60,21 70,13 80,17 90,9 100,12" },
  { id: "AF-011", name: "Volatility Compression Breakout", grade: "A", sharpe: "1.04", returnRate: "19.8%", drawdown: "−13.2%", created: "2026-08-13", points: "0,25 10,22 20,24 30,18 40,20 50,13 60,15 70,9 80,11 90,4 100,1" },
];

const folders: Array<{ key: "candidate" | "favorite" | "official" | "archive"; label: string; icon: typeof Folder; count?: number }> = [
  { key: "candidate", label: "候选", icon: Folder, count: 4 },
  { key: "favorite", label: "收藏", icon: Star },
  { key: "official", label: "官方", icon: BadgeCheck },
  { key: "archive", label: "归档", icon: Archive },
] as const;

const FOLDER_PANEL_COLLAPSED_STORAGE_KEY = "otterquant:myalphas:folder-panel-collapsed";

const alphaCopy: Record<string, UiCopy> = {
  "Factor overview": { ja: "ファクター概要", ko: "팩터 개요", es: "Resumen de factores", fr: "Vue d'ensemble des facteurs" },
  "Mined Factors": { ja: "発掘済みファクター", ko: "발굴된 팩터", es: "Factores descubiertos", fr: "Facteurs découverts" },
  "Best Return": { ja: "最高リターン", ko: "최고 수익률", es: "Mejor rentabilidad", fr: "Meilleur rendement" },
  "Best Sharpe": { ja: "最高シャープレシオ", ko: "최고 샤프 비율", es: "Mejor ratio de Sharpe", fr: "Meilleur ratio de Sharpe" },
  "Average Sharpe": { ja: "平均シャープレシオ", ko: "평균 샤프 비율", es: "Ratio de Sharpe medio", fr: "Ratio de Sharpe moyen" },
  Folders: { ja: "フォルダー", ko: "폴더", es: "Carpetas", fr: "Dossiers" },
  "Drag factors into folders to organize them, or drag them to Favorites to star them.": { ja: "ファクターをフォルダーにドラッグして整理するか、お気に入りにドラッグしてスターを付けます。", ko: "팩터를 폴더로 드래그해 정리하거나 즐겨찾기로 드래그해 별표를 추가하세요.", es: "Arrastra factores a carpetas para organizarlos o a Favoritos para destacarlos.", fr: "Faites glisser les facteurs dans des dossiers pour les classer, ou dans les favoris pour les marquer." },
  "Create folder": { ja: "フォルダーを作成", ko: "폴더 만들기", es: "Crear carpeta", fr: "Créer un dossier" },
  "Expand folder panel": { ja: "フォルダーパネルを展開", ko: "폴더 패널 펼치기", es: "Expandir panel de carpetas", fr: "Développer le panneau des dossiers" },
  "Collapse folder panel": { ja: "フォルダーパネルを折りたたむ", ko: "폴더 패널 접기", es: "Contraer panel de carpetas", fr: "Réduire le panneau des dossiers" },
  "Factor folders": { ja: "ファクターフォルダー", ko: "팩터 폴더", es: "Carpetas de factores", fr: "Dossiers de facteurs" },
  Candidates: { ja: "候補", ko: "후보", es: "Candidatos", fr: "Candidats" },
  Favorites: { ja: "お気に入り", ko: "즐겨찾기", es: "Favoritos", fr: "Favoris" },
  Official: { ja: "公式", ko: "공식", es: "Oficial", fr: "Officiel" },
  Archive: { ja: "アーカイブ", ko: "보관함", es: "Archivo", fr: "Archive" },
  "Select to compare": { ja: "選択して比較", ko: "선택하여 비교", es: "Seleccionar para comparar", fr: "Sélectionner pour comparer" },
  Select: { ja: "選択", ko: "선택", es: "Seleccionar", fr: "Sélectionner" },
  Factor: { ja: "ファクター", ko: "팩터", es: "Factor", fr: "Facteur" },
  Grade: { ja: "評価", ko: "등급", es: "Calificación", fr: "Note" },
  Sharpe: { ja: "シャープレシオ", ko: "샤프 비율", es: "Sharpe", fr: "Sharpe" },
  Return: { ja: "リターン", ko: "수익률", es: "Rentabilidad", fr: "Rendement" },
  "Max Drawdown": { ja: "最大ドローダウン", ko: "최대 낙폭", es: "Máxima caída", fr: "Drawdown maximal" },
  "Net Value": { ja: "純資産価値", ko: "순자산 가치", es: "Valor neto", fr: "Valeur nette" },
  "Created At": { ja: "作成日時", ko: "생성일", es: "Fecha de creación", fr: "Créé le" },
  "More actions": { ja: "その他の操作", ko: "추가 작업", es: "Más acciones", fr: "Autres actions" },
  Rows: { ja: "行", ko: "행", es: "Filas", fr: "Lignes" },
  "Factor list pagination": { ja: "ファクター一覧のページネーション", ko: "팩터 목록 페이지 매김", es: "Paginación de la lista de factores", fr: "Pagination de la liste des facteurs" },
  "First page": { ja: "最初のページ", ko: "첫 페이지", es: "Primera página", fr: "Première page" },
  "Previous page": { ja: "前のページ", ko: "이전 페이지", es: "Página anterior", fr: "Page précédente" },
  "Next page": { ja: "次のページ", ko: "다음 페이지", es: "Página siguiente", fr: "Page suivante" },
  "Last page": { ja: "最後のページ", ko: "마지막 페이지", es: "Última página", fr: "Dernière page" },
  "Return trend": { ja: "リターン推移", ko: "수익률 추이", es: "Tendencia de rentabilidad", fr: "Tendance du rendement" },
};

function readFolderPanelCollapsed() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(FOLDER_PANEL_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function Sparkline({ points, label }: { points: string; label: string }) {
  return (
    <svg className="oq-alpha-sparkline" viewBox="0 0 100 32" role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const dateLocaleByLanguage = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
} as const;

export default function MyAlphas() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string, copy: UiCopy = alphaCopy[en] ?? {}) =>
    translateUi(uiLang, en, zh, copy);
  const formatCreatedDate = (date: string) => new Intl.DateTimeFormat(dateLocaleByLanguage[uiLang], {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
  const localizedFolders = useMemo(() => folders.map((item) => ({
    ...item,
    label: tr(
      item.key === "candidate" ? "Candidates" : item.key === "favorite" ? "Favorites" : item.key === "official" ? "Official" : "Archive",
      item.label
    ),
  })), [uiLang]);
  const [folder, setFolder] = useState<(typeof folders)[number]["key"]>("candidate");
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState<"grade" | "sharpe" | "return" | "drawdown">("grade");
  const [sortDesc, setSortDesc] = useState(true);
  const [isFolderPanelCollapsed, setIsFolderPanelCollapsed] = useState(readFolderPanelCollapsed);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollState, setTableScrollState] = useState({ overflowing: false, atStart: true, atEnd: true, scrolling: false });
  const selectedFolder = localizedFolders.find((item) => item.key === folder) ?? localizedFolders[0];
  const SelectedFolderIcon = selectedFolder.icon;

  useEffect(() => {
    document.documentElement.classList.add("oq-alphas-active");
    return () => document.documentElement.classList.remove("oq-alphas-active");
  }, []);

  useEffect(() => {
    syncFactorCreationTaskCompletion(FACTORS.length);
  }, []);

  const visibleFactors = useMemo(() => {
    let rows = FACTORS.filter((factor) => folder !== "favorite" || factor.favorite);
    return [...rows].sort((a, b) => {
      let comparison = 0;
      if (sort === "sharpe") comparison = Number(b.sharpe) - Number(a.sharpe);
      else if (sort === "return") comparison = Number.parseFloat(b.returnRate) - Number.parseFloat(a.returnRate);
      else if (sort === "drawdown") comparison = Number.parseFloat(a.drawdown) - Number.parseFloat(b.drawdown);
      else {
        const gradeRank: Record<Factor["grade"], number> = { S: 0, A: 1, B: 2 };
        comparison = gradeRank[a.grade] - gradeRank[b.grade];
      }
      return sortDesc ? comparison : -comparison;
    });
  }, [folder, sort, sortDesc]);

  const toggleSort = (nextSort: typeof sort) => {
    if (sort !== nextSort) {
      setSort(nextSort);
      setSortDesc(true);
      return;
    }
    setSortDesc((current) => !current);
  };

  const toggleSelected = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FOLDER_PANEL_COLLAPSED_STORAGE_KEY, String(isFolderPanelCollapsed));
    } catch {
      // Keep the current-session state when storage is unavailable.
    }
  }, [isFolderPanelCollapsed]);

  useEffect(() => {
    const node = tableScrollRef.current;
    if (!node) return;
    let scrollingTimer: ReturnType<typeof setTimeout> | undefined;
    const syncScrollState = () => {
      const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
      setTableScrollState((current) => ({
        overflowing: maxScroll > 1,
        atStart: node.scrollLeft <= 1,
        atEnd: node.scrollLeft >= maxScroll - 1,
        scrolling: true,
      }));
      if (scrollingTimer) clearTimeout(scrollingTimer);
      scrollingTimer = setTimeout(() => setTableScrollState((current) => ({ ...current, scrolling: false })), 700);
    };
    syncScrollState();
    node.addEventListener("scroll", syncScrollState, { passive: true });
    const observer = new ResizeObserver(syncScrollState);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", syncScrollState);
      observer.disconnect();
      if (scrollingTimer) clearTimeout(scrollingTimer);
    };
  }, [visibleFactors.length, isFolderPanelCollapsed]);

  return (
    <div className="oq-my-alphas">
      <section className="oq-alpha-metrics" aria-label={tr("Factor overview", "因子概览")}>
        <div><strong>4</strong><span>{tr("Mined Factors", "已挖掘因子")}</span></div>
        <div><strong>28.4%</strong><span>{tr("Best Return", "最佳收益")}</span></div>
        <div className="is-accent"><strong>1.42</strong><span>{tr("Best Sharpe", "最佳夏普")}</span></div>
        <div><strong>1.12</strong><span>{tr("Average Sharpe", "平均夏普")}</span></div>
      </section>

      <section className={`oq-alpha-browser ${isFolderPanelCollapsed ? "is-folder-panel-collapsed" : ""}`}>
        <aside className="oq-alpha-folders">
          <div className="oq-alpha-folders-head">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="oq-alpha-folders-title"><span>{tr("Folders", "文件夹")}</span><Info className="oq-alpha-folders-info-icon" aria-hidden="true" /></span>
              </TooltipTrigger>
              <TooltipContent side="top">{tr("Drag factors into folders to organize them, or drag them to Favorites to star them.", "将因子拖到文件夹即可归类，拖到收藏即可标星。")}</TooltipContent>
            </Tooltip>
            <div className="oq-alpha-folders-actions">
              <button type="button" className="oq-alpha-folder-icon-button" aria-label={tr("Create folder", "新建文件夹")} title={tr("Create folder", "新建文件夹")}><Plus /></button>
              <button
                type="button"
                className="oq-alpha-folder-icon-button"
                onClick={() => setIsFolderPanelCollapsed((collapsed) => !collapsed)}
                aria-label={isFolderPanelCollapsed ? tr("Expand folder panel", "展开文件夹栏") : tr("Collapse folder panel", "折叠文件夹栏")}
                title={isFolderPanelCollapsed ? tr("Expand folder panel", "展开文件夹栏") : tr("Collapse folder panel", "折叠文件夹栏")}
              >
                {isFolderPanelCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
              </button>
            </div>
          </div>
          <nav aria-label={tr("Factor folders", "因子文件夹")}>
            {localizedFolders.map(({ key, label, icon: Icon, count }) => <button key={key} type="button" className={folder === key ? "is-active" : ""} onClick={() => setFolder(key)}><Icon /> <span>{label}</span>{count ? <b>{count}</b> : null}</button>)}
          </nav>
        </aside>
        <div className="oq-alpha-table-wrap">
          <div className="oq-alpha-table-toolbar"><div><SelectedFolderIcon /> <strong>{selectedFolder.label}</strong><b>{visibleFactors.length}</b></div><div className="oq-alpha-compare"><button type="button" disabled={selected.length < 2}><GitCompareArrows className="h-3.5 w-3.5" />{tr("Select to compare", "勾选进行对比")}</button></div></div>
          <div ref={tableScrollRef} className={`oq-alpha-table-scroll ${tableScrollState.overflowing ? "is-overflowing" : ""} ${tableScrollState.atStart ? "is-at-start" : ""} ${tableScrollState.atEnd ? "is-at-end" : ""} ${tableScrollState.scrolling ? "is-scrolling" : ""}`}>
            <table className="oq-alpha-table">
              <thead><tr><th className="oq-alpha-check" aria-label={tr("Select", "选择")} /><th>{tr("Factor", "因子")}</th><th><button type="button" className={`oq-alpha-sort-heading ${sort === "grade" ? "is-active" : ""}`} onClick={() => toggleSort("grade")}>{tr("Grade", "等级")} {sort === "grade" && sortDesc ? <ChevronDown /> : <ChevronUp />}</button></th><th><button type="button" className={`oq-alpha-sort-heading ${sort === "sharpe" ? "is-active" : ""}`} onClick={() => toggleSort("sharpe")}>{tr("Sharpe", "夏普")} {sort === "sharpe" && sortDesc ? <ChevronDown /> : <ChevronUp />}</button></th><th><button type="button" className={`oq-alpha-sort-heading ${sort === "return" ? "is-active" : ""}`} onClick={() => toggleSort("return")}>{tr("Return", "收益")} {sort === "return" && sortDesc ? <ChevronDown /> : <ChevronUp />}</button></th><th><button type="button" className={`oq-alpha-sort-heading ${sort === "drawdown" ? "is-active" : ""}`} onClick={() => toggleSort("drawdown")}>{tr("Max Drawdown", "最大回撤")} {sort === "drawdown" && sortDesc ? <ChevronDown /> : <ChevronUp />}</button></th><th>{tr("Net Value", "净值")}</th><th>{tr("Created At", "创建时间")}</th><th /></tr></thead>
              <tbody>{visibleFactors.map((factor) => <tr key={factor.id} className={selected.includes(factor.id) ? "is-selected" : ""}><td className="oq-alpha-check"><button type="button" className={`oq-alpha-check-control ${selected.includes(factor.id) ? "is-checked" : ""}`} onClick={() => toggleSelected(factor.id)} aria-label={`${tr("Select", "选择")} ${factor.name}`}>{selected.includes(factor.id) ? <Check /> : null}</button></td><td><div className="oq-alpha-name"><GripVertical /><Link href={`/alphas/${factor.id}`}>{factor.name}</Link></div></td><td><span className={`oq-alpha-grade grade-${factor.grade.toLowerCase()}`}>{factor.grade}</span></td><td className="oq-alpha-number">{factor.sharpe}</td><td className="oq-alpha-number">{factor.returnRate}</td><td className="oq-alpha-number is-risk">{factor.drawdown}</td><td><Sparkline points={factor.points} label={tr("Return trend", "收益趋势")} /></td><td className="oq-alpha-date">{formatCreatedDate(factor.created)}</td><td><button type="button" className="oq-alpha-row-menu" aria-label={`${factor.name} ${tr("More actions", "更多操作")}`}><Ellipsis /></button></td></tr>)}</tbody>
            </table>
          </div>
          <div className="oq-alpha-table-pagination">
            <div className="oq-alpha-page-summary"><span>{tr("Rows", "行")}</span><strong>{visibleFactors.length ? 1 : 0}–{visibleFactors.length}</strong><span>/ {visibleFactors.length}</span></div>
            <div className="oq-alpha-page-controls" aria-label={tr("Factor list pagination", "因子列表分页")}><button type="button" aria-label={tr("First page", "第一页")} disabled><ChevronsLeft /></button><button type="button" aria-label={tr("Previous page", "上一页")} disabled><ChevronLeft /></button><button type="button" className="is-active" aria-current="page">1</button><button type="button" aria-label={tr("Next page", "下一页")} disabled><ChevronRight /></button><button type="button" aria-label={tr("Last page", "最后一页")} disabled><ChevronsRight /></button></div>
          </div>
        </div>
      </section>
    </div>
  );
}
