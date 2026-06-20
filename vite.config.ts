import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Puerto 1420 = convención de Tauri (lo usaremos al envolver la app).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // No vigilar artefactos pesados / perfiles temporales (evita EBUSY en Windows).
      ignored: ["**/_vowen_analysis/**", "**/dist/**", "**/src-tauri/target/**"],
    },
  },
  clearScreen: false,
});
