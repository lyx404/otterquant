import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Cpu,
  Gauge,
  Goal,
  Layers3,
  LockKeyhole,
  Medal,
  PackageOpen,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Users,
  WandSparkles,
} from "lucide-react";

const IMG_OFFICIAL_FACTORS = "/landing/official-factors.png";
const IMG_OFFICIAL_STRATEGIES = "/landing/official-strategies.png";

const draftPicks = [
  { pick: "01", nameEn: "Momentum Forward", nameZh: "动量前锋", score: "91", cap: "$18.4K" },
  { pick: "02", nameEn: "Volatility Keeper", nameZh: "波动守门员", score: "87", cap: "$14.9K" },
  { pick: "03", nameEn: "On-chain Scout", nameZh: "链上球探", score: "84", cap: "$11.6K" },
  { pick: "04", nameEn: "Funding Captain", nameZh: "资金费率队长", score: "82", cap: "$9.8K" },
];

const lineupSlots = [
  { slotEn: "Captain", slotZh: "队长", factorEn: "Carry Alpha", factorZh: "Carry 因子", value: "+18.2%" },
  { slotEn: "Offense", slotZh: "进攻", factorEn: "Breakout", factorZh: "突破因子", value: "1.74 SR" },
  { slotEn: "Defense", slotZh: "防守", factorEn: "Drawdown Guard", factorZh: "回撤防线", value: "-6.8%" },
  { slotEn: "Bench", slotZh: "替补", factorEn: "Alt-data Rookie", factorZh: "另类数据新秀", value: "42% owned" },
];

const journey = [
  {
    step: "01",
    titleEn: "Enter the league",
    titleZh: "加入联赛",
    descEn: "Bring your own AI agent or use the platform scout desk.",
    descZh: "自带 AI Agent，或使用平台球探工作台。",
    icon: Users,
    tone: "blue",
  },
  {
    step: "02",
    titleEn: "Mine the draft pool",
    titleZh: "挖掘选秀池",
    descEn: "Submit factor ideas, templates, or natural language briefs.",
    descZh: "提交因子想法、模板或自然语言战术简报。",
    icon: WandSparkles,
    tone: "amber",
  },
  {
    step: "03",
    titleEn: "Run the combine",
    titleZh: "参加体测",
    descEn: "AWS backtests score Sharpe, fitness, turnover, and drawdown.",
    descZh: "AWS 回测自动评估夏普、适应度、换手和回撤。",
    icon: Gauge,
    tone: "violet",
  },
  {
    step: "04",
    titleEn: "Draft a roster",
    titleZh: "组建阵容",
    descEn: "Pick factors under a salary cap and assign roles.",
    descZh: "在工资帽内挑选因子，并分配队长、进攻、防守角色。",
    icon: ClipboardList,
    tone: "green",
  },
  {
    step: "05",
    titleEn: "Play gameweeks",
    titleZh: "打每轮比赛",
    descEn: "Strategies compete in simulated markets and live paper trading.",
    descZh: "策略进入模拟盘与纸面交易，按赛周结算积分。",
    icon: Play,
    tone: "red",
  },
  {
    step: "06",
    titleEn: "Win, upgrade, repeat",
    titleZh: "领奖升级",
    descEn: "Winners earn cash, signals, and membership conversion moments.",
    descZh: "优胜者获得现金、跟单信号与会员转化权益。",
    icon: Trophy,
    tone: "cyan",
  },
];

const mechanics = [
  {
    titleEn: "Factor Draft",
    titleZh: "因子选秀",
    textEn: "Every verified factor becomes a player card with form, risk, usage, and salary cap value.",
    textZh: "每个通过验证的因子都会变成球员卡，展示状态、风险、使用率和工资帽价值。",
    icon: Layers3,
  },
  {
    titleEn: "Gameweek Scoring",
    titleZh: "赛周积分",
    textEn: "Backtest and paper-trade results turn into points, streaks, badges, and leaderboard movement.",
    textZh: "回测和模拟交易结果转成积分、连胜、徽章与排行榜变化。",
    icon: Goal,
  },
  {
    titleEn: "League Pass",
    titleZh: "联赛通行证",
    textEn: "Free users can play practice leagues. Members unlock high-confidence signals and advanced contests.",
    textZh: "免费用户可参与练习联赛，会员解锁高置信信号与高级比赛。",
    icon: LockKeyhole,
  },
];

const flywheel = [
  { n: "01", labelEn: "Users submit ideas", labelZh: "用户提交想法" },
  { n: "02", labelEn: "AI scouts factors", labelZh: "AI 球探挖因子" },
  { n: "03", labelEn: "Combine validates", labelZh: "体测验证" },
  { n: "04", labelEn: "Cards enter draft", labelZh: "进入选秀卡池" },
  { n: "05", labelEn: "Rosters create demand", labelZh: "阵容产生需求" },
  { n: "06", labelEn: "Prizes pull creators", labelZh: "奖金吸引创作者" },
];

const scoreboardRows = [
  { rank: "01", teamEn: "Signal City FC", teamZh: "信号城 FC", pnl: "+24.8%", sharpe: "2.18", badge: "Playoff" },
  { rank: "02", teamEn: "Vol Guards", teamZh: "波动守卫", pnl: "+19.6%", sharpe: "1.91", badge: "Chase" },
  { rank: "03", teamEn: "Carry United", teamZh: "Carry 联队", pnl: "+16.2%", sharpe: "1.77", badge: "Rising" },
];

