import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { WindowControls } from "./WindowControls";
import { RecordingOverlay } from "./RecordingOverlay";
import { on, isTauri, invoke } from "@/lib/tauri";
import { useDictation } from "@/lib/dictation";
import { showToast, setInstalled, useStore, getState } from "@/lib/store";

// Permite a cada página inyectar contenido en la barra superior (acciones, tabs, etc.).
const TopBarCtx = createContext<(n: ReactNode) => void>(() => {});

export function useTopBar(node: ReactNode, deps: unknown[] = []) {
  const set = useContext(TopBarCtx);
  useEffect(() => {
    set(node);
    return () => set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function AppLayout() {
  const [bar, setBar] = useState<ReactNode>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Disparador de dictado (atajo / evento de Tauri) + píldora flotante.
  useDictation();

  // Navegación disparada desde el tray del sistema (evento "navigate").
  useEffect(() => {
    const p = on<string>("navigate", (path) => navigate(path));
    return () => {
      p.then((un) => un());
    };
  }, [navigate]);

  // Aviso "sin modelo" emitido por el backend al intentar dictar sin modelo descargado.
  useEffect(() => {
    const p = on<string>("no-model", (msg) => showToast(msg));
    return () => {
      p.then((un) => un());
    };
  }, []);

  // Reconciliar la lista de modelos instalados con lo que hay realmente en disco (escritorio).
  useEffect(() => {
    if (!isTauri) return;
    invoke<string[]>("list_installed_models").then((ids) => ids && setInstalled(ids));
    // Empujar el método de inserción persistido al backend.
    invoke("set_inject_mode", { mode: getState().insertMethod });
  }, []);

  const toast = useStore((s) => s.toast);

  return (
    <TopBarCtx.Provider value={setBar}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col bg-app">
          <header className="drag-region relative z-20 flex h-12 shrink-0 items-center gap-3 px-4">
            <div className="flex min-w-0 flex-1 items-center">{bar}</div>
            <WindowControls />
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
      {/* En escritorio (Tauri) el indicador es la ventana flotante; en navegador, el overlay de demo. */}
      {!isTauri && <RecordingOverlay />}

      {/* Aviso efímero (toast) */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
          <div className="pointer-events-auto rounded-full bg-accentbtn px-4 py-2 text-sm font-medium text-app shadow-pill">
            {toast}
          </div>
        </div>
      )}
    </TopBarCtx.Provider>
  );
}
