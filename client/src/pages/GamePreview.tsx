import { useMemo, useState } from "react";
import {
  factors,
  generatePnLData,
  getAlphaGrade,
  type AlphaGrade,
  type Factor,
} from "@/lib/mockData";
import "./GamePreview.css";

const stats = [
  {
    title: "AI员工",
    detail: "已雇：1位",
    type: "ai",
  },
  {
    title: "余额",
    detail: "$125,430",
    type: "cash",
  },
  {
    title: "排行榜",
    detail: "当前：150名",
    type: "rank",
  },
];

const navItems = [
  { label: "我的因子", type: "factor" },
  { label: "因子市场", type: "market" },
  { label: "我的策略", type: "strategy" },
  { label: "模拟交易", type: "trade" },
];

type AlphaFilter = "all" | "starred" | "revealed" | "hidden";
type AlphaView = "table" | "card";
type AlphaSortDir = "asc" | "desc" | null;
type FactorGrade = AlphaGrade | "F";
type AlphaColumnKey = "name" | "grade" | "bonus" | "sharpe" | "osSharpe" | "pnl" | "fitness";

type AlphaRow = Factor & {
  rowId: string;
  grade: FactorGrade;
  displayedGrade: FactorGrade | "hidden";
  bonus: number;
};

interface AlphaColumnDef {
  key: AlphaColumnKey;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  width: string;
  align?: "left" | "right" | "center";
}

const alphaColumns: AlphaColumnDef[] = [
  { key: "name", label: "名称", defaultVisible: true, sortable: true, width: "290px" },
  { key: "grade", label: "等级", defaultVisible: true, sortable: true, width: "106px", align: "center" },
  { key: "bonus", label: "奖金(USD)", defaultVisible: true, sortable: true, width: "130px", align: "right" },
  { key: "sharpe", label: "IS 夏普", defaultVisible: true, sortable: true, width: "120px", align: "right" },
  { key: "osSharpe", label: "OS 夏普", defaultVisible: true, sortable: true, width: "120px", align: "right" },
  { key: "pnl", label: "PNL", defaultVisible: true, sortable: false, width: "160px", align: "center" },
  { key: "fitness", label: "适应度", defaultVisible: true, sortable: true, width: "120px", align: "right" },
];

const defaultAlphaColumns = alphaColumns.filter((column) => column.defaultVisible).map((column) => column.key);
const REVEALED_GRADE_STORAGE_PREFIX = "alphaforge_grade_reset_v5_";
const hiddenGradeIds = new Set(["AF-018", "AF-006", "AF-015", "AF-017", "AF-002", "AF-003"]);
const gradeBonus: Record<FactorGrade, number> = {
  S: 0.9,
  A: 0.6,
  B: 0.3,
  C: 0.2,
  D: 0.1,
  F: 0,
};
const gradeOrder: Record<FactorGrade, number> = { F: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

function gradeClass(grade: FactorGrade) {
  return `grade-${grade.toLowerCase()}`;
}

function getFactorGrade(factor: Factor): FactorGrade {
  if (factor.status === "archived") return "F";
  return getAlphaGrade(factor.osSharpe);
}

function readRevealedGrade(factorId: string): FactorGrade | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(`${REVEALED_GRADE_STORAGE_PREFIX}${factorId}`);
    return value === "S" || value === "A" || value === "B" || value === "C" || value === "D" || value === "F" ? value : null;
  } catch {
    return null;
  }
}

function formatBonus(value: number) {
  return value === 0 ? "0" : value.toFixed(1);
}

