/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens semánticos (mapeados a variables CSS para soportar tema claro/oscuro)
        app: "rgb(var(--app-bg) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar-bg) / <alpha-value>)",
        card: "rgb(var(--card-bg) / <alpha-value>)",
        "card-hover": "rgb(var(--card-hover) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        accentbtn: "rgb(var(--accent-btn) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.05)",
        pill: "0 4px 14px 0 rgb(0 0 0 / 0.10)",
        card: "0 1px 2px rgb(0 0 0 / 0.03)",
      },
    },
  },
  plugins: [],
};
