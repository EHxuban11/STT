import { Link } from "react-router-dom";
import { BarChart3, Clock, Copy, Mic } from "lucide-react";
import { EmptyState, HeroCard, IconBadge, Kbd } from "@/components/ui";
import { useStore, type Transcription } from "@/lib/store";

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

export default function Home() {
  const txs = useStore((s) => s.transcriptions);

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
              Hold <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> to dictate anywhere.
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
                    <div
                      key={t.id}
                      className="group flex items-start gap-4 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-card"
                    >
                      <div className="w-16 shrink-0 pt-0.5 text-xs text-faint">{timeLabel(t.at)}</div>
                      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-ink">{t.text}</p>
                      <button
                        onClick={() => navigator.clipboard?.writeText(t.text)}
                        className="btn-ghost shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Copy"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
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
