/**
 * Animated amber audio waveform — pure CSS (each bar uses the `wave` keyframe
 * with a staggered delay). Server component; no JS needed.
 */
export default function Waveform({
  bars = 28,
  className = "",
  barClassName = "bg-primary",
}: {
  bars?: number;
  className?: string;
  barClassName?: string;
}) {
  // A fixed, organic-looking set of per-bar durations/delays (deterministic so
  // SSR and client markup match — no Math.random).
  return (
    <div
      className={`flex items-center gap-[3px] ${className}`}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        const duration = 0.7 + ((i * 37) % 9) * 0.08; // 0.7s–1.34s
        const delay = ((i * 53) % 11) * 0.07; // staggered
        return (
          <span
            key={i}
            className={`w-[3px] origin-center rounded-full ${barClassName}`}
            style={{
              height: "100%",
              animation: `wave ${duration}s ease-in-out ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}