const scoutCards = [
  {
    rarity: "Legendary",
    titleEn: "Funding Rate Reversal",
    titleZh: "资金费率反转",
    roleEn: "Contrarian Striker",
    roleZh: "反转前锋",
    potential: "96",
    salary: "$21.2K",
    traitEn: "Crowding Punisher",
    traitZh: "拥挤交易惩罚者",
    risk: "Med",
    color: "legendary",
  },
  {
    rarity: "Epic",
    titleEn: "Whale Flow Breakout",
    titleZh: "巨鲸流突破",
    roleEn: "On-chain Winger",
    roleZh: "链上边锋",
    potential: "89",
    salary: "$16.7K",
    traitEn: "High Conviction",
    traitZh: "高置信",
    risk: "High",
    color: "epic",
  },
  {
    rarity: "Rare",
    titleEn: "Volatility Keeper",
    titleZh: "波动守门员",
    roleEn: "Risk Guard",
    roleZh: "风险后卫",
    potential: "81",
    salary: "$9.4K",
    traitEn: "Crash Resistant",
    traitZh: "抗暴跌",
    risk: "Low",
    color: "rare",
  },
];

const combineStats = [
  { label: "Sharpe", value: "2.41" },
  { label: "Fitness", value: "1.88" },
  { label: "Max DD", value: "-7.2%" },
  { label: "Overfit", value: "18%" },
];

const lineupCards = [
  { zone: "Captain", nameEn: "Funding Reversal", nameZh: "资金费率反转", score: "+32" },
  { zone: "Core", nameEn: "Whale Breakout", nameZh: "巨鲸突破", score: "+24" },
  { zone: "Core", nameEn: "Basis Carry", nameZh: "基差 Carry", score: "+19" },
  { zone: "Defense", nameEn: "Vol Keeper", nameZh: "波动守门员", score: "+16" },
  { zone: "Bench", nameEn: "Macro Rookie", nameZh: "宏观新秀", score: "+8" },
];

const coachNotes = [
  { labelEn: "Exposure", labelZh: "暴露", textEn: "Momentum is high. Add one defensive card.", textZh: "动量暴露偏高，建议加入一张防守卡。" },
  { labelEn: "Synergy", labelZh: "协同", textEn: "Captain has low correlation with Whale Breakout.", textZh: "队长卡与巨鲸突破相关性较低。" },
  { labelEn: "Matchup", labelZh: "对阵", textEn: "This lineup fits high funding, low liquidity weeks.", textZh: "适合高资金费率、低流动性的赛周。" },
];

type TFunc = (en: string, zh: string) => string;

