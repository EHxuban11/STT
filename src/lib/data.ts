// Contenido extraído del UI-SPEC de Vowen (listas de modelos, proveedores, workflows, ajustes).

export const CLOUD_STT = [
  { name: "Groq", sub: "Whisper Large v3 Turbo" },
  { name: "Groq", sub: "Whisper Large v3" },
  { name: "Deepgram", sub: "Nova 2" },
  { name: "Deepgram", sub: "Nova 3" },
  { name: "ElevenLabs", sub: "Scribe v2" },
  { name: "AssemblyAI", sub: "Universal" },
  { name: "Mistral", sub: "Voxtral Mini" },
  { name: "Sarvam AI", sub: "Saaras v3" },
  { name: "xAI", sub: "Aurora" },
  { name: "Cartesia", sub: "Ink 2" },
  { name: "Soniox", sub: "Real-Time STT" },
  { name: "Speechmatics", sub: "Speechmatics" },
  { name: "OpenAI", sub: "OpenAI" },
  { name: "Google", sub: "Google Gemini" },
  { name: "Local / Self-hosted", sub: "Custom Server" },
];

// `backendId` mapea a un modelo real del catálogo del backend (models.json). Sin él,
// el modelo aún no es descargable (se muestra como "Coming soon").
export type LocalModel = {
  name: string;
  size: string;
  kind: "parakeet" | "whisper";
  backendId?: string;
};

export const LOCAL_ENGLISH: LocalModel[] = [
  { name: "Parakeet V2", size: "451 MB", kind: "parakeet", backendId: "parakeet-tdt-0.6b-v2-int8" },
  { name: "Medium", size: "1.4 GB", kind: "whisper" },
  { name: "Small", size: "465 MB", kind: "whisper" },
  { name: "Base", size: "141 MB", kind: "whisper", backendId: "whisper-base.en" },
  { name: "Tiny", size: "74 MB", kind: "whisper", backendId: "whisper-tiny.en" },
];

export const LOCAL_MULTI: LocalModel[] = [
  { name: "Parakeet V3", size: "478 MB", kind: "parakeet", backendId: "parakeet-tdt-0.6b-v3-int8" },
  { name: "Large v3", size: "2.9 GB", kind: "whisper" },
  { name: "Large v3 Turbo", size: "1.5 GB", kind: "whisper" },
  { name: "Medium", size: "1.4 GB", kind: "whisper" },
  { name: "Small", size: "465 MB", kind: "whisper" },
  { name: "Base", size: "141 MB", kind: "whisper" },
  { name: "Tiny", size: "74 MB", kind: "whisper" },
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
    help: "Trigger audio transcription",
    keys: ["Ctrl", "⇧ Shift"],
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
