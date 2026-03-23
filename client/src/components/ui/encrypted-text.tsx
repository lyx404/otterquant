import { useEffect, useRef, useState, useCallback } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

interface EncryptedTextProps {
  text: string;
  encryptedClassName?: string;
  revealedClassName?: string;
  revealDelayMs?: number;
  /** If true, animation triggers on mount. Otherwise triggers when element enters viewport. */
  animateOnMount?: boolean;
  className?: string;
}

export function EncryptedText({
  text,
  encryptedClassName = "text-indigo-400",
  revealedClassName = "text-white",
  revealDelayMs = 50,
  animateOnMount = false,
  className = "",
}: EncryptedTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    new Array(text.length).fill(false)
  );
  const [scrambled, setScrambled] = useState<string[]>(() =>
    text.split("").map((ch) =>
      ch === " " ? " " : CHARS[Math.floor(Math.random() * CHARS.length)]
    )
  );
  const hasStarted = useRef(false);

  const startReveal = useCallback(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // Scramble interval — rapidly change characters before reveal
    const scrambleInterval = setInterval(() => {
      setScrambled((prev) =>
        prev.map((ch, i) => {
          if (text[i] === " ") return " ";
          // Already revealed chars stay as original
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
      );
    }, 30);

    // Sequentially reveal each character
    text.split("").forEach((_, i) => {
      setTimeout(() => {
        setRevealed((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        // Stop scrambling after last char
        if (i === text.length - 1) {
          setTimeout(() => clearInterval(scrambleInterval), 60);
        }
      }, i * revealDelayMs);
    });
  }, [text, revealDelayMs]);

  // Viewport intersection or mount trigger
  useEffect(() => {
    if (animateOnMount) {
      // Small delay so the encrypted state is visible briefly
      const timer = setTimeout(startReveal, 400);
      return () => clearTimeout(timer);
    }

    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          // Small delay so user sees the encrypted state first
          setTimeout(startReveal, 300);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [animateOnMount, startReveal]);

  // Group characters into words to prevent mid-word line breaks
  const words: { chars: number[]; startIdx: number }[] = [];
  let currentWord: number[] = [];
  let currentStart = 0;
  text.split("").forEach((ch, i) => {
    if (ch === " ") {
      if (currentWord.length > 0) {
        words.push({ chars: currentWord, startIdx: currentStart });
        currentWord = [];
      }
      words.push({ chars: [i], startIdx: i }); // space as its own "word"
      currentStart = i + 1;
    } else {
      if (currentWord.length === 0) currentStart = i;
      currentWord.push(i);
    }
  });
  if (currentWord.length > 0) {
    words.push({ chars: currentWord, startIdx: currentStart });
  }

  return (
    <span ref={containerRef} className={`inline ${className}`} aria-label={text}>
      {words.map((word, wi) => {
        // Space
        if (word.chars.length === 1 && text[word.chars[0]] === " ") {
          return <span key={`s${wi}`}> </span>;
        }
        // Word — wrap in nowrap span so it breaks as a unit
        return (
          <span key={`w${wi}`} style={{ whiteSpace: "nowrap" }}>
            {word.chars.map((i) => {
              const isRevealed = revealed[i];
              return (
                <span
                  key={i}
                  className={`inline-block transition-all duration-200 ${
                    isRevealed ? revealedClassName : encryptedClassName
                  }`}
                  style={{
                    fontFamily: isRevealed ? "inherit" : "'Geist Mono', monospace",
                    transform: isRevealed ? "translateY(0)" : "translateY(2px)",
                    opacity: isRevealed ? 1 : 0.7,
                  }}
                >
                  {isRevealed ? text[i] : scrambled[i]}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
