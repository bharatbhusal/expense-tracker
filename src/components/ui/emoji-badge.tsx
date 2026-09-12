type EmojiBadgeProps = {
  emoji?: string | null;
  color: string;
  className?: string;
  label?: string;
};

export function EmojiBadge({ emoji, color, className = "", label }: EmojiBadgeProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
      }}
      className={`flex h-10 w-10 items-center justify-center rounded-md ${className}`}
    >
      {emoji || "🏷️"}
    </span>
  );
}
