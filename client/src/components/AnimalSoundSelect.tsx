import { useCallback, useEffect, useRef } from "react";
import { Select, type SelectOption } from "animal-island-ui";
import { playMenuOpen, playSelect } from "@/lib/sounds";

type AnimalSoundSelectProps = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  onChange: (key: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
};

const MENU_OPEN_SOUND_MIN_INTERVAL_MS = 120;

function playMenuOpenSafely() {
  try {
    playMenuOpen();
  } catch {
    // Audio feedback should never block opening a select.
  }
}

function playSelectSafely() {
  try {
    playSelect();
  } catch {
    // Audio feedback should never block selecting an option.
  }
}

export default function AnimalSoundSelect({
  ariaLabel,
  className,
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: AnimalSoundSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastMenuOpenSoundAtRef = useRef(0);

  const playOpenSoundFromTarget = useCallback(
    (target: EventTarget | null) => {
      if (disabled || !(target instanceof Element)) return;

      const root = rootRef.current;
      const trigger = target.closest('[class*="animal-trigger-"]');
      if (!root || !trigger || !root.contains(trigger)) return;

      const now = window.performance.now();
      if (now - lastMenuOpenSoundAtRef.current < MENU_OPEN_SOUND_MIN_INTERVAL_MS) return;

      lastMenuOpenSoundAtRef.current = now;
      playMenuOpenSafely();
    },
    [disabled],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType !== "touch") return;
      playOpenSoundFromTarget(event.target);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " " && event.key !== "ArrowDown") return;
      playOpenSoundFromTarget(event.target);
    };

    root.addEventListener("pointerdown", handlePointerDown, true);
    root.addEventListener("keydown", handleKeyDown, true);

    return () => {
      root.removeEventListener("pointerdown", handlePointerDown, true);
      root.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [playOpenSoundFromTarget]);

  return (
    <div ref={rootRef} className={className} aria-label={ariaLabel}>
      <Select
        value={value}
        onChange={(key) => {
          onChange(key);
          playSelectSafely();
        }}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
