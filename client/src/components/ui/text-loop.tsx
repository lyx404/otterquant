/**
 * TextLoop — GSAP-powered vertical text carousel
 * Animates between multiple text strings with vertical slide + blur transitions.
 * Container width dynamically adapts to current text width via GSAP animation.
 * Text is baseline-aligned with surrounding text.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import gsap from "gsap";

interface TextLoopProps {
  /** Array of text strings to cycle through */
  texts: string[];
  /** Interval between transitions in ms */
  interval?: number;
  /** Additional className for the rotating text */
  className?: string;
  /** Inline style for the container */
  style?: React.CSSProperties;
}

export function TextLoop({
  texts,
  interval = 2500,
  className = "",
  style,
}: TextLoopProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isFirstRef = useRef(true);
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // Find the longest text for initial sizing
  const longestText = useMemo(
    () => texts.reduce((a, b) => (a.length > b.length ? a : b), ""),
    [texts]
  );

  // Measure actual width of current text and animate container
  const animateWidth = useCallback(() => {
    const container = containerRef.current;
    const textNode = textRef.current;
    if (!container || !textNode) return;

    requestAnimationFrame(() => {
      const targetWidth = textNode.scrollWidth;

      if (isFirstRef.current) {
        gsap.set(container, { width: targetWidth });
      } else {
        gsap.to(container, {
          width: targetWidth,
          duration: 0.35,
          ease: "power2.inOut",
        });
      }
    });
  }, []);

  // Transition animation when index changes
  useEffect(() => {
    const node = textRef.current;
    if (!node) return;

    if (isFirstRef.current) {
      gsap.set(node, { yPercent: 0, opacity: 1, filter: "blur(0px)" });
      animateWidth();
      isFirstRef.current = false;
      return;
    }

    gsap.fromTo(
      node,
      { yPercent: 50, opacity: 0, filter: "blur(8px)" },
      {
        yPercent: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.3,
        delay: 0.25,
        ease: "back.out(1.2)",
      }
    );

    animateWidth();
  }, [currentIndex, animateWidth]);

  // Interval loop with exit animation
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;

      const node = textRef.current;
      const container = containerRef.current;
      if (node && container) {
        container.style.width = `${container.offsetWidth}px`;

        const clone = node.cloneNode(true) as HTMLSpanElement;
        clone.style.position = "absolute";
        clone.style.bottom = "0";
        clone.style.left = "0";
        clone.style.width = "auto";
        container.appendChild(clone);

        gsap.to(clone, {
          yPercent: -50,
          opacity: 0,
          filter: "blur(6px)",
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => clone.remove(),
        });
      }

      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, texts.length]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex align-baseline"
      style={{
        clipPath: "inset(-100vh 0 -100vh 0)",
        overflow: "visible",
        ...style,
      }}
    >
      {/* Hidden measurer: same font to establish correct height for baseline */}
      <span
        aria-hidden="true"
        className={`invisible whitespace-nowrap ${className}`}
        style={{ display: "inline-block", width: 0, overflow: "hidden" }}
      >
        {longestText}
      </span>

      {/* Visible animated text, bottom-aligned to match baseline */}
      <span
        ref={textRef}
        className={`whitespace-nowrap ${className}`}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          display: "inline-block",
        }}
      >
        {texts[currentIndex]}
      </span>
    </span>
  );
}

export default TextLoop;
