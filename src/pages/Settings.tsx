import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import {
  SettingRow,
  Toggle,
  Dropdown,
  KeycapCombo,
  SegmentedTabs,
} from "@/components/ui";
import { SETTINGS_SECTIONS, SettingsSection, SHORTCUTS } from "@/lib/data";
import {
  useStore,
  setState,
  saveDictionaryMode,
  saveCerebrasSettings,
  showToast,
} from "@/lib/store";
import type { CerebrasModel, DictionaryMode } from "@/lib/store";
import { invoke, isTauri } from "@/lib/tauri";
import { useTheme, type ThemeChoice } from "@/lib/theme";

// Selector de apariencia: Light / Dark / System (System sigue al sistema operativo).
function ThemeSelect() {
  const { choice, setChoice } = useTheme();
  return (
    <SegmentedTabs<ThemeChoice>
      tabs={[
        { id: "light", label: "Light" },
        { id: "dark", label: "Dark" },
        { id: "system", label: "System" },
      ]}
      value={choice}
      onChange={setChoice}
    />
  );
}

// Selector real del método de inserción, cableado al backend (set_inject_mode).
function InsertMethodSelect() {
  const method = useStore((s) => s.insertMethod);
  const change = (m: "paste" | "type") => {
    setState({ insertMethod: m });
    invoke("set_inject_mode", { mode: m });
  };
  return (
    <select
      value={method}
      onChange={(e) => change(e.target.value as "paste" | "type")}
      className="rounded-xl border border-line bg-app px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
    >
      <option value="paste">Paste method</option>
      <option value="type">Direct insertion</option>
    </select>
  );
}

export default function Settings() {
  const location = useLocation();
  const [section, setSection] = useState<SettingsSection>(() => {
    const requested = new URLSearchParams(location.search).get("section");
    return SETTINGS_SECTIONS.includes(requested as SettingsSection)
      ? (requested as SettingsSection)
      : "Account";
  });

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("section");
    if (SETTINGS_SECTIONS.includes(requested as SettingsSection)) {
      setSection(requested as SettingsSection);
    }
  }, [location.search]);

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-5xl overflow-hidden rounded-2xl border border-line bg-app">
      {/* Rail de secciones */}
      <div className="flex w-56 shrink-0 flex-col border-r border-line bg-sidebar p-3">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-app px-2.5 py-1.5">
          <Search size={14} className="text-faint" />
          <input
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                section === s
                  ? "bg-card font-semibold text-ink"
                  : "font-medium text-muted hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </nav>
        <div className="px-3 pt-2 text-xs text-faint">v0.1.9</div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-app/90 px-7 py-4 backdrop-blur">
          <h1 className="text-xl font-bold text-ink">{section}</h1>
        </div>
        <div className="px-7 pb-10">
          {section === "Account" && <AccountSection />}
          {section === "General" && <GeneralSection />}
          {section === "Audio" && <AudioSection />}
          {section === "Language" && <LanguageSection />}
          {section === "Dictionary" && <DictionarySection />}
          {section === "Recording" && <RecordingSection />}
          {section === "Shortcuts" && <ShortcutsSection />}
          {section === "Permissions" && <PermissionsSection />}
          {section === "Sync" && <SyncSection />}
          {section === "Experimental" && <ExperimentalSection />}
        </div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-line rounded-2xl border border-line px-5">{children}</div>;
}

