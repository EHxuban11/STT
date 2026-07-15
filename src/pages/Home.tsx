import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Check, ChevronRight, Clock, Copy, Mic } from "lucide-react";
import { EmptyState, HeroCard, IconBadge, Kbd } from "@/components/ui";
import {
  showToast,
  useStore,
  type TranscriptStage,
  type Transcription,
} from "@/lib/store";
import { copyText } from "@/lib/tauri";
import { PTT_KEYS } from "@/lib/hotkey";

function dateGroupLabel(ts: number) {
  const d = new Date(ts);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (day.getTime() === today.getTime()) return "Today";
  if (day.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function groupByDate(txs: Transcription[]) {
  const groups: { label: string; items: Transcription[] }[] = [];
  for (const t of txs) {
    const label = dateGroupLabel(t.at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(t);
    else groups.push({ label, items: [t] });
  }
  return groups;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } else {
      showToast("Could not copy");
    }
  }

  return (
    <button
      onClick={onCopy}
      className={
        "btn-ghost shrink-0 transition-opacity " +
        (copied ? "opacity-100 text-emerald-600" : "opacity-0 group-hover:opacity-100")
      }
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

interface DiffPart {
  text: string;
  tokenIndex?: number;
}

function splitForDiff(text: string) {
  const parts: DiffPart[] = [];
  const tokens: string[] = [];
  const segments = text.match(/\s+|[\p{L}\p{N}_]+(?:[’'-][\p{L}\p{N}_]+)*|[^\s]/gu) ?? [];
  for (const segment of segments) {
    if (/^\s+$/u.test(segment)) {
      parts.push({ text: segment });
    } else {
      parts.push({ text: segment, tokenIndex: tokens.length });
      tokens.push(segment);
    }
  }
  return { parts, tokens };
}

/** Target-side word/punctuation changes, found with a longest-common-subsequence alignment. */
function changedTokenIndices(before: string, after: string) {
  const source = splitForDiff(before).tokens;
  const target = splitForDiff(after).tokens;
  const changed = new Set(target.map((_, index) => index));
  if (!source.length || !target.length) return changed;

  // Dictations are normally short. Avoid a pathological allocation for imported/legacy text.
  if (source.length * target.length > 250_000) return changed;

  const columns = target.length + 1;
  const lcs = new Uint16Array((source.length + 1) * columns);
  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      const cell = i * columns + j;
      lcs[cell] = source[i - 1] === target[j - 1]
        ? lcs[(i - 1) * columns + j - 1] + 1
        : Math.max(lcs[(i - 1) * columns + j], lcs[i * columns + j - 1]);
    }
  }

  let i = source.length;
  let j = target.length;
  while (i > 0 && j > 0) {
    if (source[i - 1] === target[j - 1]) {
      changed.delete(j - 1);
      i -= 1;
      j -= 1;
    } else if (lcs[(i - 1) * columns + j] >= lcs[i * columns + j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return changed;
}

function ComparedText({ text, previousText }: { text: string; previousText?: string }) {
  if (!text) return <span className="italic text-faint">No text</span>;
  if (previousText === undefined) return <>{text}</>;

  const { parts } = splitForDiff(text);
  const changed = changedTokenIndices(previousText, text);
  return (
    <>
      {parts.map((part, index) =>
        part.tokenIndex !== undefined && changed.has(part.tokenIndex) ? (
          <span
            key={index}
            className="underline decoration-red-500 decoration-2 underline-offset-[3px]"
          >
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

/** Compact latency label for a stage header, e.g. "142 ms" or "1.24 s". */
function formatStageMs(ms: number | undefined) {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function visibleStages(
  stages: TranscriptStage[] | undefined,
  showDecoderStage: boolean,
  showRewriteStage: boolean
) {
  return (stages ?? []).filter((stage) => {
    if (stage.kind === "decoder-vocabulary") return showDecoderStage;
    if (stage.kind === "rewrite") return showRewriteStage;
    return true;
  });
}

function HistoryItem({
  transcription,
  showDecoderStage,
  showRewriteStage,
}: {
  transcription: Transcription;
  showDecoderStage: boolean;
  showRewriteStage: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const stages = visibleStages(transcription.stages, showDecoderStage, showRewriteStage);
  const canExpand = stages.length > 1;

  return (
    <div className="group border-b border-line transition-colors last:border-0 hover:bg-card">
      <div className="flex items-start gap-3 px-4 py-3">
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide recognition stages" : "Show recognition stages"}
            className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-line hover:text-ink"
            title={expanded ? "Hide recognition stages" : "Show recognition stages"}
          >
            <ChevronRight
              size={15}
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}
        <div className="w-16 shrink-0 pt-0.5 text-xs text-faint">
          {timeLabel(transcription.at)}
        </div>
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-ink">
          {transcription.text}
        </p>
        <CopyButton text={transcription.text} />
      </div>

      {canExpand && expanded && (
        <div className="mb-3 ml-4 mr-4 overflow-x-auto rounded-xl border border-line bg-app/70 sm:ml-[7.75rem]">
          <div
            className="grid min-w-full"
            style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(220px, 1fr))` }}
          >
            {stages.map((stage, index) => (
              <div key={`${stage.kind}-${index}`} className="min-w-0 p-3 [&+&]:border-l [&+&]:border-line">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide ${
                      index === 0 ? "text-faint" : "text-brand"
                    }`}
                  >
                    {stage.label}
                  </span>
                  {formatStageMs(stage.ms) && (
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-faint">
                      {formatStageMs(stage.ms)}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-5 text-ink">
                  <ComparedText
                    text={stage.text}
                    previousText={index > 0 ? stages[index - 1].text : undefined}
                  />
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const txs = useStore((s) => s.transcriptions);
  const decoderVocabularyEnabled = useStore((s) => s.decoderVocabularyEnabled);
  const rewriteEnabled = useStore((s) => s.dictionaryMode === "cerebras");

  return (
    <div className="mx-auto max-w-4xl space-y-5 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Hi there, XC</h1>
          <p className="mt-1 text-muted">Dictate anywhere and keep a clean local history here.</p>
        </div>
        <Link
          to="/insights"
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-app px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-card"
        >
          <BarChart3 size={15} className="text-brand" />
          View insights
        </Link>
      </div>

      {txs.length === 0 && (
        <HeroCard
          title={
            <span className="flex flex-wrap items-center gap-2">
              Hold <Kbd>{PTT_KEYS[0]}</Kbd> + <Kbd>{PTT_KEYS[1]}</Kbd> to dictate anywhere.
            </span>
          }
          body="Your words get pasted into whatever app you're in, transcribed on-device."
          right={<IconBadge icon={Mic} />}
        />
      )}

      <div>
        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
          History
        </div>
        {txs.length === 0 ? (
          <EmptyState
            icon={<Clock size={40} strokeWidth={1.5} />}
            title="No history yet"
            subtitle="Your saved transcriptions will appear here."
          />
        ) : (
          <div className="space-y-6">
            {groupByDate(txs).map((g) => (
              <div key={g.label}>
                <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {g.label}
                </div>
                <div className="overflow-hidden rounded-2xl border border-line">
                  {g.items.map((t) => (
                    <HistoryItem
                      key={t.id}
                      transcription={t}
                      showDecoderStage={decoderVocabularyEnabled}
                      showRewriteStage={rewriteEnabled}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
