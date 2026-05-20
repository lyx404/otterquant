import { useMemo, useState, type CSSProperties } from "react";
import {
  aggregateData,
  correlationData,
  factors,
  generatePnLData,
  getAlphaGrade,
  osAggregateData,
  osYearlySummary,
  strategies,
  testingStatus,
  type AlphaGrade,
  type Factor,
  yearlySummary,
} from "@/lib/mockData";
import {
  DEFAULT_EXCHANGE_API_CONNECTIONS,
  getExchangeVenueMeta,
  type ExchangeApiConnection,
  type ExchangeVenue,
} from "@/lib/exchangeApiConnections";
import "./GamePreview.css";

const stats = [
  {
    title: "员工数量",
    detail: "1/100",
    type: "ai",
  },
  {
    title: "公司总资产",
    detail: "$500,000",
    type: "cash",
  },
  {
    title: "排行榜",
    detail: "当前：150名",
    type: "rank",
  },
];

const navItems = [
  { label: "我的员工", type: "factor" },
  { label: "招聘", type: "market" },
  { label: "我的策略", type: "strategy" },
  { label: "模拟交易", type: "trade" },
];

const settingsTabs = [
  { id: "general", label: "通用", type: "shield" },
  { id: "profile", label: "资料", type: "user" },
  { id: "exchange", label: "交易所 API", type: "link" },
  { id: "agent", label: "Agent API", type: "key" },
] as const;

type AlphaFilter = "all" | "starred" | "revealed" | "hidden";
type AlphaView = "table" | "card";
type AlphaSortDir = "asc" | "desc" | null;
type FactorGrade = AlphaGrade | "F";
type AlphaColumnKey = "name" | "grade" | "bonus" | "sharpe" | "osSharpe" | "pnl" | "fitness";
type DetailSummaryPeriod = "IS" | "OS" | "DIFF";
type StrategyFilter = "all" | "favorites" | "paper" | "live";
type StrategyView = "table" | "card";
type StrategySortKey = "updated" | "name" | "roi" | "winRate" | "sharpe";
type StrategyMetricKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type StrategyExecutionMode = "paper" | "live" | "backtest";
type StrategyCreateMode = "platform" | "own";
type StrategyCreateInput = "form" | "ai-chat";
type StrategyCreateType = "time-series" | "cross-sectional";
type StrategyWeightMode = "equal" | "custom";
type SettingsTab = (typeof settingsTabs)[number]["id"];
type ViewModeSetting = "beginner" | "pro";
type ColorModeSetting = "redUp" | "greenUp";
type LanguageSetting = "en" | "zh";

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

interface StrategyViewRow {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  executionMode: StrategyExecutionMode;
  roi: string;
  winRate: string;
  sharpe: string;
  maxDrawdown: string;
}

interface SettingsApiKeyItem {
  id: string;
  name: string;
  apiKey: string;
  skillVersion: string;
  createdAt: string;
  updatedAt: string;
}

const SETTINGS_SKILL_LATEST = "v2.4.1";
const initialSettingsApiKeys: SettingsApiKeyItem[] = [
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

function generateSettingsApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ot_sk_";
  for (let i = 0; i < 32; i += 1) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function buildSettingsAgentPrompt(apiKey: string, skillVersion: string) {
  return `# Quandora Trading Skill Configuration

## API Key
${apiKey}

## Skill Version
${skillVersion}

将此提示词粘贴到你的 AI Agent，以启用因子挖掘、回测、策略提交和交易部署能力。`;
}

const alphaColumns: AlphaColumnDef[] = [
  { key: "name", label: "名称", defaultVisible: true, sortable: true, width: "250px" },
  { key: "grade", label: "等级", defaultVisible: true, sortable: true, width: "70px", align: "center" },
  { key: "bonus", label: "奖金(USD)", defaultVisible: true, sortable: true, width: "76px", align: "right" },
  { key: "sharpe", label: "IS 夏普", defaultVisible: true, sortable: true, width: "76px", align: "right" },
  { key: "osSharpe", label: "OS 夏普", defaultVisible: true, sortable: true, width: "76px", align: "right" },
  { key: "pnl", label: "PNL", defaultVisible: true, sortable: false, width: "116px", align: "center" },
  { key: "fitness", label: "适应度", defaultVisible: true, sortable: true, width: "72px", align: "right" },
];

const defaultAlphaColumns = alphaColumns.filter((column) => column.defaultVisible).map((column) => column.key);
const strategySortLabels: Record<StrategySortKey, string> = {
  updated: "创建日期",
  name: "名称",
  roi: "ROI",
  winRate: "胜率",
  sharpe: "夏普比率",
};
const strategyMetricLabels: Record<StrategyMetricKey, string> = {
  roi: "ROI",
  winRate: "胜率",
  sharpe: "夏普比率",
  maxDrawdown: "最大回撤",
};
const defaultStrategyMetrics: Record<StrategyMetricKey, boolean> = {
  roi: true,
  winRate: true,
  sharpe: true,
  maxDrawdown: true,
};
const strategySymbolPool = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "AVAXUSDT", "LINKUSDT", "DOGEUSDT"];
const MAX_STRATEGY_FACTOR_COUNT = 5;
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
const gradeBonusDetails: Record<FactorGrade, number> = {
  S: 1,
  A: 0.5,
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

function formatBonusDetail(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function parseMetric(value: string | number) {
  if (typeof value === "number") return value;
  return Number.parseFloat(value.replace("%", "").replace("‰", "")) || 0;
}

function parsePercentValue(value: string) {
  return Number.parseFloat(value.replace("%", "")) || 0;
}

function normalizeWeightInput(input: string) {
  const sanitized = input.replace(/[^\d.]/g, "");
  const dotIndex = sanitized.indexOf(".");
  if (dotIndex === -1) return sanitized;
  return `${sanitized.slice(0, dotIndex)}.${sanitized.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2)}`;
}

function formatCreditUnits(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value * 1000));
}

function formatDiff(value: number, unit = "") {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
}