function AccountSection() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-line p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-card text-muted">XC</div>
          <div>
            <div className="font-semibold text-ink">XC</div>
            <div className="text-sm text-muted">xuban.ceccon@gmail.com</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Name" value="XC" />
          <Field label="Email" value="xuban.ceccon@gmail.com" />
        </div>
        <button className="btn-primary mt-4 px-4 py-2 text-[13px]">Edit Information</button>
      </div>

      <div className="flex justify-end gap-4 text-xs text-muted">
        <a href="#" className="hover:underline">Privacy Policy</a>
        <a href="#" className="hover:underline">Terms of Service</a>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        defaultValue={value}
        className="w-full rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function GeneralSection() {
  const g = useStore((s) => s.general);
  const set = (k: keyof typeof g) => (v: boolean) =>
    setState((s) => ({ general: { ...s.general, [k]: v } }));
  return (
    <Card>
      <SettingRow
        label="Appearance"
        help="Light, Dark, or System (follows your operating system)."
        control={<ThemeSelect />}
      />
      <SettingRow
        label="Software Updates"
        help="Check for the latest version of Yawning Face"
        control={<button className="btn-secondary px-3.5 py-2 text-[13px]">Check for Updates</button>}
      />
      <SettingRow label="Auto-paste transcription" help="Automatically paste transcribed text into focused field" control={<Toggle checked={g.autopaste} onChange={set("autopaste")} />} />
      <SettingRow label="Text Insertion Method" help={'How transcribed text is inserted. "Paste method" uses the clipboard; "Direct insertion" types characters directly, the clipboard is never read, written, or modified in any way.'} control={<InsertMethodSelect />} />
      <SettingRow label="Auto Enter" help="Automatically press Enter after pasting transcription" control={<Toggle checked={g.autoEnter} onChange={set("autoEnter")} />} />
      <SettingRow label="Restore clipboard after paste" help="Restore your original clipboard content after transcription is pasted" control={<Toggle checked={g.restoreClipboard} onChange={set("restoreClipboard")} />} />
      <SettingRow label="Sound Effects" help="Play audio feedback when recording starts and stops" control={<Toggle checked={g.soundEffects} onChange={set("soundEffects")} />} />
      <SettingRow label="Save transcriptions to history" help="Transcription entries will be saved to History. Your word count and activity data are always tracked." control={<Toggle checked={g.saveHistory} onChange={set("saveHistory")} />} />
      <SettingRow label="Remove filler words" help={'Automatically remove filler words like "uh", "um", and "hmm" from transcriptions.'} control={<Toggle checked={g.removeFillers} onChange={set("removeFillers")} />} />
    </Card>
  );
}

function AudioSection() {
  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="font-semibold text-ink">Microphone</div>
      <div className="text-sm text-muted">Select your audio input device</div>
      <div className="mt-3 flex items-center gap-3">
        <Dropdown value="Default microphone / Same as system" className="flex-1" />
        <button className="btn-primary px-4 py-2 text-[13px]">Refresh</button>
      </div>
    </div>
  );
}

function LanguageSection() {
  return (
    <Card>
      <SettingRow label="UI Language" help="Select the language for the application interface" control={<Dropdown value="English" />} />
      <div className="py-3.5">
        <div className="text-[15px] font-semibold text-ink">Transcription Language</div>
        <p className="mt-0.5 text-[13px] text-muted">Select transcription language (auto-detect recommended)</p>
        <div className="mt-2 rounded-lg bg-card px-3 py-2 text-[13px] text-muted">
          <b className="text-ink">Parakeet V3:</b> Auto-detects supported speech for the active local model.
        </div>
        <div className="mt-2"><Dropdown value="English" /></div>
      </div>
      <SettingRow label="English Spelling" help="Choose the spelling convention used for English transcriptions" control={<Dropdown value="American English (default)" />} />
    </Card>
  );
}

function DictionaryModeSelect() {
  const mode = useStore((s) => s.dictionaryMode);
  const change = (value: DictionaryMode) => saveDictionaryMode(value);

  return (
    <select
      value={mode}
      onChange={(event) => change(event.target.value as DictionaryMode)}
      className="rounded-xl border border-line bg-app px-3 py-2 text-sm font-medium text-ink outline-none focus:border-brand"
    >
      <option value="postprocess">Exact replacements</option>
      <option value="cerebras">Cerebras AI</option>
      <option value="off">Off</option>
    </select>
  );
}

