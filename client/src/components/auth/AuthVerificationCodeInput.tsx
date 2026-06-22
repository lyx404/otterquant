import { useMemo, useRef } from "react";

type AuthVerificationCodeInputProps = {
  value: string;
  length?: number;
  disabled?: boolean;
  inputClassName?: string;
  onChange: (value: string) => void;
  tr: (en: string, zh: string) => string;
};

export default function AuthVerificationCodeInput({
  value,
  length = 6,
  disabled = false,
  inputClassName,
  onChange,
  tr,
}: AuthVerificationCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(
    () => Array.from({ length }, (_, index) => value[index] ?? ""),
    [length, value]
  );

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const updateValueAt = (index: number, nextChunk: string) => {
    const nextDigits = [...digits];
    const normalizedChunk = nextChunk.replace(/\D/g, "").slice(0, length - index);

    if (!normalizedChunk) {
      nextDigits[index] = "";
      onChange(nextDigits.join(""));
      return;
    }

    normalizedChunk.split("").forEach((char, offset) => {
      nextDigits[index + offset] = char;
    });

    onChange(nextDigits.join(""));
    focusInput(Math.min(index + normalizedChunk.length, length - 1));
  };

  return (
    <div className="auth-code-grid" role="group" aria-label={tr("6-digit verification code", "6位验证码")}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          className={inputClassName}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          aria-label={tr(`Verification code digit ${index + 1}`, `验证码第 ${index + 1} 位`)}
          onChange={(event) => updateValueAt(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              const nextDigits = [...digits];
              nextDigits[index - 1] = "";
              onChange(nextDigits.join(""));
              focusInput(index - 1);
            }

            if (event.key === "ArrowLeft" && index > 0) {
              event.preventDefault();
              focusInput(index - 1);
            }

            if (event.key === "ArrowRight" && index < length - 1) {
              event.preventDefault();
              focusInput(index + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            updateValueAt(index, event.clipboardData.getData("text"));
          }}
        />
      ))}
    </div>
  );
}
