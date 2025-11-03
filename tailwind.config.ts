import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./styles/**/*.{css}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b10",
        card: "#151722",
        border: "#1f2230",
        text: "#f5f7fb",
        subtext: "#abb2bf",
        accent: "#3a6cf4",
      },
      boxShadow: {
        glow: "0 0 20px rgba(58,108,244,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
