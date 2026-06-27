// Utilidades de integración con Tauri. En el navegador (sin Tauri) son no-ops,
// así que la app sigue funcionando en `vite dev`.

export const isTauri =
  typeof window !== "undefined" &&
  ((globalThis as typeof globalThis & { isTauri?: boolean }).isTauri === true ||
    "__TAURI_INTERNALS__" in window);

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

/**
 * Copia texto al portapapeles. Dentro de Tauri `navigator.clipboard` no es fiable
 * (el WebView no siempre lo expone), así que usamos el plugin de portapapeles y
 * caemos al API del navegador solo fuera de Tauri. Devuelve true si copió.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (isTauri) {
      const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
      await writeText(text);
    } else {
      await navigator.clipboard?.writeText(text);
    }
    return true;
  } catch {
    return false;
  }
}
