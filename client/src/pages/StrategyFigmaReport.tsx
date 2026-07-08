import type { ReactNode } from "react";
import "./StrategyFigmaReport.css";

type MetricTone = "good" | "warn" | "muted";

export type ReportMetric = { label: string; value: string; tone: MetricTone };

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
  { label: "Sharpe", value: "2.054", tone: "good" },
  { label: "IC", value: "—", tone: "muted" },
  { label: "Max DD", value: "20.8%", tone: "warn" },
  { label: "Calmar", value: "4.800", tone: "good" },
  { label: "Hit Rate", value: "—", tone: "muted" },
  { label: "Turnover", value: "1.231", tone: "muted" },
];

const navMetrics: Array<[string, string]> = [
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
  "Meme",
  "Internet of Things (IOT)",
  "Avalanche Ecosystem",
  "UNKNOWN",
  "Near Protocol Ecosystem",
  "Fantom Ecosystem",
  "Automated Market Maker (AMM)",
  "Entertainment",
  "Huobi ECO Chain Ecosystem",
  "Cosmos Ecosystem",
  "Bridged-Tokens",
  "Cross-chain Communication",
  "Masternodes",
  "Linea Ecosystem",
  "Infrastructure",
  "Storage",
  "Gaming (GameFi)",
  "Artificial Intelligence (AI)",
  "Decentralized Exchange (DEX)",
  "Crypto-Backed Tokens",
  "Solana Ecosystem",
  "BNB Chain Ecosystem",
  "Decentralized Finance (DeFi)",
  "Smart Contract Platform",
].map((label, index, rows) => {
  const progress = index / (rows.length - 1);
  return {
    label,
    long: 0.38 + progress * 0.52 + (index % 5) * 0.02,
    short: 0.32 + progress * 0.44 + (index % 7) * 0.018,
  };
});

const sectorRankRows: Array<[string, number]> = [
  ["Gaming (GameFi)", -0.23],
  ["NFT", -0.17],
  ["Automated Market Maker (AMM)", -0.02],
  ["GMT", 0.01],
  ["Huobi ECO Chain Ecosystem", 0.02],
  ["Fantom Ecosystem", 0.04],
  ["Solana Ecosystem", 0.05],
  ["Linea Ecosystem", 0.06],
  ["Cosmos Ecosystem", 0.07],
  ["Avalanche Ecosystem", 0.08],
  ["IoT", 0.09],
  ["Masternodes", 0.1],
  ["Bridged-Tokens", 0.11],
  ["Internet of Things (IOT)", 0.12],
  ["UNKNOWN", 0.13],
  ["Cross-chain Communication", 0.15],
  ["Crypto-Backed Tokens", 0.17],
  ["Decentralized Finance (DeFi)", 0.3],
  ["Decentralized Exchange (DEX)", 0.33],
  ["Smart Contract Platform", 0.55],
];

const defaultPositions: ReportPositionRecord[] = [
  { symbol: "FILUSDT", side: "Cross Short", entry: "0.885", interest: "451.4 FIL", opened: "2026-02-10 22:17:26", closed: "2026-02-10 23:08:11", pnl: "+1.35 USDT" },
  { symbol: "ICPUSDT", side: "Cross Long", entry: "2.375", interest: "168 ICP", opened: "2026-02-10 22:17:26", closed: "2026-02-10 23:08:08", pnl: "+2.52 USDT" },
  { symbol: "DOTUSDT", side: "Cross Short", entry: "1.278", interest: "312.8 DOT", opened: "2026-02-10 18:02:43", closed: "2026-02-10 21:44:43", pnl: "-2.50 USDT" },
  { symbol: "KSMUSDT", side: "Cross Long", entry: "4.153", interest: "96.3 KSM", opened: "2026-02-11 04:32:33", closed: "2026-02-11 11:54:24", pnl: "+2.82 USDT" },
];

const linePalette = ["#ebbc47", "#479ef5", "#29d668", "#e44444", "#b36af5", "#12c8b1", "#ff7a1a", "#d946ef"];

function makeSeries(count: number, seed: number, drift = 0.7, amp = 0.2) {
  return Array.from({ length: count }, (_, index) => {
    const x = index / Math.max(1, count - 1);
    const wave = Math.sin(index * (0.27 + seed * 0.015)) * amp;
    const wobble = Math.cos(index * (0.13 + seed * 0.01)) * amp * 0.4;
    return 0.7 + x * drift + wave + wobble + seed * 0.015;
  });
}

function toPath(values: number[], width: number, height: number, padding = 18) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  return values
    .map((value, index) => {
      const x = padding + (index / Math.max(1, values.length - 1)) * innerWidth;
      const y = height - padding - ((value - min) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function ReportCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`oq-report-card ${className}`}>
      <header className="oq-report-card-header">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      <div className="oq-report-card-body">{children}</div>
    </section>
  );
}

