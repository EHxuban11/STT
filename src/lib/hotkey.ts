// Etiquetas del atajo push-to-talk de dictado, según plataforma.
// Backend (hotkey.rs): Windows = Ctrl+Win, macOS = Ctrl+Option.
// Se usa Ctrl+Win/Opt en vez de Ctrl+Shift para no chocar con la selección
// de texto (Ctrl+Shift+flechas) ni con Shift para mayúsculas.

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent || "");

/** Las dos teclas del atajo, como etiquetas para mostrar. */
export const PTT_KEYS: [string, string] = isMac ? ["Ctrl", "⌥ Opt"] : ["Ctrl", "⊞ Win"];

/** Atajo completo en una línea, p. ej. "Ctrl + ⊞ Win". */
export const PTT_LABEL = PTT_KEYS.join(" + ");
