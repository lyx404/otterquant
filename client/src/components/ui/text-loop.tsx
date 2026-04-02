/**
 * TextLoop — GSAP-powered vertical text carousel
 * Animates between multiple text strings with vertical slide + blur transitions.
 * Container width is determined by the widest text via hidden measurers.
 * Text is baseline-aligned with surrounding text.
 */
import { useEffect, useRef, useState } from "react";
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

  // Transition animation when index changes
  useEffect(() => {
    const node = textRef.current;
    if (!node) return;

    if (isFirstRef.current) {
      gsap.set(node, { yPercent: 0, opacity: 1, filter: "blur(0px)" });
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
  }, [currentIndex]);

  // Interval loop with exit animation
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;

      const node = textRef.current;
      const container = containerRef.current;
      if (node && container) {
        // Clone current text for exit animation
        const clone = node.cloneNode(true) as HTMLSpanElement;
        clone.style.position = "absolute";
        clone.style.bottom = "0";
        clone.style.left = "0";
        clone.style.width = "100%";
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
      className="relative inline-grid align-baseline"
      style={{
        clipPath: "inset(-100vh 0 -100vh 0)",
        ...style,
      }}
    >
      {/* Hidden measurers: all texts stacked in same grid cell to establish max width */}
      {texts.map((t, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`whitespace-nowrap ${className}`}
          style={{
            gridArea: "1 / 1",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {t}
        </span>
      ))}

      {/* Visible animated text, positioned in same grid cell */}
      <span
        ref={textRef}
        className={`whitespace-nowrap ${className}`}
        style={{
          gridArea: "1 / 1",
        }}
      >
        {texts[currentIndex]}
      </span>
    </span>
  );
}

export default TextLoop;
