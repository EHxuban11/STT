import { useState } from "react";
import { Lock, Info, Plus } from "lucide-react";
import { SegmentedTabs, ProviderRow, SetupBadge, ProPill, SectionLabel, HeroCard } from "@/components/ui";
import { AI_PROVIDERS } from "@/lib/data";

export default function ConfigureAI() {
  const [tab, setTab] = useState<"configuration" | "command" | "memory">("configuration");

  return (
    <div className="mx-auto max-w-4xl space-y-4 pt-2">
      <SegmentedTabs
        tabs={[
          { id: "configuration", label: "Configuration" },
          { id: "command", label: "Command Mode" },
          { id: "memory", label: "Memory" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "configuration" && (
        <>
          <SectionLabel>
            <Lock size={13} /> AI Provider
          </SectionLabel>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {AI_PROVIDERS.map((name) => (
              <ProviderRow
                key={name}
                logo={<span className="text-xs font-bold text-muted">{name.charAt(0)}</span>}
                name={name}
                right={<SetupBadge />}
              />
            ))}
            <button className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-left hover:bg-card">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Plus size={16} /> Add Custom API
              </span>
              <ProPill label="Pro" />
            </button>
          </div>

          <HeroCard
            className="mt-4"
            title={
              <span className="flex items-center gap-2">
                <Lock size={15} /> Enhance Transcription <Info size={14} className="text-faint" />
              </span>
            }
            body="Automatically clean up filler words, fix punctuation, and format your transcriptions using an AI model of your choice."
          >
            <button className="btn-secondary px-4 py-2 text-[13px]">Connect an AI provider</button>
          </HeroCard>
        </>
      )}

      {tab === "command" && (
        <HeroCard
          title="Command Mode."
          body="Hold the Command Mode shortcut and tell Yawning Face what to do with your selection — polish text, translate, convert files and more. Requires an AI provider."
        />
      )}

      {tab === "memory" && (
        <HeroCard
          title="Memory."
          body="Give Yawning Face context about you — files and notes it can reference to personalise transcriptions and answers."
        />
      )}
    </div>
  );
}
