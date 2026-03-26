import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0d1b2a", light: "#1a3050" },
        gold: { DEFAULT: "#e8b84b", light: "#f0ca72" },
        teal: "#2ec4b6",
      },
    },
  },
  plugins: [],
};

export default config;
