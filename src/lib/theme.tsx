import { createContext, useContext, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

type ThemeValue = {
  /** Lo que el usuario eligió (puede ser "system"). */
  choice: ThemeChoice;
  /** El tema realmente aplicado ("light" | "dark"), resolviendo "system". */
  resolved: "light" | "dark";
  setChoice: (choice: ThemeChoice) => void;
};

const ThemeCtx = createContext<ThemeValue>({
  choice: "system",
  resolved: "light",
  setChoice: () => {},
});

function prefersDark() {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

function readStored(): ThemeChoice {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  if (fromUrl === "dark" || fromUrl === "light" || fromUrl === "system") return fromUrl;
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light" || saved === "system") return saved;
  return "system"; // por defecto: seguir al sistema
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStored);
  const [systemDark, setSystemDark] = useState(prefersDark);

  // Seguir los cambios del tema del SO (afecta solo cuando choice === "system").
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setChoice = (next: ThemeChoice) => {
    localStorage.setItem("theme", next);
    setChoiceState(next);
  };

  return (
    <ThemeCtx.Provider value={{ choice, resolved, setChoice }}>{children}</ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
