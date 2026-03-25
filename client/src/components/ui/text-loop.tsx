/**
 * TextLoop — GSAP-powered vertical text carousel
 * Animates between multiple text strings with vertical slide + blur transitions.
 * Uses a hidden sizer element to maintain stable container dimensions.
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
  /** Inline style for the rotating text */
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
  const textRef = useRef<HTMLSpanElement>(null);

  // Find the longest text for sizing
  const longestText = texts.reduce((a, b) => (a.length > b.length ? a : b), "");

  // Transition animation when index changes
  useEffect(() => {
    const node = textRef.current;
    if (!node) return;

    if (isFirstRef.current) {
      gsap.set(node, { yPercent: 0, opacity: 1, filter: "blur(0px)" });
      isFirstRef.current = false;
      return;
    }

    // Animate in
    gsap.fromTo(
      node,
      { yPercent: 50, opacity: 0, filter: "blur(8px)" },
      {
        yPercent: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.4,
        delay: 0.1,
        ease: "back.out(1.2)",
      }
    );
  }, [currentIndex]);

  // Interval loop with exit animation
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;

      const node = textRef.current;
      if (node) {
        // Clone for exit animation
        const parent = node.parentElement;
        if (parent) {
          const clone = node.cloneNode(true) as HTMLSpanElement;
          clone.style.position = "absolute";
          clone.style.top = "0";
          clone.style.left = "0";
          parent.appendChild(clone);

          gsap.to(clone, {
            yPercent: -50,
            opacity: 0,
            filter: "blur(6px)",
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => clone.remove(),
          });
        }
      }

      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, texts.length]);

  return (
    <span
      className="relative inline-block align-baseline"
      style={{
        overflow: "hidden",
        clipPath: "inset(-10% 0 -10% 0)",
        verticalAlign: "baseline",
        ...style,
      }}
    >
      {/* Invisible sizer: takes up space of the longest text */}
      <span
        aria-hidden="true"
        className={`invisible whitespace-nowrap ${className}`}
        style={{ display: "inline-block" }}
      >
        {longestText}
      </span>

      {/* Visible animated text, positioned absolutely over the sizer */}
      <span
        ref={textRef}
        className={`whitespace-nowrap ${className}`}
        style={{
          position: "absolute",
          top: 0,
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
