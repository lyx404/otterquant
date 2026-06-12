import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";

const PAGE_TRANSITION_SPEED_IN = 520;
const PAGE_TRANSITION_SPEED_OUT = 640;
const CLOSED_RADIUS = 0;
const OPEN_RADIUS = 150;

type PageTransitionOrigin = {
  x: number;
  y: number;
};

type PageTransitionContextValue = {
  navigateWithTransition: (to: string, origin?: PageTransitionOrigin) => Promise<void>;
};

const PageTransitionContext = createContext<PageTransitionContextValue>({
  navigateWithTransition: async () => {},
});

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function usePrefersReducedMotion() {
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

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [visible, setVisible] = useState(false);
  const [radius, setRadius] = useState(CLOSED_RADIUS);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const prefersReducedMotion = usePrefersReducedMotion();
  const animatingRef = useRef(false);
  const mountedRef = useRef(true);
  const locationRef = useRef(location);
  const lastClickRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    const updateClickOrigin = (event: PointerEvent) => {
      lastClickRef.current = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };

    window.addEventListener("pointerdown", updateClickOrigin, { capture: true });
    return () => window.removeEventListener("pointerdown", updateClickOrigin, { capture: true });
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const animateRadius = useCallback((from: number, to: number, duration: number) => {
    const startedAt = performance.now();

    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        if (!mountedRef.current) {
          resolve();
          return;
        }

        const elapsed = Math.min((now - startedAt) / duration, 1);
        const progress = easeInOut(elapsed);
        const current = from + (to - from) * progress;

        setRadius(current);

        if (elapsed < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(tick);
    });
  }, []);

  const navigateWithTransition = useCallback(
    async (to: string, explicitOrigin?: PageTransitionOrigin) => {
      if (to === locationRef.current) return;

      if (prefersReducedMotion || animatingRef.current) {
        setLocation(to);
        return;
      }

      const transitionOrigin = explicitOrigin ?? lastClickRef.current;
      animatingRef.current = true;
      setOrigin({
        x: transitionOrigin.x * 100,
        y: transitionOrigin.y * 100,
      });
      setRadius(CLOSED_RADIUS);
      setVisible(true);

      await animateRadius(CLOSED_RADIUS, OPEN_RADIUS, PAGE_TRANSITION_SPEED_IN);
      setLocation(to);
      await waitForNextPaint();
      await animateRadius(OPEN_RADIUS, CLOSED_RADIUS, PAGE_TRANSITION_SPEED_OUT);

      if (mountedRef.current) {
        setRadius(CLOSED_RADIUS);
        setVisible(false);
      }

      animatingRef.current = false;
    },
    [animateRadius, prefersReducedMotion, setLocation]
  );

  const value = useMemo(() => ({ navigateWithTransition }), [navigateWithTransition]);

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
      <div
        id="page-transition-loader"
        className={`pageload-overlay${visible ? " is-visible" : ""}`}
        aria-hidden="true"
        style={{
          "--page-transition-origin-x": `${origin.x}%`,
          "--page-transition-origin-y": `${origin.y}%`,
          "--page-transition-radius": `${radius}vmax`,
        } as React.CSSProperties}
      >
      </div>
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  return useContext(PageTransitionContext);
}
