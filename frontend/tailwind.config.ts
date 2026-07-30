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
      keyframes: {
        "radar-ring": {
          "0%": { transform: "scale(0.45)", opacity: "0.7" },
          "65%": { opacity: "0.18" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
        "pin-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.55)", opacity: "0" },
        },
        scan: {
          "0%": { transform: "translate3d(0, -100%, 0)", opacity: "0" },
          "12%": { opacity: "0.95" },
          "88%": { opacity: "0.9" },
          "100%": { transform: "translate3d(0, 560%, 0)", opacity: "0" },
        },
      },
      animation: {
        "radar-ring": "radar-ring 3.2s ease-out infinite",
        "pin-pulse": "pin-pulse 2.4s ease-out infinite",
        scan: "scan 2.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
