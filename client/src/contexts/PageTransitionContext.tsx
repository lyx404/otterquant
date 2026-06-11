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

const INITIAL_PATH =
  "M -5 -5 L -5 65 L 85 65 L 85 -5 Z M 0 0 C 0 0 7.9843788 0 40 0 C 75 0 80 0 80 0 L 80 60 C 80 60 76.055513 60 40 60 C 10 60 0 60 0 60 Z";

const OPEN_PATH =
  "M -5 -5 L -5 65 L 85 65 L 85 -5 Z M 0 35 C 0 35 15 55 40 35 C 65 15 80 35 80 35 L 80 35 C 80 30 65 10 40 30 C 15 50 0 30 0 30 Z";

const PAGE_TRANSITION_SPEED_IN = 520;
const PAGE_TRANSITION_SPEED_OUT = 520;

type PageTransitionContextValue = {
  navigateWithTransition: (to: string) => Promise<void>;
};

const PageTransitionContext = createContext<PageTransitionContextValue>({
  navigateWithTransition: async () => {},
});

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function tokenizePath(value: string) {
  return value.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];
}

function interpolatePath(from: string, to: string, progress: number) {
  const fromTokens = tokenizePath(from);
  const toTokens = tokenizePath(to);

  return fromTokens
    .map((token, index) => {
      if (/[a-zA-Z]/.test(token)) return token;

      const start = Number(token);
      const end = Number(toTokens[index]);
      const current = start + (end - start) * progress;

      return Number(current.toFixed(3));
    })
    .join(" ");
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
  const [pathD, setPathD] = useState(INITIAL_PATH);
  const prefersReducedMotion = usePrefersReducedMotion();
  const animatingRef = useRef(false);
  const mountedRef = useRef(true);
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const animatePath = useCallback((from: string, to: string, duration: number) => {
    const startedAt = performance.now();

    return new Promise<void>((resolve) => {
      const tick = (now: number) => {
        if (!mountedRef.current) {
          resolve();
          return;
        }

        const elapsed = Math.min((now - startedAt) / duration, 1);
        const progress = easeInOut(elapsed);

        setPathD(interpolatePath(from, to, progress));

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
    async (to: string) => {
      if (to === locationRef.current) return;

      if (prefersReducedMotion || animatingRef.current) {
        setLocation(to);
        return;
      }

      animatingRef.current = true;
      setPathD(INITIAL_PATH);
      setVisible(true);

      await animatePath(INITIAL_PATH, OPEN_PATH, PAGE_TRANSITION_SPEED_IN);
      setLocation(to);
      await waitForNextPaint();
      await animatePath(OPEN_PATH, INITIAL_PATH, PAGE_TRANSITION_SPEED_OUT);

      if (mountedRef.current) {
        setPathD(INITIAL_PATH);
        setVisible(false);
      }

      animatingRef.current = false;
    },
    [animatePath, prefersReducedMotion, setLocation]
  );

  const value = useMemo(() => ({ navigateWithTransition }), [navigateWithTransition]);

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
      <div
        id="page-transition-loader"
        className={`pageload-overlay${visible ? " is-visible" : ""}`}
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60" preserveAspectRatio="none">
          <path d={pathD} fillRule="evenodd" />
        </svg>
      </div>
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  return useContext(PageTransitionContext);
}
