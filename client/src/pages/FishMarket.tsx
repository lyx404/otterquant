import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { GameHudStats } from "@/components/GameHudStats";
import { useGameWalletModal } from "@/components/GameWalletModalHost";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { useGameEconomy } from "@/contexts/GameEconomyContext";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import {
  DESKTOP_STAGE_H,
  DESKTOP_STAGE_W,
  MOBILE_BREAKPOINT,
  MOBILE_STAGE_H,
  MOBILE_STAGE_W,
  SCRATCH_CARD_ASSETS,
} from "@/components/scratch-card/scratchCardData";
import { useMobilePageTransition } from "@/hooks/useMobilePageTransition";
import "@/styles/mobilePageTransition.css";

type FishMarketStageLayout = {
  width: number;
  height: number;
  scale: number;
  mode: "desktop" | "mobile";
};

function getFishMarketStageLayout(): FishMarketStageLayout {
  if (typeof window === "undefined") {
    return {
      width: DESKTOP_STAGE_W,
      height: DESKTOP_STAGE_H,
      scale: 1,
      mode: "desktop",
    };
  }

  const mode = window.innerWidth <= MOBILE_BREAKPOINT ? "mobile" : "desktop";
  const width = mode === "mobile" ? MOBILE_STAGE_W : DESKTOP_STAGE_W;
  const height = mode === "mobile" ? MOBILE_STAGE_H : DESKTOP_STAGE_H;
  const scale = Math.min(window.innerWidth / width, window.innerHeight / height);

  return { width, height, scale, mode };
}

const FISH_MARKET_ASSETS = {
  background: "/assets/fish-market/background.png",
  titleBg: "/assets/fish-market/title-bg.svg",
  cardGoldfish: "/assets/fish-market/card-goldfish.png",
  cardFish: "/assets/fish-market/card-fish.png",
  cardJellyfish: "/assets/fish-market/card-jellyfish.png",
  check: "/assets/fish-market/check.svg",
  shop: "/assets/fish-market/shop-icon.svg",
  coin: "/assets/fish-market/coin.svg",
} as const;

type FishMarketCardGrade = "sss" | "a" | "b";
type FishMarketToast = {
  id: number;
  title: string;
  message: string;
};

const FISH_MARKET_CARD_UNIT_PRICES: Record<FishMarketCardGrade, number> = {
  sss: 10000,
  a: 500,
  b: 300,
};

const FISH_MARKET_CARDS = [
  { id: "goldfish-1", grade: "sss", image: FISH_MARKET_ASSETS.cardGoldfish },
  { id: "goldfish-2", grade: "sss", image: FISH_MARKET_ASSETS.cardGoldfish },
  { id: "fish-1", grade: "a", image: FISH_MARKET_ASSETS.cardFish },
  { id: "fish-2", grade: "a", image: FISH_MARKET_ASSETS.cardFish },
  { id: "fish-3", grade: "a", image: FISH_MARKET_ASSETS.cardFish },
  { id: "jellyfish-1", grade: "b", image: FISH_MARKET_ASSETS.cardJellyfish },
  { id: "jellyfish-2", grade: "b", image: FISH_MARKET_ASSETS.cardJellyfish },
  { id: "jellyfish-3", grade: "b", image: FISH_MARKET_ASSETS.cardJellyfish },
  { id: "jellyfish-4", grade: "b", image: FISH_MARKET_ASSETS.cardJellyfish },
  { id: "jellyfish-5", grade: "b", image: FISH_MARKET_ASSETS.cardJellyfish },
  { id: "jellyfish-6", grade: "b", image: FISH_MARKET_ASSETS.cardJellyfish },
] as const;

const FISH_MARKET_CARD_SELL_ANIMATION_MS = 220;
const formatFishMarketPrice = (value: number) => value.toLocaleString("en-US");

