import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Headphones } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { WindowControls } from "./WindowControls";
import { RecordingOverlay } from "./RecordingOverlay";
import { on, isTauri, invoke } from "@/lib/tauri";
import { useDictation } from "@/lib/dictation";
import { getState, setInstalled, showToast, useStore } from "@/lib/store";

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
    if (!isTauri) return;
    invoke<string[]>("list_installed_models").then((ids) => {
      if (!ids) return;
      setInstalled(ids);
      const active = getState().activeModelId;
      if (ids.includes(active)) invoke("set_active_model", { id: active });
    });
    invoke("set_inject_mode", { mode: getState().insertMethod });
    invoke("set_dictionary", { entries: getState().dictionary });
  }, []);

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
