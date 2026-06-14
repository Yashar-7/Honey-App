import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#0A1628",
        card: "#112240",
        mustard: {
          DEFAULT: "#FFB700",
          dark: "#FFA500",
        },
      },
      borderRadius: {
        chapita: "24px",
      },
      fontFamily: {
        script: ["var(--font-script)", "cursive"],
      },
      boxShadow: {
        mustard: "0 0 24px rgba(255, 183, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