function LegendItem({ color, label, mark = "bar" }: { color: string; label: string; mark?: "bar" | "cross" }) {
  return (
    <span className="oq-report-legend-item">
      <span className={mark === "cross" ? "oq-report-cross-mark" : "oq-report-legend-dot"} style={{ color, background: mark === "bar" ? color : undefined }}>
        {mark === "cross" ? "×" : null}
      </span>
      {label}
    </span>
  );
}

function PortfolioNavChart() {
  const net = makeSeries(92, 1, 1.55, 0.08);
  const gross = makeSeries(92, 3, 2.25, 0.11);
  const drawdown = makeSeries(92, 7, -0.22, 0.24).map((value, index) => -Math.abs(value - 0.78 + Math.sin(index * 0.42) * 0.16));
  return (
    <div className="oq-nav-chart">
      <svg viewBox="240 0 880 486" preserveAspectRatio="none">
        <g className="oq-chart-grid">
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={line} x1="326" x2="1054" y1={48 + line * 54} y2={48 + line * 54} />
          ))}
          {[0, 1, 2].map((line) => (
            <line key={`dd-${line}`} x1="326" x2="1054" y1={314 + line * 46} y2={314 + line * 46} />
          ))}
        </g>
        <path d={toPath(gross, 760, 238, 30).replaceAll(" ", " ").replace(/([ML]) /g, "$1 ")} transform="translate(296 16)" className="oq-line-blue" />
        <path d={toPath(net, 760, 238, 30)} transform="translate(296 16)" className="oq-line-gold" />
        <path d={toPath(drawdown, 760, 150, 18)} transform="translate(296 298)" className="oq-line-gold" />
        <text x="286" y="50">3.57</text>
        <text x="286" y="104">2.88</text>
        <text x="286" y="158">2.20</text>
        <text x="286" y="212">1.51</text>
        <text x="286" y="266">0.82</text>
        <text x="286" y="314">0%</text>
        <text x="276" y="360">-10%</text>
        <text x="276" y="406">-20%</text>
        <text x="308" y="470">2021-01</text>
        <text x="456" y="470">2021-04</text>
        <text x="606" y="470">2021-07</text>
        <text x="756" y="470">2021-10</text>
        <text x="906" y="470">2022-03</text>
        <text x="1046" y="470">2022-06</text>
        <text x="326" y="294">Drawdown · worst -20.99%</text>
        <text x="736" y="156" className="oq-loss-marker">×</text>
        <text x="744" y="174" className="oq-gain-marker">×</text>
      </svg>
      <div className="oq-report-legend">
        <LegendItem color="#ebbc47" label="Net NAV" />
        <LegendItem color="#479ef5" label="Gross NAV" />
        <LegendItem color="#e44444" label="Max DD peak" mark="cross" />
        <LegendItem color="#29d668" label="Max DD trough" mark="cross" />
      </div>
    </div>
  );
}

