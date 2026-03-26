import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        navy: {
          50: "#e8edf5",
          100: "#c5d1e6",
          200: "#9eb3d4",
          300: "#7794c1",
          400: "#587db3",
          500: "#3966a5",
          600: "#305b96",
          700: "#254c82",
          800: "#1a3d6f",
          900: "#0d2748",
          950: "#050a14",
        },
        gold: {
          DEFAULT: "#e8b84b",
          50: "#fef9ec",
          100: "#fcf0ce",
          200: "#f9e09d",
          300: "#f5cb63",
          400: "#e8b84b",
          500: "#d9a021",
          600: "#c07d18",
          700: "#a05c17",
          800: "#83491a",
          900: "#6d3c18",
        },
        teal: {
          DEFAULT: "#2ec4b6",
          50: "#effefb",
          100: "#c7fff5",
          200: "#90ffeb",
          300: "#51f7df",
          400: "#2ec4b6",
          500: "#0fa89c",
          600: "#068880",
          700: "#0a6c68",
          800: "#0d5654",
          900: "#104746",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(99, 102, 241, 0.1)",
        glow: "0 0 20px rgba(99, 102, 241, 0.15), 0 0 60px rgba(99, 102, 241, 0.05)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.2), 0 0 80px rgba(99, 102, 241, 0.1)",
        "glow-teal": "0 0 20px rgba(46, 196, 182, 0.15)",
        "glow-gold": "0 0 20px rgba(232, 184, 75, 0.15)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
