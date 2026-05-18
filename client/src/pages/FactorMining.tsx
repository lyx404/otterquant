import { type CSSProperties, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  Boxes,
  ChevronLeft,
  Crown,
  Database,
  Gem,
  Pickaxe,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import "./GamePreview.css";

type ToneStyle = CSSProperties & {
  "--tone"?: string;
  "--x"?: string;
  "--y"?: string;
  "--depth"?: string;
};

const navItems = [
  { label: "大厅", icon: Activity, href: "/game-preview" },
  { label: "因子矿场", icon: Pickaxe, active: true },
  { label: "卡池图鉴", icon: Boxes },
  { label: "策略阵容", icon: Shield },
  { label: "PvP 对战", icon: Swords },
  { label: "排行榜", icon: Trophy },
];

const deposits = [
  {
    name: "量价共振因子",
    type: "PRICE/VOLUME",
    score: "A",
    x: "16%",
    y: "34%",
    depth: "18deg",
    tone: "var(--gp-green)",
    icon: Zap,
  },
  {
    name: "资金费率反转",
    type: "FUNDING",
    score: "S",
    x: "42%",
    y: "58%",
    depth: "-10deg",
    tone: "var(--gp-gold)",
    icon: Crown,
  },
  {
    name: "巨鲸流突破",
    type: "ON-CHAIN",
    score: "A+",
    x: "69%",
    y: "42%",
    depth: "8deg",
    tone: "var(--gp-blue)",
    icon: Database,
  },
  {
    name: "低波动守门员",
    type: "RISK",
    score: "B+",
    x: "80%",
    y: "70%",
    depth: "-18deg",
    tone: "var(--gp-violet)",
    icon: Shield,
  },
];

const minedFactors = [
  { name: "资金费率反转", metric: "IC 0.071", tag: "可入库", tone: "var(--gp-gold)" },
  { name: "量价共振因子", metric: "Sharpe 1.92", tag: "待验证", tone: "var(--gp-green)" },
  { name: "链上筹码沉淀", metric: "DD -6.4%", tag: "碎片 8/20", tone: "var(--gp-blue)" },
];

export default function FactorMining() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(deposits[1]);

  return (
    <main className="game-preview">
      <div className="gp-stars" />
      <div className="gp-grid" />
      <div className="gp-scan" />

      <div className="gp-shell">
        <aside className="gp-sidebar" aria-label="主导航">
          <div className="gp-brand">
            <div className="gp-brand-mark">
              <span>Q</span>
              <strong>Quant Arena</strong>
            </div>
            <span className="gp-season-pill">MINE</span>
          </div>

          <div className="gp-wallet" aria-label="挖矿资源">
            <div className="gp-wallet-row">
              <span>今日钩爪</span>
              <strong>3</strong>
            </div>
            <div className="gp-wallet-row">
              <span>矿工能量</span>
              <strong>86%</strong>
            </div>
          </div>

          <nav className="gp-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={item.active ? "active" : ""}
                  key={item.label}
                  onClick={() => item.href && setLocation(item.href)}
                  type="button"
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="gp-sidebar-bottom">
            <div className="gp-pass">
              <strong>矿场规则</strong>
              <span>钩中矿点后进入因子验证，按稳定性、拥挤度和过拟合风险评分。</span>
            </div>
          </div>
        </aside>

        <section className="gp-main">
          <header className="gp-topbar">
            <div className="gp-title-line">
              <h1>因子挖矿</h1>
              <span>黄金矿工玩法 · 结果产出因子</span>
            </div>
            <button className="gp-action" onClick={() => setLocation("/game-preview")} type="button">
              <ChevronLeft size={16} />
              返回大厅
            </button>
          </header>

          <div className="gp-mining-layout">
            <section className="gp-mining-stage">
              <div className="gp-mining-head">
                <div>
                  <div className="gp-kicker">
                    <Pickaxe size={16} />
                    Factor Gold Miner
                  </div>
                  <h2>抛出钩爪，抓取因子矿点</h2>
                  <p>矿点代表不同数据源中的候选 Alpha。抓取后进入验证流程，成功则生成因子卡并加入图鉴。</p>
                </div>
                <div className="gp-mining-score">
                  <span>本局收益</span>
                  <strong>+428 Dust</strong>
                </div>
              </div>

              <div className="gp-mineshaft" aria-label="因子矿场">
                <div className="gp-crane">
                  <div className="gp-crane-base" />
                  <div className="gp-cable" />
                  <div className="gp-hook">◆</div>
                </div>

                {deposits.map((deposit) => {
                  const Icon = deposit.icon;
                  return (
                    <button
                      className={`gp-deposit ${selected.name === deposit.name ? "active" : ""}`}
                      key={deposit.name}
                      onClick={() => setSelected(deposit)}
                      style={
                        {
                          "--tone": deposit.tone,
                          "--x": deposit.x,
                          "--y": deposit.y,
                          "--depth": deposit.depth,
                        } as ToneStyle
                      }
                      type="button"
                    >
                      <Icon />
                      <span>{deposit.score}</span>
                    </button>
                  );
                })}
              </div>

              <div className="gp-mining-controls">
                <button className="gp-spin" type="button">
                  抓取当前矿点
                </button>
                <button className="gp-action" type="button">
                  更换数据矿区
                </button>
                <button className="gp-action" type="button">
                  自动验证
                </button>
              </div>
            </section>

            <aside className="gp-mining-panel">
              <section className="gp-panel-card">
                <div className="gp-section-head">
                  <div>
                    <h3>当前目标</h3>
                    <span>钩爪命中后生成因子候选</span>
                  </div>
                </div>
                <div className="gp-target-card" style={{ "--tone": selected.tone } as ToneStyle}>
                  <Gem />
                  <strong>{selected.name}</strong>
                  <span>{selected.type} · 评级 {selected.score}</span>
                  <p>预计验证成本 120 Dust，样本外稳定性通过后可装配进策略阵容。</p>
                </div>
              </section>

              <section className="gp-panel-card">
                <div className="gp-section-head">
                  <div>
                    <h3>挖矿结果</h3>
                    <span>最近产出的因子</span>
                  </div>
                </div>
                <div className="gp-mined-list">
                  {minedFactors.map((factor) => (
                    <article className="gp-mined-factor" key={factor.name} style={{ "--tone": factor.tone } as ToneStyle}>
                      <Sparkles />
                      <div>
                        <strong>{factor.name}</strong>
                        <span>{factor.metric}</span>
                      </div>
                      <em>{factor.tag}</em>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
