import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Download,
  FileAudio,
  Headphones,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Upload,
  X,
} from "lucide-react";
import { CounterPill, HeroCard, IconBadge } from "@/components/ui";
import { copyText, invoke, isTauri } from "@/lib/tauri";
import { showToast, useStore } from "@/lib/store";

type JobStatus = "transcribing" | "done" | "error";

interface PickedFile {
  path: string;
  name: string;
}

interface BackendLine {
  time: number;
  text: string;
}

interface BackendResult {
  path: string;
  file_name: string;
  duration_seconds: number;
  lines: BackendLine[];
}

interface TranscriptLine {
  time: number;
  label: string;
  text: string;
}

interface TranscribeJob {
  id: string;
  fileName: string;
  path: string;
  mediaUrl: string;
  createdAt: number;
  status: JobStatus;
  lines: TranscriptLine[];
  durationSeconds: number;
  error?: string;
}

const bars = Array.from({ length: 104 }, (_, i) => 18 + ((i * 37) % 48));

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() || "Selected file";
}

function formatTime(seconds: number) {
  const clamped = Math.max(0, Math.round(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function dayLabel(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function transcriptText(job: TranscribeJob) {
  return job.lines.map((l) => `[${l.label}] ${l.text}`).join("\n");
}

function downloadTranscript(job: TranscribeJob) {
  const text = transcriptText(job);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${job.fileName.replace(/\.[^.]+$/, "") || "transcript"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function toMediaUrl(path: string) {
  if (!isTauri) return "";
  const { convertFileSrc } = await import("@tauri-apps/api/core");
  return convertFileSrc(path);
}

function resultToLines(result: BackendResult): TranscriptLine[] {
  return result.lines.map((line) => ({
    time: line.time,
    label: formatTime(line.time),
    text: line.text,
  }));
}

export default function Transcribe() {
  const modelName = useStore((s) => s.selectedModelName);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);
  const [jobs, setJobs] = useState<TranscribeJob[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeJob = jobs.find((job) => job.id === activeId) ?? null;

  function openModal() {
    setSelectedFile(null);
    setModalOpen(true);
  }

  async function runTranscription(file: PickedFile, existingId?: string) {
    const id = existingId || `${Date.now()}`;
    const mediaUrl = await toMediaUrl(file.path);
    const createdAt = Date.now();

    setJobs((current) => {
      if (existingId) {
        return current.map((job) =>
          job.id === existingId
            ? { ...job, status: "transcribing", error: undefined, lines: [] }
            : job
        );
      }
      return [
        {
          id,
          fileName: file.name,
          path: file.path,
          mediaUrl,
          createdAt,
          status: "transcribing",
          lines: [],
          durationSeconds: 0,
        },
        ...current,
      ];
    });

    try {
      const result = await invoke<BackendResult>("transcribe_media_file", { path: file.path });
      if (!result) throw new Error("File transcription is only available in the desktop app.");

      const lines = resultToLines(result);
      setJobs((current) =>
        current.map((job) =>
          job.id === id
            ? {
                ...job,
                fileName: result.file_name || file.name,
                path: result.path || file.path,
                mediaUrl,
                durationSeconds: result.duration_seconds || 0,
                status: "done",
                lines,
              }
            : job
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJobs((current) =>
        current.map((job) =>
          job.id === id ? { ...job, status: "error", error: message, lines: [] } : job
        )
      );
    }
  }

  function startTranscription() {
    if (!selectedFile) return;
    const file = selectedFile;
    setModalOpen(false);
    void runTranscription(file);
  }

  function cancelJob(id: string) {
    setJobs((current) => current.filter((job) => job.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function regenerateJob(job: TranscribeJob) {
    void runTranscription({ path: job.path, name: job.fileName }, job.id);
  }

  if (activeJob) {
    return (
      <TranscriptDetail
        job={activeJob}
        modelName={modelName}
        onBack={() => setActiveId(null)}
        onRegenerate={() => regenerateJob(activeJob)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-2">
      <button onClick={openModal} className="block w-full text-left">
        <HeroCard
          title="Transcribe any audio or video. Export as text or subtitles."
          body="Click to start a new transcription."
          right={<IconBadge icon={Upload} />}
          className="cursor-pointer border border-line bg-app transition-colors hover:bg-card"
        />
      </button>

      <div className="flex justify-end">
        <CounterPill text={`${jobs.length} transcriptions`} />
      </div>

      <div className="flex items-center rounded-lg border border-line bg-card px-3 py-2">
        <Search size={15} className="text-faint" />
        <input
          placeholder="Search transcriptions..."
          className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <button className="inline-flex items-center gap-2 rounded-lg border border-line bg-app px-3 py-2 text-xs font-semibold text-ink hover:bg-card">
          Sort: Newest first <ChevronDown size={13} className="text-faint" />
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="text-faint">
            <Headphones size={44} strokeWidth={1.5} />
          </div>
          <div className="text-[15px] font-semibold text-brand">No transcriptions yet</div>
          <div className="text-sm text-muted">Drop an audio or video file above to get started.</div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="px-0.5 text-xs font-semibold text-muted">{dayLabel(jobs[0].createdAt)}</div>
          <div className="space-y-2">
            {jobs.map((job) => (
              <TranscriptionRow
                key={job.id}
                job={job}
                onCancel={() => cancelJob(job.id)}
                onOpen={() => job.status !== "transcribing" && setActiveId(job.id)}
              />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <TranscribeModal
          modelName={modelName}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          onClose={() => setModalOpen(false)}
          onSubmit={startTranscription}
        />
      )}
    </div>
  );
}

function TranscriptionRow({
  job,
  onCancel,
  onOpen,
}: {
  job: TranscribeJob;
  onCancel: () => void;
  onOpen: () => void;
}) {
  const preview =
    job.status === "error"
      ? job.error || "Transcription failed"
      : job.lines[0]?.text || (job.status === "done" ? "No speech detected." : "");

  return (
    <div
      onClick={onOpen}
      className={`group flex min-h-[54px] items-center gap-4 rounded-xl border border-line bg-card px-4 py-3 ${
        job.status !== "transcribing" ? "cursor-pointer hover:bg-card-hover" : ""
      }`}
    >
      <div className="w-14 shrink-0 text-xs text-faint">{timeLabel(job.createdAt)}</div>
      {job.status === "transcribing" ? (
        <>
          <Loader2 size={15} className="shrink-0 animate-spin text-brand" />
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-brand">
            Transcribing {job.path}...
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onCancel();
            }}
            className="btn-ghost shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            title="Cancel"
          >
            <X size={15} />
          </button>
        </>
      ) : (
        <>
          <div
            className={`min-w-0 flex-1 truncate text-sm font-semibold ${
              job.status === "error" ? "text-red-500" : "text-brand"
            }`}
          >
            {preview}
          </div>
          <div className="shrink-0 text-xs font-medium text-muted">{formatTime(job.durationSeconds)}</div>
        </>
      )}
    </div>
  );
}

function TranscribeModal({
  modelName,
  selectedFile,
  onSelectFile,
  onClose,
  onSubmit,
}: {
  modelName: string;
  selectedFile: PickedFile | null;
  onSelectFile: (file: PickedFile | null) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [pickError, setPickError] = useState<string | null>(null);

  async function chooseFile() {
    setPickError(null);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Audio and video",
            extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg", "opus", "mp4", "mkv", "mov", "webm"],
          },
        ],
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (typeof path === "string" && path) {
        onSelectFile({ path, name: basename(path) });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPickError(`Could not open the file picker. ${message}`);
    }
  }

  function pickDroppedFile(file: File | undefined) {
    const path = file && "path" in file ? String((file as File & { path?: string }).path) : "";
    if (path) onSelectFile({ path, name: basename(path) });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4">
      <div className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-line bg-app shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Transcribe</h2>
          <button onClick={onClose} className="btn-ghost p-1.5" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <Field label="Transcription Model">
            <button className="flex w-full items-center justify-between rounded-xl border border-line bg-card px-3 py-2.5 text-left text-sm font-semibold text-ink">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Headphones size={15} className="text-brand" />
                <span className="truncate">{modelName}</span>
              </span>
              <ChevronDown size={14} className="text-faint" />
            </button>
          </Field>

          <Field label="File">
            {selectedFile ? (
              <div className="min-h-[108px] rounded-xl border border-line bg-app p-2">
                <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm text-ink">
                  <FileAudio size={15} className="shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate font-medium">{selectedFile.path}</span>
                  <button onClick={() => onSelectFile(null)} className="btn-ghost p-1" title="Remove file">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={chooseFile}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  pickDroppedFile(event.dataTransfer.files?.[0]);
                }}
                className="flex min-h-[130px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-line bg-card px-4 text-center transition-colors hover:bg-card-hover"
              >
                <Upload size={27} className="mb-3 text-muted" />
                <span className="text-sm font-semibold text-ink">Drop a file here or click to browse</span>
                <span className="mt-2 text-xs text-faint">Audio and video files supported</span>
              </button>
            )}
            {pickError && <p className="mt-2 text-xs leading-5 text-red-500">{pickError}</p>}
          </Field>

          <p className="text-xs leading-5 text-muted">
            Transcription runs locally with the selected speech model. Timestamps are generated from the audio chunks and become clickable after completion.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-[13px]">
            Cancel
          </button>
          <button
            disabled={!selectedFile}
            onClick={onSubmit}
            className="btn-primary px-4 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Transcribe
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function TranscriptDetail({
  job,
  modelName,
  onBack,
  onRegenerate,
}: {
  job: TranscribeJob;
  modelName: string;
  onBack: () => void;
  onRegenerate: () => void;
}) {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(job.durationSeconds || 0);
  const [playing, setPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentLine = useMemo(() => {
    let index = 0;
    for (let i = 0; i < job.lines.length; i++) {
      if (position >= job.lines[i].time) index = i;
      else break;
    }
    return index;
  }, [job.lines, position]);

  function seek(seconds: number) {
    const next = Math.max(0, Math.min(duration || job.durationSeconds || 0, seconds));
    setPosition(next);
    if (audioRef.current) audioRef.current.currentTime = next;
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayerError(null);
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPlayerError(`Could not play this media file. ${message}`);
      setPlaying(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      <audio
        ref={audioRef}
        src={job.mediaUrl}
        onLoadedMetadata={(event) => {
          const d = event.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onError={() => setPlayerError("Could not load this media file for playback.")}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
        <button onClick={onBack} className="btn-ghost -ml-2">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="btn-ghost p-2" title="More">
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-xl border border-line bg-app p-1 shadow-2xl">
              <button
                onClick={() => downloadTranscript(job)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-card"
              >
                <Download size={14} /> Export
              </button>
              <button
                onClick={async () => {
                  const ok = await copyText(transcriptText(job));
                  showToast(ok ? "Copied transcript" : "Could not copy");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-card"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_235px]">
        <main className="mx-auto w-full max-w-[690px] space-y-4">
          <Player
            playing={playing}
            position={position}
            duration={duration || job.durationSeconds || 0}
            onPlay={togglePlay}
            onSeek={seek}
          />
          {playerError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {playerError}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink">{job.fileName}</h1>
            <div className="mt-2 text-sm text-muted">
              {dayLabel(job.createdAt)} at {timeLabel(job.createdAt)}
            </div>
          </div>

          {job.status === "error" ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
              {job.error}
            </div>
          ) : job.status === "transcribing" ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card p-4 text-sm font-medium text-muted">
              <Loader2 size={16} className="animate-spin text-brand" />
              Transcribing this file with {modelName}...
            </div>
          ) : job.lines.length === 0 ? (
            <div className="rounded-xl border border-line bg-card p-4 text-sm text-muted">
              No speech detected in this file.
            </div>
          ) : (
            <div className="space-y-1.5 pb-12">
              {job.lines.map((line, index) => (
                <button
                  key={`${line.label}-${index}`}
                  onClick={() => seek(line.time)}
                  className={`grid w-full grid-cols-[64px_1fr] gap-4 rounded-md px-2 py-1.5 text-left transition-colors ${
                    index === currentLine ? "bg-brand-soft text-ink" : "hover:bg-card"
                  }`}
                >
                  <span className="mt-0.5 w-fit rounded px-1.5 py-0.5 text-[11px] font-semibold text-brand">
                    {line.label}
                  </span>
                  <span className="text-[15px] font-medium leading-6 text-ink">{line.text}</span>
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="hidden border-l border-line pl-5 lg:block">
          <div className="sticky top-2 space-y-4">
            <div>
              <div className="text-sm font-bold text-ink">Transcript</div>
              <div className="mt-1 text-xs leading-5 text-muted">
                Generated locally with {modelName}. Re-run it after changing speech models.
              </div>
            </div>
            <button
              onClick={onRegenerate}
              disabled={job.status === "transcribing"}
              className="btn-secondary w-full px-3 py-2 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} /> Regenerate Transcript
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Player({
  playing,
  position,
  duration,
  onPlay,
  onSeek,
}: {
  playing: boolean;
  position: number;
  duration: number;
  onPlay: () => void;
  onSeek: (seconds: number) => void;
}) {
  const safeDuration = Math.max(1, duration || 1);
  const progress = position / safeDuration;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-3">
      <IconButton title="Back 10 seconds" onClick={() => onSeek(position - 10)}>
        <SkipBack size={15} />
      </IconButton>
      <IconButton title={playing ? "Pause" : "Play"} onClick={onPlay}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
      </IconButton>
      <IconButton title="Forward 10 seconds" onClick={() => onSeek(position + 10)}>
        <SkipForward size={15} />
      </IconButton>

      <div className="flex min-w-0 flex-1 items-center gap-[2px]">
        {bars.map((height, i) => {
          const active = i / bars.length <= progress;
          return (
            <button
              key={i}
              onClick={() => onSeek((i / bars.length) * safeDuration)}
              className={`w-[3px] rounded-full transition-colors ${
                active ? "bg-brand" : "bg-muted/55"
              }`}
              style={{ height: `${height}px` }}
              title={formatTime((i / bars.length) * safeDuration)}
            />
          );
        })}
      </div>

      <div className="shrink-0 text-sm font-semibold text-muted">
        {formatTime(position)} / {formatTime(duration)}
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-app text-muted transition-colors hover:bg-card-hover hover:text-ink"
      title={title}
    >
      {children}
    </button>
  );
}
