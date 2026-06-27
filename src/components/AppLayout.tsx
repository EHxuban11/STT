import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Headphones } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { WindowControls } from "./WindowControls";
import { RecordingOverlay } from "./RecordingOverlay";
import { FeedbackButton } from "./FeedbackButton";
import { on, isTauri, invoke } from "@/lib/tauri";
import { useDictation } from "@/lib/dictation";
import { getState, setInstalled, setState, showToast, useStore } from "@/lib/store";

const SPEECH_MODELS: Record<string, { selectedModelId: string; selectedModelName: string }> = {
  "parakeet-tdt-0.6b-v3-int8": { selectedModelId: "ml:Parakeet V3", selectedModelName: "Parakeet V3" },
  "parakeet-tdt-0.6b-v2-int8": { selectedModelId: "en:Parakeet V2", selectedModelName: "Parakeet V2" },
  "whisper-base.en": { selectedModelId: "en:Base", selectedModelName: "Base" },
  "whisper-tiny.en": { selectedModelId: "en:Tiny", selectedModelName: "Tiny" },
};

const FALLBACK_SPEECH_MODEL_ORDER = [
  "parakeet-tdt-0.6b-v3-int8",
  "parakeet-tdt-0.6b-v2-int8",
  "whisper-base.en",
  "whisper-tiny.en",
];

type WorkflowEvent = {
  trigger: string;
  query: string;
  target: string;
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useDictation();

  useEffect(() => {
    const p = on<string>("navigate", (path) => navigate(path));
    return () => {
      p.then((un) => un());
    };
  }, [navigate]);

  useEffect(() => {
    const p = on<string>("no-model", (msg) => showToast(msg));
    return () => {
      p.then((un) => un());
    };
  }, []);

  useEffect(() => {
    const p = on<WorkflowEvent>("workflow-triggered", (event) => {
      showToast(event.query ? `Workflow: ${event.trigger} ${event.query}` : `Workflow: ${event.trigger}`);
    });
    return () => {
      p.then((un) => un());
    };
  }, []);

  useEffect(() => {
    const p = on<string>("workflow-error", (msg) => showToast(msg));
    return () => {
      p.then((un) => un());
    };
  }, []);

  useEffect(() => {
    const p = on<string>("tray-action", async (action) => {
      if (action !== "copy_last") return;
      const text = getState().transcriptions[0]?.text || getState().liveText;
      if (!text.trim()) {
        showToast("No transcription to copy");
        return;
      }
      try {
        if (isTauri) {
          const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
          await writeText(text);
        } else {
          await navigator.clipboard?.writeText(text);
        }
        showToast("Copied last transcription");
      } catch {
        showToast("Could not copy transcription");
      }
    });
    return () => {
      p.then((un) => un());
    };
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    invoke<string[]>("list_installed_models").then(async (ids) => {
      if (!ids) return;
      setInstalled(ids);
      let active = getState().activeModelId;
      if (!ids.includes(active)) {
        const fallback = FALLBACK_SPEECH_MODEL_ORDER.find((id) => ids.includes(id));
        if (fallback) {
          active = fallback;
          setState({ activeModelId: fallback, ...SPEECH_MODELS[fallback] });
        }
      }
      if (ids.includes(active)) {
        invoke("set_active_model", { id: active });
      }
    });
    invoke("set_inject_mode", { mode: getState().insertMethod });
    invoke("set_dictionary_mode", { mode: getState().dictionaryMode });
    invoke("set_dictionary", { entries: getState().dictionary });
    invoke("set_workflows_enabled", { workflows: getState().workflowsEnabled });
  }, []);

  // Aviso de primer cierre: la app se queda en la bandeja (para que el atajo global
  // siga funcionando). Lo explicamos una vez; después, cerrar esconde sin preguntar.
  const [closeHint, setCloseHint] = useState(false);
  useEffect(() => {
    const p = on("main-close-requested", () => {
      if (localStorage.getItem("closeHintSeen")) {
        invoke("hide_main");
      } else {
        setCloseHint(true);
      }
    });
    return () => {
      p.then((un) => un());
    };
  }, []);

  const dismissHint = () => {
    localStorage.setItem("closeHintSeen", "1");
    setCloseHint(false);
    invoke("hide_main");
  };
  const quitFully = () => {
    localStorage.setItem("closeHintSeen", "1");
    setCloseHint(false);
    invoke("quit_app");
  };

  const toast = useStore((s) => s.toast);
  const modelName = useStore((s) => s.selectedModelName);

  return (
    <>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col bg-app">
          <header className="drag-region relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 px-4">
            <Link
              to="/speech-models"
              className="no-drag inline-flex min-w-0 items-center gap-2 rounded-xl border border-line bg-app px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-card"
              title="Open speech models"
            >
              <Headphones size={14} className="shrink-0 text-brand" />
              <span className="max-w-[220px] truncate">{modelName || "Speech model"}</span>
              <ChevronRight size={14} className="shrink-0 text-faint" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="no-drag rounded-lg px-2 py-1 text-xs font-semibold text-muted">
                XC
              </div>
              <WindowControls />
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-16">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>

      {!isTauri && <RecordingOverlay />}
      <FeedbackButton />

      {closeHint && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-app p-5 shadow-2xl">
            <h2 className="text-base font-bold text-ink">Still running in the background</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Yawning Face keeps running in your system tray (bottom-right) so your
              dictation shortcut works in any app. To fully quit, use{" "}
              <span className="font-semibold text-ink">tray icon &rsaquo; Quit</span>, or quit now.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={quitFully}
                className="btn-secondary px-3.5 py-2 text-[13px]"
              >
                Quit app
              </button>
              <button
                onClick={dismissHint}
                className="rounded-lg bg-accentbtn px-3.5 py-2 text-[13px] font-semibold text-app"
              >
                Keep in tray
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
          <div className="pointer-events-auto rounded-full bg-accentbtn px-4 py-2 text-sm font-medium text-app shadow-pill">
            {toast}
          </div>
        </div>
      )}
    </>
  );
}
