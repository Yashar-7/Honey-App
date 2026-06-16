import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0f172a",
        card: "#1e293b",
        border: "#334155",
        muted: "#94a3b8",
        honey: {
          DEFAULT: "#f59e0b",
          hover: "#d97706",
        },
        mustard: {
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
      },
      borderRadius: {
        chapita: "24px",
      },
      fontFamily: {
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        honey: "0 8px 24px rgba(245, 158, 11, 0.35)",
        mustard: "0 8px 24px rgba(245, 158, 11, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
