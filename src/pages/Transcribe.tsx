import { Plus, Upload, Headphones } from "lucide-react";
import { useTopBar } from "@/components/AppLayout";
import { HeroCard, IconBadge, CounterPill, EmptyState } from "@/components/ui";

export default function Transcribe() {
  useTopBar(
    <div className="flex w-full justify-end">
      <button className="no-drag btn-primary px-3.5 py-2 text-[13px]">
        <Plus size={15} /> Transcribe
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-2">
      <HeroCard
        title="Transcribe any audio or video. Export as text or subtitles."
        body="Click to start a new transcription."
        right={<IconBadge icon={Upload} />}
        className="cursor-pointer hover:bg-card-hover"
      />
      <div className="flex justify-end">
        <CounterPill text="0/10 transcriptions" />
      </div>
      <EmptyState
        icon={<Headphones size={44} strokeWidth={1.5} />}
        title="No transcriptions yet"
        subtitle="Drop an audio or video file above to get started."
      />
    </div>
  );
}
