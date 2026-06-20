import { Moon, Sun, Minus, Square, X, UserCircle2 } from "lucide-react";
import { useTheme } from "@/lib/theme";

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function win(action: "minimize" | "maximize" | "close") {
  if (!inTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  if (action === "minimize") await w.minimize();
  if (action === "maximize") await w.toggleMaximize();
  if (action === "close") await w.close();
}

// Controles superiores de la ventana (tema, cuenta, min/max/close).
// En el navegador no manipulan la ventana; en la app Tauri usan la API nativa.
export function WindowControls() {
  const { theme, toggle } = useTheme();

  return (
    <div className="no-drag flex items-center gap-1">
      <button onClick={toggle} className="btn-ghost" title="Toggle theme">
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>
      <button className="btn-ghost" title="Account">
        <UserCircle2 size={18} />
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
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
