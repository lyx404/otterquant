import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ScratchCardGame } from "@/components/scratch-card/ScratchCardGame";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { useMobilePageTransition } from "@/hooks/useMobilePageTransition";
import "@/styles/mobilePageTransition.css";

export default function ScratchCard() {
  const [, setLocation] = useLocation();
  const { navigateWithTransition } = usePageTransition();
  const [mobilePageOpen, setMobilePageOpen] = useState(true);
  const pageTransition = useMobilePageTransition(mobilePageOpen, 260);

  useEffect(() => {
    setMobilePageOpen(true);
  }, []);

  return (
    <main
      className="scratch-card-route mobile-page-transition-route"
      data-mobile-page-transition={pageTransition.phase}
      aria-label="Scratch Card"
    >
      <section className="scratch-card-route__surface mobile-page-transition-surface">
        <ScratchCardGame
          onBack={(origin) => {
            if (typeof window !== "undefined" && window.innerWidth <= 700 && !pageTransition.prefersReducedMotion) {
              setMobilePageOpen(false);
              window.setTimeout(() => {
                setLocation("/");
              }, pageTransition.exitDurationMs);
              return;
            }

            void navigateWithTransition("/", origin);
          }}
        />
      </section>
      <style>{`
        .scratch-card-route {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: #c6d1f6;
          --ac-primary: #19c8b9;
          --ac-primary-bg: #e6f9f6;
          --ac-text: #794f27;
          --ac-text-body: #725d42;
          --ac-border: #c4b89e;
          --ac-border-hover: #a89878;
          --ac-cream: rgb(247, 243, 223);
          --ac-cream-light: #f8f8f0;
          --ac-shadow: #bdaea0;
          --ac-shadow-input: #d4c9b4;
          --ac-focus-yellow: #ffcc00;
          --radius-xs: 4px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 10px;
          --modal-title-font: "阿里妈妈方圆体 VF Regular", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
          image-rendering: pixelated;
        }

        .scratch-card-route__surface {
          width: 100%;
          height: 100%;
          will-change: transform, opacity;
        }

        .scratch-card-route .shop-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: clamp(18px, 3vw, 44px);
          background: rgba(52, 119, 166, .34);
          backdrop-filter: blur(5px);
        }

        @media (max-width: 700px) {
          .scratch-card-route .wallet-modal-backdrop {
            background: rgba(216, 237, 247, .96);
          }
        }
      `}</style>
    </main>
  );
}
