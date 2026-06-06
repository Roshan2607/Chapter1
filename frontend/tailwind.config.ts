import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "neo-bg":        "#FFFDF5",
        "neo-accent":    "#FF6B6B",
        "neo-secondary": "#FFD93D",
        "neo-muted":     "#C4B5FD",
        "neo-green":     "#AFFFCB",
      },
      fontFamily: {
        sans: ['"Albert Sans"', "sans-serif"],
        heading: ['"Unbounded"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        serif: ['"Lora"', "serif"],
      },
      boxShadow: {
        "neo-sm":  "4px 4px 0px 0px #000",
        "neo":     "8px 8px 0px 0px #000",
        "neo-lg":  "12px 12px 0px 0px #000",
        "neo-xl":  "16px 16px 0px 0px #000",
        "neo-inv": "8px 8px 0px 0px #FFD93D",
        "neo-red": "8px 8px 0px 0px #FF6B6B",
      },
      letterSpacing: {
        tightest: "-0.05em",
      },
    },
  },
  plugins: [],
};

export default config;