function getFactorPassState(factor: Factor) {
  return factor.status === "active" || factor.status === "testing" ? "通过" : "失败";
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

function StrategyPnl({ values }: { values: number[] }) {
  const width = 118;
  const height = 40;
  const path = buildSparklinePath(values, width, height, 5);
  const areaPath = path ? `${path} L ${width - 5} ${height - 5} L 5 ${height - 5} Z` : "";

  return (
    <svg className="alpha-strategy-chart" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <path d={areaPath} className="alpha-strategy-chart-area" />
      <path d={path} className="alpha-strategy-chart-line" />
    </svg>
  );
}

function DetailSparkline({ values }: { values: number[] }) {
  const width = 900;
  const height = 300;
  const left = 86;
  const right = 24;
  const top = 28;
  const bottom = 36;
  const sampled = values.filter((_, index) => index % Math.max(1, Math.floor(values.length / 120)) === 0).slice(-130);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  const step = (width - left - right) / Math.max(1, sampled.length - 1);
  const path = sampled
    .map((value, index) => {
      const x = left + index * step;
      const y = height - bottom - ((value - min) / range) * (height - top - bottom);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const areaPath = path ? `${path} L ${width - right} ${height - bottom} L ${left} ${height - bottom} Z` : "";

  return (
    <svg className="alpha-detail-chart" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <line x1="86" y1="42" x2={width - 24} y2="42" className="alpha-detail-chart-grid" />
      <line x1="86" y1="112" x2={width - 24} y2="112" className="alpha-detail-chart-grid" />
      <line x1="86" y1="182" x2={width - 24} y2="182" className="alpha-detail-chart-grid" />
      <line x1="86" y1="252" x2={width - 24} y2="252" className="alpha-detail-chart-grid" />
      <text x="28" y="47" className="alpha-detail-chart-label">1,500,000</text>
      <text x="44" y="117" className="alpha-detail-chart-label">1,000,000</text>
      <text x="52" y="187" className="alpha-detail-chart-label">500,000</text>
      <text x="72" y="257" className="alpha-detail-chart-label">0</text>
      <path d={areaPath} className="alpha-detail-chart-area" />
      <path d={path} className="alpha-detail-chart-line" />
      <line x1="86" y1={height - 36} x2={width - 24} y2={height - 36} className="alpha-detail-chart-axis" />
      <text x="86" y="288" className="alpha-detail-chart-date">2019-01</text>
      <text x="252" y="288" className="alpha-detail-chart-date">2019-08</text>
      <text x="438" y="288" className="alpha-detail-chart-date">2020-04</text>
      <text x="622" y="288" className="alpha-detail-chart-date">2020-12</text>
      <text x="794" y="288" className="alpha-detail-chart-date">2021-08</text>
    </svg>
  );
}

function FactorDetailPanel({ factor, onBack, onClose }: { factor: Factor; onBack: () => void; onClose: () => void }) {
  const [summaryPeriod, setSummaryPeriod] = useState<DetailSummaryPeriod>("IS");
  const [showTestPeriod, setShowTestPeriod] = useState(true);
  const [copiedExpression, setCopiedExpression] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pass: false,
    fail: true,
    pending: false,
  });

  const grade = getFactorGrade(factor);
  const pnlData = useMemo(() => generatePnLData(), []);
  const chartValues = useMemo(() => {
    return [...pnlData.train, ...(showTestPeriod ? pnlData.test : [])].map((item) => item.value);
  }, [pnlData, showTestPeriod]);

  const diffAggData = {
    sharpe: osAggregateData.sharpe - aggregateData.sharpe,
    turnover: formatDiff(parseMetric(osAggregateData.turnover) - parseMetric(aggregateData.turnover), "%"),
    fitness: osAggregateData.fitness - aggregateData.fitness,
    returns: formatDiff(parseMetric(osAggregateData.returns) - parseMetric(aggregateData.returns), "%"),
    drawdown: formatDiff(parseMetric(osAggregateData.drawdown) - parseMetric(aggregateData.drawdown), "%"),
    margin: formatDiff(parseMetric(osAggregateData.margin) - parseMetric(aggregateData.margin), "‰"),
  };
  const aggData = summaryPeriod === "DIFF" ? diffAggData : summaryPeriod === "OS" ? osAggregateData : aggregateData;
  const summaryRows = summaryPeriod === "OS" ? osYearlySummary : yearlySummary;
  const passItems = testingStatus.filter((item) => item.status === "pass");
  const failItems = testingStatus.filter((item) => item.status === "fail");
  const pendingItems = testingStatus.filter((item) => item.status === "pending");
  const selfCorrelationCurrent = (correlationData.selfCorrelation.maximum + correlationData.selfCorrelation.minimum) / 2;
  const detailMetrics = [
    { label: "夏普比率", value: typeof aggData.sharpe === "number" ? aggData.sharpe.toFixed(2) : aggData.sharpe },
    { label: "收益", value: aggData.returns, tone: "hot" },
    { label: "最大回撤", value: aggData.drawdown, tone: "good" },
    { label: "换手率", value: aggData.turnover },
    { label: "适应度", value: typeof aggData.fitness === "number" ? aggData.fitness.toFixed(2) : aggData.fitness },
    { label: "测试通过率", value: `${factor.testsPassed}/${factor.testsPassed + factor.testsFailed + factor.testsPending}`, hint: "通过/总数" },
    { label: "保证金", value: aggData.margin },
    { label: "等级", value: summaryPeriod === "IS" ? "-" : grade, hint: summaryPeriod === "IS" ? "暂无等级" : getFactorPassState(factor) },
  ];

  const copyExpression = async () => {
    try {
      await navigator.clipboard.writeText(factor.expression);
      setCopiedExpression(true);
      window.setTimeout(() => setCopiedExpression(false), 1200);
    } catch {
      setCopiedExpression(false);
    }
  };

  const renderTestGroup = (key: "pass" | "fail" | "pending", title: string, items: typeof testingStatus) => (
    <section className={`alpha-detail-test-group is-${key}`}>
      <button
        type="button"
        onClick={() => setExpandedSections((current) => ({ ...current, [key]: !current[key] }))}
      >
        <span>{items.length} {title}</span>
        <i>{expandedSections[key] ? "⌃" : "⌄"}</i>
      </button>
      {expandedSections[key] ? (
        <div>
          {items.map((item) => (
            <p key={item.text}>
              <strong>{item.status === "pass" ? "检查通过" : item.status === "fail" ? "低于阈值" : "等待处理"}</strong>
              <span>{item.text}</span>
              {item.status === "fail" ? <em>建议：检查参数窗口或过滤低流动性资产</em> : null}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="alpha-modal-shell" role="dialog" aria-modal="true" aria-labelledby="alpha-detail-title">
      <div className="alpha-modal-backdrop" onClick={onClose} />
      <section className="alpha-modal alpha-detail-modal">
        <header className="alpha-modal-header alpha-detail-header">
          <button className="alpha-detail-back" type="button" onClick={onBack}>← 返回</button>
          <div>
            <span className="alpha-modal-kicker">FACTOR DETAIL / 专业视角</span>
            <h2 id="alpha-detail-title">{factor.name}</h2>
            <p>{factor.id} · 创建于 {factor.createdAt}</p>
          </div>
          <button className="alpha-detail-star" type="button" aria-label="收藏因子">☆</button>
          <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭因子详情">
            ×
          </button>
        </header>

        <div className="alpha-detail-body">
          <section className="alpha-detail-panel alpha-detail-intro">
            <header>
              <h3><span className="alpha-detail-title-icon is-book" />因子介绍</h3>
            </header>
            <p>{factor.description ?? "区间位置与主动成交笔数偏向缺口：价格在滚动区间中的位置减去主动买卖笔数偏向，捕捉流量被吸收后的背离。"}</p>
          </section>

          <section className="alpha-detail-panel alpha-detail-summary-panel">
            <header>
              <h3><span className="alpha-detail-title-icon is-trend" />{summaryPeriod === "DIFF" ? "差异摘要" : `${summaryPeriod} 摘要`}</h3>
              <div className="alpha-detail-actions">
                <span>视角</span>
                {(["IS", "OS", "DIFF"] as DetailSummaryPeriod[]).map((item) => (
                  <button className={summaryPeriod === item ? "is-active" : ""} key={item} type="button" onClick={() => setSummaryPeriod(item)}>
                    {item === "IS" ? "样本内" : item === "OS" ? "样本外" : "差异"}
                  </button>
                ))}
              </div>
            </header>
            <div className="alpha-detail-summary">
              {detailMetrics.map((item) => (
                <span className={item.tone ? `is-${item.tone}` : ""} key={item.label}>
                  <small>{item.label}</small>
                  <b>{item.value}</b>
                  {item.hint ? <em>{item.hint}</em> : null}
                </span>
              ))}
            </div>
            {summaryPeriod !== "DIFF" ? (
              <table className="alpha-detail-table">
                <thead>
                  <tr>
                    <th>年份</th>
                    <th>夏普比率</th>
                    <th>换手率</th>
                    <th>适应度</th>
                    <th>收益</th>
                    <th>回撤</th>
                    <th>保证金</th>
                    <th>多头数量</th>
                    <th>空头数量</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td>{row.sharpe.toFixed(2)}</td>
                      <td>{row.turnover}</td>
                      <td>{row.fitness.toFixed(2)}</td>
                      <td>{row.returns}</td>
                      <td>{row.drawdown}</td>
                      <td>{row.margin}</td>
                      <td>{row.longCount.toLocaleString()}</td>
                      <td>{row.shortCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>

          <section className="alpha-detail-expression-bar">
            <span>表达式：</span>
            <code>{factor.expression}</code>
            <button type="button" onClick={copyExpression}>{copiedExpression ? "已复制" : "复制"}</button>
          </section>

          <div className="alpha-detail-note-row">
            <button className={showTestPeriod ? "" : "is-active"} type="button" onClick={() => setShowTestPeriod((value) => !value)}>
              {showTestPeriod ? "隐藏测试区间" : "显示测试区间"}
            </button>
            <span>{showTestPeriod ? "指定测试区间后，测试期与总体统计默认展示。" : "当前仅展示样本内区间。"}</span>
          </div>

          <section className="alpha-detail-panel alpha-detail-pnl-panel">
            <header>
              <h3><span className="alpha-detail-title-icon is-chart" />PNL</h3>
              <div className="alpha-detail-actions">
                <button className="is-active" type="button">样本内</button>
                <button className={showTestPeriod ? "is-active" : ""} type="button" onClick={() => setShowTestPeriod((value) => !value)}>样本外</button>
              </div>
            </header>
            <DetailSparkline values={chartValues} />
          </section>

          <section className="alpha-detail-bottom-grid">
            <article className="alpha-detail-panel is-correlation">
              <header>
                <h3><span className="alpha-detail-title-icon is-bars" />相关性</h3>
                <span>最近运行：{correlationData.lastRun}</span>
              </header>
              <div className="alpha-detail-correlation-row">
                <span>自相关 <b>{selfCorrelationCurrent.toFixed(2)}</b></span>
                <span>最大值 <b>{correlationData.selfCorrelation.maximum.toFixed(2)}</b></span>
                <span>最小值 <b>{correlationData.selfCorrelation.minimum.toFixed(2)}</b></span>
              </div>
            </article>

            <article className="alpha-detail-panel">
              <header>
                <h3><span className="alpha-detail-title-icon is-check" />测试结果</h3>
                <span>{factor.testsPassed} 通过 · {factor.testsFailed} 失败 · {factor.testsPending} 待处理</span>
              </header>
              <div className="alpha-detail-tests">
                {renderTestGroup("pass", "通过", passItems)}
                {renderTestGroup("fail", "失败", failItems)}
                {renderTestGroup("pending", "待处理", pendingItems)}
              </div>
            </article>
          </section>
        </div>
      </section>
    </div>
  );
}

function BonusDetailsModal({
  gradeStats,
  onClose,
}: {
  gradeStats: Record<FactorGrade, number>;
  onClose: () => void;
}) {
  const rows = (["S", "A", "B", "C", "D", "F"] as FactorGrade[]).map((grade) => {
    const count = gradeStats[grade];
    const unitBonus = gradeBonusDetails[grade];
    return {
      grade,
      count,
      unitBonus,
      subtotal: count * unitBonus,
    };
  });
  const total = rows.reduce((sum, row) => sum + row.subtotal, 0);

  return (
    <div className="alpha-bonus-modal-shell" role="dialog" aria-modal="true" aria-labelledby="alpha-bonus-title">
      <div className="alpha-bonus-backdrop" onClick={onClose} />
      <section className="alpha-bonus-modal">
        <header className="alpha-bonus-header">
          <div>
            <span className="alpha-modal-kicker">BONUS LEDGER</span>
            <h3 id="alpha-bonus-title">奖金明细</h3>
            <p>按因子等级汇总</p>
          </div>
          <div className="alpha-bonus-total" aria-label="累计奖金总计">
            <span>总计</span>
            <strong>{formatBonusDetail(total)}</strong>
            <em>USD</em>
          </div>
          <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭奖金明细弹窗">
            ×
          </button>
        </header>

        <div className="alpha-bonus-table-wrap">
          <table className="alpha-bonus-table">
            <thead>
              <tr>
                <th>等级</th>
                <th className="is-right">数量</th>
                <th className="is-right">单个奖金</th>
                <th className="is-right">小计</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.grade}>
                  <td>
                    <span className={`alpha-bonus-grade ${gradeClass(row.grade)}`}>{row.grade}</span>
                  </td>
                  <td className="is-right">{row.count}</td>
                  <td className="is-right">{formatBonusDetail(row.unitBonus)}</td>
                  <td className={row.subtotal > 0 ? "is-right is-highlight" : "is-right"}>{formatBonusDetail(row.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function toStrategyViewRow(index: number): StrategyViewRow {
  const strategy = strategies[index % strategies.length];
  const executionMode: StrategyExecutionMode =
    strategy.status === "live" ? "live" : strategy.status === "backtested" ? "backtest" : "paper";

  return {
    id: `STR-${463 + index}`,
    name: strategy.name,
    description: strategy.description,
    updatedAt: strategy.updatedAt,
    executionMode,
    roi: strategy.annualReturn,
    winRate: strategy.winRate,
    sharpe: strategy.sharpe.toFixed(2),
    maxDrawdown: strategy.maxDrawdown,
  };
}

const strategyRows: StrategyViewRow[] = Array.from({ length: 20 }, (_, index) => toStrategyViewRow(index));

function StrategyCreateModal({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<StrategyCreateMode>("platform");
  const [inputMethod, setInputMethod] = useState<StrategyCreateInput>("form");
  const [strategyType, setStrategyType] = useState<StrategyCreateType>("time-series");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(["BTCUSDT"]);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [weightMode, setWeightMode] = useState<StrategyWeightMode>("equal");
  const [customWeights, setCustomWeights] = useState<Record<string, string>>({});
  const [stopLoss, setStopLoss] = useState("8");
  const [cooldown, setCooldown] = useState("24");
  const [strategyName, setStrategyName] = useState("BTC Alpha Composite");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showSymbols, setShowSymbols] = useState(false);
  const [showFactors, setShowFactors] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const factorPool = useMemo(
    () => factors.filter((factor) => factor.category === "official" || factor.category === "graduated").slice(0, 10),
    []
  );
  const selectedFactorNames = selectedFactors.join("、");
  const selectedSymbolText = selectedSymbols.length > 0 ? selectedSymbols.join("、") : "";
  const customWeightSum = selectedFactors.reduce((sum, factorName) => sum + (Number(customWeights[factorName]) || 0), 0);
  const isCustomWeightValid = weightMode === "equal" || Math.abs(customWeightSum - 1) <= 0.0001;
  const estimatedCredit =
    mode === "platform"
      ? inputMethod === "ai-chat"
        ? aiPrompt.split(/\n+/).filter((line) => /^(\d+\.|[-*])\s/.test(line.trim())).length >= 2
          ? 4.8
          : 1.8
        : Number((0.8 + Math.max(1, selectedFactors.length) * 0.28 + (strategyType === "time-series" ? Math.max(1, selectedSymbols.length) * 0.04 : 0.12)).toFixed(2))
      : 0;
  const formInvalid =
    mode === "platform" &&
    (inputMethod === "ai-chat"
      ? aiPrompt.trim().length === 0
      : !strategyName.trim() ||
        (strategyType === "time-series" && selectedSymbols.length === 0) ||
        selectedFactors.length === 0 ||
        !isCustomWeightValid);

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((current) => {
      if (current.includes(symbol)) return current.filter((item) => item !== symbol);
      return [...current, symbol];
    });
  };

  const toggleFactor = (factorName: string) => {
    setSelectedFactors((current) => {
      if (current.includes(factorName)) {
        const next = current.filter((item) => item !== factorName);
        setCustomWeights((weights) => {
          const clone = { ...weights };
          delete clone[factorName];
          return clone;
        });
        return next;
      }
      if (current.length >= MAX_STRATEGY_FACTOR_COUNT) return current;
      return [...current, factorName];
    });
  };

  const chooseWeightMode = (nextMode: StrategyWeightMode) => {
    setWeightMode(nextMode);
    if (nextMode === "custom" && selectedFactors.length > 0) {
      const base = Number((1 / selectedFactors.length).toFixed(2));
      setCustomWeights(selectedFactors.reduce<Record<string, string>>((acc, factorName) => {
        acc[factorName] = String(base);
        return acc;
      }, {}));
    }
  };

  const handleCreate = () => {
    setShowValidation(true);
    if (formInvalid) return;
    setSubmitted(true);
  };

  return (
    <div className="alpha-modal-shell" role="dialog" aria-modal="true" aria-labelledby="strategy-create-title">
      <div className="alpha-modal-backdrop" onClick={onClose} />
      <section className="alpha-modal alpha-strategy-modal alpha-strategy-create-modal">
        <header className="alpha-modal-header alpha-strategy-create-header">
          <button className="alpha-detail-back" type="button" onClick={onBack}>← 返回</button>
          <div>
            <span className="alpha-modal-kicker">STRATEGY BUILDER</span>
            <h2 id="strategy-create-title">创建新策略</h2>
            <p>选择你想要创建策略的方式</p>
          </div>
          <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭新建策略弹窗">
            ×
          </button>
        </header>

        <div className="alpha-strategy-create-body">
          <section className="alpha-create-choice-grid" aria-label="创建方式">
            <button className={mode === "platform" ? "is-active" : ""} type="button" onClick={() => setMode("platform")}>
              <span className="alpha-create-icon is-bot" />
              <strong>平台 Agent</strong>
              <em>✓</em>
            </button>
            <button className={mode === "own" ? "is-active" : ""} type="button" onClick={() => setMode("own")}>
              <span className="alpha-create-icon is-code" />
              <strong>自有 Agent</strong>
              <em>✓</em>
            </button>
          </section>

          {mode === "platform" ? (
            <>
              <section className="alpha-create-field">
                <label>输入方式</label>
                <div className="alpha-create-segment is-narrow">
                  <button className={inputMethod === "form" ? "is-active" : ""} type="button" onClick={() => setInputMethod("form")}>表单</button>
                  <button className={inputMethod === "ai-chat" ? "is-active" : ""} type="button" onClick={() => setInputMethod("ai-chat")}>AI 对话</button>
                </div>
              </section>

              {inputMethod === "form" ? (
                <>
                  <section className="alpha-create-field">
                    <label>策略类型 <b>*</b></label>
                    <div className="alpha-create-segment">
                      <button className={strategyType === "time-series" ? "is-active" : ""} type="button" onClick={() => setStrategyType("time-series")}>时序策略</button>
                      <button className={strategyType === "cross-sectional" ? "is-active" : ""} type="button" onClick={() => setStrategyType("cross-sectional")}>截面策略</button>
                    </div>
                  </section>

                  <section className="alpha-create-field">
                    <label>{strategyType === "time-series" ? "交易对" : "交易分组"} <b>*</b></label>
                    <button className="alpha-create-picker" type="button" onClick={() => setShowSymbols((value) => !value)}>
                      {selectedSymbolText || "点击选择交易对，或添加一个 Top 分组。"}
                    </button>
                    {showSymbols ? (
                      <div className="alpha-create-popover">
                        {strategyType === "cross-sectional" ? (
                          <button type="button" onClick={() => setSelectedSymbols(strategySymbolPool.slice(0, 5))}>Top 1-50</button>
                        ) : null}
                        {strategySymbolPool.map((symbol) => (
                          <button className={selectedSymbols.includes(symbol) ? "is-active" : ""} key={symbol} type="button" onClick={() => toggleSymbol(symbol)}>
                            {symbol}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {showValidation && strategyType === "time-series" && selectedSymbols.length === 0 ? <p className="alpha-create-error">请选择至少一个交易对。</p> : null}
                  </section>

                  <section className="alpha-create-field">
                    <label>因子选择 <b>*</b></label>
                    <button className="alpha-create-picker" type="button" onClick={() => setShowFactors((value) => !value)}>
                      {selectedFactorNames || "点击从官方库或我的因子中选择因子。"}
                    </button>
                    {showFactors ? (
                      <div className="alpha-create-popover is-factor-picker">
                        {factorPool.map((factor) => (
                          <button className={selectedFactors.includes(factor.name) ? "is-active" : ""} key={factor.id} type="button" onClick={() => toggleFactor(factor.name)}>
                            <strong>{factor.name}</strong>
                            <span>{factor.id} · {factor.tag ?? factor.market}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {showValidation && selectedFactors.length === 0 ? <p className="alpha-create-error">请选择至少一个因子。</p> : null}
                  </section>

                  <section className="alpha-create-field">
                    <label>因子权重 <b>*</b></label>
                    <div className="alpha-create-segment">
                      <button className={weightMode === "equal" ? "is-active" : ""} type="button" onClick={() => chooseWeightMode("equal")}>等权重</button>
                      <button className={weightMode === "custom" ? "is-active" : ""} type="button" onClick={() => chooseWeightMode("custom")}>自定义权重</button>
                    </div>
                    {weightMode === "custom" && selectedFactors.length > 0 ? (
                      <div className="alpha-create-weight-list">
                        {selectedFactors.map((factorName) => (
                          <label key={factorName}>
                            <span>{factorName}</span>
                            <input
                              value={customWeights[factorName] ?? ""}
                              onChange={(event) => setCustomWeights((current) => ({ ...current, [factorName]: normalizeWeightInput(event.target.value) }))}
                            />
                          </label>
                        ))}
                        <p className={isCustomWeightValid ? "is-valid" : ""}>权重合计：{customWeightSum.toFixed(2)}</p>
                      </div>
                    ) : null}
                    {showValidation && !isCustomWeightValid ? <p className="alpha-create-error">自定义权重合计需等于 1。</p> : null}
                  </section>

                  <section className="alpha-create-field is-compact">
                    <label>止损（%） <b>*</b></label>
                    <input value={stopLoss} onChange={(event) => setStopLoss(event.target.value.replace(/[^\d.]/g, ""))} />
                    <div className="alpha-create-chips">
                      {["5", "8", "10"].map((value) => (
                        <button className={stopLoss === value ? "is-active" : ""} type="button" key={value} onClick={() => setStopLoss(value)}>{value}%</button>
                      ))}
                    </div>
                  </section>

                  <section className="alpha-create-field is-compact">
                    <label>冷却时间（小时） <b>*</b></label>
                    <input value={cooldown} onChange={(event) => setCooldown(event.target.value.replace(/[^\d.]/g, ""))} />
                    <div className="alpha-create-chips">
                      {["2", "6", "24", "72"].map((value) => (
                        <button className={cooldown === value ? "is-active" : ""} type="button" key={value} onClick={() => setCooldown(value)}>{value}h</button>
                      ))}
                    </div>
                  </section>

                  <section className="alpha-create-field is-name">
                    <label>策略名称</label>
                    <input value={strategyName} onChange={(event) => setStrategyName(event.target.value)} />
                    {showValidation && !strategyName.trim() ? <p className="alpha-create-error">请输入策略名称。</p> : null}
                  </section>
                </>
              ) : (
                <section className="alpha-create-field">
                  <label>AI 对话需求 <b>*</b></label>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="描述你想创建的策略。例：创建一个运行在 BTCUSDT 上的时序策略，使用动量和波动率因子，8% 止损，24 小时冷却。"
                  />
                  <div className="alpha-create-chips">
                    <button type="button" onClick={() => setAiPrompt("创建一个运行在 BTCUSDT 上的时序策略，使用动量 + 波动率因子、等权重、8% 止损、24 小时冷却。")}>时序示例</button>
                    <button type="button" onClick={() => setAiPrompt("创建一个中性截面策略，使用 5 个因子，采用头尾 10%，8% 止损，1 天冷却，自定义权重且总和为 1。")}>截面示例</button>
                  </div>
                  {showValidation && aiPrompt.trim().length === 0 ? <p className="alpha-create-error">请输入 AI 对话需求。</p> : null}
                </section>
              )}
            </>
          ) : (
            <section className="alpha-create-own-agent">
              <article>
                <span>API Key</span>
                <strong>ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h</strong>
                <em>Skill v2.4.1 · 2026-03-28</em>
              </article>
              <article>
                <span>首次运行提示词</span>
                <p>将 API Key 和 Skill 配置复制到你的 Agent，用自然语言提交策略草稿、回测请求和部署参数。</p>
              </article>
            </section>
          )}
        </div>

        <footer className="alpha-strategy-create-footer">
          {mode === "platform" ? (
            <span className="alpha-credit-pill">预计消耗 ✧ {formatCreditUnits(estimatedCredit)}</span>
          ) : null}
          {submitted ? <span className="alpha-create-success">策略创建请求已生成</span> : null}
          {mode === "platform" ? (
            <button className="alpha-strategy-create-submit" type="button" onClick={handleCreate}>
              创建策略
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function StrategyDetailModal({
  strategy,
  onBack,
  onClose,
}: {
  strategy: StrategyViewRow;
  onBack: () => void;
  onClose: () => void;
}) {
  const [starred, setStarred] = useState(false);
  const [curveRange, setCurveRange] = useState<"7D" | "30D" | "90D" | "365D">("365D");
  const [returnRange, setReturnRange] = useState<"7D" | "30D" | "90D" | "365D">("90D");
  const [showConfig, setShowConfig] = useState(false);
  const [paperDeployed, setPaperDeployed] = useState(false);
  const [liveDeployed, setLiveDeployed] = useState(false);

  const roi = parsePercentValue(strategy.roi);
  const winRate = parsePercentValue(strategy.winRate);
  const maxDrawdown = parsePercentValue(strategy.maxDrawdown);
  const initialEquity = 438000;
  const totalReturn = (initialEquity * roi) / 100;
  const currentEquity = initialEquity + totalReturn;
  const realizedPnl = totalReturn * 0.995;
  const unrealizedPnl = totalReturn - realizedPnl;
  const peakEquity = currentEquity * 1.11;
  const minEquity = Math.max(initialEquity * (1 - maxDrawdown / 100), initialEquity * 0.5);
  const calmar = Number(strategy.sharpe) * 1.89;
  const profitLossRatio = winRate > 0 ? (winRate / Math.max(100 - winRate, 1)) * 2.1 : 0;
  const totalFees = Math.abs(totalReturn) * 0.1268;
  const curveCounts = { "7D": 18, "30D": 30, "90D": 45, "365D": 64 };
  const curveLabels = {
    "7D": ["04-15", "04-17", "04-19", "04-21"],
    "30D": ["03-22", "03-29", "04-05", "04-12", "04-19"],
    "90D": ["01-22", "02-12", "03-04", "03-24", "04-14"],
    "365D": ["02-12", "04-14", "06-14", "08-14", "10-14", "12-14"],
  };
  const preferenceRows = [
    ["ETH", "14.30%", "#7184f5"],
    ["BTC", "11.64%", "#f0a13b"],
    ["WLD", "9.05%", "#36c99a"],
    ["CRV", "6.80%", "#f5b44f"],
    ["WIF", "5.28%", "#22a7df"],
    ["1000PEPE", "4.87%", "#36c99a"],
    ["SUI", "3.91%", "#5d5af0"],
    ["BCH", "3.71%", "#22a7df"],
    ["BSV", "3.70%", "#b87522"],
    ["APE", "3.57%", "#5d5af0"],
    ["其他", "33.17%", "#7b8796"],
  ];
  const positionRows = [
    ["FILUSDT", "永续", "全仓空", "已平仓", "0.885", "451.4 FIL", "2026-02-10 22:17:26", "2026-02-10 23:08:11", "+1.35 USDT"],
    ["ICPUSDT", "永续", "全仓多", "已平仓", "2.375", "168 ICP", "2026-02-10 22:17:26", "2026-02-10 23:08:08", "+2.52 USDT"],
    ["DOTUSDT", "永续", "全仓空", "已平仓", "1.278", "312.8 DOT", "2026-02-10 18:02:43", "2026-02-10 21:44:43", "-2.50 USDT"],
    ["KSMUSDT", "永续", "全仓多", "已平仓", "4.153", "96.3 KSM", "2026-02-11 04:32:33", "2026-02-11 11:54:24", "+2.82 USDT"],
  ];
  const curveValues = useMemo(() => {
    const count = curveCounts[curveRange];
    return Array.from({ length: count }, (_, index) => {
      const wave = Math.sin(index * 0.27) * 8200;
      const lift = index * (roi * 220);
      return 100000 + lift + wave;
    });
  }, [curveRange, roi]);
  const benchmarkValues = useMemo(() => {
    return curveValues.map((value, index) => value * 0.78 + index * 320);
  }, [curveValues]);
  const dailyReturns = useMemo(() => {
    const counts = { "7D": 14, "30D": 30, "90D": 56, "365D": 72 };
    return Array.from({ length: counts[returnRange] }, (_, index) => {
      const wave = Math.sin(index * 0.38) * 0.74;
      const wobble = Math.cos(index * 0.84) * 0.42;
      return Number((wave + wobble).toFixed(2));
    });
  }, [returnRange]);

  const fmtSignedValue = (value: number, fractionDigits = 2) => {
    return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  };

  const renderDetailSparkline = () => {
    const width = 760;
    const height = 260;
    const padding = 26;
    const values = [...curveValues, ...benchmarkValues];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const toPath = (series: number[]) => {
      const range = max - min || 1;
      const step = (width - padding * 2) / Math.max(1, series.length - 1);
      return series
        .map((value, index) => {
          const x = padding + index * step;
          const y = height - padding - ((value - min) / range) * (height - padding * 2);
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
    };
    const equityPath = toPath(curveValues);
    const benchmarkPath = toPath(benchmarkValues);
    const areaPath = `${equityPath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
      <svg className="alpha-strategy-detail-line-chart" viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
        {[44, 88, 132, 176, 220].map((y) => (
          <line key={y} x1={padding} y1={y} x2={width - padding} y2={y} className="alpha-detail-chart-grid" />
        ))}
        <path d={areaPath} className="alpha-strategy-detail-area" />
        <path d={equityPath} className="alpha-strategy-detail-equity" />
        <path d={benchmarkPath} className="alpha-strategy-detail-benchmark" />
      </svg>
    );
  };

  return (
    <div className="alpha-modal-shell" role="dialog" aria-modal="true" aria-labelledby="strategy-detail-title">
      <div className="alpha-modal-backdrop" onClick={onClose} />
      <section className="alpha-modal alpha-strategy-modal alpha-strategy-detail-modal">
        <header className="alpha-modal-header alpha-strategy-detail-header">
          <button className="alpha-detail-back" type="button" onClick={onBack}>← 返回</button>
          <div>
            <span className="alpha-modal-kicker">STRATEGY DETAIL</span>
            <h2 id="strategy-detail-title">{strategy.name}</h2>
            <p>{strategy.id} · 创建于 {strategy.updatedAt} 00:00</p>
          </div>
          <div className="alpha-strategy-detail-actions">
            <button className={starred ? "is-active" : ""} type="button" onClick={() => setStarred((value) => !value)}>☆</button>
            <button type="button" onClick={() => setShowConfig((value) => !value)}>查看策略配置</button>
            <button className="is-primary" type="button" onClick={() => setPaperDeployed(true)}>{paperDeployed ? "查看模拟交易" : "部署到模拟交易"}</button>
            <button type="button" onClick={() => setLiveDeployed(true)}>{liveDeployed ? "查看实盘交易" : "部署到实盘交易"}</button>
          </div>
          <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭策略详情弹窗">×</button>
        </header>

        <div className="alpha-strategy-detail-body">
          {showConfig ? (
            <section className="alpha-detail-panel alpha-strategy-config-panel">
              <header>
                <h3><span className="alpha-detail-title-icon is-book" />策略配置</h3>
              </header>
              <div>
                <span>策略 ID <b>{strategy.id}</b></span>
                <span>策略类型 <b>时序策略</b></span>
                <span>标的 <b>BTCUSDT</b></span>
                <span>信号 <b>Cross-Exchange Spread, SOL Orderbook Imbalance, Basis Trade Optimizer</b></span>
                <span>因子权重 <b>等权重</b></span>
                <span>止损 <b>5%</b></span>
                <span>冷却时间 <b>6 小时</b></span>
              </div>
            </section>
          ) : null}

          <section className="alpha-strategy-top-metrics">
            {[
              ["总权益（USDT）", currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), ""],
              ["PNL（USDT）", fmtSignedValue(totalReturn), "is-hot"],
              ["ROI", `${fmtSignedValue(roi)}%`, "is-hot"],
              ["胜率", `${winRate.toFixed(2)}%`, ""],
              ["夏普比率", strategy.sharpe, ""],
              ["最大回撤", `${maxDrawdown.toFixed(2)}%`, "is-good"],
            ].map(([label, value, tone]) => (
              <span className={tone} key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </span>
            ))}
          </section>

          <section className="alpha-strategy-detail-card-grid">
            <article className="alpha-detail-panel">
              <header><h3><span className="alpha-detail-title-icon is-bars" />资金快照</h3></header>
              <p><span>最高权益</span><b>{peakEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</b></p>
              <p><span>最低权益</span><b>{minEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</b></p>
              <p><span>已实现盈亏</span><b className="is-hot">{fmtSignedValue(realizedPnl)} USDT</b></p>
              <p><span>未实现盈亏</span><b className="is-hot">{fmtSignedValue(unrealizedPnl)} USDT</b></p>
            </article>
            <article className="alpha-detail-panel">
              <header><h3><span className="alpha-detail-title-icon is-trend" />表现指标</h3></header>
              <p><span>夏普比率</span><b>{strategy.sharpe}</b></p>
              <p><span>Calmar比率</span><b>{calmar.toFixed(2)}</b></p>
              <p><span>胜率</span><b>{winRate.toFixed(2)}%</b></p>
              <p><span>盈亏比</span><b>{profitLossRatio.toFixed(2)}</b></p>
            </article>
            <article className="alpha-detail-panel">
              <header><h3><span className="alpha-detail-title-icon is-check" />交易统计</h3></header>
              <p><span>交易天数</span><b>1097</b></p>
              <p><span>总交易次数</span><b>286</b></p>
              <p><span>最大敞口</span><b>99.73%</b></p>
              <p><span>总手续费</span><b>{totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</b></p>
            </article>
          </section>

          <section className="alpha-detail-panel alpha-strategy-curve-panel">
            <header>
              <h3><span className="alpha-detail-title-icon is-chart" />资产曲线</h3>
              <div className="alpha-detail-actions">
                {(["7D", "30D", "90D", "365D"] as const).map((item) => (
                  <button className={curveRange === item ? "is-active" : ""} type="button" key={item} onClick={() => setCurveRange(item)}>{item}</button>
                ))}
              </div>
            </header>
            <div className="alpha-strategy-curve-summary">
              <span>权益</span>
              <span>基准</span>
              <b>总收益 <em>{fmtSignedValue(roi)}%</em></b>
              <b>超额收益 <em>{fmtSignedValue(roi * 0.69)}%</em></b>
              <b>夏普比率 <em>{strategy.sharpe}</em></b>
              <b>Calmar比率 <em>{calmar.toFixed(2)}</em></b>
            </div>
            {renderDetailSparkline()}
            <div className="alpha-strategy-chart-labels">
              {curveLabels[curveRange].map((label) => <span key={label}>{label}</span>)}
            </div>
          </section>

          <section className="alpha-detail-panel alpha-strategy-preference-panel">
            <header><h3><span className="alpha-detail-title-icon is-bars" />资产偏好</h3></header>
            <div className="alpha-strategy-preference-grid">
              <div className="alpha-strategy-donut">
                <span>核心资产<b>BTC</b><em>11.64% 仓位占比</em></span>
              </div>
              <div className="alpha-strategy-preference-list">
                {preferenceRows.map(([label, value, color]) => (
                  <p key={label} style={{ "--slice-color": color } as CSSProperties}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="alpha-detail-panel alpha-strategy-return-panel">
            <header>
              <h3><span className="alpha-detail-title-icon is-trend" />日收益</h3>
              <div className="alpha-detail-actions">
                <span>均值 <b className="is-hot">+0.119%</b></span>
                <span>胜31</span>
                <span>负25</span>
                {(["7D", "30D", "90D", "365D"] as const).map((item) => (
                  <button className={returnRange === item ? "is-active" : ""} type="button" key={item} onClick={() => setReturnRange(item)}>{item}</button>
                ))}
              </div>
            </header>
            <div className="alpha-strategy-bars" aria-label="日收益柱状图">
              {dailyReturns.map((value, index) => (
                <i
                  className={value >= 0 ? "is-positive" : "is-negative"}
                  key={`${value}-${index}`}
                  style={{ height: `${Math.max(8, Math.abs(value) * 58)}px` }}
                />
              ))}
            </div>
          </section>

          <section className="alpha-detail-panel">
            <header><h3><span className="alpha-detail-title-icon is-book" />持仓历史</h3></header>
            <table className="alpha-detail-position-table">
              <thead>
                <tr>
                  <th>持仓</th>
                  <th>开仓价</th>
                  <th>最大持仓量</th>
                  <th>开仓时间</th>
                  <th>平仓时间</th>
                  <th className="is-right">盈亏</th>
                </tr>
              </thead>
              <tbody>
                {positionRows.map((row) => (
                  <tr key={row[0]}>
                    <td><strong>{row[0]}</strong><span>{row[1]} · {row[2]} · {row[3]}</span></td>
                    <td>{row[4]}</td>
                    <td>{row[5]}</td>
                    <td>{row[6]}</td>
                    <td>{row[7]}</td>
                    <td className={row[8].startsWith("-") ? "is-right is-good" : "is-right is-hot"}>{row[8]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </div>
  );
}

function MyStrategiesModal({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<"list" | "create" | "detail">("list");
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyViewRow | null>(null);
  const [query, setQuery] = useState("");
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("all");
  const [sortKey, setSortKey] = useState<StrategySortKey>("updated");
  const [sortDesc, setSortDesc] = useState(true);
  const [viewMode, setViewMode] = useState<StrategyView>("table");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<StrategyMetricKey, boolean>>(defaultStrategyMetrics);
  const [starred, setStarred] = useState<Set<string>>(new Set(["STR-463", "STR-470"]));

  const tablePnlValues = useMemo(() => {
    const pnlData = generatePnLData();
    const combined = [...pnlData.train, ...pnlData.test].map((item) => item.value);
    const sampleEvery = Math.max(1, Math.floor(combined.length / 30));
    return combined.filter((_, index) => index % sampleEvery === 0).slice(-30);
  }, []);

  const resetPage = (next: () => void) => {
    next();
    setPage(1);
  };

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return strategyRows.filter((row) => {
      if (strategyFilter === "favorites" && !starred.has(row.id)) return false;
      if (strategyFilter === "paper" && row.executionMode !== "paper") return false;
      if (strategyFilter === "live" && row.executionMode !== "live") return false;
      if (keyword && !`${row.name} ${row.id}`.toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [query, starred, strategyFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let comp = 0;
      if (sortKey === "updated") comp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else if (sortKey === "name") comp = a.name.localeCompare(b.name);
      else if (sortKey === "roi") comp = parsePercentValue(a.roi) - parsePercentValue(b.roi);
      else if (sortKey === "winRate") comp = parsePercentValue(a.winRate) - parsePercentValue(b.winRate);
      else if (sortKey === "sharpe") comp = Number(a.sharpe) - Number(b.sharpe);
      return sortDesc ? -comp : comp;
    });
  }, [filtered, sortDesc, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const visibleMetricKeys = (Object.keys(visibleMetrics) as StrategyMetricKey[]).filter((key) => visibleMetrics[key]);

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

  const toggleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMetric = (key: StrategyMetricKey) => {
    setVisibleMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderStatus = (row: StrategyViewRow) => {
    const label = row.executionMode === "live" ? "实盘交易" : row.executionMode === "paper" ? "模拟交易" : "未运行";
    return <span className={`alpha-strategy-status is-${row.executionMode}`}>{label}</span>;
  };

  const renderMetricValue = (row: StrategyViewRow, key: StrategyMetricKey) => {
    const value = row[key];
    const tone = key === "maxDrawdown" ? "is-good" : "is-hot";
    return <span className={`alpha-mono alpha-strategy-metric ${tone}`}>{value}</span>;
  };

  if (screen === "create") {
    return <StrategyCreateModal onBack={() => setScreen("list")} onClose={onClose} />;
  }

  if (screen === "detail" && selectedStrategy) {
    return (
      <StrategyDetailModal
        strategy={selectedStrategy}
        onBack={() => setScreen("list")}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="alpha-modal-shell" role="dialog" aria-modal="true" aria-labelledby="strategy-modal-title">
      <div className="alpha-modal-backdrop" onClick={onClose} />
      <section className="alpha-modal alpha-strategy-modal">
        <header className="alpha-modal-header alpha-strategy-header">
          <div>
            <span className="alpha-modal-kicker">STRATEGY TERMINAL</span>
            <h2 id="strategy-modal-title">我的策略</h2>
          </div>
          <div className="alpha-strategy-header-actions">
            <button className="alpha-strategy-create" type="button" onClick={() => setScreen("create")}>
              <span>+</span>
              新建策略
            </button>
            <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭我的策略弹窗">
              ×
            </button>
          </div>
        </header>

        <div className="alpha-modal-content">
          <div className="alpha-modal-toolbar alpha-strategy-toolbar">
            <label className="alpha-search">
              <span>搜索</span>
              <input
                value={query}
                onChange={(event) => resetPage(() => setQuery(event.target.value))}
                placeholder="按名称或 ID 搜索..."
              />
            </label>

            <div className="alpha-modal-tools">
              <select value={strategyFilter} onChange={(event) => resetPage(() => setStrategyFilter(event.target.value as StrategyFilter))}>
                <option value="all">全部</option>
                <option value="favorites">我的收藏</option>
                <option value="paper">模拟交易</option>
                <option value="live">实盘交易</option>
              </select>
              <select value={sortKey} onChange={(event) => resetPage(() => setSortKey(event.target.value as StrategySortKey))}>
                {Object.entries(strategySortLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button type="button" onClick={() => resetPage(() => setSortDesc((value) => !value))}>
                {sortDesc ? "降序" : "升序"}
              </button>
              <details className="alpha-column-menu">
                <summary>显示项</summary>
                <div>
                  {(Object.keys(strategyMetricLabels) as StrategyMetricKey[]).map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={visibleMetrics[key]}
                        onChange={() => toggleMetric(key)}
                      />
                      {strategyMetricLabels[key]}
                    </label>
                  ))}
                  <button type="button" onClick={() => setVisibleMetrics({ ...defaultStrategyMetrics })}>恢复默认</button>
                </div>
              </details>
              <span className="alpha-view-switch" aria-label="策略视图切换">
                <button className={viewMode === "table" ? "is-active" : ""} type="button" onClick={() => setViewMode("table")}>表</button>
                <button className={viewMode === "card" ? "is-active" : ""} type="button" onClick={() => setViewMode("card")}>卡</button>
              </span>
            </div>
          </div>

          {viewMode === "table" ? (
            <div className="alpha-table-wrap alpha-strategy-table-wrap">
              <table className="alpha-table alpha-strategy-table">
                <colgroup>
                  <col style={{ width: "310px" }} />
                  <col style={{ width: "92px" }} />
                  <col style={{ width: "130px" }} />
                  {visibleMetricKeys.map((key) => (
                    <col key={key} style={{ width: key === "maxDrawdown" ? "92px" : "78px" }} />
                  ))}
                  <col style={{ width: "104px" }} />
                  <col style={{ width: "106px" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>状态</th>
                    <th className="is-center">资产曲线</th>
                    {visibleMetricKeys.map((key) => (
                      <th className="is-right" key={key}>{strategyMetricLabels[key]}</th>
                    ))}
                    <th>创建日期</th>
                    <th className="is-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.id}>
                      <td>
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
                            <small>ID:{row.id}</small>
                          </span>
                        </span>
                      </td>
                      <td>{renderStatus(row)}</td>
                      <td className="is-center"><StrategyPnl values={tablePnlValues} /></td>
                      {visibleMetricKeys.map((key) => (
                        <td className="is-right" key={key}>{renderMetricValue(row, key)}</td>
                      ))}
                      <td><span className="alpha-mono">{row.updatedAt}</span></td>
                      <td className="is-right">
                        <span className="alpha-action-group">
                          <button className="alpha-action is-more" type="button" aria-label={`${row.name} 更多操作`}>...</button>
                          <button className="alpha-action" type="button" onClick={() => {
                            setSelectedStrategy(row);
                            setScreen("detail");
                          }}>查看 ↗</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5 + visibleMetricKeys.length} className="is-empty">没有符合当前筛选条件的策略。</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alpha-card-grid alpha-strategy-card-grid">
              {pageRows.map((row) => (
                <article className="alpha-factor-card alpha-strategy-card" key={row.id}>
                  <header>
                    {renderStatus(row)}
                    <button
                      className={starred.has(row.id) ? "alpha-star is-on" : "alpha-star"}
                      type="button"
                      onClick={() => toggleStar(row.id)}
                      aria-label={`收藏 ${row.name}`}
                    >
                      ★
                    </button>
                  </header>
                  <h3>{row.name}</h3>
                  <p>{row.description}</p>
                  <StrategyPnl values={tablePnlValues} />
                  <div className="alpha-factor-metrics">
                    {visibleMetricKeys.map((key) => (
                      <span key={key}>{strategyMetricLabels[key]} <b>{row[key]}</b></span>
                    ))}
                    <span>创建日期 <b>{row.updatedAt}</b></span>
                  </div>
                  <div className="alpha-strategy-card-actions">
                    <button className="alpha-action is-more" type="button">...</button>
                    <button className="alpha-action" type="button" onClick={() => {
                      setSelectedStrategy(row);
                      setScreen("detail");
                    }}>查看 ↗</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="alpha-modal-footer">
          <span>
            {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
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
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [showBonusDetails, setShowBonusDetails] = useState(false);

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

  const selectedFactor = selectedFactorId ? factors.find((factor) => factor.id === selectedFactorId) : null;
  if (selectedFactor) {
    return (
      <FactorDetailPanel
        factor={selectedFactor}
        onBack={() => setSelectedFactorId(null)}
        onClose={onClose}
      />
    );
  }

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

        <div className="alpha-modal-content">
          <div className="alpha-modal-stats is-latest" aria-label="因子统计">
            <button type="button" className={cardFilter === "all" ? "is-active alpha-summary-card is-total" : "alpha-summary-card is-total"} onClick={() => resetPage(() => setCardFilter("all"))}>
              <span className="alpha-summary-label">因子总数</span>
              <strong>{alphaRows.length}</strong>
              <em>个因子</em>
            </button>
            <button type="button" className="alpha-summary-card is-bonus" onClick={() => setShowBonusDetails(true)}>
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
                  <col style={{ width: "96px" }} />
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
                          <button className="alpha-action" type="button" onClick={() => setSelectedFactorId(row.id)}>查看</button>
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
        </div>

        {showBonusDetails ? (
          <BonusDetailsModal gradeStats={gradeStats} onClose={() => setShowBonusDetails(false)} />
        ) : null}

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

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [viewMode, setViewMode] = useState<ViewModeSetting>("pro");
  const [plainExplain, setPlainExplain] = useState(true);
  const [colorMode, setColorMode] = useState<ColorModeSetting>("redUp");
  const [language, setLanguage] = useState<LanguageSetting>("zh");
  const [nickname, setNickname] = useState("AlphaTrader");
  const [email, setEmail] = useState("alpha.trader@quandora.ai");
  const [originalNickname, setOriginalNickname] = useState("AlphaTrader");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [emailVerCode, setEmailVerCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [passwordVerCode, setPasswordVerCode] = useState("");
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsNotice, setSettingsNotice] = useState("");
  const [exchangeApiItems, setExchangeApiItems] = useState<ExchangeApiConnection[]>(DEFAULT_EXCHANGE_API_CONNECTIONS);
  const [visibleExchangeKeys, setVisibleExchangeKeys] = useState<Set<string>>(new Set());
  const [showCreateExchangeModal, setShowCreateExchangeModal] = useState(false);
  const [exchangeCreateStep, setExchangeCreateStep] = useState<1 | 2>(1);
  const [selectedExchangeVenue, setSelectedExchangeVenue] = useState<ExchangeVenue>("binance");
  const [exchangeAccountName, setExchangeAccountName] = useState("");
  const [exchangeApiKey, setExchangeApiKey] = useState("");
  const [exchangeApiSecret, setExchangeApiSecret] = useState("");
  const [editingExchangeNameId, setEditingExchangeNameId] = useState<string | null>(null);
  const [editExchangeNameValue, setEditExchangeNameValue] = useState("");
  const [exchangeDeleteConfirmId, setExchangeDeleteConfirmId] = useState<string | null>(null);
  const [exchangeMoreMenuId, setExchangeMoreMenuId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<SettingsApiKeyItem[]>(initialSettingsApiKeys);
  const [visibleAgentKeys, setVisibleAgentKeys] = useState<Set<string>>(new Set());
  const [showCreateApiModal, setShowCreateApiModal] = useState(false);
  const [apiCreateStep, setApiCreateStep] = useState<1 | 2>(1);
  const [newApiName, setNewApiName] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [editingApiNameId, setEditingApiNameId] = useState<string | null>(null);
  const [editApiNameValue, setEditApiNameValue] = useState("");
  const [apiDeleteConfirmId, setApiDeleteConfirmId] = useState<string | null>(null);
  const [apiMoreMenuId, setApiMoreMenuId] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    signals: true,
    arena: true,
    system: true,
  });
  const emailIsInvalid = newEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail);
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 1300);
    } catch {
      setCopiedLabel(null);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
  };

  const showNotice = (message: string) => {
    setSettingsNotice(message);
    window.setTimeout(() => setSettingsNotice(""), 1600);
  };

  const cancelProfileEdit = () => {
    setNickname(originalNickname);
    setEditingProfile(false);
  };

  const saveProfile = () => {
    if (!nickname.trim()) {
      showNotice("昵称不能为空");
      return;
    }
    const nextName = nickname.trim();
    setNickname(nextName);
    setOriginalNickname(nextName);
    setEditingProfile(false);
    showNotice("资料已保存");
  };

  const cancelEmailEdit = () => {
    setEmailVerCode("");
    setEmailCodeSent(false);
    setNewEmail("");
    setEditingEmail(false);
  };

  const saveEmail = () => {
    if (!emailVerCode.trim()) {
      showNotice("请输入验证码");
      return;
    }
    if (!newEmail.trim()) {
      showNotice("请输入新邮箱");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showNotice("请输入有效邮箱");
      return;
    }
    setEmail(newEmail.trim());
    cancelEmailEdit();
    showNotice("邮箱已更新");
  };

  const cancelPasswordEdit = () => {
    setPasswordVerCode("");
    setPasswordCodeSent(false);
    setNewPassword("");
    setConfirmPassword("");
    setEditingPassword(false);
  };

  const savePassword = () => {
    if (!passwordVerCode.trim()) {
      showNotice("请输入验证码");
      return;
    }
    if (!newPassword.trim()) {
      showNotice("请输入新密码");
      return;
    }
    if (newPassword.length < 8) {
      showNotice("密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotice("两次密码不一致");
      return;
    }
    cancelPasswordEdit();
    showNotice("密码已更新");
  };

  const resetExchangeCreateFlow = () => {
    setExchangeCreateStep(1);
    setSelectedExchangeVenue("binance");
    setExchangeAccountName("");
    setExchangeApiKey("");
    setExchangeApiSecret("");
  };

  const openExchangeCreateModal = () => {
    resetExchangeCreateFlow();
    setShowCreateExchangeModal(true);
  };

  const createExchangeApi = () => {
    if (!exchangeAccountName.trim() || !exchangeApiKey.trim() || !exchangeApiSecret.trim()) {
      showNotice("请完整填写所有必填字段");
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    const nextItem: ExchangeApiConnection = {
      id: `ex-${Date.now()}`,
      venue: selectedExchangeVenue,
      accountName: exchangeAccountName.trim(),
      apiKey: exchangeApiKey.trim(),
      createdAt: now,
      updatedAt: now,
    };
    setExchangeApiItems((current) => [nextItem, ...current]);
    setShowCreateExchangeModal(false);
    resetExchangeCreateFlow();
    showNotice(`${getExchangeVenueMeta(selectedExchangeVenue).label} API 已连接`);
  };

  const saveExchangeName = (id: string) => {
    if (!editExchangeNameValue.trim()) {
      showNotice("名称不能为空");
      return;
    }
    setExchangeApiItems((current) =>
      current.map((item) => item.id === id ? { ...item, accountName: editExchangeNameValue.trim() } : item)
    );
    setEditingExchangeNameId(null);
    setEditExchangeNameValue("");
    showNotice("交易所账户名称已更新");
  };

  const deleteExchangeApi = (id: string) => {
    setExchangeApiItems((current) => current.filter((item) => item.id !== id));
    setExchangeDeleteConfirmId(null);
    setExchangeMoreMenuId(null);
    showNotice("交易所 API 已删除");
  };

  const toggleExchangeKey = (id: string) => {
    setVisibleExchangeKeys((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createApiKey = () => {
    if (!newApiName.trim()) {
      showNotice("请输入 API 名称");
      return;
    }
    setCreatedApiKey(generateSettingsApiKey());
    setApiCreateStep(2);
  };

  const finishCreateApi = () => {
    if (!createdApiKey) {
      setShowCreateApiModal(false);
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((current) => [
      {
        id: `${Date.now()}`,
        name: newApiName.trim(),
        apiKey: createdApiKey,
        skillVersion: SETTINGS_SKILL_LATEST,
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);
    setShowCreateApiModal(false);
    setApiCreateStep(1);
    setNewApiName("");
    setCreatedApiKey("");
    showNotice("API 密钥创建成功");
  };

  const saveApiName = (id: string) => {
    if (!editApiNameValue.trim()) {
      showNotice("名称不能为空");
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((current) =>
      current.map((item) => item.id === id ? { ...item, name: editApiNameValue.trim(), updatedAt: now } : item)
    );
    setEditingApiNameId(null);
    setEditApiNameValue("");
    showNotice("API 名称已更新");
  };

  const deleteApiKey = (id: string) => {
    setApiKeys((current) => current.filter((item) => item.id !== id));
    setApiDeleteConfirmId(null);
    setApiMoreMenuId(null);
    showNotice("API 密钥已删除");
  };

  const refreshApiSkill = (id: string) => {
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((current) =>
      current.map((item) => item.id === id ? { ...item, skillVersion: SETTINGS_SKILL_LATEST, updatedAt: now } : item)
    );
    showNotice("Skill 已更新到 v2.4.1");
  };

  const toggleAgentKey = (id: string) => {
    setVisibleAgentKeys((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderPixelSwitch = (checked: boolean, onClick: () => void, label: string) => (
    <button
      className={checked ? "alpha-settings-switch is-on" : "alpha-settings-switch"}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
    >
      <span />
    </button>
  );

  return (
    <div className="alpha-modal-shell" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="alpha-modal-backdrop" onClick={onClose} />
      <section className="alpha-modal alpha-settings-modal">
        <header className="alpha-modal-header alpha-settings-header">
          <div>
            <span className="alpha-modal-kicker">ACCOUNT SETTINGS</span>
            <h2 id="settings-modal-title">账户设置</h2>
            <p>管理账户资料、Agent API 密钥与交易所连接</p>
          </div>
          <button className="alpha-modal-close" type="button" onClick={onClose} aria-label="关闭设置弹窗">
            ×
          </button>
        </header>

        <div className="alpha-settings-body">
          <nav className="alpha-settings-tabs" aria-label="设置分类">
            {settingsTabs.map((tab) => (
              <button
                className={activeTab === tab.id ? "is-active" : ""}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={`alpha-settings-tab-icon is-${tab.type}`} aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "general" ? (
            <section className="alpha-settings-panel">
              <header>
                <h3><span className="alpha-settings-title-icon is-compass" />常规</h3>
              </header>
              <div className="alpha-settings-row">
                <div>
                  <strong>视角模式</strong>
                  <span>选择全站使用初学者视角或专业视角。</span>
                </div>
                <div className="alpha-settings-segment">
                  <button className={viewMode === "beginner" ? "is-active" : ""} type="button" onClick={() => setViewMode("beginner")}>
                    <span className="alpha-settings-mini-icon is-eye" />
                    初学者
                  </button>
                  <button className={viewMode === "pro" ? "is-active" : ""} type="button" onClick={() => setViewMode("pro")}>
                    <span className="alpha-settings-mini-icon is-spark" />
                    专业
                  </button>
                </div>
              </div>
              <div className="alpha-settings-row">
                <div>
                  <strong>通俗解释</strong>
                  <span>在因子与策略页面显示通俗解释。</span>
                </div>
                {renderPixelSwitch(plainExplain, () => setPlainExplain((value) => !value), "通俗解释")}
              </div>
              <div className="alpha-settings-row">
                <div>
                  <strong>语言</strong>
                  <span>设置界面与通知的显示语言。</span>
                </div>
                <div className="alpha-settings-segment is-language">
                  <button className={language === "en" ? "is-active" : ""} type="button" onClick={() => setLanguage("en")}>
                    EN
                  </button>
                  <button className={language === "zh" ? "is-active" : ""} type="button" onClick={() => setLanguage("zh")}>
                    中文
                  </button>
                </div>
              </div>
              <div className="alpha-settings-row">
                <div>
                  <strong>颜色配置</strong>
                  <span>选择上涨与下跌数值的颜色显示。</span>
                </div>
                <div className="alpha-settings-segment is-color">
                  <button className={colorMode === "redUp" ? "is-active" : ""} type="button" onClick={() => setColorMode("redUp")}>
                    红涨绿跌
                    <span className="alpha-candle-pair is-red-up" />
                  </button>
                  <button className={colorMode === "greenUp" ? "is-active" : ""} type="button" onClick={() => setColorMode("greenUp")}>
                    绿涨红跌
                    <span className="alpha-candle-pair is-green-up" />
                  </button>
                </div>
              </div>
              <div className="alpha-settings-row is-compact-list">
                <div>
                  <strong>通知设置</strong>
                  <span>控制信号、竞技场与系统消息提醒。</span>
                </div>
                <div className="alpha-settings-toggle-list">
                  {[
                    ["signals", "信号通知"],
                    ["arena", "竞技场通知"],
                    ["system", "系统消息"],
                  ].map(([key, label]) => (
                    <span key={key}>
                      {label}
                      {renderPixelSwitch(notifications[key as keyof typeof notifications], () => toggleNotification(key as keyof typeof notifications), label)}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "profile" ? (
            <section className="alpha-settings-panel">
              <header>
                <h3><span className="alpha-settings-title-icon is-user" />资料</h3>
                {settingsNotice ? <span className="alpha-settings-notice">{settingsNotice}</span> : null}
              </header>
              <article className="alpha-settings-subpanel">
                <div className="alpha-settings-subhead">
                  <h4><span className="alpha-settings-title-icon is-user" />个人资料</h4>
                  {editingProfile ? (
                    <button type="button" onClick={cancelProfileEdit}>取消</button>
                  ) : (
                    <button type="button" onClick={() => setEditingProfile(true)}>编辑</button>
                  )}
                </div>
                <div className="alpha-settings-profile">
                  <button className={editingProfile ? "alpha-settings-avatar is-editable" : "alpha-settings-avatar"} type="button" disabled={!editingProfile} aria-label="上传头像">
                    {nickname.trim().charAt(0).toUpperCase() || "A"}
                  </button>
                  <label>
                    昵称
                    <input value={nickname} disabled={!editingProfile} onChange={(event) => setNickname(event.target.value)} />
                  </label>
                  <label>
                    当前邮箱
                    <input value={email} disabled />
                  </label>
                </div>
                {editingProfile ? (
                  <div className="alpha-settings-actions">
                    <button type="button" onClick={saveProfile}>保存资料</button>
                  </div>
                ) : null}
              </article>

              <article className="alpha-settings-subpanel">
                <div className="alpha-settings-subhead">
                  <h4><span className="alpha-settings-title-icon is-mail" />修改邮箱</h4>
                  {editingEmail ? (
                    <button type="button" onClick={cancelEmailEdit}>取消</button>
                  ) : (
                    <button type="button" onClick={() => setEditingEmail(true)}>编辑</button>
                  )}
                </div>
                <div className="alpha-settings-form-grid">
                  <label>
                    当前邮箱
                    <input value={email} disabled />
                  </label>
                  {editingEmail ? (
                    <label>
                      验证码
                      <span className="alpha-settings-input-action">
                        <input value={emailVerCode} onChange={(event) => setEmailVerCode(event.target.value)} placeholder="请输入验证码" />
                        <button type="button" onClick={() => {
                          setEmailCodeSent(true);
                          showNotice("验证码已发送");
                        }}>
                          {emailCodeSent ? "重新发送" : "发送验证码"}
                        </button>
                      </span>
                    </label>
                  ) : null}
                  {editingEmail ? (
                    <label className="is-wide">
                      新邮箱
                      <input value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="请输入新邮箱地址" />
                      {emailIsInvalid ? <em>请输入有效的邮箱地址</em> : null}
                    </label>
                  ) : null}
                </div>
                {editingEmail ? (
                  <div className="alpha-settings-actions">
                    <button type="button" onClick={saveEmail}>保存邮箱</button>
                  </div>
                ) : null}
              </article>

              <article className="alpha-settings-subpanel">
                <div className="alpha-settings-subhead">
                  <h4><span className="alpha-settings-title-icon is-key" />修改密码</h4>
                  {editingPassword ? (
                    <button type="button" onClick={cancelPasswordEdit}>取消</button>
                  ) : (
                    <button type="button" onClick={() => setEditingPassword(true)}>编辑</button>
                  )}
                </div>
                {editingPassword ? (
                  <>
                    <div className="alpha-settings-form-grid">
                      <label>
                        邮箱
                        <input value={email} disabled />
                      </label>
                      <label>
                        验证码
                        <span className="alpha-settings-input-action">
                          <input value={passwordVerCode} onChange={(event) => setPasswordVerCode(event.target.value)} placeholder="请输入验证码" />
                          <button type="button" onClick={() => {
                            setPasswordCodeSent(true);
                            showNotice("验证码已发送");
                          }}>
                            {passwordCodeSent ? "重新发送" : "发送验证码"}
                          </button>
                        </span>
                      </label>
                      <label>
                        新密码
                        <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="请输入新密码" />
                      </label>
                      <label>
                        确认新密码
                        <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="请再次输入新密码" />
                        {passwordsMismatch ? <em>两次输入密码不一致</em> : null}
                      </label>
                    </div>
                    <div className="alpha-settings-actions">
                      <button type="button" onClick={savePassword}>保存密码</button>
                    </div>
                  </>
                ) : (
                  <p className="alpha-settings-help">密码修改需邮箱验证码确认。</p>
                )}
              </article>
            </section>
          ) : null}

          {activeTab === "exchange" ? (
            <section className="alpha-settings-panel">
              <header>
                <h3><span className="alpha-settings-title-icon is-link" />已连接交易所 <small>({exchangeApiItems.length})</small></h3>
                <div className="alpha-settings-header-actions">
                  {settingsNotice ? <span className="alpha-settings-notice">{settingsNotice}</span> : null}
                  <button type="button" onClick={openExchangeCreateModal}>新建交易所 API</button>
                </div>
              </header>
              {exchangeApiItems.length === 0 ? (
                <div className="alpha-settings-empty">
                  <span className="alpha-settings-title-icon is-link" />
                  <strong>尚未连接交易所 API</strong>
                  <p>添加交易所连接后即可启用实盘执行与账户同步。</p>
                </div>
              ) : (
                <div className="alpha-settings-api-list">
                  {exchangeApiItems.map((item) => {
                    const venue = getExchangeVenueMeta(item.venue);
                    const keyVisible = visibleExchangeKeys.has(item.id);
                    const maskedKey = `${item.apiKey.slice(0, 8)}${"•".repeat(10)}`;
                    return (
                      <article className="alpha-settings-exchange-card" key={item.id}>
                        <div className="alpha-settings-exchange-main">
                          <span className={`alpha-settings-venue-badge is-${item.venue}`}>{venue.iconText}</span>
                          <div>
                            {editingExchangeNameId === item.id ? (
                              <span className="alpha-settings-edit-line">
                                <input
                                  value={editExchangeNameValue}
                                  onChange={(event) => setEditExchangeNameValue(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") saveExchangeName(item.id);
                                    if (event.key === "Escape") setEditingExchangeNameId(null);
                                  }}
                                  autoFocus
                                />
                                <button type="button" onClick={() => saveExchangeName(item.id)}>保存</button>
                                <button type="button" onClick={() => setEditingExchangeNameId(null)}>取消</button>
                              </span>
                            ) : (
                              <span className="alpha-settings-name-line">
                                <strong>{item.accountName}</strong>
                                <button type="button" onClick={() => {
                                  setEditingExchangeNameId(item.id);
                                  setEditExchangeNameValue(item.accountName);
                                }}>
                                  改名
                                </button>
                              </span>
                            )}
                            <span>{venue.badge} · 更新于 {item.updatedAt}</span>
                          </div>
                        </div>
                        <div className="alpha-settings-api-field">
                          <small>API 密钥</small>
                          <code>{keyVisible ? item.apiKey : maskedKey}</code>
                          <button type="button" onClick={() => toggleExchangeKey(item.id)}>{keyVisible ? "隐藏" : "显示"}</button>
                          <button type="button" onClick={() => copyValue(`exchange-${item.id}`, item.apiKey)}>
                            {copiedLabel === `exchange-${item.id}` ? "已复制" : "复制"}
                          </button>
                        </div>
                        <div className="alpha-settings-more">
                          <button type="button" onClick={() => setExchangeMoreMenuId(exchangeMoreMenuId === item.id ? null : item.id)}>...</button>
                          {exchangeMoreMenuId === item.id ? (
                            <div>
                              <button type="button" onClick={() => setExchangeDeleteConfirmId(item.id)}>删除交易所 API</button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {showCreateExchangeModal ? (
                <div className="alpha-settings-nested-shell" role="dialog" aria-modal="true" aria-label="添加交易所 API">
                  <div className="alpha-settings-nested-backdrop" onClick={() => setShowCreateExchangeModal(false)} />
                  <section className="alpha-settings-nested-modal">
                    <header>
                      <h4>{exchangeCreateStep === 1 ? "添加交易所 API" : "配置 API 凭证"}</h4>
                      <button type="button" onClick={() => setShowCreateExchangeModal(false)}>×</button>
                    </header>
                    <div className="alpha-settings-stepper">
                      <span className="is-active">1 选择交易所</span>
                      <i />
                      <span className={exchangeCreateStep === 2 ? "is-active" : ""}>2 API 配置</span>
                    </div>
                    {exchangeCreateStep === 1 ? (
                      <div className="alpha-settings-venue-grid">
                        {(["binance", "okx"] as ExchangeVenue[]).map((venueId) => {
                          const venue = getExchangeVenueMeta(venueId);
                          return (
                            <button
                              className={selectedExchangeVenue === venueId ? "is-active" : ""}
                              key={venueId}
                              type="button"
                              onClick={() => setSelectedExchangeVenue(venueId)}
                            >
                              <span className={`alpha-settings-venue-badge is-${venueId}`}>{venue.iconText}</span>
                              <strong>{venue.label}</strong>
                              <em>{selectedExchangeVenue === venueId ? "✓" : ""}</em>
                            </button>
                          );
                        })}
                        <div className="alpha-settings-actions is-wide">
                          <button type="button" onClick={() => setExchangeCreateStep(2)}>继续</button>
                        </div>
                      </div>
                    ) : (
                      <div className="alpha-settings-form-stack">
                        <label>
                          账户名称 <b>*</b>
                          <input value={exchangeAccountName} onChange={(event) => setExchangeAccountName(event.target.value)} placeholder="例如：主力合约账户" />
                        </label>
                        <label>
                          API 密钥 <b>*</b>
                          <input value={exchangeApiKey} onChange={(event) => setExchangeApiKey(event.target.value)} placeholder="输入你的 API 密钥" />
                        </label>
                        <label>
                          API Secret <b>*</b>
                          <input value={exchangeApiSecret} onChange={(event) => setExchangeApiSecret(event.target.value)} placeholder="输入你的 API Secret" />
                        </label>
                        <div className="alpha-settings-warning">
                          <strong>安全最佳实践</strong>
                          <p>API 凭证会以加密形式存储。请勿开启提币权限，仅开启交易与只读权限即可满足策略执行与监控需求。</p>
                          <span>关闭提币权限 · 设置 IP 白名单 · 定期轮换 API 凭证</span>
                        </div>
                        <div className="alpha-settings-actions">
                          <button type="button" onClick={() => setExchangeCreateStep(1)}>返回</button>
                          <button type="button" onClick={createExchangeApi}>添加交易所 API</button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              ) : null}

              {exchangeDeleteConfirmId ? (
                <div className="alpha-settings-nested-shell" role="dialog" aria-modal="true" aria-label="删除交易所 API">
                  <div className="alpha-settings-nested-backdrop" onClick={() => setExchangeDeleteConfirmId(null)} />
                  <section className="alpha-settings-confirm-modal">
                    <header>
                      <h4>删除交易所 API</h4>
                      <button type="button" onClick={() => setExchangeDeleteConfirmId(null)}>×</button>
                    </header>
                    <p>
                      确认删除 “{exchangeApiItems.find((item) => item.id === exchangeDeleteConfirmId)?.accountName}”？
                      该操作不可撤销，此交易所账户将无法用于策略部署。
                    </p>
                    <div className="alpha-settings-actions">
                      <button type="button" onClick={() => setExchangeDeleteConfirmId(null)}>取消</button>
                      <button type="button" onClick={() => deleteExchangeApi(exchangeDeleteConfirmId)}>删除</button>
                    </div>
                  </section>
                </div>
              ) : null}
            </section>
          ) : null}

          {activeTab === "agent" ? (
            <section className="alpha-settings-panel">
              <header>
                <h3><span className="alpha-settings-title-icon is-key" />Agent API <small>({apiKeys.length})</small></h3>
                <div className="alpha-settings-header-actions">
                  {settingsNotice ? <span className="alpha-settings-notice">{settingsNotice}</span> : null}
                  <button type="button" onClick={() => {
                    setShowCreateApiModal(true);
                    setApiCreateStep(1);
                    setNewApiName("");
                    setCreatedApiKey("");
                  }}>
                    新建 API 密钥
                  </button>
                </div>
              </header>
              {apiKeys.length === 0 ? (
                <div className="alpha-settings-empty">
                  <span className="alpha-settings-title-icon is-key" />
                  <strong>暂无 API 密钥</strong>
                  <p>创建首个 API 密钥以连接你的 AI Agent。</p>
                </div>
              ) : (
                <div className="alpha-settings-api-list">
                  {apiKeys.map((item) => {
                    const keyVisible = visibleAgentKeys.has(item.id);
                    const maskedKey = `${item.apiKey.slice(0, 6)}${"•".repeat(16)}...`;
                    const needsUpdate = item.skillVersion !== SETTINGS_SKILL_LATEST;
                    return (
                      <article className="alpha-settings-exchange-card is-agent" key={item.id}>
                        <div className="alpha-settings-exchange-main">
                          <span className="alpha-settings-venue-badge is-agent">AI</span>
                          <div>
                            {editingApiNameId === item.id ? (
                              <span className="alpha-settings-edit-line">
                                <input
                                  value={editApiNameValue}
                                  onChange={(event) => setEditApiNameValue(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") saveApiName(item.id);
                                    if (event.key === "Escape") setEditingApiNameId(null);
                                  }}
                                  autoFocus
                                />
                                <button type="button" onClick={() => saveApiName(item.id)}>保存</button>
                                <button type="button" onClick={() => setEditingApiNameId(null)}>取消</button>
                              </span>
                            ) : (
                              <span className="alpha-settings-name-line">
                                <strong>{item.name}</strong>
                                <button type="button" onClick={() => {
                                  setEditingApiNameId(item.id);
                                  setEditApiNameValue(item.name);
                                }}>
                                  改名
                                </button>
                              </span>
                            )}
                            <span>
                              Skill {item.skillVersion} · 更新于 {item.updatedAt}
                              {needsUpdate ? ` · 可更新至 ${SETTINGS_SKILL_LATEST}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="alpha-settings-api-field">
                          <small>API 密钥</small>
                          <code>{keyVisible ? item.apiKey : maskedKey}</code>
                          <button type="button" onClick={() => toggleAgentKey(item.id)}>{keyVisible ? "隐藏" : "显示"}</button>
                          <button type="button" onClick={() => copyValue(`agent-${item.id}`, item.apiKey)}>
                            {copiedLabel === `agent-${item.id}` ? "已复制" : "复制"}
                          </button>
                          <button type="button" onClick={() => copyValue(`prompt-${item.id}`, buildSettingsAgentPrompt(item.apiKey, SETTINGS_SKILL_LATEST))}>
                            {copiedLabel === `prompt-${item.id}` ? "已复制" : needsUpdate ? "复制最新提示词" : "复制提示词"}
                          </button>
                          <button type="button" onClick={() => refreshApiSkill(item.id)}>检查更新</button>
                        </div>
                        <div className="alpha-settings-more">
                          <button type="button" onClick={() => setApiMoreMenuId(apiMoreMenuId === item.id ? null : item.id)}>...</button>
                          {apiMoreMenuId === item.id ? (
                            <div>
                              <button type="button" onClick={() => setApiDeleteConfirmId(item.id)}>删除 API 密钥</button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {showCreateApiModal ? (
                <div className="alpha-settings-nested-shell" role="dialog" aria-modal="true" aria-label="创建新的 API 密钥">
                  <div className="alpha-settings-nested-backdrop" onClick={() => setShowCreateApiModal(false)} />
                  <section className="alpha-settings-nested-modal is-agent-api">
                    <header>
                      <h4>{apiCreateStep === 1 ? "创建新的 API 密钥" : "API 密钥已准备就绪"}</h4>
                      <button type="button" onClick={() => apiCreateStep === 2 ? finishCreateApi() : setShowCreateApiModal(false)}>×</button>
                    </header>
                    <div className="alpha-settings-stepper">
                      <span className="is-active">1 生成 API</span>
                      <i />
                      <span className={apiCreateStep === 2 ? "is-active" : ""}>2 粘贴到 Agent</span>
                    </div>
                    {apiCreateStep === 1 ? (
                      <div className="alpha-settings-form-stack">
                        <p className="alpha-settings-help">为 API 密钥命名，便于后续识别。</p>
                        <label>
                          API 名称
                          <input
                            value={newApiName}
                            onChange={(event) => setNewApiName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") createApiKey();
                            }}
                            placeholder="例如：我的交易机器人、研究 Agent..."
                            autoFocus
                          />
                        </label>
                        <div className="alpha-settings-actions">
                          <button type="button" onClick={createApiKey}>创建 API 密钥</button>
                        </div>
                      </div>
                    ) : (
                      <div className="alpha-settings-form-stack">
                        <p className="alpha-settings-help">复制下方提示词并粘贴到你的 AI Agent，即可开始使用 Quandora Trading。</p>
                        <pre className="alpha-settings-prompt-preview">
                          {buildSettingsAgentPrompt(createdApiKey, SETTINGS_SKILL_LATEST)}
                        </pre>
                        <div className="alpha-settings-actions">
                          <button type="button" onClick={() => copyValue("new-agent-prompt", buildSettingsAgentPrompt(createdApiKey, SETTINGS_SKILL_LATEST))}>
                            {copiedLabel === "new-agent-prompt" ? "已复制" : "复制提示词"}
                          </button>
                          <button type="button" onClick={finishCreateApi}>完成</button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              ) : null}

              {apiDeleteConfirmId ? (
                <div className="alpha-settings-nested-shell" role="dialog" aria-modal="true" aria-label="删除 API 密钥">
                  <div className="alpha-settings-nested-backdrop" onClick={() => setApiDeleteConfirmId(null)} />
                  <section className="alpha-settings-confirm-modal">
                    <header>
                      <h4>删除 API 密钥</h4>
                      <button type="button" onClick={() => setApiDeleteConfirmId(null)}>×</button>
                    </header>
                    <p>
                      确认删除 “{apiKeys.find((item) => item.id === apiDeleteConfirmId)?.name}”？
                      删除后使用该密钥的 Agent 将无法继续连接。
                    </p>
                    <div className="alpha-settings-actions">
                      <button type="button" onClick={() => setApiDeleteConfirmId(null)}>取消</button>
                      <button type="button" onClick={() => deleteApiKey(apiDeleteConfirmId)}>删除</button>
                    </div>
                  </section>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default function GamePreview() {
  const [activeModal, setActiveModal] = useState<"factors" | "strategies" | "settings" | null>(null);

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
          <button className="quant-game-settings" type="button" onClick={() => setActiveModal("settings")}>
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
                if (item.type === "factor") setActiveModal("factors");
                if (item.type === "strategy") setActiveModal("strategies");
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
        {activeModal === "strategies" ? <MyStrategiesModal onClose={() => setActiveModal(null)} /> : null}
        {activeModal === "settings" ? <SettingsModal onClose={() => setActiveModal(null)} /> : null}
      </section>
    </main>
  );
}
