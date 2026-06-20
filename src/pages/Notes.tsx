import { Settings2, Circle, Upload, RefreshCw, Clapperboard } from "lucide-react";
import { useTopBar } from "@/components/AppLayout";
import { HeroCard, CounterPill, EmptyState } from "@/components/ui";

export default function Notes() {
  useTopBar(
    <div className="flex w-full items-center justify-end gap-2">
      <button className="no-drag btn-ghost">
        <Settings2 size={17} />
      </button>
      <button className="no-drag btn-primary px-3.5 py-2 text-[13px]">
        <Circle size={9} className="fill-red-500 text-red-500" /> Start Taking Notes
      </button>
      <button className="no-drag btn-primary px-3.5 py-2 text-[13px]">
        <Upload size={14} /> Import
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-2">
      <div className="flex justify-end">
        <CounterPill text="0/10 notes" />
      </div>
      <HeroCard
        title="Capture every meeting, effortlessly."
        body="AI-powered summaries, action items, and key decisions — all from your voice."
        right={
          <button className="btn-ghost">
            <RefreshCw size={16} />
          </button>
        }
      />
      <EmptyState
        icon={<Clapperboard size={44} strokeWidth={1.5} />}
        title="No notes yet"
        subtitle={'Click "Start Taking Notes" to begin recording.'}
      />
    </div>
  );
}
