import { useState } from "react";
import { Type, Flame, Clock, Mic, Zap, Cloud, Sparkles, Headphones, Copy } from "lucide-react";
import { useTopBar } from "@/components/AppLayout";
import { SegmentedTabs, HeroCard, IconBadge, StatCard, Kbd, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Home() {
  const [tab, setTab] = useState<"overview" | "history">("overview");
  const modelName = useStore((s) => s.selectedModelName);
  const txs = useStore((s) => s.transcriptions);

  const totalWords = txs.reduce((a, t) => a + t.words, 0);
  const minutesSaved = Math.round((totalWords / 130) * 10) / 10; // ~130 wpm tecleando
  const today = new Date().toDateString();
  const spokenToday = txs
    .filter((t) => new Date(t.at).toDateString() === today)
    .reduce((a, t) => a + t.words, 0);

  useTopBar(
    <div className="flex w-full items-center">
      <button className="no-drag pill border border-brand/40 text-brand">✦ Get Pro</button>
      <div className="flex flex-1 justify-center">
        <SegmentedTabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "history", label: "History" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="no-drag mr-1 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted">
        <Headphones size={14} className="text-brand" /> {modelName}
      </div>
    </div>,
    [tab, modelName]
  );

  if (tab === "history")
    return (
      <div className="mx-auto max-w-4xl pt-2">
        {txs.length === 0 ? (
          <EmptyState
            icon={<Clock size={40} strokeWidth={1.5} />}
            title="No history yet"
            subtitle="Your saved transcriptions will appear here."
          />
        ) : (
          <div className="space-y-2">
            {txs.map((t) => (
              <div
                key={t.id}
                className="group flex items-start justify-between gap-4 rounded-xl border border-line bg-app p-4 transition-colors hover:bg-card"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{t.text}</p>
                  <p className="mt-1 text-xs text-muted">
                    {timeAgo(t.at)} · {t.words} words
                  </p>
                </div>
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
        )}
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-5 pt-2">
      {/* Banner de novedad */}
      <HeroCard
        title="Try out the new Expansions feature"
        body="Type a shortcut anywhere and it expands instantly."
        right={<IconBadge icon={Zap} />}
      >
        <button className="btn-primary px-4 py-2 text-[13px]">Try it out</button>
        <button className="btn-secondary px-4 py-2 text-[13px]">Dismiss</button>
      </HeroCard>

      {/* Saludo */}
      <div className="pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Hi there, XC <span className="align-middle">👋</span>
        </h1>
        <p className="mt-1 text-muted">You've spoken {spokenToday} words today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={<Type size={18} />} value={`${totalWords}`} label="Total Words" delta={`+${spokenToday} this week`} />
        <StatCard icon={<Flame size={18} />} value={spokenToday > 0 ? "1 day" : "0 days"} label="Longest Streak" delta={`${spokenToday > 0 ? 1 : 0}-day active streak`} />
        <StatCard icon={<Clock size={18} />} value={minutesSaved >= 60 ? `${(minutesSaved / 60).toFixed(1)} hour` : `${minutesSaved} min`} label="Total Time Saved" delta={`+${minutesSaved}m this week`} />
        <StatCard icon={<Mic size={18} />} value={`${txs.length}`} label="Transcriptions" delta={`+${txs.length} this week`} />
      </div>

      {/* Hint de dictado */}
      <HeroCard
        title={
          <span className="flex items-center gap-2">
            Hold <Kbd>Ctrl</Kbd> + <Kbd>⇧</Kbd> to dictate anywhere.
          </span>
        }
        right={<IconBadge icon={Mic} />}
      >
        <button className="btn-primary px-4 py-2 text-[13px]">
          Enable AI Mode <Sparkles size={14} />
        </button>
      </HeroCard>

      {/* Upsell modelo cloud */}
      <HeroCard
        title="Want faster transcription?"
        body="Switch to a cloud-based model for lightning-fast transcription in Windows. We recommend Groq — it's free, easy to set up, and incredibly fast."
        right={<IconBadge icon={Cloud} />}
      >
        <button className="btn-primary px-4 py-2 text-[13px]">Switch to Cloud Model</button>
      </HeroCard>
    </div>
  );
}
