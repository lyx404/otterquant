/*
 * GSAP Animation Hooks — Acid Green Design System
 * Staggered reveal with skewY, card hover parallax
 */
import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Staggered text reveal animation
 * Elements slide up from y:100 with skewY:7, power4.out easing
 */
export function useStaggerReveal<T extends HTMLElement>(
  deps: unknown[] = []
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lines = container.querySelectorAll(".reveal-line");
    if (lines.length === 0) return;

    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });

    gsap.to(lines, {
      y: 0,
      skewY: 0,
      opacity: 1,
      duration: 1,
      stagger: 0.08,
      ease: "power4.out",
      delay: 0.1,
    });

    return () => {
      gsap.killTweensOf(lines);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

/**
 * Fade-in stagger for a list of elements
 */
export function useFadeInStagger<T extends HTMLElement>(
  selector: string = ".fade-item",
  deps: unknown[] = []
) {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(selector);
    if (items.length === 0) return;

    gsap.set(items, { y: 30, opacity: 0 });

    gsap.to(items, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.05,
      ease: "power3.out",
      delay: 0.15,
    });

    return () => {
      gsap.killTweensOf(items);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

/**
 * Card hover parallax — inner content shifts slightly on mouse move
 */
export function useCardParallax<T extends HTMLElement>() {
  const cardRef = useRef<T>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const inner = card.querySelector("[data-parallax-inner]") as HTMLElement | null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(inner || card.firstElementChild, {
        x: x * 6,
        y: y * 4,
        duration: 0.4,
        ease: "power2.out",
      });
    };

    const onMouseLeave = () => {
      gsap.to(inner || card.firstElementChild, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
      });
    };

    card.addEventListener("mousemove", onMouseMove);
    card.addEventListener("mouseleave", onMouseLeave);

    return () => {
      card.removeEventListener("mousemove", onMouseMove);
      card.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return cardRef;
}
