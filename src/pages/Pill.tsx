import { useEffect, useRef, useState } from "react";
import { on } from "@/lib/tauri";

// Isla flotante de grabación (ventana transparente always-on-top en Tauri).
// Muestra un medidor de audio en vivo a partir de los eventos "audio-level" del backend.
const NB = 15; // nº de barras

export default function Pill() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false); // true = transcribiendo
  const levelRef = useRef(0);
  const [heights, setHeights] = useState<number[]>(() => Array(NB).fill(0.12));

  // Fondo transparente para esta ventana flotante.
  useEffect(() => {
    const prevHtml = document.documentElement.style.background;
    const prevBody = document.body.style.background;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevHtml;
      document.body.style.background = prevBody;
    };
  }, []);

  // Eventos del backend.
  useEffect(() => {
    const subs: Promise<() => void>[] = [];
    subs.push(on<number>("audio-level", (lvl) => (levelRef.current = lvl)));
    subs.push(
      on<string>("state", (s) => {
        if (s === "recording") {
          setText("");
          setBusy(false);
        }
      })
    );
    subs.push(
      on<{ text: string; interim: boolean }>("transcript", (t) => {
        if (t.interim) setText(t.text);
        else if (t.text.trim()) {
          setBusy(true);
          setText(t.text);
        }
      })
    );
    return () => subs.forEach((p) => p.then((u) => u()));
  }, []);

  // Animación del espectrograma (~60fps) escalada por el nivel RMS.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const lvl = Math.min(1, levelRef.current * 7); // amplificar RMS
      setHeights((prev) =>
        prev.map((h, i) => {
          // forma de campana: más alto en el centro
          const center = 1 - Math.abs(i - (NB - 1) / 2) / ((NB - 1) / 2);
          const target = 0.1 + lvl * center * (0.55 + 0.45 * Math.random());
          // suavizado
          return h + (target - h) * 0.5;
        })
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
          {heights.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-brand transition-[height] duration-75"
              style={{ height: `${Math.max(3, h * 24)}px` }}
            />
          ))}
        </div>

        {text ? (
          <span className="max-w-[240px] truncate text-[12px] font-medium text-white/85">{text}</span>
        ) : (
          <span className="text-[12px] font-medium text-white/55">Listening…</span>
        )}
      </div>
    </div>
  );
}
