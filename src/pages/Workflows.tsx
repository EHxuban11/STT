import { Plus } from "lucide-react";
import { useTopBar } from "@/components/AppLayout";
import { HeroCard, Kbd, CounterPill, Toggle } from "@/components/ui";
import { DEFAULT_WORKFLOWS } from "@/lib/data";
import { useStore, setState } from "@/lib/store";

export default function Workflows() {
  const enabled = useStore((s) => s.workflowsEnabled);
  const isOn = (t: string) => enabled[t] ?? true;

  useTopBar(
    <div className="flex w-full justify-end">
      <button className="no-drag btn-primary px-3.5 py-2 text-[13px]">
        <Plus size={15} /> Create Workflow
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-2">
      <HeroCard
        title={
          <span className="flex items-center gap-2">
            Hold <Kbd>Ctrl</Kbd> + <Kbd>⇧</Kbd> and say the word.
          </span>
        }
        body="Speak a trigger phrase to open apps, search the web, or talk to AI, hands-free."
      />

      <div className="flex justify-end">
        <CounterPill text="0/3 custom workflows" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-[1fr_1.6fr_auto] gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
          <div>Trigger phrase</div>
          <div>Action</div>
          <div>Enabled</div>
        </div>
        {DEFAULT_WORKFLOWS.map((r) => (
          <div
            key={r.trigger}
            className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-4 border-b border-line px-5 py-3.5 last:border-0"
          >
            <div className="text-sm font-medium text-ink">{r.trigger}</div>
            <div className="text-sm text-muted">{r.action}</div>
            <Toggle
              checked={isOn(r.trigger)}
              onChange={(v) =>
                setState((s) => ({
                  workflowsEnabled: { ...s.workflowsEnabled, [r.trigger]: v },
                }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
