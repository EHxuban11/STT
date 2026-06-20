import type { ReactNode } from "react";

/** A small keycap. Warm, slightly raised, matches the rounded brand. */
export default function Kbd({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border bg-card px-2 font-sans text-xs font-semibold text-foreground shadow-[0_2px_0_rgb(var(--border))] ${className}`}
    >
      {children}
    </kbd>
  );
}
