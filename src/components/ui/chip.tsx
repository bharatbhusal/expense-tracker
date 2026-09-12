"use client";

import * as React from "react";
import { X } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

type ChipProps = {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  variant?: "default" | "muted";
  ariaLabel?: string;
};

export function Chip({
  label,
  icon,
  onRemove,
  onClick,
  variant = "default",
  ariaLabel,
}: ChipProps) {
  // ponytail: a real <button> only when there is no nested remove control,
  // otherwise the markup would be a button inside a button.
  const Wrapper = onClick && !onRemove ? "button" : "span";

  return (
    <Wrapper
      type={Wrapper === "button" ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        variant === "default"
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)]",
        onClick && "cursor-pointer hover:brightness-110",
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="flex shrink-0 items-center">
          {icon}
        </span>
      ) : null}
      <span
        className="max-w-[12rem] truncate whitespace-nowrap"
        title={typeof label === "string" ? label : undefined}
      >
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          aria-label={typeof label === "string" ? `Remove ${label}` : "Remove filter"}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full opacity-70 transition-colors hover:opacity-100"
        >
          <X aria-hidden="true" className="h-3 w-3" />
        </button>
      ) : null}
    </Wrapper>
  );
}
