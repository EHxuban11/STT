import { useState } from "react";
import { Search, KeyRound, Gem, ExternalLink, CheckCircle2, Lock } from "lucide-react";
import clsx from "clsx";
import {
  SettingRow,
  Toggle,
  Dropdown,
  KeycapCombo,
  ProPill,
  SegmentedTabs,
} from "@/components/ui";
import { SETTINGS_SECTIONS, SettingsSection, SHORTCUTS } from "@/lib/data";
import { useStore, setState } from "@/lib/store";

export default function Settings() {
  const [section, setSection] = useState<SettingsSection>("Account");

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
        <div className="px-3 pt-2 text-xs text-faint">v0.4.7</div>
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

      <div className="flex items-center justify-between rounded-2xl border border-line p-5">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-ink">Current Plan</span>
          <span className="pill bg-card text-muted">FREE</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary px-3.5 py-2 text-[13px]">
            <KeyRound size={14} /> Activate License
          </button>
          <button className="btn-secondary px-3.5 py-2 text-[13px]">
            <Gem size={14} /> Buy License
          </button>
          <button className="btn-secondary px-3.5 py-2 text-[13px]">
            <ExternalLink size={14} /> Manage License
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line p-5">
        <div>
          <div className="font-semibold text-ink">Data</div>
          <div className="text-sm text-muted">
            Back up or restore your dictionary, threads, and workflows.
          </div>
        </div>
        <ProPill />
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
        label="Software Updates"
        help="Check for the latest version of Vowen"
        control={<button className="btn-secondary px-3.5 py-2 text-[13px]">Check for Updates</button>}
      />
      <SettingRow label="Open at Login" help="Automatically launch Vowen when you log into your computer" control={<Toggle checked={g.openAtLogin} onChange={set("openAtLogin")} />} />
      <SettingRow label="Start Minimized to Tray" help="Start the app minimized to the system tray (access via tray icon only)" control={<Toggle checked={g.startMinimized} onChange={set("startMinimized")} />} />
      <SettingRow label="Auto-paste transcription" help="Automatically paste transcribed text into focused field" control={<Toggle checked={g.autopaste} onChange={set("autopaste")} />} />
      <SettingRow label="Text Insertion Method" help={'How transcribed text is inserted. "Paste method" uses the clipboard; "Direct insertion" types characters directly — the clipboard is never read, written, or modified in any way.'} control={<Dropdown value="Paste method" />} />
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
          <b className="text-ink">Parakeet V2 (English):</b> This model only transcribes English speech.
        </div>
        <div className="mt-2"><Dropdown value="English" /></div>
      </div>
      <SettingRow label="English Spelling" help="Choose the spelling convention used for English transcriptions" control={<Dropdown value="American English (default)" />} />
    </Card>
  );
}

function RecordingSection() {
  const pos = useStore((s) => s.recordingPos);
  const [idle, setIdle] = useState(false);
  const [saveAudio, setSaveAudio] = useState(false);
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
      <SettingRow label="Save audio recordings" help="Keep .wav audio files in ~/Documents/Vowen Recordings" control={<Toggle checked={saveAudio} onChange={setSaveAudio} />} />
      <SettingRow label="Mute system audio during recording" help="Automatically mute system audio when recording starts and unmute after transcription is pasted" control={<ProPill />} />
      <SettingRow label="Real-time transcription preview" help="Show a live preview of your transcription below the recording indicator while speaking." control={<ProPill />} />
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
          {r.pro && (
            <button className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand">
              <Gem size={11} /> Multiple shortcuts — Upgrade to Pro
            </button>
          )}
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
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40">
        <p className="mb-4 text-sm text-muted">
          Sync your dictionary, threads, expansions, workflows, tones, preferences, hotkeys, and
          transcription data across devices. Your data is stored in your own cloud storage folder —
          Vowen never sees it.
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
      <div className="absolute inset-0 grid place-items-center">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-app/80 px-6 py-4 text-center backdrop-blur">
          <Lock size={20} className="text-brand" />
          <button className="text-sm font-semibold text-brand">Cloud Sync — Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}

function ExperimentalSection() {
  const [conn, setConn] = useState(false);
  const [silence, setSilence] = useState(false);
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
        <SettingRow label="Enable Connectors" badge={<Tag />} help="Connect external apps (Linear, Notion, Vercel, …) so Live Ask, Chat with Notes, and Command Mode can read from and act on them. Requires a Pro plan." control={<Toggle checked={conn} onChange={setConn} />} />
        <SettingRow label="Enable Cursor/Windsurf file tagging" badge={<Tag />} help="When dictating in Cursor or Windsurf, automatically detect file references and insert them as @ mentions using the IDE's file picker" control={<ProPill />} />
        <SettingRow label="Enhanced silence detection" badge={<Tag />} help="Increases the silence threshold for cloud models (Groq, etc.) to prevent phantom transcriptions in moderately noisy environments. Enable this if you get empty or hallucinated transcriptions while not speaking." control={<Toggle checked={silence} onChange={setSilence} />} />
      </Card>
    </>
  );
}
