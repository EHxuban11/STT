// Contenido extraído del UI-SPEC de Vowen (listas de modelos, proveedores, workflows, ajustes).

// `backendId` mapea a un modelo real del catálogo del backend (models.json).
// Solo listamos modelos que realmente se descargan y funcionan: nada de
// "Coming soon" ni proveedores en la nube con un "Setup" que no hace nada.
export type LocalModel = {
  name: string;
  size: string;
  kind: "parakeet" | "whisper";
  backendId: string;
};

export const LOCAL_ENGLISH: LocalModel[] = [
  { name: "Parakeet V2", size: "451 MB", kind: "parakeet", backendId: "parakeet-tdt-0.6b-v2-int8" },
  { name: "Base", size: "141 MB", kind: "whisper", backendId: "whisper-base.en" },
  { name: "Tiny", size: "74 MB", kind: "whisper", backendId: "whisper-tiny.en" },
];

export const LOCAL_MULTI: LocalModel[] = [
  { name: "Parakeet V3", size: "478 MB", kind: "parakeet", backendId: "parakeet-tdt-0.6b-v3-int8" },
];

export const AI_PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Groq",
  "Google",
  "DeepSeek",
  "OpenRouter",
  "Straico",
  "Azure",
  "Cerebras",
  "AWS Bedrock",
  "Custom API",
];

export const DEFAULT_WORKFLOWS = [
  { trigger: "google", action: "Opens Google search with your query" },
  { trigger: "ask chat gpt", action: "Opens ChatGPT with your question" },
  { trigger: "ask claude", action: "Opens Claude AI with your question" },
  { trigger: "ask perplexity", action: "Opens Perplexity AI search with your query" },
  { trigger: "youtube", action: "Opens YouTube search with your query" },
  { trigger: "duck duck go", action: "Opens DuckDuckGo search with your query" },
  { trigger: "open", action: "Opens common folders in File Explorer" },
];

export const SETTINGS_SECTIONS = [
  "Account",
  "General",
  "Audio",
  "Language",
  "Dictionary",
  "Recording",
  "Shortcuts",
  "Permissions",
  "Sync",
  "Experimental",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SHORTCUTS = [
  {
    label: "Transcription Shortcut",
    help: "Hold to dictate anywhere. Ctrl + Win on Windows, Ctrl + Option on macOS.",
    keys: ["Ctrl", "⊞ Win"],
    on: true,
    pro: true,
  },
  {
    label: "Command Mode Shortcut",
    help: "Trigger Command Mode processing",
    keys: ["Alt", "⇧ Shift"],
    on: true,
    pro: true,
  },
  {
    label: "Hands-Free Mode",
    help: "Press to start and stop dictation",
    keys: ["Ctrl", "H"],
    on: true,
    pro: true,
  },
  {
    label: "Paste Last Transcription",
    help: "Paste your most recent transcription into the focused app",
    keys: ["Ctrl", "⇧ Shift", "L"],
    on: false,
  },
];
