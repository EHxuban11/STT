import { useState } from "react";
import { Mic, Check, ArrowRight, Globe, Languages, Loader2, Download, Circle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useStore, setState, getState } from "@/lib/store";
import { downloadModel } from "@/lib/models";
import { invoke } from "@/lib/tauri";

// Onboarding de primer arranque, original, inspirado en el flujo típico de apps de dictado
// (bienvenida → micrófono → descargar modelo → probar). No pide correo ni datos personales.
const STEPS = 4;

const MODELS = [
  {
    id: "parakeet-tdt-0.6b-v2-int8",
    uiId: "en:Parakeet V2",
    name: "Parakeet V2",
    sub: "English · fastest, most accurate",
    bytes: 660_000_000,
    icon: Languages,
  },
  {
    id: "parakeet-tdt-0.6b-v3-int8",
    uiId: "ml:Parakeet V3",
    name: "Parakeet V3",
    sub: "Multilingual, includes Spanish",
    bytes: 700_000_000,
    icon: Globe,
  },
];

function Dots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: STEPS }).map((_, i) => (
        <span
          key={i}
          className={
            i === step ? "h-1.5 w-6 rounded-full bg-accentbtn" : "h-1.5 w-1.5 rounded-full bg-line"
          }
        />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const installed = useStore((s) => s.installed);
  const downloads = useStore((s) => s.downloads);
  const activeModelId = useStore((s) => s.activeModelId);
  const selectedModelName = useStore((s) => s.selectedModelName);
  const recording = useStore((s) => s.recording);
  const liveText = useStore((s) => s.liveText);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const finish = () => setState({ onboarded: true });
  const activeModel = MODELS.find((m) => m.id === activeModelId);
  const activeDownload = activeModel ? downloads[activeModel.id] : undefined;
  const activeReady = !!activeModel && installed.includes(activeModel.id);
  const testText =
    liveText ||
    (recording === "listening"
      ? "Listening..."
      : recording === "transcribing"
        ? "Transcribing..."
        : "");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-app">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="font-bold tracking-tight text-ink">Yawning Face STT</span>
        </div>
        <button onClick={finish} className="text-sm text-muted hover:text-ink">
          Skip
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          {step === 0 && (
            <>
              <div className="mx-auto mb-6 w-fit">
                <Logo size={64} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-ink">Speak. It&apos;s written.</h1>
              <p className="mt-3 leading-relaxed text-muted">
                Voice-first dictation for your desktop. Hold a key, talk, and your words appear in any
                app, transcribed entirely on your own device.
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Mic size={30} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Allow your microphone</h1>
              <p className="mt-3 leading-relaxed text-muted">
                Yawning Face needs the microphone to hear you. Your audio is processed locally and
                never leaves your computer. If Windows asks, choose <b className="text-ink">Allow</b>.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Pick a voice model</h1>
              <p className="mt-2 text-muted">
                Download a model to transcribe on-device. You can change it any time in Speech models.
              </p>
              <div className="mt-5 space-y-2 text-left">
                {MODELS.map((m) => {
                  const inst = installed.includes(m.id);
                  const dl = downloads[m.id];
                  const selected = inst && activeModelId === m.id;
                  const progress = dl?.total ? Math.min(100, Math.round((dl.done / dl.total) * 100)) : 0;
                  const Icon = m.icon;
                  const selectModel = () => {
                    setState({ activeModelId: m.id, selectedModelId: m.uiId, selectedModelName: m.name });
                    invoke("set_active_model", { id: m.id });
                  };
                  const onClick = async () => {
                    if (dl) return;
                    if (inst) {
                      selectModel();
                    } else {
                      await downloadModel(m.id, m.bytes);
                      if (getState().installed.includes(m.id)) selectModel();
                    }
                  };
                  return (
                    <button
                      key={m.id}
                      onClick={onClick}
                      className={[
                        "w-full rounded-xl border bg-app p-3 text-left transition-colors hover:bg-card",
                        selected ? "border-brand shadow-[0_0_0_1px_rgba(81,95,230,0.16)]" : "border-line",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-brand">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-ink">{m.name}</div>
                          <div className="text-xs text-muted">{m.sub}</div>
                        </div>
                        {dl ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-muted">
                            <Loader2 size={14} className="animate-spin" />
                            {progress}%
                          </span>
                        ) : selected ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2 py-1 text-xs font-semibold text-brand">
                            <Check size={13} />
                            Selected
                          </span>
                        ) : inst ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2 py-1 text-xs font-medium text-muted">
                            <Circle size={12} />
                            Ready
                          </span>
                        ) : (
                          <Download size={16} className="text-faint" />
                        )}
                      </div>
                      {dl ? (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-ink">Try it out</h1>
              <p className="mt-2 leading-relaxed text-muted">
                Click the box below, hold <kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Shift</kbd>,
                say something, then release.
              </p>
              <div className="mt-4 rounded-xl border border-line bg-card p-3 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-ink">{selectedModelName}</div>
                    <div className="text-xs text-muted">Active speech model</div>
                  </div>
                  {activeDownload ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Loader2 size={14} className="animate-spin" />
                      Downloading {Math.round((activeDownload.done / activeDownload.total) * 100)}%
                    </span>
                  ) : activeReady ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <Check size={13} />
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-700">Download required</span>
                  )}
                </div>
                {activeDownload ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{
                        width: `${Math.min(100, Math.round((activeDownload.done / activeDownload.total) * 100))}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <textarea
                placeholder="Your words will appear here…"
                value={testText}
                readOnly
                className="mt-4 h-28 w-full resize-none rounded-xl border border-line bg-app p-3 text-sm outline-none focus:border-brand"
              />
            </>
          )}

          <div className="mt-8">
            {step < STEPS - 1 ? (
              <button
                onClick={next}
                disabled={step === 2 && !activeReady}
                className="btn-primary mx-auto px-6 py-2.5 disabled:opacity-40"
              >
                {step === 0 ? "Get started" : "Continue"} <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={finish} className="btn-primary mx-auto px-6 py-2.5">
                Finish
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pb-8 pt-4">
        <Dots step={step} />
      </div>
    </div>
  );
}
