import { useEffect } from "react";
import { setState, getState, addTranscription } from "./store";
import { isTauri, on } from "./tauri";

const SAMPLES = [
  "This is a local transcription produced by the Parakeet model running on your device.",
  "Let's ship the production build this week and add the cloud providers next.",
  "Reminder to follow up with the team about the meeting notes feature.",
  "The quick brown fox jumps over the lazy dog while the model listens.",
];
let sampleIdx = 0;

let timers: number[] = [];
function clearTimers() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
}

/* ---------------- Camino de demo en navegador ---------------- */
export function startDictation() {
  clearTimers();
  setState({ recording: "listening", liveText: "" });
}

export function stopDictation() {
  if (getState().recording !== "listening") return;
  setState({ recording: "transcribing" });
  const text = SAMPLES[sampleIdx++ % SAMPLES.length];
  timers.push(
    window.setTimeout(() => {
      setState({ recording: "done", liveText: text });
      addTranscription(text);
      try {
        navigator.clipboard?.writeText(text);
      } catch {
        /* ignore */
      }
    }, 700)
  );
  timers.push(window.setTimeout(() => setState({ recording: null }), 2600));
}

function demoOnce() {
  startDictation();
  timers.push(window.setTimeout(stopDictation, 1800));
}

/* ---------------- Hook: conecta backend (Tauri) o demo (navegador) ---------------- */
export function useDictation() {
  useEffect(() => {
    const subs: Promise<() => void>[] = [];

    // Estado de grabación emitido por el backend Rust.
    subs.push(
      on<string>("state", (phase) => {
        if (phase === "recording") setState({ recording: "listening", liveText: "" });
        else if (phase === "idle")
          timers.push(window.setTimeout(() => setState({ recording: null }), 1400));
      })
    );

    // Transcripciones del backend: interim = preview en vivo; final = definitivo.
    subs.push(
      on<{ text: string; interim: boolean }>("transcript", (t) => {
        if (t.interim) {
          setState({ recording: "listening", liveText: t.text });
        } else if (t.text.trim()) {
          // Texto definitivo → guardar en el historial (una sola vez, sin depender del "idle").
          addTranscription(t.text);
          setState({ recording: "done", liveText: t.text });
        }
      })
    );

    // Demo en navegador: Ctrl+Shift+Space.
    const onKey = (e: KeyboardEvent) => {
      if (!isTauri && e.ctrlKey && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        demoOnce();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      subs.forEach((p) => p.then((un) => un()));
      clearTimers();
    };
  }, []);
}
