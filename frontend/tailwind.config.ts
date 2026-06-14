import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0A0A0A",
        card: "#141414",
        border: "#2A2A2A",
        muted: "#B0B0B0",
        honey: {
          DEFAULT: "#FFC107",
          hover: "#FFD54F",
        },
        mustard: {
          DEFAULT: "#FFC107",
          dark: "#FFD54F",
        },
      },
      borderRadius: {
        chapita: "24px",
      },
      fontFamily: {
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        honey: "0 8px 24px rgba(255, 193, 7, 0.35)",
        mustard: "0 8px 24px rgba(255, 193, 7, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
