import { Plus } from "lucide-react";
import { HeroCard } from "@/components/ui";

export default function Dictionary() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Dictionary</h1>
          <p className="text-sm text-muted">Teach the app names, products, and phrases you use often.</p>
        </div>
        <button className="btn-primary px-3.5 py-2 text-[13px]">
          <Plus size={15} /> Add Word
        </button>
      </div>

      <HeroCard
        title="Words that belong to you."
        body="Add words you say often so transcription can preserve the names, terms, and casing you care about."
      />

      <div className="border-t border-line pt-8 text-center text-sm text-muted">
        No vocabulary words yet
      </div>
    </div>
  );
}
