import { motion } from "framer-motion";
import { Mic, Loader2, Check } from "lucide-react";
import { PTT_LABEL } from "@/lib/hotkey";

export type PillState = "idle" | "listening" | "transcribing" | "done";

// Barras de onda animadas (simulan el nivel de audio mientras se graba).
function Waveform({ active }: { active: boolean }) {
  const bars = [0.5, 0.8, 1, 0.7, 1, 0.6, 0.9, 0.5, 0.8];
  return (
    <div className="flex h-5 items-center gap-[3px]">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-white"
          initial={{ height: 4 }}
          animate={
            active
              ? { height: [4, 20 * h, 6, 16 * h, 4] }
              : { height: 4 }
          }
          transition={{
            duration: 0.9 + (i % 3) * 0.15,
            repeat: active ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

export function RecordingPill({
  state = "listening",
  text,
}: {
  state?: PillState;
  text?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="recording-pill-surface flex items-center gap-3 rounded-full bg-zinc-900 px-4 py-2.5 text-white shadow-pill"
    >
      {state === "listening" && (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <Waveform active />
          <span className="text-[13px] font-medium text-white/80">Listening…</span>
        </>
      )}
      {state === "transcribing" && (
        <>
          <Loader2 size={16} className="animate-spin text-brand" />
          <span className="text-[13px] font-medium text-white/80">Transcribing…</span>
        </>
      )}
      {state === "done" && (
        <>
          <Check size={16} className="text-emerald-400" />
          <span className="max-w-[280px] truncate text-[13px] font-medium text-white/90">
            {text || "Done"}
          </span>
        </>
      )}
      {state === "idle" && (
        <>
          <Mic size={15} className="text-white/70" />
          <span className="text-[13px] font-medium text-white/60">Hold {PTT_LABEL}</span>
        </>
      )}
    </motion.div>
  );
}
