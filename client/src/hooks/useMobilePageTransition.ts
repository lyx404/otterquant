import { useEffect, useState } from "react";

export type MobilePageTransitionPhase = "opening" | "open" | "closing";

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

export function useMobilePageTransition(isOpen: boolean, exitDurationMs = 220, enterDurationMs = 320) {
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
