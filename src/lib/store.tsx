import { useSyncExternalStore } from "react";

// Store global mínimo, persistido en localStorage (se migrará a Tauri Store en escritorio).
export type RecordingPos = "top" | "bottom" | "off";

export interface AppState {
  selectedModelId: string; // p.ej. "en:Parakeet V2"
  selectedModelName: string; // p.ej. "Parakeet V2"
  recordingPos: RecordingPos;
  general: {
    openAtLogin: boolean;
    startMinimized: boolean;
    autopaste: boolean;
    autoEnter: boolean;
    restoreClipboard: boolean;
    soundEffects: boolean;
    saveHistory: boolean;
    removeFillers: boolean;
  };
  workflowsEnabled: Record<string, boolean>;
  transcriptions: Transcription[];
  // Estado efímero de grabación (no se persiste)
  recording: "idle" | "listening" | "transcribing" | "done" | null;
  liveText: string;
}

export interface Transcription {
  id: string;
  text: string;
  at: number;
  words: number;
}

const DEFAULT: AppState = {
  selectedModelId: "en:Parakeet V2",
  selectedModelName: "Parakeet V2",
  recordingPos: "top",
  general: {
    openAtLogin: false,
    startMinimized: false,
    autopaste: true,
    autoEnter: false,
    restoreClipboard: false,
    soundEffects: true,
    saveHistory: true,
    removeFillers: true,
  },
  workflowsEnabled: {},
  transcriptions: [],
  recording: null,
  liveText: "",
};

const KEY = "vowen.state";
// Campos que NO se persisten en localStorage.
const EPHEMERAL: (keyof AppState)[] = ["recording", "liveText"];

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

let state: AppState = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    const persisted = { ...state };
    EPHEMERAL.forEach((k) => delete (persisted as Record<string, unknown>)[k]);
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}

export function getState() {
  return state;
}

/** Añade una transcripción al historial (y deja `liveText` con el último texto). */
export function addTranscription(text: string) {
  const t: Transcription = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    text,
    at: Date.now(),
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
  };
  setState((s) => ({ transcriptions: [t, ...s.transcriptions].slice(0, 200) }));
  return t;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state)
  );
}
