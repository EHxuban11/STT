import { isTauri, on, invoke } from "./tauri";
import { getState, setState, markInstalled, clearDownload } from "./store";

/** Lanza la descarga de un modelo: real en Tauri (download_model + model-progress),
 *  simulada en el navegador. Actualiza el store (downloads / installed). */
export async function downloadModel(id: string, totalBytes: number) {
  const s = getState();
  if (s.installed.includes(id) || s.downloads[id]) return;
  setState((st) => ({ downloads: { ...st.downloads, [id]: { done: 0, total: totalBytes } } }));

  if (isTauri) {
    const un = await on<{ id: string; done: number; total: number }>("model-progress", (p) => {
      if (p.id !== id) return;
      setState((st) => ({ downloads: { ...st.downloads, [id]: { done: p.done, total: p.total } } }));
    });
    try {
      await invoke("download_model", { id });
      markInstalled(id);
    } catch (e) {
      console.error("download_model failed", e);
    } finally {
      un();
      clearDownload(id);
    }
    return;
  }

  // Navegador: simulación de progreso (~2.5s).
  await new Promise<void>((resolve) => {
    const start = performance.now();
    const dur = 2500;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      setState((st) => ({
        downloads: { ...st.downloads, [id]: { done: Math.round(totalBytes * t), total: totalBytes } },
      }));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    tick();
  });
  markInstalled(id);
  clearDownload(id);
}
