import { useEffect, useState, type CSSProperties } from "react";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";

const STAGE_WIDTH = 1902;
const STAGE_HEIGHT = 1080;

const ASSETS = {
  background: "/assets/scratch-card/bg-latest.png",
  coin: "/assets/scratch-card/start-coin-visible-latest.png",
  banner: "/assets/scratch-card/banner-latest.svg",
  decorStars: "/assets/scratch-card/decor-stars-latest.png",
  winningNumber: "/assets/scratch-card/winning-number-latest.svg",
  scratchTiles: [
    "/assets/scratch-card/tile-1-latest.svg",
    "/assets/scratch-card/tile-2-latest.svg",
    "/assets/scratch-card/tile-3-latest.svg",
    "/assets/scratch-card/tile-4-latest.svg",
    "/assets/scratch-card/tile-5-latest.svg",
    "/assets/scratch-card/tile-6-latest.svg",
  ],
  smallCoin: "/assets/scratch-card/raw-2.png",
  star: "/assets/scratch-card/raw-7.png",
  hudCoin: "/assets/hud-coin.svg",
  hudCash: "/assets/hud-cash.svg",
  hudFish: "/assets/hud-fish.svg",
} as const;

function StatCard({
  icon,
  iconWidth,
  iconHeight,
  value,
  valueClass,
}: {
  icon: string;
  iconWidth: number;
  iconHeight: number;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="scratch-stat-card">
      <img
        className="scratch-stat-icon"
        src={icon}
        alt=""
        width={iconWidth}
        height={iconHeight}
      />
      <span className={`scratch-stat-value ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function ScratchCard() {
  const { navigateWithTransition } = usePageTransition();
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      setStageScale(
        Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT)
      );
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <main className="scratch-page" aria-label={tr("Lucky Scratch Card", "幸运刮刮乐")}>
      <style>{`
        @font-face {
          font-family: "阿里妈妈方圆体 VF Regular";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        @font-face {
          font-family: "Alimama FangYuanTi VF";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        @font-face {
          font-family: "Alimama Fang YuanTi VF";
          src:
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff2") format("woff2"),
            url("https://lzcdn.dianpusoft.cn/fonts/AlimamaFangYuanTiVF/AlimamaFangYuanTiVF-Thin.woff") format("woff");
          font-display: swap;
          font-weight: 100 900;
          font-style: normal;
        }

        .scratch-page {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #c6d1f6;
          font-family: "Alimama FangYuanTi VF", "Alimama Fang YuanTi VF", "阿里妈妈方圆体 VF Regular", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
        }

        .scratch-stage {
          position: absolute;
          left: 50%;
          top: 50%;
          width: ${STAGE_WIDTH}px;
          height: ${STAGE_HEIGHT}px;
          transform: translate(-50%, -50%) scale(var(--stage-scale));
          transform-origin: center center;
        }

        .scratch-bg {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 1920px;
          height: 1088px;
          transform: translateX(-50%);
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }

        .scratch-top-stats {
          position: absolute;
          left: 40px;
          top: 40px;
          display: flex;
          align-items: center;
          gap: 30px;
        }

        .scratch-back-button {
          appearance: none;
          width: 50px;
          height: 50px;
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: 4px;
          background: #f8f8f0;
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
          color: #7c5b31;
          cursor: pointer;
          display: grid;
          place-items: center;
          font-size: 34px;
          line-height: 1;
          padding: 0 0 4px;
        }

        .scratch-back-button:active {
          transform: translateY(1px);
          box-shadow: 1px 1px 0 rgba(189, 174, 160, .48);
        }

        .scratch-stat-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .scratch-stat-card {
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 12px;
          overflow: hidden;
          background: #fff3d3;
          border: 3px solid #c4b89e;
          border-radius: 16px;
          box-shadow: 0 4px 0 rgba(78, 67, 60, .22);
        }

        .scratch-stat-icon {
          flex: 0 0 auto;
          object-fit: contain;
        }

        .scratch-stat-value {
          color: #4e433c;
          font-size: 26px;
          font-weight: 700;
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1;
          text-align: right;
          white-space: nowrap;
          letter-spacing: 0;
        }

        .scratch-stat-value--balance { width: 130px; }
        .scratch-stat-value--cash,
        .scratch-stat-value--fish { width: 90px; }

        .scratch-start {
          position: absolute;
          left: 310px;
          top: 394px;
          width: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
        }

        .scratch-gold-coin {
          width: 200px;
          height: 199px;
          object-fit: contain;
          filter: drop-shadow(0 8px 0 rgba(113, 81, 36, .16));
        }

        .scratch-start-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          width: 100%;
        }

        .scratch-start-button {
          appearance: none;
          width: 100%;
          border: 0;
          border-radius: 16px;
          background: #ffdc75;
          color: #5a3e00;
          cursor: pointer;
          font-family: "Alimama FangYuanTi VF", "Alimama Fang YuanTi VF", "阿里妈妈方圆体 VF Regular", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
          font-style: normal;
          font-size: 32px;
          font-weight: 700;
          font-stretch: 100%;
          font-synthesis: none;
          font-optical-sizing: auto;
          font-variation-settings: "wght" 700, "BEVL" 1;
          font-feature-settings: "cv02", "cv03", "cv04", "cv11";
          line-height: 1;
          padding: 22px 32px;
          text-align: center;
          white-space: nowrap;
        }

        .scratch-start-price {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #4e433c;
          font-size: 24px;
          font-weight: 700;
          white-space: nowrap;
        }

        .scratch-start-price img {
          width: 36px;
          height: 37px;
        }

        .scratch-board {
          position: absolute;
          left: 730px;
          top: 164px;
          width: 880px;
          height: 830px;
          border-radius: 30px;
          background: #8c9ee3;
        }

        .scratch-banner {
          position: absolute;
          left: 50%;
          top: -78px;
          width: 680px;
          height: 170px;
          transform: translateX(-50%);
        }

        .scratch-banner-image {
          position: absolute;
          left: 19.11px;
          top: 0;
          width: 641.78px;
          height: 163.914px;
          pointer-events: none;
          user-select: none;
        }

        .scratch-banner-title {
          position: absolute;
          left: 50%;
          top: 18px;
          transform: translateX(-50%);
          color: #fff;
          font-family: "Alimama FangYuanTi VF", "Alimama Fang YuanTi VF", "阿里妈妈方圆体 VF Regular", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
          font-style: normal;
          font-size: 52px;
          font-weight: 700;
          font-stretch: 100%;
          font-synthesis: none;
          font-optical-sizing: auto;
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1;
          text-shadow: 0 3px 0 #c25e65;
          white-space: nowrap;
        }

        .scratch-banner-subtitle {
          position: absolute;
          left: 50%;
          top: 89px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          color: #ffeea8;
          font-size: 20px;
          font-weight: 700;
          white-space: nowrap;
        }

        .scratch-banner-subtitle img {
          width: 22px;
          height: 24px;
        }

        .scratch-decor-stars {
          position: absolute;
          left: -83.7344px;
          top: 132px;
          width: 1021.2206px;
          height: 705px;
          max-width: none;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
          z-index: 0;
        }

        .scratch-banner,
        .scratch-win-panel,
        .scratch-grid-panel {
          z-index: 1;
        }

        .scratch-win-panel {
          position: absolute;
          left: 50%;
          top: 112px;
          width: 680px;
          padding: 20px 50px 30px;
          border-radius: 12px;
          background: #fdfaec;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 30px;
        }

        .scratch-section-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          color: #4e433c;
          font-size: 30px;
          font-weight: 700;
          line-height: 1;
          white-space: nowrap;
        }

        .scratch-section-title::before,
        .scratch-section-title::after {
          content: "✦";
          color: rgba(255, 255, 255, .88);
          font-size: 42px;
          line-height: .8;
          text-shadow: 0 1px 0 rgba(238, 220, 170, .55);
        }

        .scratch-winning-row {
          display: flex;
          align-items: center;
          gap: 60px;
        }

        .scratch-winning-number {
          width: 150px;
          height: 80px;
          display: block;
        }

        .scratch-grid-panel {
          position: absolute;
          left: 50%;
          top: 335px;
          width: 680px;
          height: 412px;
          border-radius: 20px;
          background: #fdfaec;
          transform: translateX(-50%);
          overflow: hidden;
        }

        .scratch-grid {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 570px;
          height: 340px;
          transform: translate(-50%, -50%);
          display: grid;
          grid-template-columns: repeat(3, 150px);
          grid-template-rows: repeat(2, 150px);
          column-gap: 60px;
          row-gap: 40px;
        }

        .scratch-tile {
          width: 150px;
          height: 150px;
          object-fit: contain;
        }
      `}</style>

      <div
        className="scratch-stage"
        style={{ "--stage-scale": stageScale } as CSSProperties}
      >
        <img className="scratch-bg" src={ASSETS.background} alt="" aria-hidden="true" />

        <div className="scratch-top-stats" aria-label={tr("Stats", "数值统计")}>
          <button
            className="scratch-back-button"
            type="button"
            aria-label={tr("Back to wallet", "返回钱包")}
            onClick={() => navigateWithTransition("/")}
          >
            ‹
          </button>
          <div className="scratch-stat-group">
            <StatCard
              icon={ASSETS.hudCoin}
              iconWidth={36}
              iconHeight={37}
              value="1,000,000"
              valueClass="scratch-stat-value--balance"
            />
            <StatCard
              icon={ASSETS.hudCash}
              iconWidth={44}
              iconHeight={28}
              value="$999.0"
              valueClass="scratch-stat-value--cash"
            />
            <StatCard
              icon={ASSETS.hudFish}
              iconWidth={40}
              iconHeight={27}
              value="10,000"
              valueClass="scratch-stat-value--fish"
            />
          </div>
        </div>

        <section className="scratch-start" aria-label={tr("Start scratching", "开始刮奖")}>
          <img className="scratch-gold-coin" src={ASSETS.coin} alt="" />
          <div className="scratch-start-actions">
            <button className="scratch-start-button" type="button">
              {tr("Scratch", "开始刮奖")}
            </button>
            <div className="scratch-start-price" aria-label={tr("1000 per card", "1000每张")}>
              <img src={ASSETS.hudCoin} alt="" />
              <span>{tr("1000/card", "1000/张")}</span>
            </div>
          </div>
        </section>

        <section className="scratch-board" aria-label={tr("Scratch Card", "刮刮乐")}>
          <div className="scratch-banner" aria-hidden="true">
            <img className="scratch-banner-image" src={ASSETS.banner} alt="" />
            <div className="scratch-banner-title">{tr("Lucky Scratch Card", "幸运刮刮乐")}</div>
            <div className="scratch-banner-subtitle">
              <img src={ASSETS.star} alt="" />
              <span>{tr("Scratch for luck, cash surprises await", "刮开好运，现金惊喜即刻到手")}</span>
              <img src={ASSETS.star} alt="" />
            </div>
          </div>

          <img
            className="scratch-decor-stars"
            src={ASSETS.decorStars}
            alt=""
            aria-hidden="true"
          />

          <div className="scratch-win-panel">
            <div className="scratch-section-title">{tr("Winning Numbers", "中奖号码")}</div>
            <div className="scratch-winning-row" aria-label={tr("Winning numbers", "中奖号码")}>
              <img className="scratch-winning-number" src={ASSETS.winningNumber} alt="" />
              <img className="scratch-winning-number" src={ASSETS.winningNumber} alt="" />
              <img className="scratch-winning-number" src={ASSETS.winningNumber} alt="" />
            </div>
          </div>

          <div className="scratch-grid-panel">
            <div className="scratch-grid" aria-label={tr("Scratch area", "待刮区")}>
              {ASSETS.scratchTiles.map((src) => (
                <img
                  className="scratch-tile"
                  src={src}
                  alt=""
                  aria-hidden="true"
                  key={src}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
