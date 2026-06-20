import { useState } from "react";
import { Plus } from "lucide-react";
import { useTopBar } from "@/components/AppLayout";
import { SegmentedTabs, HeroCard } from "@/components/ui";

export default function Dictionary() {
  const [tab, setTab] = useState<"dictionary" | "threads" | "expansions">("dictionary");

  useTopBar(
    <div className="flex w-full justify-end">
      <button className="no-drag btn-primary px-3.5 py-2 text-[13px]">
        <Plus size={15} /> Add Word
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-2">
      <SegmentedTabs
        tabs={[
          { id: "dictionary", label: "Dictionary" },
          { id: "threads", label: "Threads" },
          { id: "expansions", label: "Expansions" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "dictionary" && (
        <>
          <HeroCard
            title="Words that belong to you."
            body="Model size matters. Add words you say often — they guide transcription on Small models and above."
          />
          <div className="border-t border-line pt-8 text-center text-sm text-muted">
            No vocabulary words yet
          </div>
        </>
      )}

      {tab === "threads" && (
        <>
          <HeroCard
            title="Threads."
            body="Group related phrases so Vowen recognises them as a single unit."
          />
          <div className="border-t border-line pt-8 text-center text-sm text-muted">
            No threads yet
          </div>
        </>
      )}

      {tab === "expansions" && (
        <>
          <HeroCard
            title="Expansions."
            body="Type a short trigger anywhere and it expands instantly into longer text."
          />
          <div className="border-t border-line pt-8 text-center text-sm text-muted">
            No expansions yet
          </div>
        </>
      )}
    </div>
  );
}
