import { useState } from "react";
import { Plus, X, Mic, ChevronDown } from "lucide-react";
import { useTopBar } from "@/components/AppLayout";
import { HeroCard, CounterPill, Toggle } from "@/components/ui";

export default function Tones() {
  const [showDialog, setShowDialog] = useState(false);

  useTopBar(
    <div className="flex w-full justify-end">
      <button
        onClick={() => setShowDialog(true)}
        className="no-drag btn-primary px-3.5 py-2 text-[13px]"
      >
        <Plus size={15} /> Create Tone
      </button>
    </div>,
    []
  );

  return (
    <div className="mx-auto max-w-4xl space-y-3 pt-2">
      <HeroCard
        title="Tones"
        body="Create tailored recording modes for different contexts and apps."
      />
      <div className="flex justify-end">
        <CounterPill text="0/1 tones" />
      </div>
      <div className="pt-10 text-center text-sm text-muted">
        No tones yet — create one to override settings for specific apps.
      </div>

      {showDialog && <NewToneDialog onClose={() => setShowDialog(false)} />}
    </div>
  );
}

function NewToneDialog({ onClose }: { onClose: () => void }) {
  const [aiOn, setAiOn] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-app p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">New Tone</h2>
          <button onClick={onClose} className="btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-ink">Icon &amp; Name</div>
              <div className="flex items-center gap-2">
                <button className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-card text-muted">
                  <Mic size={18} />
                </button>
                <input
                  placeholder="Tone name…"
                  className="flex-1 rounded-lg border border-line bg-app px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-ink">Active in Apps</div>
              <button className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-line text-muted hover:bg-card">
                <Plus size={18} />
              </button>
            </div>
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-ink">Custom Instructions</div>
              <div className="relative">
                <textarea
                  disabled
                  placeholder="e.g. Always use Oxford comma. Keep responses under 3 sentences."
                  className="h-24 w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm text-muted"
                />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="pill bg-app text-muted shadow-soft">
                    Enable AI Enhancement to use custom instructions
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-ink">Speech Model</div>
              <button className="flex w-full items-center justify-between rounded-lg border border-line bg-app px-3 py-2 text-sm hover:bg-card">
                <span className="flex items-center gap-2">◐ Parakeet V2</span>
                <ChevronDown size={15} className="text-faint" />
              </button>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-line p-3">
              <div>
                <div className="text-[14px] font-semibold text-ink">AI Enhancement</div>
                <div className="text-[12px] text-muted">Enhance transcriptions with an AI model</div>
              </div>
              <Toggle checked={aiOn} onChange={setAiOn} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-[13px]">
            Cancel
          </button>
          <button className="btn-primary px-4 py-2 text-[13px] opacity-50" disabled>
            Create Tone
          </button>
        </div>
      </div>
    </div>
  );
}