function DraftRoom({ tr }: { tr: TFunc }) {
  return (
    <div className="draft-room" aria-label={tr("Live fantasy quant draft room", "实时 Fantasy 量化选秀室")}>
      <div className="draft-strip">
        {draftPicks.map((pick) => (
          <div className="draft-pick" key={pick.pick}>
            <span>{pick.pick}</span>
            <strong>{tr(pick.nameEn, pick.nameZh)}</strong>
            <em>{pick.score}</em>
            <small>{pick.cap}</small>
          </div>
        ))}
      </div>
      <div className="lineup-panel">
        <div className="panel-heading">
          <span>{tr("Roster Lock", "阵容锁定")}</span>
          <strong>{tr("Gameweek 08", "第 08 赛周")}</strong>
        </div>
        <div className="lineup-grid">
          {lineupSlots.map((item) => (
            <div className="lineup-slot" key={item.slotEn}>
              <span>{tr(item.slotEn, item.slotZh)}</span>
              <strong>{tr(item.factorEn, item.factorZh)}</strong>
              <em>{item.value}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="score-tape">
        <span>{tr("Salary cap", "工资帽")} $54.7K / $60K</span>
        <span>{tr("Projected points", "预计积分")} 182.4</span>
        <span>{tr("Reward pool", "奖池")} $10K</span>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  tone = "solid",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "solid" | "quiet";
}) {
  return (
    <button className={`q-button ${tone}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function ScoutPackShowcase({ tr }: { tr: TFunc }) {
  const [active, setActive] = useState(0);
  const selected = scoutCards[active];

  return (
    <div className="scout-lab">
      <div className="prompt-console">
        <div className="console-head">
          <span>{tr("Scout Prompt", "球探提示词")}</span>
          <strong>{tr("BTC Weekly Pack", "BTC 周赛卡包")}</strong>
        </div>
        <p>
          {tr(
            "Find reversal factors after funding rates overheat and open interest stops expanding.",
            "寻找资金费率过热且持仓量停止扩张后的反转因子。"
          )}
        </p>
        <div className="console-actions">
          <span>{tr("Market", "市场")} BTC / Perp</span>
          <span>{tr("Cost", "消耗")} 3 credits</span>
          <span>{tr("Pack", "卡包")} 3 cards</span>
        </div>
      </div>

      <div className="pack-stage">
        {scoutCards.map((card, index) => (
          <button
            className={`factor-card ${card.color} ${active === index ? "active" : ""}`}
            key={card.titleEn}
            onClick={() => setActive(index)}
            type="button"
          >
            <span className="rarity">{card.rarity}</span>
            <strong>{tr(card.titleEn, card.titleZh)}</strong>
            <em>{tr(card.roleEn, card.roleZh)}</em>
            <div className="card-stats">
              <span>{tr("POT", "潜力")} {card.potential}</span>
              <span>{card.salary}</span>
            </div>
            <small>{tr(card.traitEn, card.traitZh)}</small>
          </button>
        ))}
      </div>

      <div className="combine-panel">
        <div className="combine-title">
          <span className={`rarity-dot ${selected.color}`} />
          <div>
            <strong>{tr("Send to Combine", "送入体测")}</strong>
            <p>{tr(selected.titleEn, selected.titleZh)} · {tr(selected.traitEn, selected.traitZh)}</p>
          </div>
        </div>
        <div className="combine-grid">
          {combineStats.map((stat) => (
            <div key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
        <div className="combine-result">
          <ShieldCheck size={18} />
          {tr("Passes validation. Eligible for draft pool and creator rewards.", "通过验证，可进入选秀池并参与创作者收益。")}
        </div>
      </div>
    </div>
  );
}

function LineupBuilderShowcase({ tr }: { tr: TFunc }) {
  return (
    <div className="lineup-builder">
      <div className="league-panel">
        <div className="league-header">
          <span>{tr("League Mode", "联赛模式")}</span>
          <strong>{tr("High Sharpe Arena", "高夏普竞技场")}</strong>
        </div>
        <div className="formation-toggle">
          <button type="button">Balanced</button>
          <button type="button" className="selected">Contrarian</button>
          <button type="button">Defensive</button>
        </div>
        <div className="salary-meter">
          <div>
            <span>{tr("Salary Cap", "工资帽")}</span>
            <strong>$53.1K / $60K</strong>
          </div>
          <i />
        </div>
      </div>

      <div className="pitch-board">
        {lineupCards.map((card) => (
          <div className={`pitch-card ${card.zone.toLowerCase()}`} key={card.nameEn}>
            <span>{card.zone}</span>
            <strong>{tr(card.nameEn, card.nameZh)}</strong>
            <em>{card.score}</em>
          </div>
        ))}
      </div>

      <div className="coach-panel">
        <div className="coach-head">
          <Cpu size={18} />
          <strong>{tr("AI Coach Review", "AI 教练复盘")}</strong>
        </div>
        {coachNotes.map((note) => (
          <div className="coach-note" key={note.labelEn}>
            <span>{tr(note.labelEn, note.labelZh)}</span>
            <p>{tr(note.textEn, note.textZh)}</p>
          </div>
        ))}
        <div className="match-score">
          <span>{tr("Projected Gameweek Score", "预计赛周积分")}</span>
          <strong>184.6</strong>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { uiLang, setUiLang } = useAppLanguage();
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const isDark = theme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>("[data-hero]");
    items.forEach((item, index) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(18px)";
      item.style.transition = `opacity 560ms ease ${index * 80}ms, transform 560ms ease ${index * 80}ms`;
      requestAnimationFrame(() => {
        item.style.opacity = "1";
        item.style.transform = "translateY(0)";
      });
    });
  }, []);

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.unobserve(el);
        });
      },
      { threshold: 0.12 }
    );

    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity 520ms ease, transform 520ms ease";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const start = () => navigate(isAuthenticated ? "/" : "/launch-guide");
  const jumpToDraft = () => document.getElementById("draft")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className={`fantasy-quant ${isDark ? "is-dark" : "is-light"}`}>
      <style>{`
        .fantasy-quant {
          --surface: oklch(97.5% 0.01 156);
          --surface-2: oklch(93% 0.018 156);
          --ink: oklch(18% 0.027 172);
          --muted: oklch(46% 0.027 172);
          --line: oklch(84% 0.026 156);
          --field: oklch(38% 0.095 154);
          --field-2: oklch(30% 0.076 160);
          --gold: oklch(73% 0.14 82);
          --red: oklch(59% 0.17 25);
          --blue: oklch(56% 0.13 245);
          --violet: oklch(57% 0.15 295);
          --cyan: oklch(65% 0.11 198);
          --card: oklch(99% 0.006 156);
          --space-xs: 4px;
          --space-sm: 8px;
          --space-md: 12px;
          --space-lg: 16px;
          --space-xl: 24px;
          --space-2xl: 32px;
          --space-3xl: 48px;
          --space-4xl: 64px;
          background: var(--surface);
          color: var(--ink);
          min-height: 100vh;
          font-family: "Aptos", "Söhne", "Segoe UI", sans-serif;
        }

        .fantasy-quant.is-dark {
          --surface: oklch(15% 0.025 172);
          --surface-2: oklch(20% 0.027 172);
          --ink: oklch(95% 0.009 156);
          --muted: oklch(70% 0.022 156);
          --line: oklch(29% 0.028 172);
          --field: oklch(38% 0.098 154);
          --field-2: oklch(24% 0.072 160);
          --card: oklch(20% 0.027 172);
        }

        .q-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          border-bottom: 1px solid transparent;
          transition: background 180ms ease, border-color 180ms ease;
        }

        .q-nav.scrolled {
          background: color-mix(in oklch, var(--surface) 88%, transparent);
          border-color: var(--line);
          backdrop-filter: blur(18px);
        }

        .q-wrap {
          width: min(1180px, calc(100% - 32px));
          margin: 0 auto;
        }

        .q-nav-inner {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-lg);
        }

        .q-brand {
          display: inline-flex;
          align-items: center;
          gap: var(--space-md);
          color: var(--ink);
          text-decoration: none;
          font-weight: 800;
        }

        .q-brand img {
          width: 34px;
          height: 34px;
          border-radius: 8px;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .lang-toggle,
        .login-pill {
          height: 34px;
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 0 12px;
          color: var(--ink);
          background: color-mix(in oklch, var(--card) 82%, transparent);
          font-size: 12px;
          font-weight: 700;
        }

        .login-pill {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--surface);
          text-decoration: none;
        }

        .hero {
          position: relative;
          min-height: 92vh;
          padding-top: 60px;
          overflow: hidden;
          background: var(--field-2);
          color: oklch(97% 0.01 156);
        }

        .hero-bg {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-columns: 1fr;
          opacity: 0.62;
        }

        .hero-bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(0.85);
        }

        .hero-cover {
          position: absolute;
          inset: 0;
          background: color-mix(in oklch, var(--field-2) 76%, transparent);
        }

        .pitch-lines {
          position: absolute;
          inset: 72px 24px 24px;
          border: 1px solid color-mix(in oklch, white 28%, transparent);
          border-radius: 8px;
          pointer-events: none;
        }

        .pitch-lines::before,
        .pitch-lines::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: color-mix(in oklch, white 26%, transparent);
        }

        .pitch-lines::before { left: 33.33%; }
        .pitch-lines::after { right: 33.33%; }

        .hero-content {
          position: relative;
          z-index: 2;
          min-height: calc(92vh - 60px);
          display: grid;
          align-content: center;
          padding: var(--space-4xl) 0 var(--space-3xl);
        }

        .hero-copy {
          width: min(760px, 100%);
          display: grid;
          gap: var(--space-xl);
        }

        .eyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: var(--space-sm);
          padding: 8px 10px;
          border: 1px solid color-mix(in oklch, white 32%, transparent);
          border-radius: 8px;
          background: color-mix(in oklch, var(--field-2) 72%, transparent);
          font-size: 12px;
          font-weight: 800;
        }

        .hero h1 {
          margin: 0;
          max-width: 820px;
          font-size: 56px;
          line-height: 1.02;
          letter-spacing: 0;
          font-weight: 900;
        }

        .hero p {
          max-width: 650px;
          margin: 0;
          color: oklch(89% 0.018 156);
          font-size: 17px;
          line-height: 1.75;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
        }

        .q-button {
          min-height: 44px;
          border-radius: 8px;
          border: 1px solid color-mix(in oklch, var(--ink) 14%, transparent);
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          font-weight: 800;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }

        .q-button:hover {
          transform: translateY(-1px);
        }

        .q-button.solid {
          background: oklch(90% 0.12 92);
          border-color: oklch(90% 0.12 92);
          color: oklch(19% 0.04 160);
        }

        .q-button.quiet {
          background: color-mix(in oklch, white 9%, transparent);
          border-color: color-mix(in oklch, white 34%, transparent);
          color: oklch(97% 0.01 156);
        }

        .draft-room {
          position: absolute;
          right: max(24px, calc((100vw - 1180px) / 2));
          bottom: 34px;
          z-index: 3;
          width: min(520px, calc(100% - 48px));
          display: grid;
          gap: var(--space-md);
        }

        .draft-strip,
        .lineup-panel,
        .score-tape {
          border: 1px solid color-mix(in oklch, white 28%, transparent);
          border-radius: 8px;
          background: color-mix(in oklch, var(--field-2) 70%, transparent);
          backdrop-filter: blur(14px);
        }

        .draft-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          overflow: hidden;
        }

        .draft-pick {
          min-height: 108px;
          padding: 12px;
          display: grid;
          align-content: space-between;
          gap: var(--space-sm);
          background: color-mix(in oklch, white 7%, transparent);
        }

        .draft-pick span,
        .draft-pick small,
        .lineup-slot span,
        .score-tape span {
          font-size: 11px;
          color: oklch(83% 0.02 156);
        }

        .draft-pick strong,
        .lineup-slot strong {
          font-size: 13px;
          line-height: 1.25;
        }

        .draft-pick em,
        .lineup-slot em {
          font-style: normal;
          font-weight: 900;
          color: oklch(90% 0.12 92);
        }

        .lineup-panel {
          padding: 14px;
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
          font-size: 12px;
        }

        .panel-heading strong {
          color: oklch(90% 0.12 92);
        }

        .lineup-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-sm);
        }

        .lineup-slot {
          min-height: 84px;
          display: grid;
          gap: var(--space-xs);
          padding: 10px;
          border: 1px solid color-mix(in oklch, white 18%, transparent);
          border-radius: 8px;
        }

        .score-tape {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding: 10px 12px;
        }

        .section {
          padding: 88px 0;
          background: var(--surface);
        }

        .section.alt {
          background: var(--surface-2);
        }

        .section-head {
          display: grid;
          gap: var(--space-md);
          max-width: 720px;
          margin-bottom: var(--space-3xl);
        }

        .section-kicker {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: var(--space-sm);
          color: var(--field);
          font-size: 12px;
          font-weight: 900;
        }

        .section h2 {
          margin: 0;
          font-size: 34px;
          line-height: 1.18;
          letter-spacing: 0;
          font-weight: 900;
        }

        .section-head p {
          margin: 0;
          color: var(--muted);
          line-height: 1.75;
          font-size: 16px;
        }

        .mechanics-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-lg);
        }

        .mechanic-card,
        .journey-node,
        .scoreboard,
        .flywheel-card,
        .image-callout,
        .prompt-console,
        .combine-panel,
        .league-panel,
        .pitch-board,
        .coach-panel,
        .final-cta {
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--card);
        }

        .mechanic-card {
          display: grid;
          gap: var(--space-lg);
          padding: 22px;
        }

        .icon-box {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: color-mix(in oklch, var(--field) 13%, transparent);
          color: var(--field);
        }

        .mechanic-card h3,
        .journey-node h3,
        .flywheel-card h3,
        .image-callout h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          font-weight: 900;
        }

        .mechanic-card p,
        .journey-node p,
        .image-callout p {
          margin: 0;
          color: var(--muted);
          line-height: 1.65;
        }

        .scout-lab {
          display: grid;
          grid-template-columns: minmax(280px, 0.86fr) minmax(420px, 1.14fr);
          gap: var(--space-lg);
          align-items: stretch;
        }

        .prompt-console,
        .combine-panel,
        .league-panel,
        .coach-panel {
          padding: 18px;
        }

        .console-head,
        .league-header,
        .coach-head,
        .combine-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-md);
        }

        .console-head span,
        .league-header span,
        .salary-meter span,
        .coach-note span,
        .match-score span,
        .combine-grid span {
          color: var(--muted);
          font-size: 12px;
          font-weight: 800;
        }

        .console-head strong,
        .league-header strong {
          font-size: 13px;
          color: var(--field);
        }

        .prompt-console p {
          margin: 28px 0;
          font-size: 21px;
          line-height: 1.45;
          font-weight: 850;
        }

        .console-actions {
          display: grid;
          gap: var(--space-sm);
        }

        .console-actions span {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 800;
        }

        .pack-stage {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: var(--space-md);
        }

        .factor-card {
          min-height: 292px;
          border: 1px solid color-mix(in oklch, var(--card-tone) 42%, var(--line));
          border-radius: 8px;
          padding: 16px;
          display: grid;
          align-content: space-between;
          gap: var(--space-md);
          background:
            linear-gradient(180deg, color-mix(in oklch, var(--card-tone) 22%, var(--card)), var(--card) 62%),
            var(--card);
          color: var(--ink);
          text-align: left;
          transition: transform 160ms ease, border-color 160ms ease;
        }

        .factor-card.active,
        .factor-card:hover {
          transform: translateY(-3px);
          border-color: var(--card-tone);
        }

        .factor-card.legendary { --card-tone: var(--gold); }
        .factor-card.epic { --card-tone: var(--violet); }
        .factor-card.rare { --card-tone: var(--blue); }

        .rarity {
          width: fit-content;
          border-radius: 8px;
          background: color-mix(in oklch, var(--card-tone) 18%, transparent);
          color: var(--card-tone);
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .factor-card strong {
          font-size: 22px;
          line-height: 1.06;
          font-weight: 950;
        }

        .factor-card em {
          color: var(--muted);
          font-style: normal;
          font-size: 13px;
          font-weight: 800;
        }

        .card-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
        }

        .card-stats span,
        .factor-card small {
          border: 1px solid color-mix(in oklch, var(--card-tone) 28%, var(--line));
          border-radius: 8px;
          padding: 9px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 850;
        }

        .combine-panel {
          grid-column: 1 / -1;
          display: grid;
          gap: var(--space-lg);
        }

        .combine-title {
          justify-content: flex-start;
        }

        .combine-title p {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 13px;
        }

        .rarity-dot {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: var(--card-tone);
        }

        .rarity-dot.legendary { --card-tone: var(--gold); }
        .rarity-dot.epic { --card-tone: var(--violet); }
        .rarity-dot.rare { --card-tone: var(--blue); }

        .combine-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: var(--space-sm);
        }

        .combine-grid div {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 12px;
          display: grid;
          gap: var(--space-xs);
        }

        .combine-grid strong {
          font-size: 22px;
          line-height: 1;
        }

        .combine-result {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--field);
          font-weight: 850;
          line-height: 1.5;
        }

        .lineup-builder {
          display: grid;
          grid-template-columns: 280px minmax(360px, 1fr) 280px;
          gap: var(--space-lg);
          align-items: stretch;
        }

        .formation-toggle {
          display: grid;
          gap: var(--space-sm);
          margin-top: var(--space-xl);
        }

        .formation-toggle button {
          border: 1px solid var(--line);
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          padding: 10px 12px;
          text-align: left;
          font-weight: 850;
        }

        .formation-toggle .selected {
          border-color: var(--field);
          background: color-mix(in oklch, var(--field) 12%, transparent);
          color: var(--ink);
        }

        .salary-meter {
          display: grid;
          gap: var(--space-md);
          margin-top: var(--space-xl);
        }

        .salary-meter div {
          display: flex;
          justify-content: space-between;
          gap: var(--space-md);
        }

        .salary-meter i {
          height: 10px;
          border-radius: 999px;
          background:
            linear-gradient(90deg, var(--gold) 0 88%, color-mix(in oklch, var(--ink) 10%, transparent) 88% 100%);
        }

        .pitch-board {
          min-height: 430px;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(90deg, transparent 49.5%, color-mix(in oklch, var(--ink) 12%, transparent) 49.5% 50.5%, transparent 50.5%),
            color-mix(in oklch, var(--field) 13%, var(--card));
        }

        .pitch-board::before {
          content: "";
          position: absolute;
          inset: 20px;
          border: 1px solid color-mix(in oklch, var(--field) 42%, transparent);
          border-radius: 8px;
        }

        .pitch-card {
          position: absolute;
          width: 146px;
          border: 1px solid color-mix(in oklch, var(--ink) 14%, transparent);
          border-radius: 8px;
          padding: 10px;
          display: grid;
          gap: var(--space-xs);
          background: color-mix(in oklch, var(--card) 88%, transparent);
          backdrop-filter: blur(12px);
        }

        .pitch-card span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 900;
        }

        .pitch-card strong {
          font-size: 13px;
          line-height: 1.2;
        }

        .pitch-card em {
          color: var(--field);
          font-style: normal;
          font-weight: 950;
        }

        .pitch-card.captain { left: 50%; top: 8%; transform: translateX(-50%); }
        .pitch-card.core:nth-child(2) { left: 15%; top: 35%; }
        .pitch-card.core:nth-child(3) { right: 15%; top: 35%; }
        .pitch-card.defense { left: 50%; bottom: 22%; transform: translateX(-50%); }
        .pitch-card.bench { right: 24px; bottom: 24px; }

        .coach-panel {
          display: grid;
          gap: var(--space-md);
        }

        .coach-head {
          justify-content: flex-start;
          color: var(--field);
        }

        .coach-note {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px;
        }

        .coach-note p {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
        }

        .match-score {
          margin-top: auto;
          border-radius: 8px;
          padding: 14px;
          background: var(--field-2);
          color: oklch(97% 0.01 156);
          display: grid;
          gap: var(--space-xs);
        }

        .match-score span {
          color: oklch(82% 0.022 156);
        }

        .match-score strong {
          font-size: 34px;
          line-height: 1;
        }

        .journey-board {
          display: grid;
          grid-template-columns: repeat(6, minmax(148px, 1fr));
          gap: var(--space-md);
          overflow-x: auto;
          padding-bottom: var(--space-sm);
        }

        .journey-node {
          min-height: 238px;
          padding: 18px;
          display: grid;
          align-content: space-between;
          gap: var(--space-lg);
        }

        .node-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-md);
        }

        .node-index {
          font-weight: 900;
          font-size: 22px;
        }

        .node-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: color-mix(in oklch, var(--node-tone) 14%, transparent);
          color: var(--node-tone);
        }

        .journey-node.blue { --node-tone: var(--blue); }
        .journey-node.amber { --node-tone: var(--gold); }
        .journey-node.violet { --node-tone: var(--violet); }
        .journey-node.green { --node-tone: var(--field); }
        .journey-node.red { --node-tone: var(--red); }
        .journey-node.cyan { --node-tone: var(--cyan); }

        .draft-section {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
          gap: var(--space-2xl);
          align-items: start;
        }

        .scoreboard {
          overflow: hidden;
        }

        .scoreboard-head,
        .score-row {
          display: grid;
          grid-template-columns: 52px 1fr 82px 70px 88px;
          align-items: center;
          gap: var(--space-md);
          padding: 14px 16px;
        }

        .scoreboard-head {
          background: color-mix(in oklch, var(--field) 12%, transparent);
          color: var(--muted);
          font-size: 12px;
          font-weight: 900;
        }

        .score-row {
          border-top: 1px solid var(--line);
          font-size: 14px;
        }

        .score-row strong {
          font-size: 15px;
        }

        .rank {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: var(--ink);
          color: var(--surface);
          font-weight: 900;
        }

        .positive {
          color: var(--field);
          font-weight: 900;
        }

        .badge {
          width: fit-content;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .image-callout {
          overflow: hidden;
        }

        .image-copy {
          display: grid;
          gap: var(--space-md);
          padding: 24px;
        }

        .image-callout img {
          width: 100%;
          height: 320px;
          object-fit: cover;
          border-top: 1px solid var(--line);
        }

        .flywheel-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: var(--space-md);
        }

        .flywheel-card {
          min-height: 152px;
          padding: 16px;
          display: grid;
          align-content: space-between;
        }

        .flywheel-card span {
          color: var(--field);
          font-weight: 900;
          font-size: 24px;
        }

        .flywheel-card h3 {
          font-size: 15px;
        }

        .final-cta {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: var(--space-xl);
          align-items: center;
          padding: 28px;
          background: var(--field-2);
          color: oklch(97% 0.01 156);
        }

        .final-cta h2 {
          color: inherit;
        }

        .final-cta p {
          color: oklch(84% 0.022 156);
          margin: 10px 0 0;
          line-height: 1.65;
        }

        .q-footer {
          padding: 30px 0;
          border-top: 1px solid var(--line);
          background: var(--surface);
        }

        .footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-lg);
          color: var(--muted);
          font-size: 13px;
        }

        @media (max-width: 980px) {
          .hero h1 { font-size: 42px; }
          .hero-content { align-content: start; padding-top: 92px; padding-bottom: 360px; }
          .draft-room { left: 16px; right: 16px; bottom: 24px; width: auto; }
          .scout-lab,
          .lineup-builder {
            grid-template-columns: 1fr;
          }
          .mechanics-grid,
          .draft-section { grid-template-columns: 1fr; }
          .flywheel-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }

        @media (max-width: 700px) {
          .q-wrap { width: min(100% - 24px, 1180px); }
          .q-brand span { display: none; }
          .hero h1 { font-size: 34px; }
          .hero p { font-size: 15px; }
          .hero-content { padding-bottom: 500px; }
          .draft-strip { grid-template-columns: repeat(2, 1fr); }
          .lineup-grid { grid-template-columns: 1fr; }
          .pack-stage,
          .combine-grid {
            grid-template-columns: 1fr;
          }
          .factor-card { min-height: 230px; }
          .pitch-board { min-height: 520px; }
          .pitch-card {
            position: relative;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            bottom: auto !important;
            transform: none !important;
            width: auto;
            margin: 12px;
          }
          .pitch-board {
            display: grid;
            align-content: start;
            padding-top: 8px;
          }
          .section { padding: 64px 0; }
          .section h2 { font-size: 27px; }
          .mechanics-grid { gap: var(--space-md); }
          .scoreboard-head { display: none; }
          .score-row { grid-template-columns: 42px 1fr; }
          .score-row span:nth-child(n+3) { display: none; }
          .journey-board { grid-template-columns: repeat(6, 210px); }
          .flywheel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .final-cta { grid-template-columns: 1fr; }
          .footer-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <header className={`q-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="q-wrap q-nav-inner">
          <Link href="/landing" className="q-brand">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/otter-logo_ef58ab33.png"
              alt="Quandora"
            />
            <span>Quandora League</span>
          </Link>

          <div className="nav-actions">
            <AnimatedThemeToggler
              className="h-[34px] w-[34px] rounded-lg border border-border"
              title={tr("Switch theme", "切换主题")}
            />
            <button className="lang-toggle" type="button" onClick={() => setUiLang(uiLang === "zh" ? "en" : "zh")}>
              {uiLang === "zh" ? "中文" : "EN"}
            </button>
            <Link className="login-pill" href={isAuthenticated ? "/" : "/auth"}>
              {isAuthenticated ? tr("Dashboard", "仪表盘") : tr("Log in", "登录")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <section className="hero" ref={heroRef}>
        <div className="hero-bg" aria-hidden="true">
          <img src={IMG_OFFICIAL_STRATEGIES} alt="" />
        </div>
        <div className="hero-cover" aria-hidden="true" />
        <div className="pitch-lines" aria-hidden="true" />

        <div className="q-wrap hero-content">
          <div className="hero-copy">
            <span className="eyebrow" data-hero>
              <Sparkles size={16} />
              {tr("Fantasy sports mechanics for AI quant", "用 Fantasy Sports 重做 AI 量化")}
            </span>
            <h1 data-hero>
              {tr(
                "Draft factors like players. Manage strategies like a league.",
                "像选球员一样选因子，像打联赛一样经营策略。"
              )}
            </h1>
            <p data-hero>
              {tr(
                "Quandora turns factor mining into a fantasy quant league: users scout ideas with AI, pass a backtest combine, draft factor cards under a salary cap, and compete for rewards every market gameweek.",
                "Quandora 把因子挖掘变成 Fantasy 量化联赛：用户用 AI 挖想法，通过回测体测，在工资帽内选因子卡，并在每个市场赛周争夺奖励。"
              )}
            </p>
            <div className="hero-actions" data-hero>
              <PrimaryButton onClick={start}>
                {isAuthenticated ? tr("Open my team", "打开我的球队") : tr("Start scouting", "开始球探挖掘")}
                <ArrowRight size={18} />
              </PrimaryButton>
              <PrimaryButton tone="quiet" onClick={jumpToDraft}>
                {tr("View draft room", "查看选秀室")}
                <ChevronRight size={18} />
              </PrimaryButton>
            </div>
          </div>
        </div>

        <DraftRoom tr={tr} />
      </section>

      <section className="section">
        <div className="q-wrap">
          <div className="section-head" data-reveal>
            <span className="section-kicker">
              <Medal size={16} />
              {tr("Product thesis", "产品设定")}
            </span>
            <h2>{tr("The quant workflow becomes a season, not a form.", "量化流程不再是表单，而是一整个赛季。")}</h2>
            <p>
              {tr(
                "The old flow asked users to submit, wait, and upgrade. The new flow gives every action a game role: scout, draft, manage, compete, and win.",
                "旧流程让用户提交、等待、升级；新流程把每个动作变成游戏身份：球探、选秀、经理、比赛、领奖。"
              )}
            </p>
          </div>

          <div className="mechanics-grid">
            {mechanics.map((item) => {
              const Icon = item.icon;
              return (
                <article className="mechanic-card" key={item.titleEn} data-reveal>
                  <div className="icon-box">
                    <Icon size={20} />
                  </div>
                  <h3>{tr(item.titleEn, item.titleZh)}</h3>
                  <p>{tr(item.textEn, item.textZh)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section alt" id="scout">
        <div className="q-wrap">
          <div className="section-head" data-reveal>
            <span className="section-kicker">
              <PackageOpen size={16} />
              {tr("Create factor = open scout pack", "创建因子 = 打开球探卡包")}
            </span>
            <h2>{tr("Factor creation starts with a pack reveal, then earns truth through a combine.", "创建因子先抽出候选卡，再用体测证明真假。")}</h2>
            <p>
              {tr(
                "The user gives AI a market thesis. The system reveals several factor cards with rarity, role, potential, salary, and traits. Only validated cards can enter the draft pool.",
                "用户给 AI 一个市场假设，系统开出多张因子卡，展示稀有度、位置、潜力、工资和特性。只有通过验证的卡才能进入选秀池。"
              )}
            </p>
          </div>

          <ScoutPackShowcase tr={tr} />
        </div>
      </section>

      <section className="section" id="journey">
        <div className="q-wrap">
          <div className="section-head" data-reveal>
            <span className="section-kicker">
              <RadioTower size={16} />
              {tr("Journey map", "用户旅程地图")}
            </span>
            <h2>{tr("Two entry paths merge into one competitive loop.", "两种入口路径，汇入同一个竞争飞轮。")}</h2>
            <p>
              {tr(
                "Own-agent users keep their workflow. No-agent users use the platform scout desk. Both end at the same combine, roster, and reward loop.",
                "自带 Agent 的用户保留原工作流；无 Agent 用户进入平台球探台。两条路径都会进入体测、阵容和奖励循环。"
              )}
            </p>
          </div>

          <div className="journey-board" data-reveal>
            {journey.map((item) => {
              const Icon = item.icon;
              return (
                <article className={`journey-node ${item.tone}`} key={item.step}>
                  <div className="node-top">
                    <span className="node-index">{item.step}</span>
                    <span className="node-icon">
                      <Icon size={18} />
                    </span>
                  </div>
                  <div>
                    <h3>{tr(item.titleEn, item.titleZh)}</h3>
                    <p>{tr(item.descEn, item.descZh)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section alt" id="draft">
        <div className="q-wrap">
          <div className="section-head" data-reveal>
            <span className="section-kicker">
              <Swords size={16} />
              {tr("Create strategy = build lineup", "创建策略 = 组建阵容")}
            </span>
            <h2>{tr("Strategy creation becomes a tactical board with salary cap, roles, and AI coaching.", "创建策略变成战术板：工资帽、角色位、AI 教练一起上。")}</h2>
            <p>
              {tr(
                "Instead of choosing formulas in a long form, users draft a captain, core cards, defense cards, and bench cards. The lineup can be simulated before it enters a league.",
                "用户不再在长表单里选公式，而是选择队长卡、核心卡、防守卡和替补卡。阵容先模拟对战，再进入联赛。"
              )}
            </p>
          </div>

          <LineupBuilderShowcase tr={tr} />
        </div>
      </section>

      <section className="section">
        <div className="q-wrap draft-section">
          <div className="section-head" data-reveal>
            <span className="section-kicker">
              <Activity size={16} />
              {tr("Match result", "对战结算")}
            </span>
            <h2>{tr("Wins come from durable performance, not one lucky PNL spike.", "胜负来自稳健表现，而不是一次幸运暴涨。")}</h2>
            <p>
              {tr(
                "Gameweek scoring mixes return, Sharpe, drawdown defense, consistency, uniqueness, and turnover cost so the competition rewards better quant behavior.",
                "赛周积分混合收益、夏普、回撤防守、稳定性、独特性与换手成本，让比赛奖励真正更好的量化行为。"
              )}
            </p>
          </div>

          <div className="scoreboard" data-reveal>
            <div className="scoreboard-head">
              <span>#</span>
              <span>{tr("Team", "球队")}</span>
              <span>PNL</span>
              <span>SR</span>
              <span>{tr("Status", "状态")}</span>
            </div>
            {scoreboardRows.map((row) => (
              <div className="score-row" key={row.rank}>
                <span className="rank">{row.rank}</span>
                <strong>{tr(row.teamEn, row.teamZh)}</strong>
                <span className="positive">{row.pnl}</span>
                <span>{row.sharpe}</span>
                <span className="badge">{row.badge}</span>
              </div>
            ))}
            <div className="image-callout" style={{ borderWidth: 0, borderTop: "1px solid var(--line)", borderRadius: 0 }}>
              <div className="image-copy">
                <h3>{tr("League board built from real quant fields", "用真实量化字段生成联赛榜")}</h3>
                <p>
                  {tr(
                    "Sharpe, fitness, drawdown, turnover, pass count, and PnL become a language users can compare at a glance.",
                    "夏普、适应度、回撤、换手、通过数和 PnL 被转成用户一眼可比较的联赛语言。"
                  )}
                </p>
              </div>
              <img src={IMG_OFFICIAL_FACTORS} alt={tr("Official factor library", "官方因子库")} />
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="q-wrap">
          <div className="section-head" data-reveal>
            <span className="section-kicker">
              <ShieldCheck size={16} />
              {tr("Business flywheel", "商业飞轮")}
            </span>
            <h2>{tr("Rewards create supply. Supply improves the game.", "奖励带来供给，供给增强比赛。")}</h2>
            <p>
              {tr(
                "The flywheel from the reference becomes a fantasy league economy: low-friction submissions create factor cards, cards power strategies, strategies generate leaderboards, and leaderboards pull users into membership.",
                "参考图里的飞轮变成 Fantasy 联赛经济：低门槛提交产生因子卡，因子卡驱动策略，策略生成排行榜，排行榜把用户拉向会员。"
              )}
            </p>
          </div>

          <div className="flywheel-grid" data-reveal>
            {flywheel.map((item) => (
              <article className="flywheel-card" key={item.n}>
                <span>{item.n}</span>
                <h3>{tr(item.labelEn, item.labelZh)}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="q-wrap final-cta" data-reveal>
          <div>
            <span className="section-kicker" style={{ color: "oklch(90% 0.12 92)" }}>
              <CircleDollarSign size={16} />
              {tr("Monetization moments", "转化节点")}
            </span>
            <h2>{tr("Free users play. Members manage serious lineups.", "免费用户先玩起来，会员经营高阶阵容。")}</h2>
            <p>
              {tr(
                "Practice leagues stay open. Paid members unlock high-confidence signals, private contests, bigger submission limits, and follow-trade strategy rooms.",
                "练习联赛保持开放；付费会员解锁高置信信号、私密比赛、更高提交额度和跟单策略室。"
              )}
            </p>
          </div>
          <PrimaryButton onClick={start}>
            {tr("Enter the league", "进入联赛")}
            <ArrowRight size={18} />
          </PrimaryButton>
        </div>
      </section>

      <footer className="q-footer">
        <div className="q-wrap footer-inner">
          <span>Quandora League</span>
          <span>{tr("AI quant factor mining, redesigned as a fantasy sports season.", "把 AI 量化因子挖掘重新设计成 Fantasy Sports 赛季。")}</span>
        </div>
      </footer>
    </main>
  );
}
