import { Monitor, Moon, Sun, Minus, Square, X } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { isTauri } from "@/lib/tauri";

async function win(action: "minimize" | "maximize" | "close") {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  if (action === "minimize") await w.minimize();
  if (action === "maximize") await w.toggleMaximize();
  if (action === "close") await w.close();
}

// Controles superiores de la ventana (tema, min/max/close).
// En el navegador no manipulan la ventana; en la app Tauri usan la API nativa.
const THEME_CYCLE: ThemeChoice[] = ["system", "light", "dark"];

export function WindowControls() {
  const { choice, setChoice } = useTheme();

  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(choice) + 1) % THEME_CYCLE.length];
    setChoice(next);
  };
  const ThemeIcon = choice === "system" ? Monitor : choice === "light" ? Sun : Moon;

  return (
    <div className="no-drag flex items-center gap-1">
      <button onClick={cycleTheme} className="btn-ghost" title={`Theme: ${choice}`}>
        <ThemeIcon size={17} />
      </button>
      <div className="ml-1 flex items-center">
        <button onClick={() => win("minimize")} className="btn-ghost px-2" title="Minimize">
          <Minus size={16} />
        </button>
        <button onClick={() => win("maximize")} className="btn-ghost px-2" title="Maximize">
          <Square size={13} />
        </button>
        <button
          onClick={() => win("close")}
          className="rounded-lg px-2 py-1.5 text-muted transition-colors hover:bg-red-500 hover:text-white"
          title="Hide to tray"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
