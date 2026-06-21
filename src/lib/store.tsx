import { useSyncExternalStore } from "react";
import { invoke } from "./tauri";

// Store global mínimo, persistido en localStorage (se migrará a Tauri Store en escritorio).
export type RecordingPos = "top" | "bottom" | "off";
export type DictionaryMode = "off" | "postprocess";

// Entrada de diccionario: "cuando oigas {from}, escribe {to}".
export interface DictEntry {
  from: string;
  to: string;
}

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
  dictionary: DictEntry[];
  dictionaryMode: DictionaryMode;
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
  selectedModelId: "ml:Parakeet V3",
  selectedModelName: "Parakeet V3",
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
  dictionary: [],
  dictionaryMode: "postprocess",
  transcriptions: [],
  installed: [], // se rellena desde el backend (list_installed_models); en navegador, por descargas simuladas
  activeModelId: "parakeet-tdt-0.6b-v3-int8",
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

const RECORDING_POS: RecordingPos[] = ["top", "bottom", "off"];
const DICTIONARY_MODES: DictionaryMode[] = ["off", "postprocess"];
const INSERT_METHODS: AppState["insertMethod"][] = ["paste", "type"];
const RECORDING_STATES: NonNullable<AppState["recording"]>[] = [
  "idle",
  "listening",
  "transcribing",
  "done",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function boolOr(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function enumOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function workflowMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
  );
}

function dictEntries(value: unknown): DictEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => ({
      from: stringOr(entry.from, "").trim(),
      to: stringOr(entry.to, "").trim(),
    }))
    .filter((entry) => entry.from && entry.to)
    .slice(0, 500);
}

function transcriptionEntries(value: unknown): Transcription[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((entry) => {
      const text = stringOr(entry.text, "").trim();
      const at = typeof entry.at === "number" && Number.isFinite(entry.at) ? entry.at : Date.now();
      const words =
        typeof entry.words === "number" && Number.isFinite(entry.words)
          ? entry.words
          : text
            ? text.split(/\s+/).length
            : 0;
      return {
        id: stringOr(entry.id, `${at}-${Math.floor(Math.random() * 1e6)}`),
        text,
        at,
        words,
      };
    })
    .filter((entry) => entry.text)
    .slice(0, 200);
}

function normalizeState(value: unknown): AppState {
  if (!isRecord(value)) return { ...DEFAULT };
  const general = isRecord(value.general) ? value.general : {};
  const loaded: AppState = {
    ...DEFAULT,
    selectedModelId: stringOr(value.selectedModelId, DEFAULT.selectedModelId),
    selectedModelName: stringOr(value.selectedModelName, DEFAULT.selectedModelName),
    recordingPos: enumOr(value.recordingPos, RECORDING_POS, DEFAULT.recordingPos),
    general: {
      openAtLogin: boolOr(general.openAtLogin, DEFAULT.general.openAtLogin),
      startMinimized: boolOr(general.startMinimized, DEFAULT.general.startMinimized),
      autopaste: boolOr(general.autopaste, DEFAULT.general.autopaste),
      autoEnter: boolOr(general.autoEnter, DEFAULT.general.autoEnter),
      restoreClipboard: boolOr(general.restoreClipboard, DEFAULT.general.restoreClipboard),
      soundEffects: boolOr(general.soundEffects, DEFAULT.general.soundEffects),
      saveHistory: boolOr(general.saveHistory, DEFAULT.general.saveHistory),
      removeFillers: boolOr(general.removeFillers, DEFAULT.general.removeFillers),
    },
    workflowsEnabled: workflowMap(value.workflowsEnabled),
    dictionary: dictEntries(value.dictionary),
    dictionaryMode: enumOr(value.dictionaryMode, DICTIONARY_MODES, DEFAULT.dictionaryMode),
    transcriptions: transcriptionEntries(value.transcriptions),
    installed: stringArray(value.installed),
    activeModelId: stringOr(value.activeModelId, DEFAULT.activeModelId),
    insertMethod: enumOr(value.insertMethod, INSERT_METHODS, DEFAULT.insertMethod),
    onboarded: boolOr(value.onboarded, DEFAULT.onboarded),
    downloads: {},
    recording: enumOr(value.recording, RECORDING_STATES, DEFAULT.recording ?? "idle"),
    liveText: stringOr(value.liveText, DEFAULT.liveText),
    toast: null,
  };

  if (!value.recording) loaded.recording = null;
  return loaded;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const loaded = normalizeState(JSON.parse(raw));
      const oldDefaultModel =
        loaded.selectedModelId === "en:Parakeet V2" &&
        loaded.selectedModelName === "Parakeet V2" &&
        loaded.activeModelId === "parakeet-tdt-0.6b-v2-int8";
      if (oldDefaultModel) {
        return {
          ...loaded,
          selectedModelId: DEFAULT.selectedModelId,
          selectedModelName: DEFAULT.selectedModelName,
          activeModelId: DEFAULT.activeModelId,
        };
      }
      return loaded;
    }
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

/** Guarda el diccionario y lo empuja al backend (que lo aplica a cada dictado). */
export function saveDictionary(entries: DictEntry[]) {
  setState({ dictionary: entries });
  invoke("set_dictionary", { entries });
}

/** Cambia cómo se aplica el diccionario del usuario. */
export function saveDictionaryMode(mode: DictionaryMode) {
  setState({ dictionaryMode: mode });
  invoke("set_dictionary_mode", { mode });
}

/** Guarda el estado de un workflow y lo sincroniza con el backend. */
export function saveWorkflowEnabled(trigger: string, enabled: boolean) {
  const workflows = { ...getState().workflowsEnabled, [trigger]: enabled };
  setState({ workflowsEnabled: workflows });
  invoke("set_workflows_enabled", { workflows });
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
