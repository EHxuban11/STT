import { useMemo } from "react";
import { BookText, Flame, Headphones, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { computeInsights, type DayCell } from "@/lib/insights";

const nf = (n: number) => n.toLocaleString();

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`rounded-2xl border border-line bg-app p-5 ${className}`}>{children}</div>;
}

function Gauge({ value, max }: { value: number; max: number }) {
  const radius = 52;
  const cx = 64;
  const cy = 64;
  const len = Math.PI * radius;
  const frac = Math.max(0, Math.min(1, value / max));
  const arc = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div className="relative mx-auto w-[128px]">
      <svg viewBox="0 0 128 74" className="w-full">
        <path d={arc} fill="none" strokeWidth={12} strokeLinecap="round" className="stroke-card" />
        <path
          d={arc}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          className="stroke-brand"
          strokeDasharray={`${frac * len} ${len}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-2xl font-bold leading-none text-ink">{value}</div>
        <div className="text-[11px] font-medium text-faint">words/session</div>
      </div>
    </div>
  );
}

function level(words: number, max: number): string {
  if (words <= 0) return "bg-card";
  const r = words / max;
  if (r < 0.25) return "bg-brand/30";
  if (r < 0.5) return "bg-brand/55";
  if (r < 0.8) return "bg-brand/80";
  return "bg-brand";
}

function Heatmap({ weeks, max }: { weeks: DayCell[][]; max: number }) {
  const monthLabels = weeks.map((col, i) => {
    const first = col[0].date;
    const prev = i > 0 ? weeks[i - 1][0].date : null;
    if (i === 0 || (prev && first.getMonth() !== prev.getMonth())) {
      return first.toLocaleDateString(undefined, { month: "short" });
    }
    return "";
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1">
        <div className="flex gap-[3px] pl-7">
          {monthLabels.map((m, i) => (
            <div key={i} className="w-[12px] text-[9px] text-faint">
              {m}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="mr-1 flex flex-col justify-between py-[1px] text-[9px] text-faint">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          {weeks.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={
                    cell.future
                      ? ""
                      : `${cell.date.toLocaleDateString()} - ${cell.words} word${
                          cell.words === 1 ? "" : "s"
                        }`
                  }
                  className={`h-[12px] w-[12px] rounded-[3px] ${
                    cell.future ? "bg-transparent" : level(cell.words, max)
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bars({ days }: { days: DayCell[] }) {
  const max = Math.max(1, ...days.map((d) => d.words));

  return (
    <div className="flex h-32 items-end gap-1.5">
      {days.map((d) => {
        const h = (d.words / max) * 100;
        return (
          <div key={d.key} className="group flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                title={`${d.date.toLocaleDateString()} - ${d.words} words`}
                className={`w-full rounded-md transition-colors ${
                  d.words > 0 ? "bg-brand/70 group-hover:bg-brand" : "bg-card"
                }`}
                style={{ height: `${Math.max(d.words > 0 ? 6 : 3, h)}%` }}
              />
            </div>
            <div className="text-[9px] text-faint">{d.date.getDate()}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Insights() {
  const txs = useStore((s) => s.transcriptions);
  const modelName = useStore((s) => s.selectedModelName);
  const ins = useMemo(() => computeInsights(txs), [txs]);

  if (txs.length === 0) {
    return (
      <div className="mx-auto max-w-5xl pt-2">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-ink">Insights</h1>
        <p className="mb-8 text-muted">Your usage and voice patterns appear here as you dictate.</p>
        <EmptyState
          icon={<Sparkles size={40} strokeWidth={1.5} />}
          title="Nothing to show yet"
          subtitle="Hold Ctrl + Shift and start dictating to build your local profile."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Insights</h1>
        <p className="text-sm text-muted">A compact view of usage and voice patterns, computed on-device.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-faint">
            Average dictation
          </div>
          <Gauge value={ins.avgWords} max={75} />
          <div className="mt-3 text-center text-xs text-muted">
            across {nf(ins.sessions)} saved session{ins.sessions === 1 ? "" : "s"}
          </div>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[15px] font-bold text-ink">Activity</div>
            <div className="text-xs text-faint">last 14 days</div>
          </div>
          <Bars days={ins.last14} />
        </Card>

        <Card className="md:col-span-2">
          <div className="mb-4 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-brand" />
              <span className="text-2xl font-bold text-ink">{ins.currentStreak}</span>
              <span className="text-[15px] font-semibold text-ink">day streak</span>
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-faint">
              Longest {ins.longestStreak} days
            </div>
          </div>
          <Heatmap weeks={ins.weeks} max={ins.maxDayWords} />
          <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-faint">
            Less
            <span className="h-[11px] w-[11px] rounded-[3px] bg-card" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-brand/30" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-brand/55" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-brand/80" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-brand" />
            More
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-[15px] font-bold text-ink">
            <BookText size={17} className="text-brand" />
            Your most-said words
          </div>
          <p className="mb-4 text-sm text-muted">The non-filler words that show up most often.</p>
          {ins.topWords.length === 0 ? (
            <p className="text-sm text-faint">Not enough words yet.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {ins.topWords.map((w, i) => {
                const size = 13 + Math.round((1 - i / ins.topWords.length) * 9);
                return (
                  <span
                    key={w.word}
                    style={{ fontSize: `${size}px` }}
                    className="rounded-full bg-brand-soft px-3 py-1 font-semibold text-brand"
                  >
                    {w.word}
                    <span className="ml-1.5 text-[11px] font-medium text-faint">{w.count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="text-[15px] font-bold text-ink">Vocabulary</div>
          <div className="mt-4 space-y-3">
            <Stat label="Unique words" value={nf(ins.uniqueWords)} />
            <Stat label="Avg / session" value={nf(ins.avgWords)} />
            <Stat label="Active days" value={nf(ins.activeDays)} />
          </div>
        </Card>

        <Card className="md:col-span-1 xl:col-span-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand">
              <Headphones size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-ink">{modelName}</div>
              <div className="text-sm text-muted">Active local speech model.</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-lg font-bold text-ink">{value}</span>
    </div>
  );
}
