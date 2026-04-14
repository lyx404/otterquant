"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  backgroundColor?: string;
  className?: string;
}

export function StarButton({
  children,
  backgroundColor = "#818cf8",
  className,
  ...props
}: StarButtonProps) {
  return (
    <button
      style={{ backgroundColor }}
      className={cn(
        "h-10 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-3xl text-sm font-medium text-white transition-colors hover:opacity-90 active:opacity-80 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
