import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ScratchCardGame } from "@/components/scratch-card/ScratchCardGame";
import { usePageTransition } from "@/contexts/PageTransitionContext";

type MobilePageTransitionPhase = "opening" | "open" | "closing";

function useLocalPrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useMobilePageTransition(isOpen: boolean, exitDurationMs = 220, enterDurationMs = 320) {
  const prefersReducedMotion = useLocalPrefersReducedMotion();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [phase, setPhase] = useState<MobilePageTransitionPhase>(isOpen ? "open" : "closing");

  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldRender(isOpen);
      setPhase(isOpen ? "open" : "closing");
      return undefined;
    }

    let timeoutId = 0;

    if (isOpen) {
      setShouldRender(true);
      setPhase("opening");
      timeoutId = window.setTimeout(() => {
        setPhase("open");
      }, enterDurationMs);
    } else if (shouldRender) {
      setPhase("closing");
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, exitDurationMs);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enterDurationMs, exitDurationMs, isOpen, prefersReducedMotion, shouldRender]);

  return { shouldRender, phase, prefersReducedMotion, exitDurationMs };
}

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
      className="scratch-card-route"
      data-mobile-page-transition={pageTransition.phase}
      aria-label="Scratch Card"
    >
      <section className="scratch-card-route__surface">
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
          .scratch-card-route {
            --mobile-page-enter-duration: 320ms;
            --mobile-page-exit-duration: 260ms;
            --mobile-page-enter-ease: cubic-bezier(0.22, 1, 0.36, 1);
            --mobile-page-exit-ease: cubic-bezier(0.4, 0, 1, 1);
            --mobile-page-surface-enter-x: 40px;
            --mobile-page-surface-exit-x: 28px;
          }

          .scratch-card-route[data-mobile-page-transition="opening"] {
            animation: scratch-mobile-page-backdrop-in var(--mobile-page-enter-duration) var(--mobile-page-enter-ease) both;
          }

          .scratch-card-route[data-mobile-page-transition="closing"] {
            animation: scratch-mobile-page-backdrop-out var(--mobile-page-exit-duration) var(--mobile-page-exit-ease) both;
            pointer-events: none;
          }

          .scratch-card-route[data-mobile-page-transition="opening"] .scratch-card-route__surface {
            animation: scratch-mobile-page-surface-in var(--mobile-page-enter-duration) var(--mobile-page-enter-ease) both;
          }

          .scratch-card-route[data-mobile-page-transition="closing"] .scratch-card-route__surface {
            animation: scratch-mobile-page-surface-out var(--mobile-page-exit-duration) var(--mobile-page-exit-ease) both;
          }
        }

        @keyframes scratch-mobile-page-backdrop-in {
          from { opacity: .01; }
          to { opacity: 1; }
        }

        @keyframes scratch-mobile-page-backdrop-out {
          from { opacity: 1; }
          to { opacity: .01; }
        }

        @keyframes scratch-mobile-page-surface-in {
          from {
            opacity: .01;
            transform: translate3d(var(--mobile-page-surface-enter-x, 18px), 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes scratch-mobile-page-surface-out {
          from {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          to {
            opacity: .01;
            transform: translate3d(var(--mobile-page-surface-exit-x, 14px), 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scratch-card-route,
          .scratch-card-route__surface {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </main>
  );
}