function MetricsTable({ rows = navMetrics }: { rows?: Array<[string, string]> }) {
  return (
    <div className="oq-report-metrics-table">
      <div className="oq-report-table-row is-head">
        <span>Metric</span>
        <span>Value</span>
      </div>
      {rows.map(([metric, value]) => (
        <div className="oq-report-table-row" key={metric}>
          <span>{metric}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ExposureChart() {
  return (
    <div className="oq-exposure-chart">
      <div className="oq-exposure-axis">
        <span>-0.15</span><span>-0.07</span><span>0.00</span><span>0.07</span><span>0.15</span>
      </div>
      {exposureRows.map((row) => (
        <div className="oq-exposure-row" key={row.label}>
          <span>{row.label}</span>
          <i style={{ width: `${row.short * 42}%` }} />
          <b style={{ width: `${row.long * 42}%` }} />
        </div>
      ))}
      <div className="oq-report-legend">
        <LegendItem color="#29d668" label="Long" />
        <LegendItem color="#e44444" label="Short" />
      </div>
    </div>
  );
}

function SectorRankChart() {
  return (
    <div className="oq-rank-chart">
      <div className="oq-rank-axis"><span>-0.23</span><span>0.00</span><span>0.29</span><span>0.55</span></div>
      {sectorRankRows.map(([label, value]) => (
        <div className="oq-rank-row" key={label}>
          <span>{label}</span>
          <b className={value < 0 ? "is-negative" : ""} style={{ width: `${Math.max(3, Math.abs(value) * 118)}%` }} />
        </div>
      ))}
    </div>
  );
}

function DenseLines({ count = 42, height = 260 }: { count?: number; height?: number }) {
  return (
    <svg className="oq-dense-lines" viewBox={`180 0 800 ${height}`} preserveAspectRatio="none">
      {[0, 1, 2, 3].map((line) => <line key={line} x1="220" x2="920" y1={32 + line * 52} y2={32 + line * 52} />)}
      {Array.from({ length: count }, (_, index) => {
        const path = toPath(makeSeries(70, index, 0.08 - (index % 7) * 0.035, 0.08 + (index % 4) * 0.03), 720, height - 50, 12);
        return <path key={index} d={path} transform="translate(210 22)" stroke={linePalette[index % linePalette.length]} opacity="0.72" />;
      })}
      <text x="210" y={height - 10}>2021-01</text>
      <text x="430" y={height - 10}>2021-06</text>
      <text x="650" y={height - 10}>2021-11</text>
      <text x="890" y={height - 10}>2022-06</text>
    </svg>
  );
}

function AttributionGrid() {
  const titles = [
    "预测分位收益 / Prediction Decile Returns (cum)",
    "风格多空累计收益 / Barra Style Long-Short Returns (cum)",
    "风格暴露 / Mean Daily Barra Exposure",
    "预测衰减 / Prediction Return Autocorr Decay",
    "预测风格相关 / Prediction-Barra Correlation (EMA250)",
    "日换手率 / Daily Turnover Rate",
  ];
  return (
    <div className="oq-attribution-grid">
      {titles.map((title, index) => (
        <div className="oq-mini-card" key={title}>
          <h3><span />{title}</h3>
          {index === 2 ? (
            <div className="oq-mini-bars">
              {[0.24, -0.16, 0.5, -0.62, 0.54, -0.21, 0.49, 0.08, -0.05, 0.04].map((value, barIndex) => (
                <i key={barIndex} className={value < 0 ? "is-short" : ""} style={{ height: `${Math.abs(value) * 82}%` }} />
              ))}
            </div>
          ) : (
            <DenseLines count={index === 3 ? 2 : index === 5 ? 3 : 8} height={150} />
          )}
        </div>
      ))}
    </div>
  );
}

function PositionHistory({ rows = defaultPositions }: { rows?: ReportPositionRecord[] }) {
  return (
    <section className="oq-position-card">
      <header>
        <div>
          <h2>Position History</h2>
          <p>Closed positions from the latest strategy replay</p>
        </div>
      </header>
      <div className="oq-position-table">
        <div className="oq-position-head">
          <span>Position</span><span>Entry Price</span><span>Max Open Interest</span><span>Opened</span><span>Closed</span><span>PnL</span>
        </div>
        {rows.map((position) => (
          <article key={position.symbol}>
            <div className="oq-position-symbol">
              <strong>{position.symbol}</strong>
              <span>Perp</span>
              <span>{position.side}</span>
              <small>Closed</small>
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
  actions,
  metricRows = navMetrics,
  positions = defaultPositions,
}: {
  title?: string;
  subtitle?: string;
  headerMetrics?: ReportMetric[];
  dateLabel?: string;
  actions?: ReactNode;
  metricRows?: Array<[string, string]>;
  positions?: ReportPositionRecord[];
}) {
  return (
    <div className="oq-strategy-figma-report">
      <header className="oq-report-top">
        <div className="oq-report-title-block">
          <span className="oq-report-kicker">Strategy Workbench</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="oq-report-head-tools">
          <div className="oq-report-metric-strip">
            {headerMetrics.map((metric) => (
              <div className="oq-report-metric" data-tone={metric.tone} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
            <button type="button">{dateLabel}⌄</button>
          </div>
          {actions ? <div className="oq-report-actions">{actions}</div> : null}
        </div>
      </header>

      <ReportCard title="组合净值 / Portfolio NAV · 回撤 / Drawdown" subtitle="net & gross NAV · 1500 pts" className="is-nav">
        <PortfolioNavChart />
        <MetricsTable rows={metricRows} />
      </ReportCard>

      <div className="oq-report-two-col">
        <ReportCard title="行业暴露 / Average Sector Exposure" subtitle="long (+) / short (-) avg abs weight">
          <ExposureChart />
        </ReportCard>
        <ReportCard title="行业收益排名 / Sector Return Rank" subtitle="total pnl contribution · top + bottom">
          <SectorRankChart />
        </ReportCard>
      </div>

      <ReportCard title="单币种累计 PnL / Single-Symbol Cumulative PnL (All)" subtitle="99 symbols">
        <DenseLines count={58} height={320} />
      </ReportCard>

      <ReportCard title="单币种 Top/Bottom / Single-Symbol PnL Rank" subtitle="ranked by total pnl">
        <div className="oq-split-lines">
          <DenseLines count={9} height={210} />
          <DenseLines count={9} height={210} />
        </div>
      </ReportCard>

      <ReportCard title="截面归因概览 / CS Attribution Overview" subtitle="7 Barra factors · attribution dashboard">
        <AttributionGrid />
      </ReportCard>

      <PositionHistory rows={positions} />
    </div>
  );
}
