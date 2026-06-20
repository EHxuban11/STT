import { Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { useStore } from "./lib/store";
import { AppLayout } from "./components/AppLayout";
import Home from "./pages/Home";
import Transcribe from "./pages/Transcribe";
import SpeechModels from "./pages/SpeechModels";
import Dictionary from "./pages/Dictionary";
import Workflows from "./pages/Workflows";
import ConfigureAI from "./pages/ConfigureAI";
import Notes from "./pages/Notes";
import Tones from "./pages/Tones";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Pill from "./pages/Pill";
import Onboarding from "./pages/Onboarding";

function Gate() {
  const onboarded = useStore((s) => s.onboarded);
  const isPill = useLocation().pathname === "/pill";
  return (
    <>
      <Routes>
        {/* Ventana flotante de grabación (sin sidebar) */}
        <Route path="pill" element={<Pill />} />
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="transcribe" element={<Transcribe />} />
          <Route path="speech-models" element={<SpeechModels />} />
          <Route path="dictionary" element={<Dictionary />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="configure-ai" element={<ConfigureAI />} />
          <Route path="notes" element={<Notes />} />
          <Route path="tones" element={<Tones />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
        </Route>
      </Routes>
      {/* Onboarding de primer arranque (no en la ventana flotante) */}
      {!onboarded && !isPill && <Onboarding />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Gate />
    </ThemeProvider>
  );
}
