// Utilidades de integración con Tauri. En el navegador (sin Tauri) son no-ops,
// así que la app sigue funcionando en `vite dev`.

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type Unlisten = () => void;

/** Escucha eventos del backend (p. ej. del tray) y ejecuta el callback. */
export async function on<T>(event: string, cb: (payload: T) => void): Promise<Unlisten> {
  if (!isTauri) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (e) => cb(e.payload));
}

/** Invoca un comando Rust. Devuelve null fuera de Tauri. */
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauri) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}
