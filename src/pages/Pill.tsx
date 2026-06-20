import { useEffect, useState } from "react";
import { RecordingPill, PillState } from "@/components/RecordingPill";

// Contenido de la ventana flotante de grabación (ventana transparente always-on-top en Tauri).
// Ciclo de demo para previsualizar los estados.
export default function Pill() {
  const [state, setState] = useState<PillState>("listening");

  useEffect(() => {
    const seq: PillState[] = ["listening", "transcribing", "done", "idle"];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % seq.length;
      setState(seq[i]);
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-transparent">
      <RecordingPill state={state} text="Hello from your local model" />
    </div>
  );
}