export default function FishMarket() {
  const [, setLocation] = useLocation();
  const { t } = useAppLanguage();
  const { addCoins, fishBalance } = useGameEconomy();
  const walletController = useGameWalletModal();
  const { navigateWithTransition } = usePageTransition();
  const [mobilePageOpen, setMobilePageOpen] = useState(true);
  const [stageLayout, setStageLayout] = useState(getFishMarketStageLayout);
  const [availableCards, setAvailableCards] = useState(() => [...FISH_MARKET_CARDS]);
  const [selectedCardIds, setSelectedCardIds] = useState(() => new Set<string>());
  const [sellingCardIds, setSellingCardIds] = useState(() => new Set<string>());
  const [sellSuccessToast, setSellSuccessToast] = useState<FishMarketToast | null>(null);
  const sellAnimationTimeoutRef = useRef<number | null>(null);
  const pageTransition = useMobilePageTransition(mobilePageOpen, 260);
  const tr = useCallback((en: string, zh: string) => t(en, zh), [t]);
  const selectedCardCount = selectedCardIds.size;
  const estimatedPrice = availableCards.reduce((total, card) => (
    selectedCardIds.has(card.id)
      ? total + FISH_MARKET_CARD_UNIT_PRICES[card.grade]
      : total
  ), 0);
  const allCardsSelected = availableCards.length > 0 && selectedCardIds.size === availableCards.length;
  const canSellSelectedCards = selectedCardCount > 0;
  const stageStyle = {
    "--fish-market-stage-width": `${stageLayout.width}px`,
    "--fish-market-stage-height": `${stageLayout.height}px`,
    "--fish-market-stage-scale": stageLayout.scale,
    "--scale": stageLayout.scale,
    "--mobile-page-base-transform": "translate(-50%, -50%) scale(var(--fish-market-stage-scale))",
  } as CSSProperties;

  useEffect(() => {
    setMobilePageOpen(true);
  }, []);

  useEffect(() => {
    const syncStageLayout = () => {
      setStageLayout(getFishMarketStageLayout());
    };

    syncStageLayout();
    window.addEventListener("resize", syncStageLayout);
    return () => window.removeEventListener("resize", syncStageLayout);
  }, []);

  useEffect(() => () => {
    if (sellAnimationTimeoutRef.current) {
      window.clearTimeout(sellAnimationTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!sellSuccessToast) return undefined;

    const toastTimer = window.setTimeout(() => {
      setSellSuccessToast(null);
    }, 2600);

    return () => window.clearTimeout(toastTimer);
  }, [sellSuccessToast]);

  const handleBackClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    const origin = typeof window === "undefined"
      ? undefined
      : {
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
        };

    if (typeof window !== "undefined" && window.innerWidth <= 700 && !pageTransition.prefersReducedMotion) {
      setMobilePageOpen(false);
      window.setTimeout(() => {
        setLocation("/");
      }, pageTransition.exitDurationMs);
      return;
    }

    void navigateWithTransition("/", origin);
  }, [navigateWithTransition, pageTransition.exitDurationMs, pageTransition.prefersReducedMotion, setLocation]);

  const toggleCard = useCallback((cardId: string) => {
    setSellSuccessToast(null);
    setSelectedCardIds((current) => {
      const next = new Set(current);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  const toggleAllCards = useCallback(() => {
    setSellSuccessToast(null);
    setSelectedCardIds((current) => (
      current.size === availableCards.length
        ? new Set<string>()
        : new Set(availableCards.map((card) => card.id))
    ));
  }, [availableCards]);

  const handleSellSelectedCards = useCallback(() => {
    if (!canSellSelectedCards || estimatedPrice <= 0) return;

    const soldCardIds = new Set(selectedCardIds);
    const removeSoldCards = () => {
      setAvailableCards((current) => current.filter((card) => !soldCardIds.has(card.id)));
      setSellingCardIds(new Set<string>());
    };
    const prefersReducedMotion = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    addCoins(estimatedPrice);
    if (walletController.hasWalletDisplayOverrides) {
      walletController.setWalletDisplayOverrides({
        coinBalance: walletController.coinBalanceValue + estimatedPrice,
        cashBalanceUsd: walletController.cashBalanceValue,
        coinActivities: walletController.coinActivitiesOverride,
        cashActivities: walletController.cashActivitiesOverride,
      });
    }

    if (sellAnimationTimeoutRef.current) {
      window.clearTimeout(sellAnimationTimeoutRef.current);
    }

    if (prefersReducedMotion) {
      removeSoldCards();
    } else {
      setSellingCardIds(soldCardIds);
      sellAnimationTimeoutRef.current = window.setTimeout(() => {
        removeSoldCards();
        sellAnimationTimeoutRef.current = null;
      }, FISH_MARKET_CARD_SELL_ANIMATION_MS);
    }

    setSelectedCardIds(new Set<string>());
    setSellSuccessToast({
      id: Date.now(),
      title: "出售成功",
      message: `获得 ${formatFishMarketPrice(estimatedPrice)} 游戏币`,
    });
  }, [addCoins, canSellSelectedCards, estimatedPrice, selectedCardIds, walletController]);

  return (
    <main
      className="fish-market-route mobile-page-transition-route"
      data-mobile-page-transition={pageTransition.phase}
      aria-label={tr("Fish Market", "鱼市场")}
    >
      <section
        className="fish-market-route__surface mobile-page-transition-surface"
        data-layout={stageLayout.mode}
        style={stageStyle}
      >
        <img className="fish-market-route__background" src={FISH_MARKET_ASSETS.background} alt="" aria-hidden="true" />
        <header className="fish-market-route__hud" aria-label={tr("Stats", "数值统计")}>
          <button
            className="fish-market-back-button"
            type="button"
            aria-label={tr("Back", "返回")}
            onClick={handleBackClick}
          >
            <span className="fish-market-back-button__icon" aria-hidden="true">
              <ArrowLeft size={22} strokeWidth={3} />
            </span>
            <img src={SCRATCH_CARD_ASSETS.back} alt="" />
          </button>
          <GameHudStats
            className="fish-market-hud-stats"
            coinBalance={walletController.coinBalanceValue}
            cashBalance={walletController.cashBalanceValue}
            cashDecimals={1}
            fishBalance={fishBalance}
            tr={tr}
            onOpenWallet={walletController.openWalletModal}
          />
        </header>

        <div className="fish-market-scene" data-node-id="1086:95554" data-name="鱼市场">
          <div className="fish-market-title-block" data-node-id="1086:95555" data-name="标题区">
            <div className="fish-market-title-block__image" aria-hidden="true">
              <img src={FISH_MARKET_ASSETS.titleBg} alt="" />
            </div>
            <h1 className="fish-market-title">鱼市场</h1>
          </div>

          <section className="fish-market-board" data-node-id="1086:95558" data-name="内容" aria-label="鱼市场">
            <div
              className={`fish-market-card-grid${availableCards.length === 0 ? " is-empty" : ""}`}
              data-node-id="1086:95559"
              data-name="选择区"
            >
              {availableCards.length === 0 ? (
                <div className="fish-market-empty" role="status">
                  <img className="fish-market-empty__icon" src="/assets/wallet-empty-state.svg" alt="" aria-hidden="true" />
                  <span>{tr("Empty", "空空如也")}</span>
                </div>
              ) : (
                availableCards.map((card) => {
                  const selling = sellingCardIds.has(card.id);
                  const selected = selectedCardIds.has(card.id) || selling;

                  return (
                    <button
                      className={`fish-market-card-option${selling ? " is-selling" : ""}`}
                      key={card.id}
                      type="button"
                      disabled={selling}
                      aria-pressed={selected}
                      aria-label={selling ? "鱼卡出售中" : selected ? "取消选择鱼卡" : "选择鱼卡"}
                      onClick={() => toggleCard(card.id)}
                    >
                      <img className="fish-market-card-option__image" src={card.image} alt="" />
                      <span className={`fish-market-check${selected ? " is-selected" : ""}`} aria-hidden="true">
                        {selected && <img src={FISH_MARKET_ASSETS.check} alt="" />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <aside className="fish-market-settlement" data-node-id="1086:95593" data-name="结算区">
              <div className="fish-market-summary" data-node-id="1086:95599" data-name="结算数值">
                <div className="fish-market-summary__title" data-node-id="1086:95600">
                  <span>出售卡牌可获得游戏币</span>
                </div>
                <div className="fish-market-summary__body" data-node-id="1086:95602">
                  <img className="fish-market-summary__shop" src={FISH_MARKET_ASSETS.shop} alt="" />
                  <div className="fish-market-summary__rows">
                    <div className="fish-market-summary__row">
                      <span>已选择</span>
                      <strong>{selectedCardCount} 张</strong>
                    </div>
                    <div className="fish-market-summary__row">
                      <span>预计价格</span>
                      <img className="fish-market-summary__coin" src={FISH_MARKET_ASSETS.coin} alt="" />
                      <strong>{formatFishMarketPrice(estimatedPrice)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="fish-market-select-all"
                type="button"
                disabled={availableCards.length === 0}
                aria-pressed={allCardsSelected}
                onClick={toggleAllCards}
              >
                <span className={`fish-market-check${allCardsSelected ? " is-selected" : ""}`} aria-hidden="true">
                  {allCardsSelected && <img src={FISH_MARKET_ASSETS.check} alt="" />}
                </span>
                <span>全选</span>
              </button>

              <button
                className="fish-market-sell-button"
                type="button"
                disabled={!canSellSelectedCards}
                onClick={handleSellSelectedCards}
              >
                出售
              </button>
            </aside>
          </section>
        </div>
      </section>
      {sellSuccessToast && (
        <div
          key={sellSuccessToast.id}
          className="fish-market-toast"
          role="status"
          aria-live="polite"
        >
          <span className="fish-market-toast__icon" aria-hidden="true">✓</span>
          <div>
            <p className="fish-market-toast__title">{sellSuccessToast.title}</p>
            <p className="fish-market-toast__message">{sellSuccessToast.message}</p>
          </div>
        </div>
      )}
      <style>{`
        .fish-market-route {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #90CBF3;
          --fish-market-font: "Alimama FangYuanTi", "Alimama FangYuanTi VF", "Alimama Fang YuanTi VF", "阿里妈妈方圆体 VF Regular", "PingFang SC", "Microsoft YaHei UI", sans-serif;
          --ac-cream-light: #f8f8f0;
          --ac-border: #c4b89e;
          --ac-shadow: #bdaea0;
          --radius-xs: 4px;
          image-rendering: pixelated;
        }

        .fish-market-route__surface {
          position: absolute;
          top: 50%;
          left: 50%;
          width: var(--fish-market-stage-width);
          height: var(--fish-market-stage-height);
          background: #90CBF3;
          overflow: hidden;
          transform-origin: center;
        }

        .fish-market-route__background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }

        .fish-market-route__hud {
          position: absolute;
          top: 40px;
          left: 40px;
          display: flex;
          align-items: center;
          gap: 30px;
          z-index: 8;
        }

        .fish-market-back-button {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border: 1.5px solid rgba(196, 184, 158, 0.86);
          border-radius: 4px;
          background: #f8f8f0;
          box-shadow: 2px 2px 0 rgba(189, 174, 160, 0.48);
          cursor: pointer;
        }

        .fish-market-back-button__icon {
          display: none;
          color: #6b4a2d;
          line-height: 0;
        }

        .fish-market-back-button__icon svg {
          width: 22px;
          height: 22px;
          display: block;
        }

        .fish-market-back-button img {
          width: 26px;
          height: 26px;
        }

        .fish-market-hud-stats {
          position: static;
          left: auto;
          top: auto;
          z-index: auto;
        }

        .fish-market-hud-stats .hud-stat-card--button {
          cursor: pointer;
        }

        .fish-market-scene {
          position: absolute;
          left: 50%;
          top: calc(50% + 26px);
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          transform: translate(-50%, -50%);
        }

        .fish-market-title-block {
          position: relative;
          flex: 0 0 auto;
          width: 1298px;
          height: 105px;
          margin-bottom: -20px;
        }

        .fish-market-title-block__image {
          position: absolute;
          left: 0;
          top: 0;
          width: 1298px;
          height: 105px;
          overflow: hidden;
          background: transparent;
          pointer-events: none;
        }

        .fish-market-title-block__image img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          max-width: none;
          background: transparent;
          object-fit: fill;
        }

        .fish-market-title {
          position: absolute;
          left: 50%;
          top: 54px;
          margin: 0;
          color: #ffffff;
          font-family: var(--fish-market-font);
          font-size: 52px;
          font-style: normal;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
          text-align: center;
          text-shadow:
            0 4px 0 #0f5aa5,
            -3px 0 0 #0f5aa5,
            3px 0 0 #0f5aa5,
            0 -3px 0 #0f5aa5;
          transform: translate(-50%, -50%);
        }

        .fish-market-board {
          position: relative;
          display: flex;
          align-items: stretch;
          overflow: hidden;
          flex: 0 0 auto;
          border: 12px solid #64a8f8;
          border-radius: 30px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, .18) inset;
        }

        .fish-market-card-grid {
          display: grid;
          grid-template-columns: repeat(4, 240px);
          grid-auto-rows: 301px;
          gap: 10px;
          width: 1050px;
          height: 760px;
          padding: 30px;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          box-sizing: border-box;
          background: #f4fbfe;
        }

        .fish-market-card-grid::-webkit-scrollbar {
          display: none;
        }

        .fish-market-card-grid.is-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .fish-market-empty {
          display: grid;
          place-items: center;
          align-content: center;
          justify-content: center;
          gap: 16px;
          width: 100%;
          min-height: 0;
          padding: 30px 16px 34px;
          box-sizing: border-box;
          color: rgba(114, 93, 66, .38);
          font-family: var(--fish-market-font);
          font-size: 32px;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-synthesis: none;
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1;
          text-align: center;
          pointer-events: none;
        }

        .fish-market-empty__icon {
          display: block;
          width: 240px;
          max-width: 34vw;
          height: auto;
          opacity: .5;
          user-select: none;
          pointer-events: none;
        }

        .fish-market-empty > span {
          display: block;
          margin-top: 2px;
        }

        .fish-market-card-option {
          appearance: none;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 240px;
          height: 301px;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          font: inherit;
          cursor: pointer;
          transform-origin: center;
          transition:
            opacity ${FISH_MARKET_CARD_SELL_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            transform ${FISH_MARKET_CARD_SELL_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
            filter ${FISH_MARKET_CARD_SELL_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }

        .fish-market-card-option.is-selling {
          opacity: 0;
          filter: saturate(.9);
          pointer-events: none;
          transform: translateY(-8px) scale(.94);
        }

        .fish-market-card-option__image {
          display: block;
          width: 240px;
          height: 291px;
          margin: 0 0 -20px;
          object-fit: cover;
          pointer-events: none;
          user-select: none;
        }

        .fish-market-check {
          position: relative;
          display: inline-block;
          flex: 0 0 auto;
          width: 30px;
          height: 30px;
          box-sizing: border-box;
          overflow: hidden;
          border: 3px solid #d6cdb8;
          border-radius: 8px;
          background: #ffffff;
        }

        .fish-market-check.is-selected {
          border: 0;
          background: #ffdc75;
        }

        .fish-market-check img {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 53.34%;
          height: 43.33%;
          display: block;
          object-fit: fill;
          transform: translate(-50%, -50%);
        }

        .fish-market-settlement {
          position: relative;
          flex: 0 0 400px;
          width: 400px;
          min-height: 760px;
          background: #ecf5fd;
          font-family: var(--fish-market-font);
          font-style: normal;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          color: #5a3e00;
        }

        .fish-market-toast {
          position: fixed;
          right: max(24px, env(safe-area-inset-right));
          bottom: max(24px, env(safe-area-inset-bottom));
          z-index: 95;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          width: min(460px, calc(100vw - 32px));
          padding: 12px 16px;
          box-sizing: border-box;
          border: 2px solid var(--ac-border);
          border-radius: 8px;
          background: linear-gradient(180deg, #fff8e6 0%, #f7e8bf 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .62),
            0 6px 0 rgba(78, 67, 60, .34),
            0 16px 34px rgba(77, 51, 28, .18);
          color: #5a3e00;
          font-family: var(--fish-market-font);
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          letter-spacing: 0;
          pointer-events: none;
          animation: fish-market-toast-pop 220ms ease-out;
        }

        .fish-market-toast__icon {
          display: inline-grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 2px solid #08724f;
          border-radius: 999px;
          background: linear-gradient(180deg, #34d399 0%, #0f9f6e 100%);
          box-shadow: 0 3px 0 rgba(8, 114, 79, .34);
          color: #fffdf4;
          font-size: 21px;
          font-weight: 1000;
          line-height: 1;
        }

        .fish-market-toast__title {
          margin: 0;
          color: #5a3e00;
          font-size: 14px;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1.25;
        }

        .fish-market-toast__message {
          margin: 3px 0 0;
          color: #725d42;
          font-size: 12px;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1.45;
        }

        @keyframes fish-market-toast-pop {
          from {
            opacity: 0;
            transform: translate(12px, 10px) scale(.96);
          }
          to {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }

        .fish-market-summary {
          position: absolute;
          top: 30px;
          left: 30px;
          width: 340px;
          overflow: hidden;
          border-radius: 16px;
        }

        .fish-market-summary__title {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60px;
          padding: 20px 30px;
          box-sizing: border-box;
          background: #578ece;
          color: #ffffff;
          font-size: 20px;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
        }

        .fish-market-summary__body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 60px;
          padding: 30px;
          box-sizing: border-box;
          background: #dfeef6;
        }

        .fish-market-summary__shop {
          display: block;
          width: 150px;
          height: 139px;
          object-fit: contain;
          pointer-events: none;
        }

        .fish-market-summary__rows {
          display: flex;
          flex-direction: column;
          gap: 30px;
          width: 100%;
        }

        .fish-market-summary__row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          font-size: 20px;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
        }

        .fish-market-summary__row span {
          flex: 1 1 0;
          min-width: 0;
          text-align: left;
        }

        .fish-market-summary__row strong {
          flex: 0 0 auto;
          font: inherit;
          text-align: right;
        }

        .fish-market-summary__coin {
          width: 24px;
          height: 25px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .fish-market-select-all {
          appearance: none;
          position: absolute;
          left: 155px;
          top: 592px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: #5a3e00;
          font-family: var(--fish-market-font);
          font-size: 24px;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1;
          white-space: nowrap;
          cursor: pointer;
        }

        .fish-market-select-all:disabled {
          color: rgba(90, 62, 0, .38);
          cursor: not-allowed;
        }

        .fish-market-select-all:disabled .fish-market-check {
          border-color: rgba(214, 205, 184, .72);
          background: rgb(238, 236, 232);
        }

        .fish-market-sell-button {
          appearance: none;
          position: absolute;
          left: 30px;
          bottom: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 340px;
          min-height: 82px;
          padding: 22px 32px;
          box-sizing: border-box;
          border: 0;
          border-radius: 16px;
          background: #ffdc75;
          color: #5a3e00;
          font-family: var(--fish-market-font);
          font-size: 32px;
          font-weight: var(--font-rounded-numeric-weight, 700);
          font-variation-settings: "wght" 700, "BEVL" 1;
          line-height: 1;
          letter-spacing: 0;
          white-space: nowrap;
          cursor: pointer;
          transform: translateY(0);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .38),
            0 5px 0 rgba(151, 111, 30, .32);
          transition:
            background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
            filter 180ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .fish-market-sell-button:not(:disabled):hover {
          background: #ffe18b;
          filter: saturate(1.04) brightness(1.02);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .48),
            0 7px 0 rgba(151, 111, 30, .36),
            0 12px 20px rgba(111, 79, 23, .16);
          transform: translateY(-2px);
        }

        .fish-market-sell-button:not(:disabled):active {
          filter: saturate(1) brightness(.98);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .32),
            0 2px 0 rgba(151, 111, 30, .32);
          transform: translateY(2px);
        }

        .fish-market-sell-button:disabled {
          background: rgb(238, 236, 232);
          color: rgba(90, 62, 0, .54);
          cursor: not-allowed;
          box-shadow: none;
          filter: none;
          transform: none;
        }

        .fish-market-card-option:focus-visible,
        .fish-market-select-all:focus-visible,
        .fish-market-sell-button:focus-visible {
          outline: 4px solid rgba(255, 220, 117, .92);
          outline-offset: 4px;
        }

        @media (prefers-reduced-motion: reduce) {
          .fish-market-card-option,
          .fish-market-sell-button,
          .fish-market-toast {
            animation: none;
            transition: none;
          }

          .fish-market-sell-button:not(:disabled):hover,
          .fish-market-sell-button:not(:disabled):active {
            transform: none;
          }
        }

        .fish-market-route .shop-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: clamp(18px, 3vw, 44px);
          background: rgba(52, 119, 166, .34);
          backdrop-filter: blur(5px);
        }

        .fish-market-route__surface[data-layout="mobile"] .fish-market-route__hud {
          top: 26px;
          left: 50%;
          width: 514px;
          justify-content: flex-start;
          gap: 12px;
          transform: translateX(-50%);
        }

        .fish-market-route__surface[data-layout="mobile"] .fish-market-back-button {
          width: calc(38px / var(--scale));
          height: calc(38px / var(--scale));
          flex: 0 0 auto;
          display: inline-grid;
          place-items: center;
          order: 2;
          margin-left: auto;
        }

        .fish-market-route__surface[data-layout="mobile"] .fish-market-back-button__icon {
          display: inline-grid;
          place-items: center;
        }

        .fish-market-route__surface[data-layout="mobile"] .fish-market-back-button img {
          display: none;
        }

        .fish-market-route__surface[data-layout="mobile"] .fish-market-hud-stats {
          gap: calc(4.8px / var(--scale));
          --hud-stat-height: calc(40px / var(--scale));
          --hud-stat-padding: calc(6px / var(--scale));
          --hud-stat-border-width: 2px;
          --hud-stat-radius: calc(8px / var(--scale));
          --hud-stat-font-size: calc(13.6px / var(--scale));
          --hud-stat-balance-width: calc(60.8px / var(--scale));
          --hud-stat-compact-width: calc(41.6px / var(--scale));
          --hud-stat-icon-scale: calc(.576 / var(--scale));
        }

        .fish-market-route__surface[data-layout="mobile"] .fish-market-scene {
          transform: translate(-50%, -50%) scale(.29);
        }

        @media (max-width: 700px) {
          .fish-market-route__hud {
            top: 26px;
            left: 50%;
            width: 514px;
            justify-content: flex-start;
            gap: 12px;
            transform: translateX(-50%);
          }

          .fish-market-back-button {
            width: calc(38px / var(--scale));
            height: calc(38px / var(--scale));
            flex: 0 0 auto;
            display: inline-grid;
            place-items: center;
            order: 2;
            margin-left: auto;
          }

          .fish-market-back-button__icon {
            display: inline-grid;
            place-items: center;
          }

          .fish-market-back-button img {
            display: none;
          }

          .fish-market-hud-stats {
            gap: calc(4.8px / var(--scale));
            --hud-stat-height: calc(40px / var(--scale));
            --hud-stat-padding: calc(6px / var(--scale));
            --hud-stat-border-width: 2px;
            --hud-stat-radius: calc(8px / var(--scale));
            --hud-stat-font-size: calc(13.6px / var(--scale));
            --hud-stat-balance-width: calc(60.8px / var(--scale));
            --hud-stat-compact-width: calc(41.6px / var(--scale));
            --hud-stat-icon-scale: calc(.576 / var(--scale));
          }
        }
      `}</style>
    </main>
  );
}
