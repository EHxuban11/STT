import { HeroCard, Kbd, Toggle } from "@/components/ui";
import { DEFAULT_WORKFLOWS } from "@/lib/data";
import { saveWorkflowEnabled, useStore } from "@/lib/store";

export default function Workflows() {
  const enabled = useStore((s) => s.workflowsEnabled);
  const isOn = (trigger: string) => enabled[trigger] ?? true;

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Workflows</h1>
        <p className="text-sm text-muted">Trigger useful actions with short spoken phrases.</p>
      </div>

      <HeroCard
        title={
          <span className="flex flex-wrap items-center gap-2">
            Hold <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> and say the trigger phrase.
          </span>
        }
        body="Speak a trigger phrase to open apps, search the web, or talk to AI, hands-free."
      />

      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-[1fr_1.6fr_auto] gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
          <div>Trigger phrase</div>
          <div>Action</div>
          <div>Enabled</div>
        </div>
        {DEFAULT_WORKFLOWS.map((workflow) => (
          <div
            key={workflow.trigger}
            className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-4 border-b border-line px-5 py-3.5 last:border-0"
          >
            <div className="text-sm font-medium text-ink">{workflow.trigger}</div>
            <div className="text-sm text-muted">{workflow.action}</div>
            <Toggle
              checked={isOn(workflow.trigger)}
              onChange={(enabled) => saveWorkflowEnabled(workflow.trigger, enabled)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