function buildSparklinePath(values: number[], width: number, height: number, padding = 4) {
  if (values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MiniPnl({ values }: { values: number[] }) {
  const width = 104;
  const height = 34;
  const path = buildSparklinePath(values, width, height);
  const areaPath = path ? `${path} L ${width - 4} ${height - 4} L 4 ${height - 4} Z` : "";

  return (
    <svg className="alpha-pixel-chart" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <path d={areaPath} className="alpha-pixel-chart-area" />
      <path d={path} className="alpha-pixel-chart-line" />
    </svg>
  );
}

function MyFactorsModal({ onClose }: { onClose: () => void }) {
  const [filterName, setFilterName] = useState("");
  const [cardFilter, setCardFilter] = useState<AlphaFilter>("all");
  const [viewMode, setViewMode] = useState<AlphaView>("table");
  const [sortKey, setSortKey] = useState<AlphaColumnKey | "">("bonus");
  const [sortDir, setSortDir] = useState<AlphaSortDir>("asc");
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<Set<AlphaColumnKey>>(() => new Set(defaultAlphaColumns));
  const [page, setPage] = useState(1);
  const [starred, setStarred] = useState<Set<string>>(new Set(["AF-004", "AF-009"]));
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [gradeRevealTick, setGradeRevealTick] = useState(0);

  const tablePnlValues = useMemo(() => {
    const pnlData = generatePnLData();
    const combined = [...pnlData.train, ...pnlData.test].map((item) => item.value);
    const sampleEvery = Math.max(1, Math.floor(combined.length / 28));
    return combined.filter((_, index) => index % sampleEvery === 0).slice(-28);
  }, []);

  const alphaRows: AlphaRow[] = useMemo(() => {
    return factors.map((factor) => {
      const grade = getFactorGrade(factor);
      const displayedGrade = hiddenGradeIds.has(factor.id) && !revealedIds.has(factor.id) ? "hidden" : grade;

      return {
        ...factor,
        rowId: factor.id,
        grade,
        displayedGrade,
        bonus: gradeBonus[grade],
      };
    });
  }, [gradeRevealTick, revealedIds]);

  const filtered = useMemo(() => {
    const normalized = filterName.trim().toLowerCase();
    return alphaRows.filter((row) => {
      if (normalized && !`${row.name} ${row.id}`.toLowerCase().includes(normalized)) return false;
      if (cardFilter === "starred" && !starred.has(row.id)) return false;
      if (cardFilter === "revealed" && row.displayedGrade === "hidden") return false;
      if (cardFilter === "hidden" && row.displayedGrade !== "hidden") return false;
      return true;
    });
  }, [alphaRows, cardFilter, filterName, starred]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;

    return [...filtered].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;

      if (sortKey === "grade") {
        av = gradeOrder[a.grade];
        bv = gradeOrder[b.grade];
      } else {
        av = a[sortKey] ?? 0;
        bv = b[sortKey] ?? 0;
      }

      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortDir, sortKey]);

  const visibleCols = alphaColumns.filter((column) => visibleColumns.has(column.key));
  const sortColumns = alphaColumns.filter((column) => column.sortable);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const hasActiveFilters = Boolean(filterName);
  const gradeStats = useMemo(() => {
    return alphaRows.reduce<Record<FactorGrade, number>>(
      (acc, row) => {
        acc[row.grade] += 1;
        return acc;
      },
      { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 }
    );
  }, [alphaRows]);
  const totalBonus = useMemo(() => alphaRows.reduce((sum, row) => sum + row.bonus, 0), [alphaRows]);

  const unrevealedPassedCount = useMemo(() => {
    void gradeRevealTick;
    return alphaRows.reduce((count, row) => {
      return row.displayedGrade === "hidden" ? count + 1 : count;
    }, 0);
  }, [alphaRows, gradeRevealTick]);

  const resetPage = (next: () => void) => {
    next();
    setPage(1);
  };

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumn = (key: AlphaColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next.size === 0 ? prev : next;
    });
  };

  const handleSort = (key: AlphaColumnKey) => {
    if (sortKey === key) {
      if (sortDir === "desc") setSortDir("asc");
      else if (sortDir === "asc") {
        setSortDir(null);
        setSortKey("");
      } else setSortDir("desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const revealAll = () => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      alphaRows.forEach((row) => {
        if (row.displayedGrade === "hidden") next.add(row.id);
      });
      return next;
    });
    alphaRows.forEach((row) => {
      if (row.displayedGrade !== "hidden") return;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`${REVEALED_GRADE_STORAGE_PREFIX}${row.id}`, row.grade);
      }
    });
    setGradeRevealTick((value) => value + 1);
  };

  const getPageRange = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, index) => index + 1);
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  const renderGrade = (row: AlphaRow) => {
    if (row.displayedGrade === "hidden") {
      return (
        <button
          className="alpha-grade is-hidden"
          type="button"
          onClick={() => {
            setRevealedIds((prev) => new Set(prev).add(row.id));
            if (typeof window !== "undefined") {
              window.localStorage.setItem(`${REVEALED_GRADE_STORAGE_PREFIX}${row.id}`, row.grade);
            }
            setGradeRevealTick((value) => value + 1);
          }}
          aria-label={`揭示 ${row.name} 等级`}
        >
          待揭开
        </button>
      );
    }
    return <span className={`alpha-grade ${gradeClass(row.displayedGrade)}`}>{row.displayedGrade}</span>;
  };

  const renderSortMark = (key: AlphaColumnKey) => {
    if (sortKey !== key || !sortDir) return "↕";
    return sortDir === "desc" ? "↓" : "↑";
  };

  const renderCell = (row: AlphaRow, colKey: AlphaColumnKey) => {
    switch (colKey) {
      case "name":
        return (
          <span className="alpha-name-cell">
            <button
              className={starred.has(row.id) ? "alpha-star is-on" : "alpha-star"}
              type="button"
              onClick={() => toggleStar(row.id)}
              aria-label={`收藏 ${row.name}`}
            >
              ★
            </button>
            <span>
              <strong>{row.name}</strong>
              <small>{row.id} · {row.tag ?? row.market}</small>
            </span>
          </span>
        );
      case "grade":
        return renderGrade(row);
      case "bonus":
        return <span className={`alpha-mono alpha-bonus ${row.bonus > 0 ? "is-on" : ""}`}>{formatBonus(row.bonus)}</span>;
      case "pnl":
        return <MiniPnl values={tablePnlValues} />;
      case "sharpe":
        return <span className="alpha-mono">{row.sharpe.toFixed(2)}</span>;
      case "osSharpe":
        return <span className={`alpha-mono ${row.osSharpe >= 1 ? "is-good" : row.osSharpe >= 0.5 ? "is-warn" : "is-bad"}`}>{row.osSharpe.toFixed(2)}</span>;
      case "fitness":
        return <span className={`alpha-mono ${row.fitness >= 1 ? "is-good" : row.fitness >= 0.5 ? "is-warn" : ""}`}>{row.fitness.toFixed(2)}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="alpha-modal-shell" role="dialog" aria-modal="true" aria-labelledby="alpha-modal-title">
      <div className="alpha-modal-backdrop" onClick={onClose} />
      <section className="alpha-modal">
        <header className="alpha-modal-header">
          <div>
            <span className="alpha-modal-kicker">FACTOR TERMINAL</span>
            <h2 id="alpha-modal-title">我的因子</h2>
          </div>
          <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭我的因子弹窗">
            ×
          </button>
        </header>

        <div className="alpha-modal-stats is-latest" aria-label="因子统计">
          <button type="button" className={cardFilter === "all" ? "is-active alpha-summary-card is-total" : "alpha-summary-card is-total"} onClick={() => resetPage(() => setCardFilter("all"))}>
            <span className="alpha-summary-label">因子总数</span>
            <strong>{alphaRows.length}</strong>
            <em>个因子</em>
          </button>
          <button type="button" className="alpha-summary-card is-bonus">
            <span className="alpha-summary-label">累计奖金</span>
            <strong>{formatBonus(totalBonus)}</strong>
            <em>USD</em>
            <span className="alpha-summary-link">明细</span>
          </button>
          <div className="alpha-summary-card is-distribution" aria-label="因子等级分布">
            <span className="alpha-summary-label">因子等级分布</span>
            <div className="alpha-grade-bar" aria-hidden="true">
              <i className="is-s" style={{ flexGrow: gradeStats.S }} />
              <i className="is-a" style={{ flexGrow: gradeStats.A }} />
              <i className="is-b" style={{ flexGrow: gradeStats.B }} />
              <i className="is-c" style={{ flexGrow: gradeStats.C }} />
              <i className="is-d" style={{ flexGrow: gradeStats.D }} />
              <i className="is-f" style={{ flexGrow: gradeStats.F }} />
            </div>
            <div className="alpha-grade-legend">
              {(["S", "A", "B", "C", "D", "F"] as FactorGrade[]).map((grade) => (
                <span className={`is-${grade.toLowerCase()}`} key={grade}>
                  <b>{grade}:</b> {gradeStats[grade]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="alpha-modal-toolbar">
          <label className="alpha-search">
            <span>搜索</span>
            <input
              value={filterName}
              onChange={(event) => resetPage(() => setFilterName(event.target.value))}
              placeholder="按名称或 ID 搜索..."
            />
          </label>

          <div className="alpha-modal-tools">
            {hasActiveFilters ? <button type="button" onClick={() => resetPage(() => setFilterName(""))}>清除筛选</button> : null}
            {unrevealedPassedCount > 0 ? <button type="button" onClick={revealAll}>揭示全部等级</button> : null}
            <select value={cardFilter} onChange={(event) => resetPage(() => setCardFilter(event.target.value as AlphaFilter))}>
              <option value="all">全部</option>
              <option value="starred">收藏</option>
              <option value="revealed">已揭示</option>
              <option value="hidden">待揭开</option>
            </select>
            <select value={sortKey} onChange={(event) => resetPage(() => setSortKey(event.target.value as AlphaColumnKey))}>
              {sortColumns.map((column) => (
                <option key={column.key} value={column.key}>{column.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
              {sortDir === "asc" ? "升序" : "降序"}
            </button>
            <details className="alpha-column-menu">
              <summary>显示项</summary>
              <div>
                {alphaColumns.map((column) => (
                  <label key={column.key}>
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(column.key)}
                      onChange={() => toggleColumn(column.key)}
                    />
                    {column.label}
                  </label>
                ))}
                <button type="button" onClick={() => setVisibleColumns(new Set(defaultAlphaColumns))}>恢复默认</button>
              </div>
            </details>
            <span className="alpha-view-switch" aria-label="视图切换">
              <button className={viewMode === "table" ? "is-active" : ""} type="button" onClick={() => setViewMode("table")}>表</button>
              <button className={viewMode === "card" ? "is-active" : ""} type="button" onClick={() => setViewMode("card")}>卡</button>
            </span>
          </div>
        </div>

        {viewMode === "table" ? (
          <div className="alpha-table-wrap">
            <table className="alpha-table">
              <colgroup>
                {visibleCols.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
                <col style={{ width: "126px" }} />
              </colgroup>
              <thead>
                <tr>
                  {visibleCols.map((column) => (
                    <th
                      className={`${column.align ? `is-${column.align}` : ""} ${sortKey === column.key ? "is-sorted" : ""}`}
                      key={column.key}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      {column.label}
                      {column.sortable ? <span>{renderSortMark(column.key)}</span> : null}
                    </th>
                  ))}
                  <th className="is-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.rowId}>
                    {visibleCols.map((column) => (
                      <td className={column.align ? `is-${column.align}` : ""} key={column.key}>
                        {renderCell(row, column.key)}
                      </td>
                    ))}
                    <td className="is-right">
                      <span className="alpha-action-group">
                        <button className="alpha-action is-more" type="button" aria-label={`${row.name} 更多操作`}>...</button>
                        <button className="alpha-action" type="button">查看</button>
                      </span>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={visibleCols.length + 1} className="is-empty">没有符合当前筛选条件的因子。</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="alpha-card-grid">
            {pageRows.map((row) => {
              return (
                <article className="alpha-factor-card" key={row.rowId}>
                  <header>
                    <span>{row.tag ?? row.market}</span>
                    <button
                      className={starred.has(row.id) ? "alpha-star is-on" : "alpha-star"}
                      type="button"
                      onClick={() => toggleStar(row.id)}
                    >
                      ★
                    </button>
                  </header>
                  <h3>{row.name}</h3>
                  <p>{row.description}</p>
                  <div className="alpha-factor-metrics">
                    <span>等级 <b>{row.displayedGrade === "hidden" ? "待揭开" : row.displayedGrade}</b></span>
                    <span>奖金 <b>{formatBonus(row.bonus)} USD</b></span>
                    <span>OS <b>{row.osSharpe.toFixed(2)}</b></span>
                    <span>Fitness <b>{row.fitness.toFixed(2)}</b></span>
                    <span>IS <b>{row.sharpe.toFixed(2)}</b></span>
                    {renderGrade(row)}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <footer className="alpha-modal-footer">
          <span>
            {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} 共 {sorted.length}
          </span>
          <label className="alpha-page-size">
            行数
            <select value={pageSize} onChange={(event) => resetPage(() => setPageSize(Number(event.target.value)))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>«</button>
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>
            {getPageRange().map((item) => (
              <button className={item === page ? "is-active" : ""} key={item} type="button" onClick={() => setPage(item)}>
                {item}
              </button>
            ))}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>›</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function GamePreview() {
  const [activeModal, setActiveModal] = useState<"factors" | null>(null);

  return (
    <main className="quant-game-page" aria-label="Quant 游戏化预览">
      <section className="quant-game-stage">
        <div className="quant-game-stats" aria-label="账户状态">
          {stats.map((item) => (
            <article className={`quant-game-card is-${item.type}`} key={item.title}>
              <span className="quant-game-card-icon" aria-hidden="true">
                <span />
              </span>
              <span className="quant-game-card-copy">
                <h2>{item.title}</h2>
                <p>{item.detail}</p>
              </span>
            </article>
          ))}
        </div>

        <aside className="quant-game-actions" aria-label="系统状态">
          <div className="quant-game-time" aria-label="当前时间">
            <span className="quant-game-action-icon is-weather" aria-hidden="true">
              <span />
            </span>
            <span className="quant-game-action-copy">
              <strong>09:42</strong>
              <span>周一，2026/05/18</span>
            </span>
          </div>
          <button className="quant-game-settings" type="button">
            <span className="quant-game-action-icon is-gear" aria-hidden="true">
              <span />
            </span>
            <span>设置</span>
          </button>
        </aside>

        <nav className="quant-game-nav" aria-label="主要导航">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              onClick={() => {
                if (item.label === "我的因子") setActiveModal("factors");
              }}
            >
              <span className={`quant-nav-icon is-${item.type}`} aria-hidden="true">
                <span />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {activeModal === "factors" ? <MyFactorsModal onClose={() => setActiveModal(null)} /> : null}
      </section>
    </main>
  );
}
