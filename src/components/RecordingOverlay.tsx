import { AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { RecordingPill, PillState } from "./RecordingPill";
import { useStore } from "@/lib/store";

// Muestra la píldora de grabación flotante sobre la app, en la posición configurada.
export function RecordingOverlay() {
  const recording = useStore((s) => s.recording);
  const pos = useStore((s) => s.recordingPos);
  const text = useStore((s) => s.liveText);

  if (pos === "off") return null;

  return (
    <div
      className={clsx(
        "pointer-events-none fixed inset-x-0 z-[60] flex justify-center",
        pos === "top" ? "top-6" : "bottom-8"
      )}
    >
      <AnimatePresence>
        {recording && (
          <div className="pointer-events-auto">
            <RecordingPill state={recording as PillState} text={text} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
