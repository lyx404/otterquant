/**
 * ScrambleText — GSAP-powered character scramble animation
 * Splits text into individual characters and scrambles them with random chars,
 * then reveals the original text. Supports auto-repeat interval and theme-aware colors.
 *
 * Inspired by SplitText scramble pattern, implemented in pure React + GSAP.
 */
import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

interface ScrambleTextProps {
  /** The text to display and scramble */
  text: string;
  /** Duration of the scramble animation in seconds */
  scrambleDuration?: number;
  /** Stagger delay between each character in seconds */
  stagger?: number;
  /** Number of random character cycles before revealing */
  cycles?: number;
  /** Character pool for scramble effect */
  characters?: string;
  /** Auto-repeat interval in milliseconds (0 = no repeat) */
  repeatInterval?: number;
  /** Additional className for the wrapper span */
  className?: string;
  /** Inline style to preserve existing styling */
  style?: React.CSSProperties;
}

export function ScrambleText({
  text,
  scrambleDuration = 0.5,
  stagger = 0.02,
  cycles = 10,
  characters = "01$&#%@*+=-",
  repeatInterval = 5000,
  className = "",
  style,
}: ScrambleTextProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const charNodesRef = useRef<HTMLSpanElement[]>([]);
  const originalCharsRef = useRef<string[]>([]);

  const getRandomChar = useCallback(
    () => characters[Math.floor(Math.random() * characters.length)] ?? "",
    [characters]
  );

  // Split text into character spans on mount
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Clear existing content
    wrapper.innerHTML = "";
    const chars: HTMLSpanElement[] = [];
    const originals: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = document.createElement("span");
      span.style.display = "inline-block";
      if (ch === " ") {
        span.style.whiteSpace = "pre";
        span.textContent = " ";
      } else {
        span.textContent = ch;
      }
      wrapper.appendChild(span);
      chars.push(span);
      originals.push(ch);
    }

    charNodesRef.current = chars;
    originalCharsRef.current = originals;

    return () => {
      timelineRef.current?.kill();
    };
  }, [text]);

  // Create and run scramble animation
  const runScramble = useCallback(() => {
    const nodes = charNodesRef.current;
    const originals = originalCharsRef.current;
    if (!nodes.length) return;

    timelineRef.current?.kill();

    const tl = gsap.timeline();
    const stepCount = Math.max(1, Math.floor(cycles));
    const stepDuration = scrambleDuration / stepCount;

    // Get computed brand color from CSS variable
    const wrapper = wrapperRef.current;
    const brandColor = wrapper
      ? getComputedStyle(wrapper).getPropertyValue("--brand-scramble").trim() || "#4f47e6"
      : "#4f47e6";
    const brandGlow = wrapper
      ? getComputedStyle(wrapper).getPropertyValue("--brand-glow").trim() || "none"
      : "none";

    nodes.forEach((node, index) => {
      const finalChar = originals[index];
      if (!finalChar || finalChar.trim().length === 0) return;

      const charTl = gsap.timeline();

      // Start: switch to brand color with subtle glow
      charTl.set(node, {
        color: brandColor,
        textShadow: brandGlow,
      });

      // Scramble cycles
      for (let i = 0; i < stepCount; i++) {
        charTl.call(() => {
          node.textContent = getRandomChar();
        });
        charTl.to({}, { duration: stepDuration });
      }

      // End: restore original character and inherit color
      charTl.call(() => {
        node.textContent = finalChar;
        gsap.set(node, { color: "inherit", textShadow: "none" });
      });

      tl.add(charTl, index * stagger);
    });

    timelineRef.current = tl;
    tl.play();
  }, [cycles, scrambleDuration, stagger, getRandomChar]);

  // Auto-repeat interval
  useEffect(() => {
    if (repeatInterval <= 0) return;

    // Run initial scramble after a short delay
    const initialTimer = setTimeout(runScramble, 800);

    const interval = setInterval(runScramble, repeatInterval);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      timelineRef.current?.kill();
    };
  }, [repeatInterval, runScramble]);

  return (
    <span
      ref={wrapperRef}
      className={`scramble-text-container ${className}`}
      style={style}
      aria-label={text}
    />
  );
}

export default ScrambleText;
