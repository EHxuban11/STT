import { useEffect, useRef, useState } from "react";
import { on } from "@/lib/tauri";

// Isla flotante de grabación (ventana transparente always-on-top en Tauri).
// Medidor de audio en vivo a partir de los eventos "audio-level" del backend.
// Las barras se animan por REFS (sin setState por frame) y el bucle se para al inactivar.
const NB = 15;

export default function Pill() {
  const [busy, setBusy] = useState(false);
  const levelRef = useRef(0);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef(0);

  // Fondo transparente para esta ventana flotante.
  useEffect(() => {
    const ph = document.documentElement.style.background;
    const pb = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = ph;
      document.body.style.background = pb;
    };
  }, []);

  function startLoop() {
    if (rafRef.current) return;
    const tick = () => {
      const lvl = Math.min(1, levelRef.current * 7); // amplificar RMS
      for (let i = 0; i < NB; i++) {
        const el = barsRef.current[i];
        if (!el) continue;
        const center = 1 - Math.abs(i - (NB - 1) / 2) / ((NB - 1) / 2);
        const target = 0.1 + lvl * center * (0.55 + 0.45 * Math.random());
        const cur = parseFloat(el.dataset.h || "0.12");
        const nh = cur + (target - cur) * 0.5; // suavizado
        el.dataset.h = String(nh);
        el.style.height = `${Math.max(3, nh * 24)}px`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    for (const el of barsRef.current) {
      if (el) {
        el.dataset.h = "0.12";
        el.style.height = "3px";
      }
    }
  }

  useEffect(() => {
    const subs: Promise<() => void>[] = [];
    subs.push(on<number>("audio-level", (lvl) => (levelRef.current = lvl)));
    subs.push(
      on<string>("state", (s) => {
        if (s === "recording") {
          setBusy(false);
          startLoop();
        } else if (s === "idle") {
          window.setTimeout(stopLoop, 300);
        }
      })
    );
    // Mientras finaliza el STT mostramos un spinner breve en lugar del punto rojo.
    subs.push(
      on<{ text: string; interim: boolean }>("transcript", (t) => {
        if (!t.interim && t.text.trim()) setBusy(true);
      })
    );
    startLoop(); // por si la ventana se muestra ya grabando
    return () => {
      subs.forEach((p) => p.then((u) => u()));
      stopLoop();
    };
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-transparent">
      <div className="flex items-center gap-3 rounded-full bg-zinc-900/95 px-4 py-2.5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
        {busy ? (
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}

        <div className="flex h-6 items-center gap-[2px]">
          {Array.from({ length: NB }).map((_, i) => (
            <span
              key={i}
              ref={(el) => {
                barsRef.current[i] = el;
              }}
              className="w-[3px] rounded-full bg-brand"
              style={{ height: "3px" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