interface CerebrasKeyStatus {
  configured: boolean;
  source: "credential_store" | "environment" | "none";
}

const CEREBRAS_MODELS: { id: CerebrasModel; label: string }[] = [
  { id: "gpt-oss-120b", label: "GPT OSS 120B" },
  { id: "zai-glm-4.7", label: "Z.ai GLM 4.7" },
  { id: "gemma-4-31b", label: "Gemma 4 31B" },
];

function credentialLabel(status: CerebrasKeyStatus | null, loading: boolean, unavailable: boolean) {
  if (loading) return "Checking…";
  if (unavailable) return "Status unavailable";
  if (!status || status.source === "none") return "Not configured";
  if (status.source === "environment") return "Environment variable";
  return "Credential store";
}

function CerebrasConfigCard() {
  const saved = useStore((s) => s.cerebras);
  const [model, setModel] = useState<CerebrasModel>(saved.model);
  const [context, setContext] = useState(saved.context);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<CerebrasKeyStatus | null>(null);
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(isTauri);
  const [busy, setBusy] = useState<"save-key" | "test" | "remove" | "settings" | null>(null);

  useEffect(() => {
    setModel(saved.model);
    setContext(saved.context);
  }, [saved.context, saved.model]);

  const refreshStatus = useCallback(async () => {
    if (!isTauri) {
      setLoadingStatus(false);
      return;
    }
    setLoadingStatus(true);
    setStatusUnavailable(false);
    try {
      const next = await invoke<CerebrasKeyStatus>("get_cerebras_status");
      setStatus(next);
    } catch {
      setStatus(null);
      setStatusUnavailable(true);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function verifyAndSave() {
    const key = apiKey.trim();
    if (!key) {
      showToast("Paste a Cerebras API key first");
      return;
    }
    if (!isTauri) {
      showToast("Cerebras setup is available in the desktop app only");
      return;
    }
    setBusy("save-key");
    try {
      await invoke("save_cerebras_api_key", { apiKey: key });
      setApiKey("");
      await refreshStatus();
      showToast("Cerebras key verified and saved securely");
    } catch {
      showToast("Cerebras could not verify that key. Check it and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function testConnection() {
    if (!isTauri) {
      showToast("Connection testing is available in the desktop app only");
      return;
    }
    setBusy("test");
    try {
      await invoke("test_cerebras_connection");
      showToast("Cerebras connection is working");
    } catch {
      showToast("Cerebras connection failed. The saved key was not changed.");
    } finally {
      setBusy(null);
    }
  }

  async function removeKey() {
    if (!isTauri) return;
    setBusy("remove");
    try {
      await invoke("clear_cerebras_api_key");
      setApiKey("");
      await refreshStatus();
      showToast("Saved Cerebras key removed");
    } catch {
      showToast("Could not remove the saved Cerebras key");
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    const nextContext = context.trim().slice(0, 4000);
    setBusy("settings");
    try {
      await saveCerebrasSettings({ model, context: nextContext });
      setContext(nextContext);
      showToast("Cerebras settings saved");
    } catch {
      showToast("Could not save the Cerebras settings");
    } finally {
      setBusy(null);
    }
  }

  const settingsChanged = model !== saved.model || context.trim() !== saved.context;
  const source = credentialLabel(status, loadingStatus, statusUnavailable);

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-ink">Cerebras AI correction</div>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            For live dictation, the local transcription, your domain context, and up to the first
            200 non-empty dictionary entries are sent to Cerebras. If correction fails, the app
            uses the local transcription. File transcription remains local without dictionary
            correction.
          </p>
        </div>
        <span
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            status?.configured ? "bg-emerald-500/15 text-emerald-600" : "bg-card text-muted"
          )}
        >
          {source}
        </span>
      </div>

      {!isTauri && (
        <div className="mt-4 rounded-xl border border-line bg-card px-3.5 py-3 text-[13px] text-muted">
          API-key setup and connection tests are available in the desktop app only. The browser
          preview does not accept or save credentials.
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">Model</span>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value as CerebrasModel)}
            className="w-full rounded-xl border border-line bg-app px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand"
          >
            {CEREBRAS_MODELS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={status?.configured ? "Enter a replacement key" : "Paste a Cerebras API key"}
            autoComplete="off"
            spellCheck={false}
            disabled={!isTauri || busy !== null}
            className="w-full rounded-xl border border-line bg-app px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">Domain context</span>
        <textarea
          value={context}
          onChange={(event) => setContext(event.target.value)}
          maxLength={4000}
          rows={4}
          className="w-full resize-y rounded-xl border border-line bg-app px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-brand"
          placeholder="Describe the terminology and subject matter you usually dictate."
        />
        <span className="mt-1 block text-xs text-faint">
          This non-secret context is stored with your app settings and sent only in Cerebras AI mode.
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-xs text-muted">
          {status?.source === "environment"
            ? "Source: CEREBRAS_API_KEY environment variable."
            : status?.source === "credential_store"
              ? "Source: your operating system credential store."
              : statusUnavailable
                ? "Credential status could not be read. Try reopening Settings."
                : "No Cerebras credential is currently available."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={!settingsChanged || busy !== null}
            className="btn-secondary px-3.5 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "settings" ? "Saving…" : "Save settings"}
          </button>
          <button
            type="button"
            onClick={() => void verifyAndSave()}
            disabled={!isTauri || !apiKey.trim() || busy !== null}
            className="btn-primary px-3.5 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "save-key" ? "Verifying…" : "Verify & save"}
          </button>
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={!isTauri || !status?.configured || busy !== null}
            className="btn-secondary px-3.5 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "test" ? "Testing…" : "Test"}
          </button>
          <button
            type="button"
            onClick={() => void removeKey()}
            disabled={!isTauri || status?.source !== "credential_store" || busy !== null}
            className="btn-ghost px-3 py-2 text-[13px] text-muted hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "remove" ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DictionarySection() {
  const dictionary = useStore((s) => s.dictionary);
  const mode = useStore((s) => s.dictionaryMode);
  const modeHelp =
    mode === "cerebras"
      ? "For live dictation, Cerebras reviews the local transcript using your dictionary and domain context. This sends those contents to Cerebras."
      : mode === "postprocess"
        ? "Exact replacements run locally after speech recognition. They only match the text you specify."
        : "Dictionary processing is disabled, so the raw local speech-model result is used.";

  return (
    <div className="space-y-4">
      <Card>
        <SettingRow
          label="Dictionary mode"
          help={modeHelp}
          control={<DictionaryModeSelect />}
        />
        <SettingRow
          label="Vocabulary"
          help={`${dictionary.length} saved ${dictionary.length === 1 ? "entry" : "entries"}.`}
          control={
            <Link to="/dictionary" className="btn-secondary px-3.5 py-2 text-[13px]">
              Edit Dictionary
            </Link>
          }
        />
      </Card>
      <CerebrasConfigCard />
    </div>
  );
}

function RecordingSection() {
  const pos = useStore((s) => s.recordingPos);
  const [idle, setIdle] = useState(false);
  const [saveAudio, setSaveAudio] = useState(false);
  const [muteSys, setMuteSys] = useState(false);
  const [preview, setPreview] = useState(false);
  return (
    <Card>
      <SettingRow
        label="Recording Indicator Position"
        help="Choose where the recording indicator appears on your screen"
        control={
          <SegmentedTabs
            tabs={[
              { id: "top", label: "Top" },
              { id: "bottom", label: "Bottom" },
              { id: "off", label: "Don't show" },
            ]}
            value={pos}
            onChange={(v) => setState({ recordingPos: v })}
          />
        }
      />
      <SettingRow label="Show idle pill" help="Display a minimized bar at the screen edge when idle. Hover to expand and start a recording." control={<Toggle checked={idle} onChange={setIdle} />} />
      <SettingRow label="Save audio recordings" help="Keep .wav audio files in ~/Documents/Yawning Face Recordings" control={<Toggle checked={saveAudio} onChange={setSaveAudio} />} />
      <SettingRow label="Mute system audio during recording" help="Automatically mute system audio when recording starts and unmute after transcription is pasted" control={<Toggle checked={muteSys} onChange={setMuteSys} />} />
      <SettingRow label="Real-time transcription preview" help="Show a live preview of your transcription below the recording indicator while speaking." control={<Toggle checked={preview} onChange={setPreview} />} />
    </Card>
  );
}

function ShortcutsSection() {
  const [rows, setRows] = useState(SHORTCUTS);
  return (
    <Card>
      {rows.map((r, i) => (
        <div key={i} className="py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[15px] font-semibold text-ink">{r.label}</div>
              <p className="mt-0.5 text-[13px] text-muted">{r.help}</p>
            </div>
            <div className="flex items-center gap-3">
              <KeycapCombo keys={r.keys} />
              <Toggle
                checked={r.on}
                onChange={(v) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, on: v } : x)))}
              />
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

function PermissionsSection() {
  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-ink">Microphone Access</div>
          <div className="text-sm text-muted">Required for recording audio when you speak</div>
        </div>
        <CheckCircle2 size={22} className="text-success" />
      </div>
      <button className="btn-primary mt-4 px-4 py-2 text-[13px]">Refresh Status</button>
    </div>
  );
}

function SyncSection() {
  const providers = [
    { name: "iCloud Drive", help: "Enable iCloud Drive in System Settings.", status: "Not detected" },
    { name: "Google Drive", help: "Install Google Drive for Desktop and sign in.", status: "Not detected" },
    { name: "Dropbox", help: "Install the Dropbox desktop app and sign in.", status: "Not detected" },
    { name: "OneDrive", help: "Sign in to OneDrive.", status: "Connect" },
  ];
  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Sync your dictionary, workflows, preferences, hotkeys, and transcription data across devices.
        Your data is stored in your own cloud storage folder, so it never leaves your control.
      </p>
      <Card>
        {providers.map((p) => (
          <SettingRow
            key={p.name}
            label={p.name}
            help={p.help}
            control={<span className="text-sm text-muted">{p.status}</span>}
          />
        ))}
      </Card>
    </div>
  );
}

function ExperimentalSection() {
  const [conn, setConn] = useState(false);
  const [silence, setSilence] = useState(false);
  const [tagging, setTagging] = useState(false);
  const Tag = () => (
    <span className="pill bg-amber-500/15 text-[10px] font-bold uppercase text-amber-600">
      Experimental
    </span>
  );
  return (
    <>
      <p className="mb-4 text-sm text-muted">
        These features are in active development and may behave unexpectedly. Enable only if you're
        experiencing a specific issue.
      </p>
      <Card>
        <SettingRow label="Enable Connectors" badge={<Tag />} help="Connect external apps (Linear, Notion, Vercel, etc.) so AI actions can read from and act on them." control={<Toggle checked={conn} onChange={setConn} />} />
        <SettingRow label="Enable Cursor/Windsurf file tagging" badge={<Tag />} help="When dictating in Cursor or Windsurf, automatically detect file references and insert them as @ mentions using the IDE's file picker" control={<Toggle checked={tagging} onChange={setTagging} />} />
        <SettingRow label="Enhanced silence detection" badge={<Tag />} help="Increases the silence threshold for cloud models (Groq, etc.) to prevent phantom transcriptions in moderately noisy environments. Enable this if you get empty or hallucinated transcriptions while not speaking." control={<Toggle checked={silence} onChange={setSilence} />} />
      </Card>
    </>
  );
}
