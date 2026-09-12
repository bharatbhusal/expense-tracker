"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Theme } from "emoji-picker-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

type EmojiPickerFieldProps = {
  value: string;
  onChange: (emoji: string) => void;
  fallback?: string;
  label?: string;
};

export function EmojiPickerField({
  value,
  onChange,
  fallback = "🏷️",
  label = "Pick emoji",
}: EmojiPickerFieldProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-lg transition-colors hover:bg-[var(--color-surface-muted)]"
          aria-label={label}
        >
          {value || fallback}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="max-h-[40vh] overflow-y-auto">
          <EmojiPicker
            theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={(emojiObject) => onChange(emojiObject.emoji)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
