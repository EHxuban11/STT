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
  installed: string[]; // ids de BACKEND de modelos descargados (p.ej. "parakeet-tdt-0.6b-v2-int8")
  activeModelId: string; // id de BACKEND del modelo activo (el que usa el dictado)
  insertMethod: "paste" | "type"; // método de inserción de texto
  onboarded: boolean; // si el usuario completó el onboarding inicial
  // Estado efímero (no se persiste)
  downloads: Record<string, { done: number; total: number }>;
  recording: "idle" | "listening" | "transcribing" | "done" | null;
  liveText: string;
  toast: string | null;
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
  installed: [], // se rellena desde el backend (list_installed_models); en navegador, por descargas simuladas
  activeModelId: "parakeet-tdt-0.6b-v2-int8",
  insertMethod: "paste",
  onboarded: false,
  downloads: {},
  recording: null,
  liveText: "",
  toast: null,
};

const KEY = "vowen.state";
// Campos que NO se persisten en localStorage.
const EPHEMERAL: (keyof AppState)[] = ["recording", "liveText", "downloads", "toast"];

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

export function markInstalled(id: string) {
  setState((s) => (s.installed.includes(id) ? {} : { installed: [...s.installed, id] }));
}

export function clearDownload(id: string) {
  setState((s) => {
    const d = { ...s.downloads };
    delete d[id];
    return { downloads: d };
  });
}

/** Reemplaza la lista de modelos instalados (la que reporta el backend). */
export function setInstalled(ids: string[]) {
  setState({ installed: ids });
}

let toastTimer = 0;
/** Muestra un aviso efímero (toast) en la app. */
export function showToast(msg: string, ms = 4500) {
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => setState({ toast: null }), ms);
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
